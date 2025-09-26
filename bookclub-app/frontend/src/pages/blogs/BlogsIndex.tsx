import React from 'react';
import { Link } from 'react-router-dom';

const posts = [
  {
    slug: 'how-to-host-a-no-cost-book-swap',
    title: 'How to host a no-cost book swap with friends',
    description: 'Step-by-step guide to run a fun, zero-cost book swap at home or a park. Includes invites, setup, and flow tips.',
  },
  {
    slug: 'starter-rules-for-club-swaps',
    title: 'Starter rules for club swaps (templates inside)',
    description: 'Clear, copy-paste templates to set expectations for fair, fun, repeatable swap nights.',
  },
  {
    slug: 'declutter-your-shelf-10-tips',
    title: 'Declutter your shelf: 10 tips for guilt-free swapping',
    description: 'A gentle framework for letting books go, choosing what to share, and finding your next great read.',
  },
];

const BlogsIndex: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Blogs — BookClub';
    const desc = 'Evergreen guides on book swapping, club rules, and decluttering for readers.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Blogs</h1>
          <p className="text-gray-700 mt-2">Evergreen guides and templates for better swapping.</p>
        </header>
        <div className="grid gap-4">
          {posts.map(p => (
            <Link key={p.slug} to={`/about/blogs/${p.slug}`} className="block bg-white border rounded-lg p-4 hover:shadow">
              <h2 className="text-xl font-semibold text-gray-900">{p.title}</h2>
              <p className="text-gray-700 mt-1">{p.description}</p>
              <span className="text-indigo-600 text-sm mt-2 inline-block">Read more →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogsIndex;
