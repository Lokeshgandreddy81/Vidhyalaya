import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Library from './pages/Library';
import CreatePath from './pages/CreatePath';
import PathDetail from './pages/PathDetail';
import StudySession, { StudySessionWithBoundary } from './pages/StudySession';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';
import PathExplorer from './pages/PathExplorer';
import SmartStudy from './pages/SmartStudy';
import SaraLayout from './components/SaraLayout';
import SaraHome from './pages/SaraHome';
import AdminDashboard from './pages/AdminDashboard';
import StudentVaultLogin from './pages/StudentVaultLogin';
import { AppProvider, useAppStore } from './context/Store';
import { FocusProvider } from './context/FocusContext';
import { Toaster } from 'sonner';
import ExamMode from './pages/ExamMode';
 
import AuthPage from './pages/AuthPage';
import ApiKeySetupPage from './pages/ApiKeySetupPage';
import OnboardingPage from './pages/OnboardingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import { hasConfiguredApiKey, refreshServerAiStatus } from './services/geminiService';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Cortex hit a rendering error</h1>
          <p className="text-sm text-slate-600 max-w-md mb-6">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-[#4e5bff] text-white text-sm font-semibold"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import LandingPage from './portfolio/LandingPage';
import ResumePage from './portfolio/ResumePage';
import Docs from './pages/Docs';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  const [serverReady, setServerReady] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if backend server has a key — used to show status banner in Dashboard
    // Does NOT block app access; AUTO mode uses the server key for all users
    void refreshServerAiStatus().then(ready => {
      setServerReady(ready);
      localStorage.setItem('vidyal_server_ai_ready', ready ? 'true' : 'false');
    }).catch(() => {
      setServerReady(false);
      localStorage.setItem('vidyal_server_ai_ready', 'false');
    });
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only show loading briefly on first cold start (server check still pending)
  if (serverReady === null && !localStorage.getItem('vidyal_server_ai_ready')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Preparing your workspace…
      </div>
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AppErrorBoundary>
    <AppProvider>
      <FocusProvider>
        <Toaster position="top-right" richColors closeButton />
        <Router>
          <Routes>
            {/* Public Portfolio Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/docs" element={<Docs />} />
            
            {/* Auth & Setup Routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/api-setup" element={<ApiKeySetupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forgot-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Protected/App Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    {/* SARA Ecosystem Routes */}
                    <Route path="/sara" element={<SaraLayout><SaraHome /></SaraLayout>} />
                    <Route path="/sara/vault/login" element={<StudentVaultLogin />} />
                    <Route path="/sara/vault" element={<SaraLayout><SmartStudy /></SaraLayout>} />

                    {/* Admin — standalone, no sidebar context */}
                    <Route path="/admin" element={<AdminDashboard />} />

                    {/* Cortex Main Routes */}
                    <Route
                      path="*"
                      element={
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
                            
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </Layout>
                      }
                    />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </FocusProvider>
    </AppProvider>
    </AppErrorBoundary>
  );
};

export default App;