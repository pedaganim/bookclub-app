import React from 'react';
import { Navigate } from 'react-router-dom';

const Register: React.FC = () => {
  // Registration is no longer available - redirect to login
  return <Navigate to="/login" replace />;
};

export default Register;
