const { getTableName } = require('../../lib/table-names');
const dynamoDb = require('../../lib/dynamodb');

// Generate a very simple XML sitemap
function xmlEscape(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function listRecentBooks(limit = 200) {
  const params = {
    TableName: getTableName('books'),
    Limit: limit,
    ScanIndexForward: false,
  };
  const result = await dynamoDb.scan(params);
  return Array.isArray(result.Items) ? result.Items : [];
}

module.exports.handler = async () => {
  try {
    const base = process.env.SITE_BASE_URL || 'https://booklub.shop';
    const urls = [
      { loc: `${base}/`, changefreq: 'daily', priority: '0.8' },
      { loc: `${base}/library`, changefreq: 'daily', priority: '0.7' },
      { loc: `${base}/swap-toys`, changefreq: 'weekly', priority: '0.5' },
    ];

    // Add recent book detail pages
    try {
      const items = await listRecentBooks(200);
      items.forEach((b) => {
        if (b && b.bookId) {
          urls.push({ loc: `${base}/books/${encodeURIComponent(b.bookId)}`, changefreq: 'weekly', priority: '0.6' });
        }
      });
    } catch (e) {
      // Proceed with base URLs only if scan fails
      console.warn('[sitemap] failed to list books:', e?.message || e);
    }

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(u => (
        `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )),
      '</urlset>'
    ].join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900',
      },
      body,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Failed to generate sitemap',
    };
  }
};
