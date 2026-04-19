import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProfileEdit from './pages/ProfileEdit';
import BookLibrary from './pages/BookLibrary';
import About from './pages/About';
import BlogsIndex from './pages/blogs/BlogsIndex';
import BlogPost from './pages/blogs/BlogPost';
import BookDetails from './pages/BookDetails';
import AddBook from './pages/AddBook';
import EditBook from './pages/EditBook';
import Clubs from './pages/Clubs';
import BrowseClubs from './pages/BrowseClubs';
import Messages from './pages/Messages';
import UserProfile from './pages/UserProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import NotificationSettings from './pages/NotificationSettings';
import LibraryHub from './pages/LibraryHub';
import LibraryPage from './pages/LibraryPage';
import ClubRequests from './pages/ClubRequests';
import ClubBooks from './pages/ClubBooks';
import { LIBRARY_CONFIGS } from './config/libraryConfig';
import { useSubdomain } from './hooks/useSubdomain';

function App() {
  const { isSubdomain, isLoading } = useSubdomain();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <NotificationProvider>
        <AuthProvider>
          <div className="App">
            <Navbar />
            <main className="min-h-screen bg-gray-50 pb-20 md:pb-0">
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Navigate to="/login" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/about/blogs" element={<BlogsIndex />} />
                <Route path="/about/blogs/:slug" element={<BlogPost />} />
                <Route path="/library" element={<LibraryHub />} />
                {LIBRARY_CONFIGS.map((cfg) => (
                  <Route
                    key={cfg.slug}
                    path={`/library/${cfg.slug}`}
                    element={<LibraryPage config={cfg} />}
                  />
                ))}
                <Route path="/library/books" element={<BookLibrary />} />
                {/* Legacy redirects */}
                <Route path="/libraries" element={<Navigate to="/library" replace />} />
                <Route path="/libraries/*" element={<Navigate to="/library" replace />} />
                <Route path="/swap-toys" element={<Navigate to="/library/toys" replace />} />
                <Route
                  path="/books/:bookId"
                  element={<BookDetails />}
                />
                <Route
                  path="/books/new"
                  element={
                    <ProtectedRoute>
                      <AddBook />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/books/:bookId/edit"
                  element={
                    <ProtectedRoute>
                      <EditBook />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages/:conversationId"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/:userId"
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />
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
                  element={<Navigate to={isSubdomain ? "/library/books" : "/library"} replace />}
                />
                <Route
                  path="/clubs/browse"
                  element={<BrowseClubs />}
                />
                <Route
                  path="/clubs/:clubId/requests"
                  element={
                    <ProtectedRoute>
                      <ClubRequests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clubs/:clubId/explore"
                  element={<ClubBooks />}
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
                <Route
                  path="/settings/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationSettings />
                    </ProtectedRoute>
                  }
                />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
