import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Search, Trash2 } from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge, { type StatusBadgeTone } from '../../components/admin/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { canManageLeads, canViewLeads } from '../../lib/permissions';
import {
  deleteLead,
  listLeads,
  logLeadExport,
  updateLeadNotes,
  updateLeadStatus,
  type LeadStatus,
} from '../../services/leads.service';
import type { Lead } from '../../types/cms';
import { normalizeSearchText } from '../../utils/storeMappers';

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string; tone: StatusBadgeTone }> = [
  { value: 'novo', label: 'Novo', tone: 'info' },
  { value: 'em_atendimento', label: 'Em atendimento', tone: 'warning' },
  { value: 'proposta_enviada', label: 'Proposta enviada', tone: 'published' },
  { value: 'visita_agendada', label: 'Visita agendada', tone: 'info' },
  { value: 'fechado', label: 'Fechado', tone: 'success' },
  { value: 'perdido', label: 'Perdido', tone: 'danger' },
];

function getStatusMeta(status: string): { label: string; tone: StatusBadgeTone } {
  const found = STATUS_OPTIONS.find((option) => option.value === status);
  return found ?? { label: status || 'Sem status', tone: 'neutral' };
}

function toLeadTypeLabel(type: string): string {
  if (!type.trim()) {
    return 'Nao informado';
  }

  return type
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleString('pt-BR');
}

function escapeCsvValue(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function LeadsAdmin() {
  const { profile } = useAuth();
  const canAccessLeads = canViewLeads(profile);
  const canManageLeadsModule = canManageLeads(profile);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<LeadStatus>('novo');
  const [notesDraft, setNotesDraft] = useState('');

  const [pendingDeleteLead, setPendingDeleteLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    if (!canAccessLeads) {
      setLeads([]);
      setError('Seu perfil nao possui permissao para visualizar leads.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await listLeads();

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setLeads(result.data ?? []);
  }, [canAccessLeads]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLeads();
  }, [loadLeads]);

  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>(
      leads.map((lead) => lead.type).filter((type): type is string => !!type),
    );

    return Array.from(typeSet).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return leads.filter((lead) => {
      const matchesType = typeFilter === 'all' || lead.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      const searchBlob = normalizeSearchText(
        `${lead.name} ${lead.company ?? ''} ${lead.email ?? ''} ${lead.phone ?? ''}`,
      );
      const matchesSearch = !normalizedSearch || searchBlob.includes(normalizedSearch);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [leads, searchTerm, typeFilter, statusFilter]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

  const updateLeadInState = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
  };

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setStatusDraft(
      STATUS_OPTIONS.some((item) => item.value === lead.status)
        ? (lead.status as LeadStatus)
        : 'novo',
    );
    setNotesDraft(lead.internal_notes ?? '');
    setSuccessMessage(null);
    setError(null);
  };

  const handleSaveStatus = async () => {
    if (!canManageLeadsModule) {
      setError('Seu perfil possui acesso somente leitura para leads.');
      return;
    }

    if (!selectedLead) {
      return;
    }

    if (selectedLead.status === statusDraft) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await updateLeadStatus(selectedLead.id, statusDraft);

    setIsMutating(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Falha ao atualizar status do lead.');
      return;
    }

    updateLeadInState(result.data);
    setSuccessMessage('Status do lead atualizado.');
  };

  const handleSaveNotes = async () => {
    if (!canManageLeadsModule) {
      setError('Seu perfil possui acesso somente leitura para leads.');
      return;
    }

    if (!selectedLead) {
      return;
    }

    if ((selectedLead.internal_notes ?? '') === notesDraft.trim()) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await updateLeadNotes(selectedLead.id, notesDraft);

    setIsMutating(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Falha ao salvar observacoes internas.');
      return;
    }

    updateLeadInState(result.data);
    setSuccessMessage('Observacoes internas atualizadas.');
  };

  const handleDeleteLead = async () => {
    if (!canManageLeadsModule) {
      setError('Seu perfil possui acesso somente leitura para leads.');
      return;
    }

    if (!pendingDeleteLead) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await deleteLead(pendingDeleteLead.id);

    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setLeads((prev) => prev.filter((lead) => lead.id !== pendingDeleteLead.id));
    if (selectedLeadId === pendingDeleteLead.id) {
      setSelectedLeadId(null);
    }

    setPendingDeleteLead(null);
    setSuccessMessage('Lead removido com sucesso.');
  };

  const handleExportCsv = async () => {
    if (!canManageLeadsModule) {
      setError('Seu perfil possui acesso somente leitura para leads.');
      return;
    }

    if (!filteredLeads.length) {
      setError('Nao ha leads para exportar com os filtros atuais.');
      return;
    }

    const rows: string[][] = [
      [
        'Nome',
        'Empresa',
        'Tipo',
        'Status',
        'Email',
        'Telefone',
        'CNPJ',
        'Segmento',
        'Origem',
        'Mensagem',
        'Observacoes internas',
        'Criado em',
      ],
      ...filteredLeads.map((lead) => [
        lead.name,
        lead.company ?? '',
        lead.type,
        lead.status,
        lead.email ?? '',
        lead.phone ?? '',
        lead.cnpj ?? '',
        lead.segment ?? '',
        lead.source_page ?? '',
        lead.message ?? '',
        lead.internal_notes ?? '',
        formatDate(lead.created_at),
      ]),
    ];

    downloadCsv(`leads-mega-polo-${new Date().toISOString().slice(0, 10)}.csv`, rows);

    await logLeadExport({
      exported_count: filteredLeads.length,
      filters: {
        type: typeFilter,
        status: statusFilter,
        query: searchTerm,
      },
    });

    setSuccessMessage('Arquivo CSV exportado.');
  };

  const columns: Array<AdminTableColumn<Lead>> = [
    {
      key: 'lead',
      label: 'Lead',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.name}</p>
          <p className="text-xs text-brand-dark/60">{row.company ?? 'Sem empresa informada'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (row) => <span className="text-sm">{toLeadTypeLabel(row.type)}</span>,
    },
    {
      key: 'contact',
      label: 'Contato',
      render: (row) => (
        <div className="space-y-1 text-xs text-brand-dark/80">
          <p>{row.email ?? 'Sem e-mail'}</p>
          <p>{row.phone ?? 'Sem telefone'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const statusMeta = getStatusMeta(row.status);
        return <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />;
      },
    },
    {
      key: 'created',
      label: 'Recebido em',
      render: (row) => <span className="text-xs text-brand-dark/70">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleOpenDetails(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Detalhes
          </button>
          {canManageLeadsModule && (
            <button
              type="button"
              onClick={() => setPendingDeleteLead(row)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Leads | CMS Mega Polo Moda"
        description="Acompanhe leads recebidos, altere status e exporte contatos para o time comercial."
      />

      <AdminPageHeader
        title="Leads"
        description={
          canManageLeadsModule
            ? 'Gerencie contatos recebidos pelos formularios publicos do portal.'
            : 'Visualizacao de leads em modo somente leitura para o perfil atual.'
        }
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadLeads()}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={!canManageLeadsModule}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        )}
      />

      {isLoading && <AdminLoadingState label="Carregando leads..." />}

      {!isLoading && canAccessLeads && !canManageLeadsModule && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Seu papel atual permite apenas visualizacao de leads. Alteracoes e exportacao estao restritas a admin e super_admin.
        </div>
      )}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void loadLeads()} />}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <AdminCard title="Lista de leads" description="Filtre por tipo, status e dados de contato.">
            <div className="space-y-4">
              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                  {successMessage}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nome, empresa, e-mail ou telefone"
                    className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todos os tipos</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {toLeadTypeLabel(type)}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as LeadStatus | 'all')}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todos os status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {filteredLeads.length === 0 ? (
                <AdminEmptyState
                  title="Nenhum lead encontrado"
                  description={
                    leads.length
                      ? 'Ajuste os filtros para localizar leads ja recebidos.'
                      : 'Ainda nao ha leads cadastrados. Os formularios publicos passarao a alimentar esta lista.'
                  }
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={filteredLeads}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhum lead encontrado."
                />
              )}
            </div>
          </AdminCard>

          <AdminCard title="Detalhes do lead" description="Visualize os dados completos e organize o atendimento.">
            {!selectedLead ? (
              <AdminEmptyState
                title="Selecione um lead"
                description="Clique em 'Detalhes' na tabela para visualizar dados completos, atualizar status e registrar observacoes internas."
              />
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xl font-serif font-semibold">{selectedLead.name}</p>
                  <p className="text-sm text-brand-dark/70">{selectedLead.company ?? 'Sem empresa informada'}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={getStatusMeta(selectedLead.status).label}
                      tone={getStatusMeta(selectedLead.status).tone}
                    />
                    <StatusBadge label={toLeadTypeLabel(selectedLead.type)} tone="neutral" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm">
                  <p><span className="font-semibold">E-mail:</span> {selectedLead.email ?? 'Nao informado'}</p>
                  <p><span className="font-semibold">Telefone:</span> {selectedLead.phone ?? 'Nao informado'}</p>
                  <p><span className="font-semibold">CNPJ:</span> {selectedLead.cnpj ?? 'Nao informado'}</p>
                  <p><span className="font-semibold">Segmento:</span> {selectedLead.segment ?? 'Nao informado'}</p>
                  <p><span className="font-semibold">Origem:</span> {selectedLead.source_page ?? 'Nao informado'}</p>
                  <p><span className="font-semibold">Recebido em:</span> {formatDate(selectedLead.created_at)}</p>
                </div>

                {selectedLead.message && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Mensagem</p>
                    <p className="text-sm text-brand-dark/80 whitespace-pre-wrap">{selectedLead.message}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="lead-status" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Status do lead
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="lead-status"
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value as LeadStatus)}
                      disabled={!canManageLeadsModule}
                      className="flex-1 rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleSaveStatus()}
                      disabled={!canManageLeadsModule || isMutating || selectedLead.status === statusDraft}
                      className="px-4 py-2 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="lead-notes" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Observacoes internas
                  </label>
                  <textarea
                    id="lead-notes"
                    rows={5}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    disabled={!canManageLeadsModule}
                    placeholder="Registre contexto de atendimento, proposta e proximos passos..."
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveNotes()}
                    disabled={!canManageLeadsModule || isMutating || (selectedLead.internal_notes ?? '') === notesDraft.trim()}
                    className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Salvar observacoes
                  </button>
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteLead}
        title="Excluir lead"
        description={
          pendingDeleteLead
            ? `Tem certeza que deseja excluir o lead "${pendingDeleteLead.name}"?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDeleteLead(null)}
        onConfirm={() => void handleDeleteLead()}
      />
    </>
  );
}

