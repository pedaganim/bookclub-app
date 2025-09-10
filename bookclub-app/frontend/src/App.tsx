import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProfileEdit from './pages/ProfileEdit';

function App() {
  return (
    <Router>
      <NotificationProvider>
        <AuthProvider>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileEdit />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
