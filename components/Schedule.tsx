import React from 'react';
import { CalendarDays } from 'lucide-react';

const Schedule: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white p-10">
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
        <CalendarDays size={40} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-indigo-950 mb-2">Schedule</h2>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-md">
        This page is being redesigned. Your study schedule and calendar will appear here.
      </p>
    </div>
  );
};

export default Schedule;
