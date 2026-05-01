import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExamMode: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Top Nav Bar (mocked to keep the top nav bar as same) */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-[#000666]">Exam Mode</h1>
        </div>
      </header>

      {/* Plain Page Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-300 mb-2">Exam Environment</h2>
          <p className="text-slate-400">This is a plain page for exam mode.</p>
        </div>
      </div>
    </div>
  );
};

export default ExamMode;
