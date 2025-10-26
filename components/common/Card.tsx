import React from 'react';

interface CardProps {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, className }) => {
  return (
    <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-md ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 rounded-t-2xl flex items-center gap-3">
          {icon && <i className={`fa-solid ${icon} text-brand-500 text-lg`}></i>}
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};