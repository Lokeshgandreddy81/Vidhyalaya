import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { GraduationCap, Plus, BookOpen } from 'lucide-react';

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white p-10">
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
        <GraduationCap size={40} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-indigo-950 mb-2">Courses</h2>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-md">
        This page is being redesigned. You have {paths.length} course{paths.length !== 1 ? 's' : ''} in your library.
      </p>
      <button
        onClick={() => navigate('/create')}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors active:scale-95"
      >
        <Plus size={18} />
        Create New Course
      </button>
    </div>
  );
};

export default Courses;
