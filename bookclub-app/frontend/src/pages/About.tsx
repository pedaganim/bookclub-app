import React, { useState } from 'react';

const About: React.FC = () => {
  const [tab, setTab] = useState<'original' | 'sqs'>('original');
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
          <p className="text-gray-700">
            Book Club is a serverless web application that helps readers discover and manage books with a simple, modern interface.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setTab('original')}
            className={`px-4 py-2 text-sm font-medium rounded-t-md ${tab === 'original' ? 'bg-white border border-b-0 border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            aria-pressed={tab === 'original'}
          >
            Original Architecture
          </button>
          <button
            onClick={() => setTab('sqs')}
            className={`px-4 py-2 text-sm font-medium rounded-t-md ${tab === 'sqs' ? 'bg-white border border-b-0 border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            aria-pressed={tab === 'sqs'}
          >
            SQS-driven Analyzer
          </button>
        </div>

        {tab === 'original' && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">Architecture</h2>
            <p className="text-gray-700">
              Our architecture leverages AWS managed services for scalability and low operational overhead. Below is a high-level overview of the data flow involving
              API Gateway, AWS Lambda, Amazon DynamoDB, Amazon S3, and Amazon Textract.
            </p>
            <div className="bg-white border rounded-lg p-4">
              <img
                src="/architecture.svg"
                alt="System Architecture Diagram"
                className="w-full h-auto"
              />
            </div>
          </section>
        )}

        {tab === 'sqs' && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">New Flow: SQS-driven Bedrock Analyzer</h2>
            <p className="text-gray-700">
              We introduced an SQS-driven worker to smooth out bursts when analyzing book covers with Amazon Bedrock (Claude). This improves reliability and reduces
              throttling. The diagram below highlights the new components (SQS queue, DLQ, and worker Lambda) and their interactions.
            </p>
            <div className="bg-white border rounded-lg p-4">
              <img
                src="/architecture-sqs.svg"
                alt="SQS-driven Bedrock Analyzer Architecture"
                className="w-full h-auto"
              />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">Links</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>
              GitHub: <a className="text-indigo-600 hover:text-indigo-800 underline" href="https://github.com/pedaganim/bookclub-app" target="_blank" rel="noreferrer">https://github.com/pedaganim/bookclub-app</a>
            </li>
            <li>
              For new Feature Requests: please open an issue on our <a className="text-indigo-600 hover:text-indigo-800 underline" href="https://github.com/pedaganim/bookclub-app/issues/new/choose" target="_blank" rel="noreferrer">GitHub Issues</a> page.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default About;
