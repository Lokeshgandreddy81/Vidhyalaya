import React from 'react';
import Resume from './pages/Resume';
import { ThemeProvider } from './context/ThemeContext';
import './theme.css';

const ResumePage: React.FC = () => {
  return (
    <ThemeProvider>
      <Resume />
    </ThemeProvider>
  );
};

export default ResumePage;
