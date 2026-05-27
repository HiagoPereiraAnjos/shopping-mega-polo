import type { StatusBadgeTone } from './StatusBadge';

export function getStatusBadgeTone(status: string): StatusBadgeTone {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'published' || normalized === 'publicado') {
    return 'published';
  }
  if (normalized === 'draft' || normalized === 'rascunho') {
    return 'draft';
  }
  if (normalized === 'active' || normalized === 'ativo') {
    return 'active';
  }
  if (normalized === 'inactive' || normalized === 'inativo') {
    return 'inactive';
  }
  if (normalized === 'pending' || normalized === 'pendente') {
    return 'pending';
  }

  return 'neutral';
}
