import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PageLayout } from './components/layout/PageLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRoute } from './components/auth/RoleRoute';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { StationsPage } from './pages/StationsPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import { ExpeditionsListPage } from './pages/ExpeditionsListPage';
import { ExpeditionDetailPage } from './pages/ExpeditionDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

// User Pages
import { BookmarksPage } from './pages/BookmarksPage';

// Scientist Pages
import { ScientistDashboardPage } from './pages/ScientistDashboardPage';
import { ScientistApplyPage } from './pages/ScientistApplyPage';
import { ScientistUploadPage } from './pages/ScientistUploadPage';
import { ScientistSubmissionsPage } from './pages/ScientistSubmissionsPage';
import { OutreachStudioPage } from './pages/OutreachStudioPage';

// Admin Pages
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminScientistsPage } from './pages/AdminScientistsPage';
import { AdminContentPage } from './pages/AdminContentPage';

// 404
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Main Layout wrapper */}
          <Route element={<PageLayout />}>
            
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/stations" element={<StationsPage />} />
            <Route path="/expeditions" element={<ExpeditionsListPage />} />
            <Route path="/expeditions/:slug" element={<ExpeditionDetailPage />} />
            <Route path="/content/:id" element={<ContentDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* PROTECTED USER ROUTES */}
            <Route element={<ProtectedRoute />}>
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/scientist/apply" element={<ScientistApplyPage />} />
            </Route>

            {/* PROTECTED SCIENTIST & ADMIN ROUTES */}
            <Route element={<RoleRoute allowedRoles={['SCIENTIST', 'ADMIN']} />}>
              <Route path="/scientist/dashboard" element={<ScientistDashboardPage />} />
              <Route path="/scientist/upload" element={<ScientistUploadPage />} />
              <Route path="/scientist/submissions" element={<ScientistSubmissionsPage />} />
            </Route>

            {/* PROTECTED SCIENTIST ONLY ROUTES */}
            <Route element={<RoleRoute allowedRoles={['SCIENTIST']} />}>
              <Route path="/outreach" element={<OutreachStudioPage />} />
              <Route path="/outreach/:contentId" element={<OutreachStudioPage />} />
            </Route>

            {/* PROTECTED ADMIN ONLY ROUTES */}
            <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/scientists" element={<AdminScientistsPage />} />
              <Route path="/admin/content" element={<AdminContentPage />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
