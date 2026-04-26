import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CreatePath from './components/CreatePath';
import PathDetail from './components/PathDetail';
import StudySession from './components/StudySession';
import Settings from './components/Settings';
import { AppProvider } from './context/Store';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreatePath />} />
            <Route path="/path/:id" element={<PathDetail />} />
            <Route path="/study/:pathId/:phaseId/:moduleId" element={<StudySession />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
