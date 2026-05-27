import { Upload } from 'lucide-react';
import AdminFormSection from '../../../components/admin/AdminFormSection';
import MediaPickerField from '../../../components/admin/media/MediaPickerField';
import type { SetStoreFormState, StoreFormState } from './storeAdmin.types';

interface StoreMediaFieldsProps {
  form: StoreFormState;
  setForm: SetStoreFormState;
  isUploadingLogo: boolean;
  isUploadingBanner: boolean;
  onUploadLogo: (file: File) => Promise<void> | void;
  onUploadBanner: (file: File) => Promise<void> | void;
}

export default function StoreMediaFields({
  form,
  setForm,
  isUploadingLogo,
  isUploadingBanner,
  onUploadLogo,
  onUploadBanner,
}: StoreMediaFieldsProps) {
  return (
    <AdminFormSection title="Imagens">
      <div className="space-y-2">
        <MediaPickerField
          id="store-logo-url"
          label="URL da logo"
          value={form.logo_url}
          onChange={(value) => setForm((prev) => ({ ...prev, logo_url: value }))}
          placeholder="https://..."
          allowedBuckets={['logos', 'stores', 'institutional']}
          initialBucket="logos"
          typeFilter="image"
          showPreview
          previewAlt={`Logo da loja ${form.name || 'selecionada'}`}
          pickerTitle="Selecionar logo da loja"
          pickerDescription="Escolha uma imagem da biblioteca para usar como logo da loja."
        />
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
          <Upload className="w-4 h-4" />
          {isUploadingLogo ? 'Enviando logo...' : 'Upload logo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUploadLogo(file);
              }
            }}
          />
        </label>
      </div>

      <div className="space-y-2">
        <MediaPickerField
          id="store-banner-url"
          label="URL do banner"
          value={form.banner_url}
          onChange={(value) => setForm((prev) => ({ ...prev, banner_url: value }))}
          placeholder="https://..."
          allowedBuckets={['banners', 'stores', 'pages', 'institutional']}
          initialBucket="banners"
          typeFilter="image"
          showPreview
          previewAlt={`Banner da loja ${form.name || 'selecionada'}`}
          pickerTitle="Selecionar banner da loja"
          pickerDescription="Escolha uma imagem da biblioteca para usar como capa da loja."
        />
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
          <Upload className="w-4 h-4" />
          {isUploadingBanner ? 'Enviando banner...' : 'Upload banner'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUploadBanner(file);
              }
            }}
          />
        </label>
      </div>
    </AdminFormSection>
  );
}
