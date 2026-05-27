import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  mask?: (value: string) => string;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, error, mask, onChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mask) {
      e.target.value = mask(e.target.value);
    }
    onChange?.(e);
  };

  return (
    <div className="space-y-3">
      <label className="text-[9px] tracking-brand font-bold text-brand-dark/40 uppercase pl-1">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/20" />
        )}
        <input 
          {...props}
          onChange={handleChange}
          className={`w-full bg-white border border-brand-dark/5 py-4 ${Icon ? 'pl-12' : 'px-4'} pr-4 rounded-md text-sm focus:outline-none focus:border-brand-red transition-colors shadow-soft ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && <span className="text-[10px] text-red-500 font-sans pl-1">{error}</span>}
    </div>
  );
};
