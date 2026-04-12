import React from 'react';
import SEO from '../components/SEO';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO 
        title="Terms of Service"
        description="Read our terms of service to understand the rules, guidelines, and user responsibilities for using the Community Library platform."
      />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 underline decoration-indigo-500 decoration-4 underline-offset-8">Terms of Service</h1>
        
        <div className="prose prose-indigo max-w-none text-gray-600 space-y-10">
          <p className="text-sm italic">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">1</span>
              Acceptance of Terms
            </h2>
            <p className="leading-relaxed">
              By accessing or using our services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">2</span>
              Platform as a Facilitator
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
              <p className="text-blue-800 font-medium">
                Community Library is a neutral facilitation platform only.
              </p>
              <p className="mt-2 text-blue-700 text-sm">
                We provide the digital infrastructure to allow users to list and discover items for exchange. We do not own, sell, resell, provide, control, manage, offer, or deliver any items listed on the platform.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-600 text-sm font-bold">3</span>
              Limitation of Liability & Items
            </h2>
            <div className="bg-red-50 border border-red-100 p-6 rounded-xl space-y-4">
              <p className="text-red-900 font-bold uppercase tracking-tight text-sm">Crucial Disclaimer:</p>
              <p className="text-red-800 leading-relaxed">
                WE ARE NOT RESPONSIBLE FOR THE ITEMS EXCHANGED. We make no representations or warranties, express or implied, regarding the condition, safety, legality, quality, or authenticity of any items listed or exchanged through the platform. 
              </p>
              <p className="text-red-800 leading-relaxed">
                Any exchange of items is strictly between the users involved. We are NOT liable for any loss, damage, injury, or legal issue arising from your use of the platform to facilitate these transactions.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">4</span>
              User Interactions & Safety
            </h2>
            <p className="leading-relaxed">
              Users are solely responsible for their interactions with other members of the community. You agree to take all necessary precautions when meeting other individuals for item exchanges. You assume ALL risk associated with your use of the platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">5</span>
              Indemnification
            </h2>
            <p className="leading-relaxed text-sm">
              You agree to release, defend, indemnify, and hold Community Library and its affiliates harmless from and against any claims, liabilities, damages, losses, and expenses, including without limitation, reasonable legal and accounting fees, arising out of or in any way connected with your access to or use of the service or your violation of these Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
