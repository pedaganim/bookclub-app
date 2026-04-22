import React from 'react';
import SEO from '../components/SEO';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title="About Us"
        description="Learn about the Community Library project, our mission to simplify book discovery, and the serverless architecture powering our sharing platform."
      />
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
          <p className="text-gray-700">
            Book Club is a serverless web application that helps readers discover and manage books with a simple, modern interface.
          </p>
          <p>
            <a href="/about/blogs" className="inline-block mt-2 text-indigo-600 hover:text-indigo-800 underline">
              Read our Blogs →
            </a>
          </p>
        </header>

        {/* Purpose & Community section replaces architecture and technical diagrams */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Purpose & Community</h2>
          <p className="text-gray-700">
            This website is built to enable people to share things and ideas with one another inside private, isolated communities where members can
            interact safely and respectfully. The core idea is simple: make it easy for people to share the books they've read and to borrow
            books, items, tools, and other resources from members of their community.
          </p>
          <p className="text-gray-700">
            Members can list items they're willing to lend or give away, request items they want to borrow, and connect with others in their community to
            arrange exchanges. Privacy and a sense of local community are central — sharing happens within defined groups rather than publicly.
          </p>
          <ul className="list-disc list-inside text-gray-700">
            <li><span className="font-semibold">Share books:</span> Tell others about titles you've enjoyed and make them available to borrow.</li>
            <li><span className="font-semibold">Borrow items & tools:</span> Find and borrow everyday items, tools, or special resources from other members.</li>
            <li><span className="font-semibold">Private communities:</span> Exchanges and conversations take place inside private groups to respect members' privacy.</li>
            <li><span className="font-semibold">Interaction:</span> Members can message, comment, and coordinate lending arrangements within the platform.</li>
          </ul>
        </section>

        {/* Keep a short FAQs or additional context section if helpful */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">How it works</h2>
          <p className="text-gray-700">
            To get started, join or create a community, add items you'd like to share, and browse items available from other members. When you find
            something you want, send a request and coordinate pickup or delivery privately with the lender.
          </p>
        </section>

      </div>
    </div>
  );
};

export default About;
