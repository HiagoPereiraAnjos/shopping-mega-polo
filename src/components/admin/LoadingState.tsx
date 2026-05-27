import React from 'react';
import AdminLoadingState from './AdminLoadingState';

interface LoadingStateProps {
  label?: string;
}

export default function LoadingState(props: LoadingStateProps) {
  return <AdminLoadingState {...props} />;
}
