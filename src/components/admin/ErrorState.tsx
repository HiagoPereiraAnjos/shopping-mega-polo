import React from 'react';
import AdminErrorState from './AdminErrorState';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorState(props: ErrorStateProps) {
  return <AdminErrorState {...props} />;
}
