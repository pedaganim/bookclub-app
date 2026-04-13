import React from 'react';
import SEO from '../components/SEO';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title="About Us"
        description="A collaborative platform for kids and parents to share books within their trusted circles like society, friends, and communities."
      />
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
          <p className="text-gray-700">
            Book Club is a collaborative platform designed for kids and parents to share books within their close-knit circles — such as societies, friends, neighbors, and people with similar interests.
          </p>
          <p className="text-gray-700">
            The goal is to build a trusted community where books can be discovered, exchanged, and enjoyed without the need for large public marketplaces.
          </p>
          <p>
            <a href="/about/blogs" className="inline-block mt-2 text-indigo-600 hover:text-indigo-800 underline">
              Read our Blogs →
            </a>
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">Vision</h2>
          <p className="text-gray-700">
            We believe learning grows best in communities. By enabling local sharing among trusted groups, we aim to encourage reading habits in kids while strengthening community connections.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;