import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { UploadModalProvider, useUploadModal, GENERIC_UPLOAD_CONFIG } from './contexts/UploadModalContext';
import CreateListingModal from './components/CreateListingModal';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProfileEdit from './pages/ProfileEdit';
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
import ContactPage from './pages/ContactPage';
import NotificationSettings from './pages/NotificationSettings';
import LibraryHub from './pages/LibraryHub';
import LibraryPage from './pages/LibraryPage';
import MyLibraryHub from './pages/MyLibraryHub';
import MyItemsPage from './pages/MyItemsPage';
import ClubRequests from './pages/ClubRequests';
import ClubMembers from './pages/ClubMembers';
import ClubBooks from './pages/ClubBooks';
import { LIBRARY_CONFIGS } from './config/libraryConfig';
import { useSubdomain } from './hooks/useSubdomain';

function GlobalUploadModal() {
  const { isOpen, closeModal } = useUploadModal();
  if (!isOpen) return null;
  return <CreateListingModal config={GENERIC_UPLOAD_CONFIG} onClose={closeModal} onCreated={() => {}} />;
}

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
          <UploadModalProvider>
          <div className="App">
            <GlobalUploadModal />
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
                
                {/* Unified Management Routes */}
                <Route
                  path="/my-library"
                  element={
                    <ProtectedRoute>
                      <MyLibraryHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-library/:categorySlug"
                  element={
                    <ProtectedRoute>
                      <MyItemsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-lost-and-found"
                  element={
                    <ProtectedRoute>
                      <MyItemsPage categorySlugOverride="lost-found" />
                    </ProtectedRoute>
                  }
                />

                {/* Legacy & Backward Compatibility Redirects */}
                <Route path="/library/books" element={<Navigate to="/library/books" replace />} /> {/* Handled by dynamice loop above, but explicit for clarity */}
                <Route path="/my-books" element={<Navigate to="/my-library/books" replace />} />
                <Route path="/libraries" element={<Navigate to="/library" replace />} />
                <Route path="/libraries/*" element={<Navigate to="/library" replace />} />

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
                  path="/clubs/:clubId/members"
                  element={
                    <ProtectedRoute>
                      <ClubMembers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clubs/:clubId/explore"
                  element={<ClubBooks />}
                />
                <Route
                  path="/my-books"
                  element={<Navigate to="/my-library/books" replace />}
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
                <Route path="/contact" element={<ContactPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
          </UploadModalProvider>
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
