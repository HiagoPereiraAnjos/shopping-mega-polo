import AdminFormSection from '../../../components/admin/AdminFormSection';
import type { SetStoreFormState, StoreFormState } from './storeAdmin.types';

interface StoreStatusFieldsProps {
  form: StoreFormState;
  setForm: SetStoreFormState;
}

export default function StoreStatusFields({ form, setForm }: StoreStatusFieldsProps) {
  return (
    <AdminFormSection title="Status e destaque">
      <input
        type="text"
        placeholder="Tags (separadas por virgula)"
        value={form.tags}
        onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
      />

      <div className="flex flex-col gap-3">
        <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) => setForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
            className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
          />
          Loja em destaque
        </label>

        <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(event) => setForm((prev) => ({ ...prev, is_published: event.target.checked }))}
            className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
          />
          Publicar loja
        </label>
      </div>
    </AdminFormSection>
  );
}
