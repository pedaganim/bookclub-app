import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProfileEdit from './pages/ProfileEdit';
import BookLibrary from './pages/BookLibrary';
import About from './pages/About';
import Clubs from './pages/Clubs';

function App() {
  return (
    <Router>
      <NotificationProvider>
        <AuthProvider>
          <div className="App">
            <Navbar />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 min-h-screen bg-gray-50">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Navigate to="/login" replace />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/library" element={<BookLibrary />} />
                  <Route
                    path="/clubs"
                    element={
                      <ProtectedRoute>
                        <Clubs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Home />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-books"
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
              </main>
            </div>
          </div>
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
