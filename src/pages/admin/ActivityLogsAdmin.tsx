import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCcw, Search } from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import {
  getActivityLogById,
  listActivityLogs,
  type ActivityLogWithUser,
} from '../../services/activityLogs.service';
import { getRoleLabel } from '../../lib/permissions';

interface FilterState {
  userId: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
}

const ACTION_LABELS: Record<string, string> = {
  create_store: 'Criou loja',
  update_store: 'Atualizou loja',
  delete_store: 'Excluiu loja',
  publish_store: 'Publicou loja',
  unpublish_store: 'Despublicou loja',
  create_category: 'Criou categoria',
  update_category: 'Atualizou categoria',
  delete_category: 'Excluiu categoria',
  reorder_categories: 'Reordenou categorias',
  create_launch: 'Criou lancamento',
  update_launch: 'Atualizou lancamento',
  delete_launch: 'Excluiu lancamento',
  publish_launch: 'Publicou lancamento',
  unpublish_launch: 'Despublicou lancamento',
  upload_catalog: 'Enviou catalogo',
  update_catalog: 'Atualizou catalogo',
  activate_catalog: 'Ativou catalogo',
  deactivate_catalog: 'Desativou catalogo',
  delete_catalog: 'Excluiu catalogo',
  update_site_settings: 'Atualizou configuracoes do site',
  create_lead: 'Registrou lead',
  update_lead_status: 'Atualizou status do lead',
  update_lead_notes: 'Atualizou notas do lead',
  delete_lead: 'Excluiu lead',
  export_leads: 'Exportou leads',
  update_user_role: 'Atualizou papel de usuario',
  update_admin_profile: 'Atualizou perfil administrativo',
  disable_admin_user: 'Desativou usuario admin',
  create_footer_section: 'Criou coluna do rodape',
  update_footer_section: 'Atualizou coluna do rodape',
  delete_footer_section: 'Excluiu coluna do rodape',
  create_footer_link: 'Criou link do rodape',
  update_footer_link: 'Atualizou link do rodape',
  delete_footer_link: 'Excluiu link do rodape',
  reorder_footer: 'Reordenou rodape',
};

function toActionLabel(action: string): string {
  if (ACTION_LABELS[action]) {
    return ACTION_LABELS[action];
  }

  if (!action.trim()) {
    return 'Acao nao informada';
  }

  return action
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toEntityLabel(entity: string): string {
  if (!entity.trim()) {
    return 'Entidade nao informada';
  }

  const labels: Record<string, string> = {
    stores: 'Lojas',
    categories: 'Categorias',
    launches: 'Lancamentos',
    catalogs: 'Catalogos',
    site_settings: 'Configuracoes do Site',
    leads: 'Leads',
    admin_profiles: 'Usuarios',
    pages: 'Paginas',
    home_sections: 'Home',
    media: 'Midias',
    newsletter: 'Newsletter',
    store_products: 'Produtos de Loja',
    footer_sections: 'Rodape',
    footer_links: 'Links do Rodape',
  };

  return labels[entity] ?? entity;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
}

function formatMetadata(metadata: unknown): string {
  if (!metadata) {
    return '{}';
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return '{}';
  }
}

export default function ActivityLogsAdmin() {
  const [logs, setLogs] = useState<ActivityLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    userId: 'all',
    action: 'all',
    entity: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLogWithUser | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await listActivityLogs({
      userId: filters.userId !== 'all' ? filters.userId : undefined,
      action: filters.action !== 'all' ? filters.action : undefined,
      entity: filters.entity !== 'all' ? filters.entity : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      limit: 300,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const rows = result.data ?? [];
    setLogs(rows);

    if (selectedLogId) {
      const current = rows.find((row) => row.id === selectedLogId) ?? null;
      setSelectedLog(current);
    }
  }, [filters.action, filters.dateFrom, filters.dateTo, filters.entity, filters.userId, selectedLogId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs();
  }, [loadLogs]);

  const handleViewDetails = async (logId: string) => {
    setSelectedLogId(logId);
    setIsDetailLoading(true);

    const result = await getActivityLogById(logId);
    setIsDetailLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Nao foi possivel carregar os detalhes do log.');
      return;
    }

    setSelectedLog(result.data);
  };

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();

    logs.forEach((log) => {
      if (!log.user_id) {
        return;
      }

      const displayName = log.admin_name
        ? `${log.admin_name} (${getRoleLabel(log.admin_role)})`
        : log.user_id;
      map.set(log.user_id, displayName);
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'pt-BR'),
    );
  }, [logs]);

  const actionOptions = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.action)))
        .filter((action): action is string => typeof action === 'string' && action.length > 0)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [logs],
  );

  const entityOptions = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.entity)))
        .filter((entity): entity is string => typeof entity === 'string' && entity.length > 0)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [logs],
  );

  const columns: Array<AdminTableColumn<ActivityLogWithUser>> = [
    {
      key: 'created_at',
      label: 'Data',
      render: (row) => (
        <span className="text-xs text-brand-dark/70">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'user',
      label: 'Usuario',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">
            {row.admin_name ?? 'Usuario nao identificado'}
          </p>
          <p className="text-xs text-brand-dark/60">
            {row.admin_role ? getRoleLabel(row.admin_role) : row.user_id ?? 'Sem user_id'}
          </p>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Acao',
      render: (row) => (
        <StatusBadge label={toActionLabel(row.action)} tone="info" />
      ),
    },
    {
      key: 'entity',
      label: 'Entidade',
      render: (row) => (
        <StatusBadge label={toEntityLabel(row.entity)} tone="neutral" />
      ),
    },
    {
      key: 'actions',
      label: 'Detalhes',
      render: (row) => (
        <button
          type="button"
          onClick={() => void handleViewDetails(row.id)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver
        </button>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Logs de Atividade | CMS Mega Polo Moda"
        description="Auditoria de acoes administrativas do CMS do Mega Polo Moda."
      />

      <AdminPageHeader
        title="Logs de Atividade"
        description="Monitore as acoes administrativas para auditoria e rastreabilidade."
        actions={(
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        )}
      />

      {isLoading && <AdminLoadingState label="Carregando logs de atividade..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void loadLogs()} />}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <AdminCard title="Historico de acoes" description="Filtre por usuario, acao, entidade e periodo.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                  <select
                    value={filters.userId}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, userId: event.target.value }))
                    }
                    className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  >
                    <option value="all">Todos os usuarios</option>
                    {userOptions.map(([userId, label]) => (
                      <option key={userId} value={userId}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={filters.action}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, action: event.target.value }))
                  }
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todas as acoes</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {toActionLabel(action)}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.entity}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, entity: event.target.value }))
                  }
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todas as entidades</option>
                  {entityOptions.map((entity) => (
                    <option key={entity} value={entity}>
                      {toEntityLabel(entity)}
                    </option>
                  ))}
                </select>

                <div className="space-y-1">
                  <label htmlFor="log-date-from" className="text-xs text-brand-dark/60 font-semibold">
                    Data inicial
                  </label>
                  <input
                    id="log-date-from"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                    }
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="log-date-to" className="text-xs text-brand-dark/60 font-semibold">
                    Data final
                  </label>
                  <input
                    id="log-date-to"
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                    }
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>
              </div>

              {logs.length === 0 ? (
                <AdminEmptyState
                  title="Nenhum log encontrado"
                  description="Nao existem registros para os filtros selecionados."
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={logs}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhum log encontrado."
                />
              )}
            </div>
          </AdminCard>

          <AdminCard title="Detalhes do log" description="Visualize os metadados completos da acao selecionada.">
            {isDetailLoading && <AdminLoadingState label="Carregando detalhes..." />}

            {!isDetailLoading && !selectedLog && (
              <AdminEmptyState
                title="Selecione um registro"
                description="Clique em Ver para abrir o metadata detalhado da acao."
              />
            )}

            {!isDetailLoading && selectedLog && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-brand text-brand-dark/60">Data</p>
                  <p className="text-sm font-semibold text-brand-dark">
                    {formatDate(selectedLog.created_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-brand text-brand-dark/60">Usuario</p>
                  <p className="text-sm font-semibold text-brand-dark">
                    {selectedLog.admin_name ?? 'Usuario nao identificado'}
                  </p>
                  <p className="text-xs text-brand-dark/60">
                    {selectedLog.admin_role
                      ? getRoleLabel(selectedLog.admin_role)
                      : selectedLog.user_id ?? 'Sem user_id'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-brand text-brand-dark/60">Acao</p>
                  <p className="text-sm font-semibold text-brand-dark">
                    {toActionLabel(selectedLog.action)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-brand text-brand-dark/60">Entidade</p>
                  <p className="text-sm font-semibold text-brand-dark">
                    {toEntityLabel(selectedLog.entity)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-brand text-brand-dark/60">entity_id</p>
                  <p className="text-xs text-brand-dark/80 break-all">
                    {selectedLog.entity_id ?? 'Nao informado'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-brand text-brand-dark/60">metadata</p>
                  <pre className="text-xs bg-brand-paper border border-brand-dark/10 rounded-xl p-4 overflow-x-auto text-brand-dark/85">
                    {formatMetadata(selectedLog.metadata)}
                  </pre>
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      )}
    </>
  );
}
