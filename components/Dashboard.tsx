import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { Plus, FileCheck } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white p-6 gap-4">
      <button
        onClick={() => navigate('/create')}
        className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-indigo-700 transition-colors active:scale-95 shadow-sm w-64"
      >
        <Plus size={16} strokeWidth={2.5} />
        Create New Course
      </button>
      <button
        onClick={() => navigate('/exam')}
        className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-[#000666] px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-slate-50 hover:border-indigo-200 transition-colors shadow-sm w-64"
      >
        <FileCheck size={16} strokeWidth={2.5} />
        Exam Mode
      </button>
    </div>
  );
};

export default Dashboard;
