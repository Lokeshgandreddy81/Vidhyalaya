import React from 'react';

const Footer = () => {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-semibold text-zinc-300 tracking-tight">
            vidhyal.ai
          </span>
          <span className="text-[12px] text-zinc-600 mono">
            © {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {['Privacy', 'Terms', 'Status'].map(item => (
            <span key={item} className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer mono">
              {item}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;