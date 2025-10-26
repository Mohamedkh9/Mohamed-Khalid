import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, ...props }) => {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <select
        className="w-full pl-4 pr-10 py-2 bg-slate-200/50 dark:bg-slate-800/70 border border-slate-300/70 dark:border-slate-700/80 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/80 focus:border-brand-500 transition duration-200 appearance-none"
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 top-7 flex items-center px-3 text-slate-400">
        <i className="fa-solid fa-chevron-down text-xs"></i>
      </div>
    </div>
  );
};