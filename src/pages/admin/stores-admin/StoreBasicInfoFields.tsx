import type { Category } from '../../../types/cms';
import AdminFormSection from '../../../components/admin/AdminFormSection';
import { slugify } from '../../../utils/slug';
import type { SetStoreFormState, StoreFormState } from './storeAdmin.types';

interface StoreBasicInfoFieldsProps {
  form: StoreFormState;
  setForm: SetStoreFormState;
  categories: Category[];
  slugManuallyEdited: boolean;
  setSlugManuallyEdited: (value: boolean) => void;
}

export default function StoreBasicInfoFields({
  form,
  setForm,
  categories,
  slugManuallyEdited,
  setSlugManuallyEdited,
}: StoreBasicInfoFieldsProps) {
  return (
    <>
      <AdminFormSection title="Dados basicos">
        <div className="space-y-2">
          <label htmlFor="store-name" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
            Nome *
          </label>
          <input
            id="store-name"
            type="text"
            value={form.name}
            onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({
                ...prev,
                name: value,
                slug: slugManuallyEdited ? prev.slug : slugify(value),
              }));
            }}
            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="store-slug" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
            Slug *
          </label>
          <input
            id="store-slug"
            type="text"
            value={form.slug}
            onChange={(event) => {
              setSlugManuallyEdited(true);
              setForm((prev) => ({ ...prev, slug: event.target.value }));
            }}
            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="store-category" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
            Categoria *
          </label>
          <select
            id="store-category"
            value={form.category_id}
            onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="store-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
            Descricao
          </label>
          <textarea
            id="store-description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
          />
        </div>
      </AdminFormSection>

      <AdminFormSection title="Localizacao dentro do shopping">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="store-floor" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
              Piso
            </label>
            <input
              id="store-floor"
              type="text"
              value={form.floor}
              onChange={(event) => setForm((prev) => ({ ...prev, floor: event.target.value }))}
              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="store-number" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
              Numero da loja
            </label>
            <input
              id="store-number"
              type="text"
              value={form.store_number}
              onChange={(event) => setForm((prev) => ({ ...prev, store_number: event.target.value }))}
              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            />
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Contatos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="WhatsApp"
            value={form.whatsapp}
            onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
          />
          <input
            type="text"
            placeholder="Telefone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="md:col-span-2 w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
          />
        </div>
      </AdminFormSection>

      <AdminFormSection title="Redes sociais">
        <input
          type="text"
          placeholder="Instagram (sem @ ou URL completa)"
          value={form.instagram}
          onChange={(event) => setForm((prev) => ({ ...prev, instagram: event.target.value }))}
          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
        />
        <input
          type="text"
          placeholder="Website"
          value={form.website}
          onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
        />
      </AdminFormSection>
    </>
  );
}
