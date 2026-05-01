import React from 'react';
import { useAppStore } from '../context/Store';
import { BookOpen } from 'lucide-react';

const Library: React.FC = () => {
  const { paths } = useAppStore();

  const totalModules = paths.reduce((acc, p) => acc + (p.phases || []).reduce((a, ph) => a + (ph.modules || []).length, 0), 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white p-10">
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
        <BookOpen size={40} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-indigo-950 mb-2">Library</h2>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-md">
        This page is being redesigned. You have {totalModules} module{totalModules !== 1 ? 's' : ''} across all your courses.
      </p>
    </div>
  );
};

export default Library;
