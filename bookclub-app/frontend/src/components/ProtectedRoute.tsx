import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // If we're on a subdomain, redirect to the main domain's login page
      // This ensures PKCE verifiers are saved on the main domain which matches the callback URL.
      const mainDomainLogin = `${config.apiBaseUrl.replace('api.', '')}/login`;
      const currentUrl = window.location.origin;
      
      if (!mainDomainLogin.includes(currentUrl)) {
        window.location.href = mainDomainLogin;
      }
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the content.
  // If not authenticated, we either show a local redirect (if already on main domain)
  // or wait for the useEffect above to handle the external redirect.
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Only use local Navigate if we are already on the main domain
  const mainDomainLogin = `${config.apiBaseUrl.replace('api.', '')}/login`;
  const currentUrl = window.location.origin;
  if (mainDomainLogin.includes(currentUrl)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Otherwise, return null while the useEffect redirect happens
  return null;
};

export default ProtectedRoute;
