# Edge Functions Recomendadas para Gestao de Usuarios Admin

Este projeto **nao** usa `service_role` no front-end.  
Para listar e convidar usuarios do Supabase Auth com seguranca, use Edge Functions server-side:

## 1) `admin-users-directory`

Objetivo:
- listar dados de `auth.users` para complementar `admin_profiles` no CMS.

Resposta esperada:

```json
{
  "users": [
    {
      "user_id": "uuid",
      "email": "usuario@dominio.com",
      "last_sign_in_at": "2026-05-27T12:30:00.000Z",
      "invited_at": "2026-05-26T18:00:00.000Z",
      "created_at": "2026-05-26T17:50:00.000Z"
    }
  ]
}
```

Regra de seguranca minima:
- validar JWT do chamador;
- verificar no banco se o chamador tem `can_manage_users()` (super_admin);
- somente entao consultar `auth.users` via client admin (service role no backend).

## 2) `admin-invite-user`

Objetivo:
- enviar convite por e-mail com `supabase.auth.admin.inviteUserByEmail`;
- opcionalmente criar/atualizar `admin_profiles` com role inicial.

Payload esperado:

```json
{
  "email": "novo@dominio.com",
  "name": "Novo Usuario",
  "role": "viewer"
}
```

Resposta esperada:

```json
{
  "user": {
    "user_id": "uuid",
    "email": "novo@dominio.com",
    "last_sign_in_at": null,
    "invited_at": "2026-05-27T13:00:00.000Z",
    "created_at": "2026-05-27T13:00:00.000Z"
  }
}
```

Regra de seguranca minima:
- validar JWT;
- permitir apenas `super_admin`;
- nao aceitar role fora de `super_admin|admin|editor|viewer`;
- registrar log em `activity_logs` (`update_admin_profile` ou acao dedicada).

## Variaveis necessarias (apenas no backend da Function)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no front-end.
