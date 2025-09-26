import React from 'react';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
          <p className="text-gray-700">
            Book Club is a serverless web application that helps readers discover and manage books with a simple, modern interface.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Architecture</h2>
          <p className="text-gray-700">
            Our architecture leverages AWS managed services for scalability and low operational overhead. Below is a high-level overview of the data flow involving
            API Gateway, AWS Lambda, Amazon DynamoDB, Amazon S3, and Amazon Textract.
          </p>
          <p className="text-gray-700">
            The flow also integrates intelligence layers:
            <span className="font-medium"> Strands Agent</span> orchestrates cover analysis requests and downstream enrichments, and an
            <span className="font-medium"> MCP Server</span> exposes tooling/interfaces (OCR, catalog search, labeling) that the agent and services can call during enrichment.
          </p>
          <div className="bg-white border rounded-lg p-4">
            <img
              src="/architecture.svg"
              alt="System Architecture Diagram"
              className="w-full h-auto"
            />
          </div>
          <ul className="list-disc list-inside text-gray-700">
            <li><span className="font-semibold">MCP Server</span>: Provides standardized tool endpoints (OCR, metadata lookup, classification) consumed by enrichment services.</li>
            <li><span className="font-semibold">Strands Agent</span>: Coordinates analysis steps, chooses tools, and feeds results back into the book record.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">New Flow: SQS-driven Bedrock Analyzer</h2>
          <p className="text-gray-700">
            We introduced an SQS-driven worker to smooth out bursts when analyzing book covers with Amazon Bedrock (Claude). This improves reliability and reduces
            throttling. The diagram below highlights the new components (SQS queue, DLQ, and worker Lambda) and their interactions.
          </p>
          <p className="text-gray-700">
            In this flow, the <span className="font-medium">Strands Agent</span> runs within the analyzer worker and may call the <span className="font-medium">MCP Server</span>
            for specialized tasks (e.g., OCR fallback, catalog reconciliation). Results are written to the book’s <code className="px-1 py-0.5 bg-gray-100 rounded">advancedMetadata</code>
            field and normalized into top-level columns (title, author, ISBN, etc.).
          </p>
          <div className="bg-white border rounded-lg p-4">
            <img
              src="/architecture-sqs.svg"
              alt="SQS-driven Bedrock Analyzer Architecture"
              className="w-full h-auto"
            />
          </div>
          <ul className="list-disc list-inside text-gray-700">
            <li><span className="font-semibold">Queue</span>: buffers cover analysis jobs.</li>
            <li><span className="font-semibold">Analyzer Worker</span>: executes Bedrock vision inference; embeds the Strands Agent decision loop.</li>
            <li><span className="font-semibold">MCP Server</span>: pluggable tool endpoints the agent can invoke for OCR, metadata fusion, categorization.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">Components Glossary</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><span className="font-semibold">MCP Server</span>: A Model Context Protocol server exposing tools (e.g., OCR, search, labeling) via a consistent API for agents and services.</li>
            <li><span className="font-semibold">Strands Agent</span>: An orchestration layer that selects tools, interprets outputs, and assembles enriched book metadata.</li>
          </ul>
        </section>

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
