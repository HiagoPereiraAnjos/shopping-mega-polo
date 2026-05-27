import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Mail, RefreshCcw, Save, Search, Shield, UserCog, UserPlus } from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import {
  canManageUsers,
  getRoleLabel,
  hasRole,
  type AdminRole,
} from '../../lib/permissions';
import {
  listAdminProfiles,
  updateAdminProfile,
} from '../../services/adminProfiles.service';
import {
  inviteAdminUser,
  listAdminAuthDirectory,
  type AdminAuthDirectoryEntry,
} from '../../services/adminUserManagement.service';
import type { AdminProfile } from '../../types/cms';
import { normalizeSearchText } from '../../utils/storeMappers';

const ROLE_OPTIONS: AdminRole[] = ['super_admin', 'admin', 'editor', 'viewer'];

const ROLE_ORDER: Record<AdminRole, number> = {
  super_admin: 0,
  admin: 1,
  editor: 2,
  viewer: 3,
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleString('pt-BR');
}

function formatOptionalDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
}

function getRoleTone(role: string) {
  if (role === 'super_admin') {
    return 'warning' as const;
  }
  if (role === 'admin') {
    return 'published' as const;
  }
  if (role === 'editor') {
    return 'info' as const;
  }
  if (role === 'viewer') {
    return 'neutral' as const;
  }
  return 'draft' as const;
}

function sortProfiles(profiles: AdminProfile[]): AdminProfile[] {
  return [...profiles].sort((a, b) => {
    const roleA = ROLE_ORDER[(a.role as AdminRole) ?? 'viewer'] ?? 99;
    const roleB = ROLE_ORDER[(b.role as AdminRole) ?? 'viewer'] ?? 99;
    if (roleA !== roleB) {
      return roleA - roleB;
    }

    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }

    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export default function UsersAdmin() {
  const { profile, user } = useAuth();

  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [authDirectoryByUserId, setAuthDirectoryByUserId] = useState<Record<string, AdminAuthDirectoryEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directoryWarning, setDirectoryWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [roleDraft, setRoleDraft] = useState<AdminRole>('viewer');
  const [activeDraft, setActiveDraft] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('viewer');

  const canManage = canManageUsers(profile);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDirectoryWarning(null);

    const [profilesResult, directoryResult] = await Promise.all([
      listAdminProfiles(),
      listAdminAuthDirectory(),
    ]);
    setIsLoading(false);

    if (profilesResult.error) {
      setError(profilesResult.error);
      return;
    }

    if (directoryResult.error) {
      setDirectoryWarning(directoryResult.error);
      setAuthDirectoryByUserId({});
    } else {
      const index: Record<string, AdminAuthDirectoryEntry> = {};
      (directoryResult.data ?? []).forEach((entry) => {
        index[entry.user_id] = entry;
      });
      setAuthDirectoryByUserId(index);
    }

    const rows = sortProfiles(profilesResult.data ?? []);
    setProfiles(rows);

    if (selectedId) {
      const selected = rows.find((item) => item.id === selectedId);
      if (!selected) {
        setSelectedId(null);
      }
    }
  }, [selectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfiles();
  }, [loadProfiles]);

  const filteredProfiles = useMemo(() => {
    const query = normalizeSearchText(searchTerm);

    return profiles.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? item.is_active : !item.is_active);

      const directoryInfo = authDirectoryByUserId[item.user_id];
      const searchBlob = normalizeSearchText(
        `${item.name} ${item.user_id} ${item.role} ${directoryInfo?.email ?? ''}`,
      );
      const matchesSearch = !query || searchBlob.includes(query);

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [authDirectoryByUserId, profiles, roleFilter, searchTerm, statusFilter]);

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedId) ?? null,
    [profiles, selectedId],
  );
  const activeSuperAdminCount = useMemo(
    () => profiles.filter((item) => item.role === 'super_admin' && item.is_active).length,
    [profiles],
  );
  const isSelectedLastSuperAdmin = useMemo(
    () => Boolean(
      selectedProfile
      && selectedProfile.role === 'super_admin'
      && selectedProfile.is_active
      && activeSuperAdminCount <= 1,
    ),
    [activeSuperAdminCount, selectedProfile],
  );

  const handleSelectProfile = (item: AdminProfile) => {
    setSelectedId(item.id);
    setNameDraft(item.name);
    setRoleDraft((item.role as AdminRole) ?? 'viewer');
    setActiveDraft(item.is_active);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) {
      return;
    }

    if (!canManage) {
      setError('Sua conta nao possui permissao para gerenciar usuarios.');
      return;
    }

    if (selectedProfile.user_id === user?.id && !activeDraft) {
      setError('Nao e permitido desativar o proprio usuario em uso.');
      return;
    }

    const superAdminWouldBeDemoted = roleDraft !== 'super_admin';
    const superAdminWouldBeDeactivated = !activeDraft;
    const wouldAffectLastSuperAdmin =
      isSelectedLastSuperAdmin && (superAdminWouldBeDemoted || superAdminWouldBeDeactivated);

    if (wouldAffectLastSuperAdmin) {
      setError('Nao e permitido rebaixar ou desativar o ultimo super_admin ativo.');
      return;
    }

    if (
      selectedProfile.role === 'super_admin' &&
      roleDraft !== 'super_admin' &&
      !hasRole(profile, ['super_admin'])
    ) {
      setError('Apenas super_admin pode rebaixar outro super_admin.');
      return;
    }

    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await updateAdminProfile(
      selectedProfile.id,
      {
        name: nameDraft,
        role: roleDraft,
        is_active: activeDraft,
      },
      profile,
    );

    setIsMutating(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Falha ao atualizar perfil administrativo.');
      return;
    }

    setProfiles((prev) =>
      sortProfiles(
        prev.map((item) => (item.id === result.data?.id ? result.data : item)),
      ),
    );
    setSuccessMessage('Perfil administrativo atualizado com sucesso.');
  };

  const handleInviteUser = async () => {
    if (!canManage) {
      setInviteError('Apenas super_admin pode enviar convites administrativos.');
      return;
    }

    if (!inviteName.trim()) {
      setInviteError('Informe o nome do usuario antes de enviar o convite.');
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setInviteError('Informe um e-mail valido para enviar o convite.');
      return;
    }

    setInviteError(null);
    setInviteSuccessMessage(null);
    setIsInviting(true);

    const result = await inviteAdminUser({
      email: normalizedEmail,
      name: inviteName,
      role: inviteRole,
    });

    setIsInviting(false);

    if (result.error || !result.data) {
      setInviteError(result.error ?? 'Nao foi possivel enviar o convite.');
      return;
    }

    setAuthDirectoryByUserId((prev) => ({
      ...prev,
      [result.data.user_id]: result.data,
    }));
    setInviteEmail('');
    setInviteName('');
    setInviteRole('viewer');
    setInviteSuccessMessage(
      'Convite enviado. Se o perfil admin_profiles nao for criado automaticamente, finalize com a insercao manual.',
    );

    await loadProfiles();
  };

  const columns: Array<AdminTableColumn<AdminProfile>> = [
    {
      key: 'name',
      label: 'Usuario',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.name}</p>
          <p className="text-xs text-brand-dark/60 break-all">{row.user_id}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (row) => {
        const email = authDirectoryByUserId[row.user_id]?.email ?? (row.user_id === user?.id ? user.email ?? null : null);
        return (
          <div className="space-y-1">
            <p className="text-sm text-brand-dark break-all">{email ?? 'Nao disponivel no cliente'}</p>
            {!email && (
              <p className="text-[11px] text-brand-dark/55">Requer Edge Function com service_role no backend</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'role',
      label: 'Papel',
      render: (row) => (
        <StatusBadge label={getRoleLabel(row.role)} tone={getRoleTone(row.role)} />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          label={row.is_active ? 'Ativo' : 'Inativo'}
          tone={row.is_active ? 'success' : 'draft'}
        />
      ),
    },
    {
      key: 'last_access',
      label: 'Ultimo acesso',
      render: (row) => {
        const lastAccess =
          authDirectoryByUserId[row.user_id]?.last_sign_in_at
          ?? (row.user_id === user?.id ? user.last_sign_in_at ?? null : null);
        return <span className="text-xs text-brand-dark/70">{formatOptionalDate(lastAccess)}</span>;
      },
    },
    {
      key: 'updated',
      label: 'Atualizado em',
      render: (row) => (
        <span className="text-xs text-brand-dark/70">{formatDate(row.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleSelectProfile(row)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
        >
          <UserCog className="w-3.5 h-3.5" />
          Editar
        </button>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Usuarios | CMS Mega Polo Moda"
        description="Gerencie usuarios administrativos, papeis e status de acesso ao CMS."
      />

      <AdminPageHeader
        title="Usuarios Administrativos"
        description="Controle papeis e status da tabela admin_profiles para governanca do CMS."
        actions={(
          <button
            type="button"
            onClick={() => void loadProfiles()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        )}
      />

      {!canManage && (
        <AdminErrorState
          title="Permissao insuficiente"
          message="Apenas super_admin pode gerenciar usuarios administrativos."
        />
      )}

      {canManage && isLoading && <AdminLoadingState label="Carregando usuarios administrativos..." />}

      {canManage && !isLoading && error && (
        <AdminErrorState message={error} onRetry={() => void loadProfiles()} />
      )}

      {canManage && !isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <AdminCard
            title="Perfis administrativos"
            description="Liste e filtre os usuarios cadastrados em admin_profiles."
          >
            <div className="space-y-4">
              {directoryWarning && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3" role="status">
                  {directoryWarning}
                </p>
              )}

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
                    placeholder="Buscar por nome, e-mail, role ou user_id"
                    className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | AdminRole)}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todos os papeis</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>

              {filteredProfiles.length === 0 ? (
                <AdminEmptyState
                  title="Nenhum perfil encontrado"
                  description={
                    profiles.length
                      ? 'Ajuste os filtros para localizar usuarios administrativos.'
                      : 'Ainda nao ha registros em admin_profiles.'
                  }
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={filteredProfiles}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhum perfil administrativo encontrado."
                />
              )}
            </div>
          </AdminCard>

          <div className="space-y-6">
            <AdminCard
              title="Editar perfil"
              description="Altere nome, papel e status de acesso do usuario selecionado."
            >
              {!selectedProfile ? (
                <AdminEmptyState
                  title="Selecione um usuario"
                  description="Clique em Editar na tabela para ajustar nome, papel e status."
                />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3 space-y-1.5">
                    <p className="text-xs text-brand-dark/60 break-all">
                      user_id: {selectedProfile.user_id}
                    </p>
                    <p className="text-sm text-brand-dark flex items-center gap-2 break-all">
                      <Mail className="w-4 h-4 text-brand-dark/50" />
                      {authDirectoryByUserId[selectedProfile.user_id]?.email
                        ?? (selectedProfile.user_id === user?.id ? user.email ?? null : null)
                        ?? 'E-mail nao disponivel no cliente'}
                    </p>
                    <p className="text-sm text-brand-dark/75 flex items-center gap-2">
                      <Clock3 className="w-4 h-4 text-brand-dark/50" />
                      Ultimo acesso: {formatOptionalDate(
                        authDirectoryByUserId[selectedProfile.user_id]?.last_sign_in_at
                          ?? (selectedProfile.user_id === user?.id ? user.last_sign_in_at ?? null : null),
                      )}
                    </p>
                  </div>

                  {isSelectedLastSuperAdmin && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      Este usuario e o ultimo super_admin ativo. Rebaixamento ou desativacao estao bloqueados.
                    </p>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="admin-user-name" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Nome
                    </label>
                    <input
                      id="admin-user-name"
                      type="text"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="admin-user-role" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Papel
                    </label>
                    <select
                      id="admin-user-role"
                      value={roleDraft}
                      onChange={(event) => setRoleDraft(event.target.value as AdminRole)}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                      disabled={isMutating}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option
                          key={role}
                          value={role}
                          disabled={isSelectedLastSuperAdmin && role !== 'super_admin'}
                        >
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-brand-dark">
                    <input
                      type="checkbox"
                      checked={activeDraft}
                      onChange={(event) => setActiveDraft(event.target.checked)}
                      className="h-4 w-4 rounded border-brand-dark/30 text-brand-red focus:ring-brand-red/30"
                      disabled={isMutating || isSelectedLastSuperAdmin || selectedProfile.user_id === user?.id}
                    />
                    Usuario ativo no CMS
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={isMutating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isMutating ? 'Salvando...' : 'Salvar perfil'}
                  </button>
                </div>
              )}
            </AdminCard>

            <AdminCard
              title="Convite de novo usuario"
              description="Fluxo seguro via Edge Function (server-side). Nao usa service_role no front-end."
            >
              <div className="space-y-4 text-sm text-brand-dark/80">
                {inviteError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                    {inviteError}
                  </p>
                )}
                {inviteSuccessMessage && (
                  <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                    {inviteSuccessMessage}
                  </p>
                )}

                <div className="space-y-2">
                  <label htmlFor="invite-name" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Nome do usuario
                  </label>
                  <input
                    id="invite-name"
                    type="text"
                    value={inviteName}
                    onChange={(event) => setInviteName(event.target.value)}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    placeholder="Ex: Ana Souza"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="invite-email" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    E-mail
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    placeholder="nome@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="invite-role" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Papel inicial
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as AdminRole)}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void handleInviteUser()}
                  disabled={isInviting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4" />
                  {isInviting ? 'Enviando convite...' : 'Enviar convite seguro'}
                </button>

                <p className="font-semibold text-brand-dark flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-red" />
                  Fallback manual (sem Edge Function)
                </p>
                <pre className="text-xs bg-brand-paper border border-brand-dark/10 rounded-xl p-3 overflow-x-auto">
{`insert into public.admin_profiles (user_id, name, role, is_active)
values ('<auth_user_uuid>', 'Novo usuario CMS', 'viewer', true);`}
                </pre>
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </>
  );
}
