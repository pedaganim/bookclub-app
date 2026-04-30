import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src={`${process.env.PUBLIC_URL || ''}/logo.png`}
              alt="Community Library"
              className="h-6 w-auto opacity-50 grayscale"
            />
            <span className="text-sm text-gray-400 font-medium">
              &copy; {new Date().getFullYear()} Community Library
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/privacy" 
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              to="/contact" 
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
