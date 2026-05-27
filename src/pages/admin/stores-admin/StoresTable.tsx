import AdminEmptyState from '../../../components/admin/AdminEmptyState';
import AdminTable, { type AdminTableColumn } from '../../../components/admin/AdminTable';
import type { Store } from '../../../types/cms';

interface StoresTableProps {
  stores: Store[];
  allStoresCount: number;
  canEditStores: boolean;
  columns: Array<AdminTableColumn<Store>>;
}

export default function StoresTable({
  stores,
  allStoresCount,
  canEditStores,
  columns,
}: StoresTableProps) {
  if (stores.length === 0) {
    return (
      <AdminEmptyState
        title="Nenhuma loja encontrada"
        description={
          allStoresCount
            ? 'Ajuste os filtros para localizar lojas cadastradas.'
            : canEditStores
              ? 'Cadastre a primeira loja para iniciar a operacao do portal.'
              : 'Ainda nao ha lojas cadastradas para visualizacao.'
        }
      />
    );
  }

  return (
    <AdminTable
      columns={columns}
      rows={stores}
      rowKey={(row) => row.id}
      emptyMessage="Nenhuma loja cadastrada."
    />
  );
}
