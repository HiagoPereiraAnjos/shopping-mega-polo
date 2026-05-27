import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Mail, Megaphone, Store, UserPlus } from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import StatusBadge, { type StatusBadgeTone } from '../../components/admin/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import {
  canManageLeads,
  canManageNewsletter,
  canViewAdmin,
  getRoleLabel,
  toAdminRole,
} from '../../lib/permissions';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '../../lib/supabase';

interface DashboardTotals {
  totalStores: number;
  publishedStores: number;
  totalLaunches: number;
  totalPages: number;
  newLeads: number;
  newsletterSubscribers: number;
}

interface DashboardLeadRow {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface DashboardUpdateRow {
  id: string;
  entity: string;
  title: string;
  isPublished: boolean;
  updatedAt: string;
}

interface MetricCard {
  id: string;
  label: string;
  value: number;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INITIAL_TOTALS: DashboardTotals = {
  totalStores: 0,
  publishedStores: 0,
  totalLaunches: 0,
  totalPages: 0,
  newLeads: 0,
  newsletterSubscribers: 0,
};

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLeadTone(status: string): StatusBadgeTone {
  const normalized = status.toLowerCase();

  if (normalized === 'new' || normalized === 'novo') {
    return 'info';
  }
  if (normalized === 'contacted' || normalized === 'em_atendimento') {
    return 'warning';
  }
  if (normalized === 'closed' || normalized === 'convertido') {
    return 'success';
  }

  return 'neutral';
}

function getLeadLabel(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === 'new' || normalized === 'novo') return 'Novo';
  if (normalized === 'contacted' || normalized === 'em_atendimento') return 'Em atendimento';
  if (normalized === 'closed') return 'Fechado';
  if (normalized === 'convertido') return 'Convertido';

  return status || 'Sem status';
}

function isPermissionDeniedError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) {
    return false;
  }

  const message = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toUpperCase();

  return (
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('not allowed') ||
    code === '42501' ||
    code === '403' ||
    code === '401'
  );
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const role = toAdminRole(profile?.role);

  const canViewOperational = canViewAdmin(profile);
  const canViewLeadsData = canManageLeads(profile);
  const canViewNewsletterData = canManageNewsletter(profile);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<DashboardTotals>(INITIAL_TOTALS);
  const [latestLeads, setLatestLeads] = useState<DashboardLeadRow[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<DashboardUpdateRow[]>([]);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [updatesMessage, setUpdatesMessage] = useState<string | null>(null);
  const [infoNotices, setInfoNotices] = useState<string[]>([]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLeadMessage(null);
    setNewsletterMessage(null);
    setUpdatesMessage(null);
    setInfoNotices([]);

    if (!supabase) {
      setTotals(INITIAL_TOTALS);
      setLatestLeads([]);
      setLatestUpdates([]);
      setIsLoading(false);
      return;
    }

    const nextTotals: DashboardTotals = { ...INITIAL_TOTALS };
    let nextLeads: DashboardLeadRow[] = [];
    let nextUpdates: DashboardUpdateRow[] = [];
    const nextNotices: string[] = [];

    if (canViewOperational) {
      const [
        totalStoresResult,
        publishedStoresResult,
        totalLaunchesResult,
        totalPagesResult,
      ] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('launches').select('id', { count: 'exact', head: true }),
        supabase.from('pages').select('id', { count: 'exact', head: true }),
      ]);

      const operationalErrors = [
        totalStoresResult.error,
        publishedStoresResult.error,
        totalLaunchesResult.error,
        totalPagesResult.error,
      ].filter((item) => !!item);

      const hasBlockingOperationalError = operationalErrors.some(
        (item) => item && !isPermissionDeniedError(item),
      );

      if (hasBlockingOperationalError) {
        setError(operationalErrors[0]?.message ?? 'Nao foi possivel carregar os dados do dashboard.');
        setIsLoading(false);
        return;
      }

      if (operationalErrors.length) {
        nextNotices.push('Alguns indicadores operacionais nao puderam ser carregados para este perfil.');
      } else {
        nextTotals.totalStores = totalStoresResult.count ?? 0;
        nextTotals.publishedStores = publishedStoresResult.count ?? 0;
        nextTotals.totalLaunches = totalLaunchesResult.count ?? 0;
        nextTotals.totalPages = totalPagesResult.count ?? 0;
      }

      const [
        latestStoresResult,
        latestLaunchesResult,
        latestPagesResult,
      ] = await Promise.all([
        supabase
          .from('stores')
          .select('id,name,is_published,updated_at')
          .order('updated_at', { ascending: false })
          .limit(4),
        supabase
          .from('launches')
          .select('id,title,is_published,updated_at')
          .order('updated_at', { ascending: false })
          .limit(4),
        supabase
          .from('pages')
          .select('id,title,is_published,updated_at')
          .order('updated_at', { ascending: false })
          .limit(4),
      ]);

      const updateErrors = [
        latestStoresResult.error,
        latestLaunchesResult.error,
        latestPagesResult.error,
      ].filter((item) => !!item);

      if (updateErrors.length) {
        setUpdatesMessage(
          isPermissionDeniedError(updateErrors[0])
            ? 'Seu perfil nao possui acesso completo ao historico de atualizacoes.'
            : 'Nao foi possivel carregar as ultimas atualizacoes agora.',
        );
      } else {
        const storeUpdates: DashboardUpdateRow[] = (latestStoresResult.data ?? []).map((storeItem) => ({
          id: `store-${storeItem.id}`,
          entity: 'Loja',
          title: storeItem.name,
          isPublished: storeItem.is_published,
          updatedAt: storeItem.updated_at,
        }));

        const launchUpdates: DashboardUpdateRow[] = (latestLaunchesResult.data ?? []).map((launchItem) => ({
          id: `launch-${launchItem.id}`,
          entity: 'Lancamento',
          title: launchItem.title,
          isPublished: launchItem.is_published,
          updatedAt: launchItem.updated_at,
        }));

        const pageUpdates: DashboardUpdateRow[] = (latestPagesResult.data ?? []).map((pageItem) => ({
          id: `page-${pageItem.id}`,
          entity: 'Pagina',
          title: pageItem.title,
          isPublished: pageItem.is_published,
          updatedAt: pageItem.updated_at,
        }));

        nextUpdates = [...storeUpdates, ...launchUpdates, ...pageUpdates]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 6);
      }
    } else {
      nextNotices.push('Seu perfil possui acesso administrativo restrito neste dashboard.');
      setUpdatesMessage('Sem acesso aos dados operacionais.');
    }

    if (canViewLeadsData) {
      const [newLeadsResult, latestLeadsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .or('status.eq.new,status.eq.novo,status.eq.em_atendimento'),
        supabase
          .from('leads')
          .select('id,name,email,status,created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const leadErrors = [newLeadsResult.error, latestLeadsResult.error].filter((item) => !!item);

      if (leadErrors.length) {
        setLeadMessage(
          isPermissionDeniedError(leadErrors[0])
            ? 'Seu perfil nao possui acesso aos leads.'
            : 'Nao foi possivel carregar os leads no momento.',
        );
      } else {
        nextTotals.newLeads = newLeadsResult.count ?? 0;
        nextLeads = (latestLeadsResult.data ?? []).map((lead) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          status: lead.status ?? 'novo',
          createdAt: lead.created_at,
        }));
      }
    } else {
      setLeadMessage('Seu perfil nao possui permissao para visualizar leads.');
    }

    if (canViewNewsletterData) {
      const newsletterResult = await supabase
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true });

      if (newsletterResult.error) {
        setNewsletterMessage(
          isPermissionDeniedError(newsletterResult.error)
            ? 'Seu perfil nao possui acesso a dados de newsletter.'
            : 'Nao foi possivel carregar o total de newsletter.',
        );
      } else {
        nextTotals.newsletterSubscribers = newsletterResult.count ?? 0;
      }
    } else {
      setNewsletterMessage('Seu perfil nao possui permissao para visualizar newsletter.');
    }

    setTotals(nextTotals);
    setLatestLeads(nextLeads);
    setLatestUpdates(nextUpdates);
    setInfoNotices(nextNotices);
    setIsLoading(false);
  }, [canViewLeadsData, canViewNewsletterData, canViewOperational]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadDashboard]);

  const metricCards = useMemo<MetricCard[]>(() => {
    const cards: MetricCard[] = [];

    if (canViewOperational) {
      cards.push(
        {
          id: 'total-stores',
          label: 'Total de lojas',
          value: totals.totalStores,
          helper: 'Cadastros no portal',
          icon: Store,
        },
        {
          id: 'published-stores',
          label: 'Lojas publicadas',
          value: totals.publishedStores,
          helper: 'Visiveis para compradores',
          icon: CheckCircle2,
        },
        {
          id: 'total-launches',
          label: 'Lancamentos',
          value: totals.totalLaunches,
          helper: 'Conteudos cadastrados',
          icon: Megaphone,
        },
        {
          id: 'total-pages',
          label: 'Paginas',
          value: totals.totalPages,
          helper: 'Paginas institucionais',
          icon: FileText,
        },
      );
    }

    if (canViewLeadsData) {
      cards.push({
        id: 'new-leads',
        label: 'Leads novos',
        value: totals.newLeads,
        helper: 'Status novo ou em atendimento',
        icon: UserPlus,
      });
    }

    if (canViewNewsletterData) {
      cards.push({
        id: 'newsletter',
        label: 'Newsletter',
        value: totals.newsletterSubscribers,
        helper: 'Inscritos na base',
        icon: Mail,
      });
    }

    return cards;
  }, [canViewLeadsData, canViewNewsletterData, canViewOperational, totals]);

  const leadColumns: Array<AdminTableColumn<DashboardLeadRow>> = [
    {
      key: 'name',
      label: 'Lead',
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-brand-dark">{row.name}</p>
          <p className="text-xs text-brand-dark/60">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge label={getLeadLabel(row.status)} tone={getLeadTone(row.status)} />,
    },
    {
      key: 'createdAt',
      label: 'Data',
      render: (row) => <span className="text-brand-dark/70">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  const updateColumns: Array<AdminTableColumn<DashboardUpdateRow>> = [
    {
      key: 'entity',
      label: 'Tipo',
      render: (row) => <span className="font-semibold">{row.entity}</span>,
    },
    {
      key: 'title',
      label: 'Conteudo',
      render: (row) => <span className="text-brand-dark/90">{row.title}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge label={row.isPublished ? 'Publicado' : 'Rascunho'} tone={row.isPublished ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'updatedAt',
      label: 'Atualizado em',
      render: (row) => <span className="text-brand-dark/70">{formatDateTime(row.updatedAt)}</span>,
    },
  ];

  const roleLabel = getRoleLabel(role);
  const dashboardDescription = useMemo(() => {
    if (role === 'super_admin') {
      return 'Visao completa de operacao, conteudo e comercial.';
    }
    if (role === 'admin') {
      return 'Visao operacional e comercial conforme permissoes administrativas.';
    }
    if (role === 'editor') {
      return 'Visao editorial de conteudo e operacao sem dados comerciais sensiveis.';
    }
    return 'Visao de leitura dos dados permitidos para o seu perfil.';
  }, [role]);

  return (
    <>
      <SEO
        title="Dashboard CMS | Mega Polo Moda"
        description="Painel administrativo com indicadores e ultimas atualizacoes do conteudo."
      />

      <AdminPageHeader
        title="Dashboard"
        description={`Perfil atual: ${roleLabel}. ${dashboardDescription}`}
        actions={
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            Atualizar dados
          </button>
        }
      />

      {!isSupabaseConfigured && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase ainda nao configurado neste ambiente"
            description={
              supabaseConfigMessage ??
              'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para carregar dados reais do CMS.'
            }
          />
        </div>
      )}

      {isLoading && <AdminLoadingState />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void loadDashboard()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {infoNotices.length > 0 && (
            <AdminCard>
              <div className="space-y-2">
                {infoNotices.map((notice) => (
                  <p key={notice} className="text-sm text-brand-dark/75">
                    {notice}
                  </p>
                ))}
              </div>
            </AdminCard>
          )}

          {metricCards.length > 0 ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              {metricCards.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.id}>
                    <AdminCard className="h-full">
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-paper border border-brand-dark/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-brand-red" />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-brand text-brand-dark/60 font-semibold">
                            {metric.label}
                          </p>
                          <p className="text-3xl font-serif font-semibold mt-1">{metric.value}</p>
                          <p className="text-xs text-brand-dark/60 mt-1">{metric.helper}</p>
                        </div>
                      </div>
                    </AdminCard>
                  </div>
                );
              })}
            </section>
          ) : (
            <AdminEmptyState
              title="Nenhum indicador disponivel"
              description="Seu perfil possui acesso de leitura restrito e nao ha indicadores liberados no momento."
            />
          )}

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AdminCard title="Ultimos leads" description="Contatos recentes recebidos pelo portal.">
              {canViewLeadsData ? (
                <AdminTable
                  columns={leadColumns}
                  rows={latestLeads}
                  rowKey={(row) => row.id}
                  emptyMessage={leadMessage ?? 'Nenhum lead recente encontrado.'}
                />
              ) : (
                <AdminEmptyState
                  title="Acesso restrito"
                  description={leadMessage ?? 'Seu perfil nao possui permissao para visualizar leads.'}
                />
              )}
            </AdminCard>

            <AdminCard
              title="Ultimos conteudos alterados"
              description="Atualizacoes recentes em lojas, lancamentos e paginas."
            >
              {updatesMessage ? (
                <AdminEmptyState
                  title="Dados de atualizacao indisponiveis"
                  description={updatesMessage}
                />
              ) : (
                <AdminTable
                  columns={updateColumns}
                  rows={latestUpdates}
                  rowKey={(row) => row.id}
                  emptyMessage="Ainda nao ha conteudos alterados para mostrar."
                />
              )}
            </AdminCard>
          </section>

          <AdminCard title="Newsletter" description="Resumo de acesso ao modulo comercial.">
            {canViewNewsletterData ? (
              <p className="text-sm text-brand-dark/70">
                Total de inscritos disponivel no dashboard: <strong>{totals.newsletterSubscribers}</strong>
              </p>
            ) : (
              <AdminEmptyState
                title="Acesso restrito"
                description={newsletterMessage ?? 'Seu perfil nao possui permissao para visualizar newsletter.'}
              />
            )}
          </AdminCard>
        </div>
      )}
    </>
  );
}
