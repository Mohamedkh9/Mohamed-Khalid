import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600 focus:ring-brand-500 shadow-lg shadow-brand-500/20',
    secondary: 'bg-slate-500/10 dark:bg-slate-400/10 text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 dark:hover:bg-slate-400/20 focus:ring-brand-500 border border-slate-500/10 dark:border-slate-400/10',
    tertiary: 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 dark:hover:bg-slate-400/10 focus:ring-brand-500 border border-slate-300 dark:border-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const fullWidthClass = fullWidth ? 'w-full' : '';

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidthClass} ${className}`;

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};