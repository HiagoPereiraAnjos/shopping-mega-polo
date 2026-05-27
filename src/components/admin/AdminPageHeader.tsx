import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}

export default function AdminPageHeader({
  title,
  description,
  actions,
  eyebrow = 'CMS Mega Polo Moda',
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 md:gap-6 mb-6 md:mb-8">
      <div className="space-y-2">
        <p className="text-[11px] tracking-brand font-bold text-brand-dark/50 uppercase">{eyebrow}</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold">{title}</h1>
        {description && <p className="text-sm md:text-base text-brand-dark/70 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
