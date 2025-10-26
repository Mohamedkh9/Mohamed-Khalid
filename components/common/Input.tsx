import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        className="w-full px-4 py-2 bg-slate-200/50 dark:bg-slate-800/70 border border-slate-300/70 dark:border-slate-700/80 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/80 focus:border-brand-500 transition duration-200"
        {...props}
      />
    </div>
  );
};