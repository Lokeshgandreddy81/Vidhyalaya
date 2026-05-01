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
import { AppProvider } from './context/Store';

import ExamMode from './components/ExamMode';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/library" element={<Library />} />
            <Route path="/create" element={<CreatePath />} />
            <Route path="/path/:id" element={<PathDetail />} />
            <Route path="/study/:pathId/:phaseId/:moduleId" element={<StudySession />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/exam" element={<ExamMode />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
