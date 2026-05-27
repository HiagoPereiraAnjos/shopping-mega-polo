import { Eye, EyeOff, Pencil, Star, Trash2 } from 'lucide-react';
import StatusBadge from '../../../components/admin/StatusBadge';
import type { Store } from '../../../types/cms';

interface StoreActionsProps {
  row: Store;
  canEditStores: boolean;
  onEdit: (store: Store) => void;
  onTogglePublish: (store: Store) => void;
  onToggleFeatured: (store: Store) => void;
  onDelete: (store: Store) => void;
}

export default function StoreActions({
  row,
  canEditStores,
  onEdit,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
}: StoreActionsProps) {
  if (!canEditStores) {
    return <StatusBadge label="Somente leitura" tone="neutral" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Editar
      </button>

      <button
        type="button"
        onClick={() => onTogglePublish(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
      >
        {row.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {row.is_published ? 'Despublicar' : 'Publicar'}
      </button>

      <button
        type="button"
        onClick={() => onToggleFeatured(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
      >
        <Star className={`w-3.5 h-3.5 ${row.is_featured ? 'fill-current text-amber-500' : ''}`} />
        {row.is_featured ? 'Remover destaque' : 'Destacar'}
      </button>

      <button
        type="button"
        onClick={() => onDelete(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Excluir
      </button>
    </div>
  );
}
