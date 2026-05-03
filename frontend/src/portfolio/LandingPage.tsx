import React from 'react';
import Home from './pages/Home';
import { ThemeProvider } from './context/ThemeContext';
import './theme.css';
import './portfolio.css';

const LandingPage: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="portfolio-wrapper">
        <Home />
      </div>
    </ThemeProvider>
  );
};

export default LandingPage;
