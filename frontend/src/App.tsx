import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Courses from './components/Courses';
import Library from './components/Library';
import CreatePath from './components/CreatePath';
import PathDetail from './components/PathDetail';
import StudySession, { StudySessionWithBoundary } from './components/StudySession';
import Settings from './components/Settings';
import Schedule from './components/Schedule';
import PathExplorer from './components/PathExplorer';
import SmartStudy from './components/SmartStudy';
import DevRagTester from './components/DevRagTester';
import AdminDashboard from './pages/AdminDashboard';
import { AppProvider, useAppStore } from './context/Store';
import { FocusProvider } from './context/FocusContext';
import { Toaster } from 'sonner';

import ExamMode from './components/ExamMode';
import AuthPage from './components/AuthPage';
import ApiKeySetupPage from './components/ApiKeySetupPage';

import LandingPage from './portfolio/LandingPage';
import ResumePage from './portfolio/ResumePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  const hasCustomKey = localStorage.getItem('vidyal_custom_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow setting up API key without blocking setup page
  if (!hasCustomKey && window.location.hash !== '#/api-setup') {
    return <Navigate to="/api-setup" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <FocusProvider>
        <Toaster position="top-right" richColors closeButton />
        <Router>
          <Routes>
            {/* Public Portfolio Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/resume" element={<ResumePage />} />
            
            {/* Auth & Setup Routes (Teammate's Updates) */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/api-setup" element={<ApiKeySetupPage />} />

            {/* Protected/App Routes with Layout */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/courses" element={<Courses />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/create" element={<CreatePath />} />
                      <Route path="/explore" element={<PathExplorer />} />
                      <Route path="/path/:id" element={<PathDetail />} />
                      <Route path="/study/:pathId/:phaseId/:moduleId" element={<StudySessionWithBoundary />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/schedule" element={<Schedule />} />
                      <Route path="/exam" element={<ExamMode />} />
                      
                      {/* YOUR SARA MVP ROUTE */}
                      <Route path="/smart-study" element={<SmartStudy />} />
                      
                      {/* DEV RAG TESTER ROUTE */}
                      <Route path="/dev-rag" element={<DevRagTester />} />
                      
                      {/* ADMIN DASHBOARD */}
                      <Route path="/admin" element={<AdminDashboard />} />
                      
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </FocusProvider>
    </AppProvider>
  );
};

export default App;