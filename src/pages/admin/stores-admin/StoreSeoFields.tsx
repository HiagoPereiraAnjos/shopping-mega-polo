import AdminFormSection from '../../../components/admin/AdminFormSection';
import MediaPickerField from '../../../components/admin/media/MediaPickerField';
import type { SetStoreFormState, StoreFormState } from './storeAdmin.types';

interface StoreSeoFieldsProps {
  form: StoreFormState;
  setForm: SetStoreFormState;
  seoPreviewTitle: string;
  seoPreviewDescription: string;
  seoPreviewUrl: string;
}

export default function StoreSeoFields({
  form,
  setForm,
  seoPreviewTitle,
  seoPreviewDescription,
  seoPreviewUrl,
}: StoreSeoFieldsProps) {
  return (
    <AdminFormSection title="SEO basico">
      <input
        type="text"
        placeholder="SEO title"
        value={form.seo_title}
        onChange={(event) => setForm((prev) => ({ ...prev, seo_title: event.target.value }))}
        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
      />
      <textarea
        rows={2}
        placeholder="SEO description"
        value={form.seo_description}
        onChange={(event) => setForm((prev) => ({ ...prev, seo_description: event.target.value }))}
        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
      />
      <MediaPickerField
        id="store-og-image-url"
        label="OG image URL"
        value={form.og_image_url}
        onChange={(value) => setForm((prev) => ({ ...prev, og_image_url: value }))}
        placeholder="https://..."
        allowedBuckets={['stores', 'pages', 'banners', 'institutional']}
        initialBucket="stores"
        typeFilter="image"
        showPreview
        previewAlt={`Imagem OG da loja ${form.name || ''}`}
        pickerTitle="Selecionar imagem OG da loja"
        pickerDescription="Escolha uma imagem para compartilhar esta loja em redes sociais."
      />

      <div className="rounded-xl border border-brand-dark/10 bg-white p-4 space-y-1">
        <p className="text-[11px] font-semibold text-brand-dark/60 uppercase tracking-brand">Preview Google</p>
        <p className="text-base text-[#1a0dab] leading-snug">{seoPreviewTitle}</p>
        <p className="text-xs text-[#006621] break-all">{seoPreviewUrl}</p>
        <p className="text-sm text-brand-dark/70 leading-snug">{seoPreviewDescription}</p>
      </div>
    </AdminFormSection>
  );
}
