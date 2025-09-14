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
          <div className="bg-white border rounded-lg p-4">
            <img
              src="/architecture.svg"
              alt="System Architecture Diagram"
              className="w-full h-auto"
            />
          </div>
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
