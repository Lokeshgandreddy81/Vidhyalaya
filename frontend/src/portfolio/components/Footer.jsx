import React from 'react';
import siteConfig from '../config/siteConfig';

const Footer = () => {
  return (
    <footer className="py-12 px-8 border-t border-[#222]">
      <div className="max-w-[1200px] mx-auto text-center text-sm text-[#666]">
        <p className="mb-2">
          {siteConfig.footer.text}{' '}
          <a 
            href={siteConfig.github}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#999] hover:text-[#e8e8e8] transition-colors underline"
          >
            {siteConfig.footer.linkText}
          </a>
        </p>
        <p>
          {siteConfig.footer.copyright}
        </p>
      </div>
    </footer>
  );
};

export default Footer;