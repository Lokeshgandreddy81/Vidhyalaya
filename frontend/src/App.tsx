import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Courses from './components/Courses';
import Library from './components/Library';
import CreatePath from './components/CreatePath';
import PathDetail from './components/PathDetail';
import StudySession from './components/StudySession';
import Settings from './components/Settings';
import Schedule from './components/Schedule';
import PathExplorer from './components/PathExplorer';
import SmartStudy from './components/SmartStudy';
import { AppProvider } from './context/Store';
import { Toaster } from 'sonner';

import ExamMode from './components/ExamMode';

import LandingPage from './portfolio/LandingPage';
import ResumePage from './portfolio/ResumePage';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Toaster position="top-right" richColors closeButton />
      <Router>
        <Routes>
          {/* Public Portfolio Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/resume" element={<ResumePage />} />

          {/* Protected/App Routes with Layout */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/create" element={<CreatePath />} />
                  <Route path="/explore" element={<PathExplorer />} />
                  <Route path="/path/:id" element={<PathDetail />} />
                  <Route path="/study/:pathId/:phaseId/:moduleId" element={<StudySession />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/exam" element={<ExamMode />} />
                  <Route path="/smart-study" element={<SmartStudy />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
