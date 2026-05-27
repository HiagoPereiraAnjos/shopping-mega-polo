import React from 'react';
import type { LucideIcon } from 'lucide-react';
import AdminEmptyState from './AdminEmptyState';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export default function EmptyState(props: EmptyStateProps) {
  return <AdminEmptyState {...props} />;
}
