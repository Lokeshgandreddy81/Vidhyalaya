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
  { hasError: boolean; message: string; stack: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', stack: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || 'Unexpected error',
      stack: error.stack || '',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AppErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center font-sans">
          <div className="max-w-xl w-full bg-white p-8 rounded-2xl border border-slate-200/85 shadow-xl space-y-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">Cortex hit a rendering error</h1>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{this.state.message}</p>
            </div>
            {this.state.stack && (
              <div className="p-4 rounded-xl bg-slate-950 text-left font-mono text-[11px] text-rose-400 overflow-auto max-h-48 custom-scrollbar border border-slate-900 shadow-inner whitespace-pre-wrap break-all">
                {this.state.stack}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#4e5bff] hover:bg-[#3c49e2] text-white text-sm font-semibold shadow-md transition-colors cursor-pointer"
              >
                Reload App
              </button>
            </div>
          </div>
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