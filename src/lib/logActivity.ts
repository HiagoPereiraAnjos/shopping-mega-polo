import { createActivityLog } from '../services/activityLogs.service';
import type { Json } from '../types/database';

export interface LogActivityPayload {
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: unknown;
}

export async function logActivity(payload: LogActivityPayload): Promise<void> {
  const result = await createActivityLog({
    ...payload,
    metadata: (payload.metadata ?? {}) as Json,
  });

  if (result.error && import.meta.env.DEV) {
    console.warn(
      `Falha ao registrar log de atividade (${payload.action}/${payload.entity}):`,
      result.error,
    );
  }
}
