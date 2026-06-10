import React from 'react';
import Home from './pages/Home';
import { ThemeProvider } from './context/ThemeContext';
import './portfolio.css';

const LandingPage: React.FC = () => {
  React.useEffect(() => {
    sessionStorage.setItem('fromApp', 'false');
  }, []);

  return (
    <ThemeProvider>
      <div className="portfolio-wrapper">
        <Home />
      </div>
    </ThemeProvider>
  );
};

export default LandingPage;
