import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminPageHeader from './AdminPageHeader';

interface AdminBreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function BreadcrumbItem({ item, isLast }: { item: AdminBreadcrumbItem; isLast: boolean }) {
  if (!item.href || isLast) {
    return <span className={isLast ? 'text-brand-dark font-semibold' : 'text-brand-dark/60'}>{item.label}</span>;
  }

  return (
    <Link to={item.href} className="text-brand-dark/60 hover:text-brand-red transition-colors">
      {item.label}
    </Link>
  );
}

export default function AdminPageShell({
  title,
  description,
  eyebrow,
  breadcrumbs = [],
  actions,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={className ?? ''}>
      {breadcrumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1 text-xs" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`${item.label}-${index}`}>
                <BreadcrumbItem item={item} isLast={isLast} />
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-brand-dark/35" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <AdminPageHeader title={title} description={description} actions={actions} eyebrow={eyebrow} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
