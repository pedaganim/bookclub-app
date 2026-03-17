const BookClub = require('../src/models/bookclub');
const dynamoDb = require('../src/lib/dynamodb');
const { getTableName } = require('../lib/table-names');

async function backfillSlugs() {
  console.log('Starting backfill for club slugs...');
  
  const tableName = getTableName('bookclub-groups');
  let lastEvaluatedKey = null;
  let count = 0;
  let updatedCount = 0;

  do {
    const params = {
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const result = await dynamoDb.scan(params);
    const clubs = result.Items || [];

    for (const club of clubs) {
      count++;
      if (!club.slug) {
        // Use the same logic as BookClub.create
        const slug = club.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        console.log(`Updating "${club.name}" with slug "${slug}"...`);
        
        await BookClub.update(club.clubId, { slug });
        updatedCount++;
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Backfill complete. Processed ${count} clubs, updated ${updatedCount} records.`);
}

backfillSlugs().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
