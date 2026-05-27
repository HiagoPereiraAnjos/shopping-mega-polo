import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { CmsServiceResult, Lead, LeadFormPayload, LeadInsert } from '../types/cms';
import { logActivity } from '../lib/logActivity';

export type LeadStatus =
  | 'novo'
  | 'em_atendimento'
  | 'proposta_enviada'
  | 'visita_agendada'
  | 'fechado'
  | 'perdido';

export interface LeadsQueryOptions {
  query?: string;
  type?: string;
  status?: LeadStatus | 'all';
}

export interface CreateLeadPayload extends LeadFormPayload {
  status?: LeadStatus;
  consent?: boolean;
}

const ALLOWED_LEAD_STATUSES = new Set<LeadStatus>([
  'novo',
  'em_atendimento',
  'proposta_enviada',
  'visita_agendada',
  'fechado',
  'perdido',
]);

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function normalizeEmail(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.trim().toLowerCase();
}

function normalizePhone(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.trim();
}

function normalizeText(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.trim();
}

function hasValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

function hasValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 14) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calcDigit = (base: string, factors: number[]) => {
    const total = factors.reduce((sum, factor, index) => sum + Number(base[index]) * factor, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const base = digits.slice(0, 12);
  const digit1 = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(`${base}${digit1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits === `${base}${digit1}${digit2}`;
}

function isCommercialLead(type: string): boolean {
  const normalized = type.trim().toLowerCase();
  return normalized === 'leasing' || normalized === 'comercial';
}

function validateLeadInput(payload: CreateLeadPayload): string | null {
  if (!payload.type?.trim()) {
    return 'Informe o tipo de lead.';
  }

  if (!payload.name?.trim()) {
    return 'Informe o nome.';
  }

  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedCnpj = normalizeText(payload.cnpj);

  if (!normalizedEmail && !normalizedPhone) {
    return 'Informe e-mail ou telefone para contato.';
  }

  if (normalizedEmail && !hasValidEmail(normalizedEmail)) {
    return 'Informe um e-mail valido.';
  }

  if (normalizedPhone && !hasValidPhone(normalizedPhone)) {
    return 'Informe um telefone valido com DDD.';
  }

  if (normalizedCnpj && !hasValidCnpj(normalizedCnpj)) {
    return 'Informe um CNPJ valido.';
  }

  if (isCommercialLead(payload.type) && payload.consent !== true) {
    return 'Confirme o consentimento LGPD para enviar o formulario comercial.';
  }

  return null;
}

async function logLeadAction(
  action:
    | 'create_lead'
    | 'update_lead_status'
    | 'update_lead_notes'
    | 'delete_lead'
    | 'export_leads',
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  await logActivity({
    action,
    entity: 'leads',
    entity_id: entityId ?? null,
    metadata,
  });
}

function mapLeadErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes('row-level security')) {
    return 'Sua conta nao possui permissao para esta operacao de leads.';
  }
  return errorMessage;
}

export async function createLead(payload: CreateLeadPayload): Promise<CmsServiceResult<Lead>> {
  if (!supabase) {
    return missingConfigResult<Lead>();
  }

  const validationError = validateLeadInput(payload);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const leadPayload: LeadInsert = {
    type: payload.type.trim(),
    name: payload.name.trim(),
    email: normalizeEmail(payload.email),
    phone: normalizePhone(payload.phone),
    message: normalizeText(payload.message),
    company: normalizeText(payload.company),
    cnpj: normalizeText(payload.cnpj),
    segment: normalizeText(payload.segment),
    source_page: normalizeText(payload.source_page),
    status: payload.status ?? 'novo',
  };

  const { data, error } = await supabase.from('leads').insert(leadPayload).select('*').single();

  if (error) {
    return { data: null, error: mapLeadErrorMessage(error.message) };
  }

  await logLeadAction(
    'create_lead',
    {
      lead_id: data.id,
      type: data.type,
      source_page: data.source_page,
    },
    data.id,
  );

  return { data, error: null };
}

export async function listLeads(
  options: LeadsQueryOptions = {},
): Promise<CmsServiceResult<Lead[]>> {
  if (!supabase) {
    return missingConfigResult<Lead[]>();
  }

  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

  if (options.type?.trim()) {
    query = query.eq('type', options.type.trim());
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.query?.trim()) {
    const sanitized = options.query.replace(/[%_,]/g, '').trim();
    if (sanitized) {
      query = query.or(
        `name.ilike.%${sanitized}%,company.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: mapLeadErrorMessage(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function getLeads(): Promise<CmsServiceResult<Lead[]>> {
  return listLeads();
}

export async function getLeadById(id: string): Promise<CmsServiceResult<Lead>> {
  if (!supabase) {
    return missingConfigResult<Lead>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lead e obrigatorio.' };
  }

  const { data, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();

  if (error) {
    return { data: null, error: mapLeadErrorMessage(error.message) };
  }

  return { data: data ?? null, error: null };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<CmsServiceResult<Lead>> {
  if (!supabase) {
    return missingConfigResult<Lead>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lead e obrigatorio.' };
  }

  if (!ALLOWED_LEAD_STATUSES.has(status)) {
    return { data: null, error: 'Status de lead invalido.' };
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapLeadErrorMessage(error.message) };
  }

  await logLeadAction(
    'update_lead_status',
    {
      lead_id: data.id,
      status: data.status,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateLeadNotes(
  id: string,
  internalNotes: string,
): Promise<CmsServiceResult<Lead>> {
  if (!supabase) {
    return missingConfigResult<Lead>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lead e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ internal_notes: normalizeText(internalNotes) })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapLeadErrorMessage(error.message) };
  }

  await logLeadAction(
    'update_lead_notes',
    {
      lead_id: data.id,
      has_notes: !!data.internal_notes,
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteLead(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lead e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('leads')
    .select('id,name,status,type')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: mapLeadErrorMessage(existingError.message) };
  }

  if (!existing) {
    return { data: null, error: 'Lead nao encontrado.' };
  }

  const { error } = await supabase.from('leads').delete().eq('id', id);

  if (error) {
    return { data: null, error: mapLeadErrorMessage(error.message) };
  }

  await logLeadAction(
    'delete_lead',
    {
      lead_id: existing.id,
      name: existing.name,
      status: existing.status,
      type: existing.type,
    },
    existing.id,
  );

  return { data: { id }, error: null };
}

export async function logLeadExport(
  metadata: Record<string, unknown>,
): Promise<CmsServiceResult<{ success: true }>> {
  if (!supabase) {
    return missingConfigResult<{ success: true }>();
  }

  await logLeadAction('export_leads', metadata);
  return { data: { success: true }, error: null };
}
