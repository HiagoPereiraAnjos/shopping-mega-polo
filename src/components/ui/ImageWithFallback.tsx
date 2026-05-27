import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

type ImageLoading = 'eager' | 'lazy';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loading?: ImageLoading;
  decoding?: 'sync' | 'async' | 'auto';
  referrerPolicy?: React.ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  sizes?: string;
  width?: number;
  height?: number;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  loading = 'lazy',
  decoding = 'async',
  referrerPolicy = 'no-referrer',
  sizes,
  width,
  height,
  onClick,
}: ImageWithFallbackProps) {
  const normalizedSrc = typeof src === 'string' ? src.trim() : '';
  const invalidSrc =
    !normalizedSrc ||
    normalizedSrc.toLowerCase() === 'undefined' ||
    normalizedSrc.toLowerCase() === 'null';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = invalidSrc || failedSrc === normalizedSrc;

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full bg-gradient-to-br from-brand-paper via-brand-paper to-brand-dark/10 flex flex-col items-center justify-center gap-2 text-brand-dark/45 ${className} ${fallbackClassName}`}
      >
        <ImageIcon className="w-8 h-8 opacity-60" />
        <span className="text-[10px] tracking-brand font-bold uppercase">Imagem em breve</span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      sizes={sizes}
      width={width}
      height={height}
      onClick={onClick}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}
