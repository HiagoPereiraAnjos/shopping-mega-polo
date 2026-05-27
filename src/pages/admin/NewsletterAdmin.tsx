import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, UserX } from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import StatusBadge, { type StatusBadgeTone } from '../../components/admin/StatusBadge';
import {
  listNewsletterSubscribers,
  unsubscribeNewsletter,
  type NewsletterStatus,
} from '../../services/newsletter.service';
import type { NewsletterSubscriber } from '../../types/cms';
import { normalizeSearchText } from '../../utils/storeMappers';

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
  const csv = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(',')).join('\n');

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

function getStatusMeta(status: string): { label: string; tone: StatusBadgeTone } {
  if (status === 'active') {
    return { label: 'Ativo', tone: 'success' };
  }

  if (status === 'inactive') {
    return { label: 'Inativo', tone: 'draft' };
  }

  return { label: status || 'Sem status', tone: 'neutral' };
}

export default function NewsletterAdmin() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NewsletterStatus | 'all'>('all');

  const loadSubscribers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await listNewsletterSubscribers();

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSubscribers(result.data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSubscribers();
  }, [loadSubscribers]);

  const filteredSubscribers = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return subscribers.filter((subscriber) => {
      const matchesStatus = statusFilter === 'all' || subscriber.status === statusFilter;
      const searchBlob = normalizeSearchText(`${subscriber.email} ${subscriber.name ?? ''}`);
      const matchesSearch = !normalizedSearch || searchBlob.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [subscribers, searchTerm, statusFilter]);

  const handleUnsubscribe = async (subscriber: NewsletterSubscriber) => {
    if (subscriber.status === 'inactive') {
      return;
    }

    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await unsubscribeNewsletter(subscriber.id);

    setIsMutating(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Falha ao desativar inscricao.');
      return;
    }

    setSubscribers((prev) =>
      prev.map((item) => (item.id === result.data?.id ? result.data : item)),
    );
    setSuccessMessage('Inscricao desativada com sucesso.');
  };

  const handleExportCsv = () => {
    if (!filteredSubscribers.length) {
      setError('Nao ha inscritos para exportar com os filtros atuais.');
      return;
    }

    const rows: string[][] = [
      ['E-mail', 'Nome', 'Status', 'Consentimento', 'Criado em'],
      ...filteredSubscribers.map((subscriber) => [
        subscriber.email,
        subscriber.name ?? '',
        subscriber.status,
        subscriber.consent ? 'Sim' : 'Nao',
        formatDate(subscriber.created_at),
      ]),
    ];

    downloadCsv(`newsletter-mega-polo-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setSuccessMessage('Arquivo CSV exportado.');
  };

  const columns: Array<AdminTableColumn<NewsletterSubscriber>> = [
    {
      key: 'email',
      label: 'E-mail',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.email}</p>
          <p className="text-xs text-brand-dark/60">{row.name ?? 'Sem nome informado'}</p>
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
      key: 'consent',
      label: 'Consentimento',
      render: (row) => (
        <StatusBadge
          label={row.consent ? 'Confirmado' : 'Nao'}
          tone={row.consent ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'created',
      label: 'Inscrito em',
      render: (row) => <span className="text-xs text-brand-dark/70">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <button
          type="button"
          onClick={() => void handleUnsubscribe(row)}
          disabled={isMutating || row.status === 'inactive'}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <UserX className="w-3.5 h-3.5" />
          {row.status === 'inactive' ? 'Ja inativo' : 'Desativar'}
        </button>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Newsletter | CMS Mega Polo Moda"
        description="Gerencie inscritos da newsletter, status de envio e exportacao de contatos."
      />

      <AdminPageHeader
        title="Newsletter"
        description="Acompanhe a base de inscritos e desative contatos quando necessario."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadSubscribers()}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        )}
      />

      {isLoading && <AdminLoadingState label="Carregando inscritos da newsletter..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void loadSubscribers()} />}

      {!isLoading && !error && (
        <AdminCard title="Inscritos" description="Busque por e-mail e filtre por status para organizar sua base.">
          <div className="space-y-4">
            {successMessage && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                {successMessage}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por e-mail"
                  className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as NewsletterStatus | 'all')}
                className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {filteredSubscribers.length === 0 ? (
              <AdminEmptyState
                title="Nenhum inscrito encontrado"
                description={
                  subscribers.length
                    ? 'Ajuste os filtros para localizar inscritos da newsletter.'
                    : 'Ainda nao ha inscricoes na newsletter.'
                }
              />
            ) : (
              <AdminTable
                columns={columns}
                rows={filteredSubscribers}
                rowKey={(row) => row.id}
                emptyMessage="Nenhum inscrito encontrado."
              />
            )}
          </div>
        </AdminCard>
      )}
    </>
  );
}

