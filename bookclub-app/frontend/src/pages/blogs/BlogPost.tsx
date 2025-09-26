import React from 'react';

type Post = {
  slug: string;
  title: string;
  description: string;
  content: React.ReactNode;
};

const POSTS: Record<string, Post> = {
  'how-to-host-a-no-cost-book-swap': {
    slug: 'how-to-host-a-no-cost-book-swap',
    title: 'How to host a no-cost book swap with friends',
    description: 'A step-by-step guide to run a fun, zero-cost book swap at home or a park. Includes invites, setup and flow tips.',
    content: (
      <div className="prose prose-indigo max-w-none">
        <h2>Why a no-cost swap?</h2>
        <p>It’s a simple way to share stories, declutter shelves, and discover new reads without spending a cent.</p>
        <h3>1) Set a date and format</h3>
        <ul>
          <li>Pick a 2-hour window (e.g., Saturday 2–4pm).</li>
          <li>Choose a location: living room, backyard, or a shaded spot at a local park.</li>
        </ul>
        <h3>2) Invite your circle</h3>
        <ul>
          <li>Ask everyone to bring 3–10 books they’re happy to part with.</li>
          <li>Encourage a mix: fiction, non-fiction, kids, YA.</li>
        </ul>
        <h3>3) Set up simple zones</h3>
        <ul>
          <li>Sort by genre or audience (kids / YA / adult).</li>
          <li>Provide sticky notes for short “why you’ll love this” recommendations.</li>
        </ul>
        <h3>4) Run a browsing round</h3>
        <p>Give everyone 10–15 minutes to browse and pick 1–2 books per round. Repeat until the excitement quiets down.</p>
        <h3>5) Wrap up kindly</h3>
        <ul>
          <li>Offer a donate box for leftovers (local library charity shop).</li>
          <li>Snap a group photo and share favorite finds.</li>
        </ul>
      </div>
    )
  },
  'starter-rules-for-club-swaps': {
    slug: 'starter-rules-for-club-swaps',
    title: 'Starter rules for club swaps (templates inside)',
    description: 'Clear, copy-paste templates to set expectations for fair, fun, repeatable swap nights.',
    content: (
      <div className="prose prose-indigo max-w-none">
        <h2>Why rules help</h2>
        <p>Simple, predictable guidelines reduce friction and make swaps repeatable.</p>
        <h3>Starter rules template</h3>
        <ol>
          <li>Bring up to 5 books you’re happy to swap.</li>
          <li>Books should be in readable condition (no missing pages, heavy damage).</li>
          <li>We’ll do 3 browsing rounds; 2 picks per round.</li>
          <li>Trades are final. No cash, no IOUs.</li>
          <li>Leftovers go to a donate box at the end.</li>
        </ol>
        <h3>Variation ideas</h3>
        <ul>
          <li>Kid-friendly hour first, adults after.</li>
          <li>Genre spotlight nights (mystery, memoir, sci‑fi).</li>
        </ul>
      </div>
    )
  },
  'declutter-your-shelf-10-tips': {
    slug: 'declutter-your-shelf-10-tips',
    title: 'Declutter your shelf: 10 tips for guilt-free swapping',
    description: 'A gentle framework for letting books go, choosing what to share, and finding your next great read.',
    content: (
      <div className="prose prose-indigo max-w-none">
        <h2>Letting go, joyfully</h2>
        <ol>
          <li>Keep favorites, swap the rest.</li>
          <li>Ask: will I reread this in the next 2 years?</li>
          <li>Group duplicates and extras—great swap fuel.</li>
          <li>Unfinished? If it’s been a year, let it travel.</li>
          <li>Pass along series starters you won’t continue.</li>
          <li>Set a shelf space limit as an easy rule of thumb.</li>
          <li>Choose 1–2 “try a chapter” to decide later.</li>
          <li>For gifts: keep the memory, release the book.</li>
          <li>Condition counts—clean lightly before swapping.</li>
          <li>Celebrate the space you’ve made for new stories.</li>
        </ol>
      </div>
    )
  },
};

const BlogPost: React.FC = () => {
  const [slug, setSlug] = React.useState<string>('');

  React.useEffect(() => {
    // Get slug from URL
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const m = path.match(/\/about\/blogs\/(.*)$/);
    if (m && m[1]) setSlug(m[1]);
  }, []);

  const post = slug ? POSTS[slug] : undefined;

  React.useEffect(() => {
    if (!post) return;
    document.title = `${post.title} — BookClub`;
    const desc = post.description;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    // JSON-LD Article
    const ld: any = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: desc,
      author: { '@type': 'Organization', name: 'BookClub' },
      publisher: { '@type': 'Organization', name: 'BookClub' },
      mainEntityOfPage: typeof window !== 'undefined' ? window.location.href : undefined,
      image: (typeof window !== 'undefined' ? window.location.origin : '') + '/logo512.png',
      datePublished: new Date().toISOString(),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'article-jsonld');
    script.text = JSON.stringify(ld);
    document.querySelectorAll('script[data-seo="article-jsonld"]').forEach(n => n.remove());
    document.head.appendChild(script);
    return () => {
      document.querySelectorAll('script[data-seo="article-jsonld"]').forEach(n => n.remove());
    };
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Post not found</h1>
          <p className="text-gray-700 mt-2">Check the URL or return to the Blogs index.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
          <p className="text-gray-700 mt-2">{post.description}</p>
        </header>
        <article>
          {post.content}
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
