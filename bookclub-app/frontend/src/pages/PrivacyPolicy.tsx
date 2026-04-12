import React from 'react';
import SEO from '../components/SEO';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO 
        title="Privacy Policy"
        description="Read our privacy policy to understand how the Community Library handles your personal data and our commitment to protecting your privacy."
      />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 underline decoration-indigo-500 decoration-4 underline-offset-8">Privacy Policy</h1>
        
        <div className="prose prose-indigo max-w-none text-gray-600 space-y-10">
          <p className="text-sm italic">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">1</span>
              Information We Collect
            </h2>
            <p className="leading-relaxed">
              We collect information you provide directly to us when you create an account, such as your name, email address, profile information, and any content you post to the platform including book listings and messages.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">2</span>
              How We Use Your Information
            </h2>
            <p className="leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services, including facilitating book sharing, communication between members, and personalized community features.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-600 text-sm font-bold">3</span>
              Data Security Disclaimer
            </h2>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-xl space-y-4">
              <p className="text-amber-900 font-bold uppercase tracking-tight text-sm">Security Policy Disclosure:</p>
              <p className="text-amber-800 leading-relaxed">
                While we implement industry-standard security measures to protect your personal information, <span className="font-bold underline">WE DO NOT GUARANTEE THAT YOUR INFORMATION WILL NOT BE LEAKED</span> or accessed by unauthorized parties. No method of transmission over the internet or electronic storage is 100% secure.
              </p>
              <p className="text-amber-800 font-semibold leading-relaxed">
                By using this service, you acknowledge this inherent risk and agree that we are NOT liable for any damages resulting from data breaches, unauthorized access, or accidental data disclosure.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">4</span>
              Third-Party Services
            </h2>
            <p className="leading-relaxed">
              We use third-party providers (such as AWS and Google) to process data and host our services. Each of these providers has their own privacy policy and we recommend you review them. We are not responsible for the privacy practices of these third-party services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">5</span>
              Contact Us
            </h2>
            <p className="leading-relaxed text-sm">
              If you have any questions about this Privacy Policy or how your data is handled, please contact us through the community support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
