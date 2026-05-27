import React from 'react';

interface AdminFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function AdminFormSection({
  title,
  description,
  children,
  className,
}: AdminFormSectionProps) {
  return (
    <section className={`space-y-4 ${className ?? ''}`}>
      <header>
        <h3 className="text-lg font-serif font-semibold">{title}</h3>
        {description && <p className="text-sm text-brand-dark/70 mt-1">{description}</p>}
      </header>
      <div className="grid gap-4 md:gap-5">{children}</div>
    </section>
  );
}
