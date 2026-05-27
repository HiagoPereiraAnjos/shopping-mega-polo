import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type AdminFormModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface AdminFormModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  size?: AdminFormModalSize;
  footer?: React.ReactNode;
}

const sizeClassName: Record<AdminFormModalSize, string> = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export default function AdminFormModal({
  open,
  title,
  description,
  children,
  onClose,
  onSubmit,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  isSubmitting = false,
  submitDisabled = false,
  size = 'md',
  footer,
}: AdminFormModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 md:py-10">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-brand-dark/50"
        aria-label="Fechar modal"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${sizeClassName[size]} bg-white rounded-2xl border border-brand-dark/10 shadow-2xl flex flex-col max-h-[90vh]`}
      >
        <header className="flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-brand-dark/10">
          <div className="space-y-1">
            <h2 className="text-xl font-serif font-semibold">{title}</h2>
            {description && <p className="text-sm text-brand-dark/70 leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-brand-dark/60 hover:text-brand-dark hover:bg-brand-paper transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 md:px-6 py-5">{children}</div>

        <footer className="border-t border-brand-dark/10 px-5 md:px-6 py-4 flex items-center justify-end gap-2">
          {footer ?? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || submitDisabled}
                className="px-4 py-2 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : submitLabel}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
