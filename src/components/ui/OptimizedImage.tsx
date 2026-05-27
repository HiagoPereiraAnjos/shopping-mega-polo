import React from 'react';
import { ImageWithFallback } from './ImageWithFallback';

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackClassName?: string;
  aspectRatio?: string;
  loading?: 'eager' | 'lazy';
  width?: number;
  height?: number;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackClassName = '',
  aspectRatio,
  loading = 'lazy',
  width,
  height,
  sizes,
}: OptimizedImageProps) {
  return (
    <div
      className={containerClassName}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <ImageWithFallback
        src={src}
        alt={alt}
        className={`w-full h-full ${className}`}
        fallbackClassName={fallbackClassName}
        loading={loading}
        width={width}
        height={height}
        sizes={sizes}
      />
    </div>
  );
}
