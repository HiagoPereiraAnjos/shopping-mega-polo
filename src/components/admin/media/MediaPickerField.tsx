import React, { useId, useMemo, useState } from 'react';
import { Eraser, File, FileImage, FileText, Library } from 'lucide-react';
import { ImageWithFallback } from '../../ui/ImageWithFallback';
import type { MediaBucket } from '../../../services/media.service';
import MediaPicker from './MediaPicker';
import {
  inferMediaTypeByUrl,
  type MediaPickerSelection,
  type MediaPickerTypeFilter,
} from './mediaPicker.utils';

interface MediaPickerFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowedBuckets?: MediaBucket[];
  initialBucket?: MediaBucket;
  initialPath?: string;
  typeFilter?: MediaPickerTypeFilter;
  pickerTitle?: string;
  pickerDescription?: string;
  showPreview?: boolean;
  previewAlt?: string;
  onSelectionChange?: (selection: MediaPickerSelection | null) => void;
}

const defaultInputClassName =
  'w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15';

export default function MediaPickerField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  allowedBuckets,
  initialBucket,
  initialPath,
  typeFilter = 'all',
  pickerTitle,
  pickerDescription,
  showPreview = false,
  previewAlt = 'Preview do arquivo selecionado',
  onSelectionChange,
}: MediaPickerFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const normalizedValue = value.trim();
  const selectedType = useMemo(() => inferMediaTypeByUrl(normalizedValue), [normalizedValue]);

  const clearValue = () => {
    onChange('');
    onSelectionChange?.(null);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
        {label}
      </label>

      <div className="space-y-2">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${defaultInputClassName} disabled:bg-brand-paper/40`}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/20 text-sm font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Library className="w-4 h-4" />
            Selecionar da biblioteca
          </button>

          {normalizedValue && (
            <button
              type="button"
              onClick={clearValue}
              disabled={disabled}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/20 text-sm font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eraser className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {showPreview && normalizedValue && (
        <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/40 p-3">
          {selectedType === 'image' ? (
            <div className="h-36 overflow-hidden rounded-lg border border-brand-dark/10 bg-white">
              <ImageWithFallback
                src={normalizedValue}
                alt={previewAlt}
                className="w-full h-full object-cover"
                loading="lazy"
                width={420}
                height={240}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-brand-dark/70">
              {selectedType === 'pdf' ? (
                <FileText className="w-4 h-4 text-brand-red" />
              ) : selectedType === 'document' ? (
                <File className="w-4 h-4 text-brand-dark/70" />
              ) : (
                <FileImage className="w-4 h-4 text-brand-dark/70" />
              )}
              <span className="break-all">{normalizedValue}</span>
            </div>
          )}
        </div>
      )}

      {isPickerOpen && (
        <MediaPicker
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(selection) => {
            onChange(selection.url);
            onSelectionChange?.(selection);
          }}
          allowedBuckets={allowedBuckets}
          initialBucket={initialBucket}
          initialPath={initialPath}
          initialTypeFilter={typeFilter}
          title={pickerTitle}
          description={pickerDescription}
        />
      )}
    </div>
  );
}
