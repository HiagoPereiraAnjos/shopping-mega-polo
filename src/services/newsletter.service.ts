import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type {
  CmsServiceResult,
  NewsletterInsert,
  NewsletterPayload,
  NewsletterSubscriber,
} from '../types/cms';
import type { Json } from '../types/database';

export type NewsletterStatus = 'active' | 'inactive';

export interface NewsletterQueryOptions {
  query?: string;
  status?: NewsletterStatus | 'all';
}

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name?: string | null): string | null {
  if (!name?.trim()) {
    return null;
  }
  return name.trim();
}

function hasValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapNewsletterError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('duplicate key value') || lower.includes('already exists')) {
    return 'Este e-mail ja esta inscrito na newsletter.';
  }

  if (lower.includes('row-level security')) {
    return 'Sua conta nao possui permissao para esta operacao.';
  }

  return message;
}

async function logNewsletterAction(
  action: 'unsubscribe_newsletter',
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase.from('activity_logs').insert({
    user_id: authData.user?.id ?? null,
    action,
    entity: 'newsletter_subscribers',
    entity_id: entityId ?? null,
    metadata: metadata as Json,
  });

  if (error && import.meta.env.DEV) {
    console.warn('Falha ao registrar log de newsletter:', error.message);
  }
}

export async function subscribeNewsletter(
  payload: NewsletterPayload,
): Promise<CmsServiceResult<NewsletterSubscriber>> {
  if (!supabase) {
    return missingConfigResult<NewsletterSubscriber>();
  }

  const email = normalizeEmail(payload.email || '');

  if (!email || !hasValidEmail(email)) {
    return { data: null, error: 'Informe um e-mail valido.' };
  }

  if (payload.consent === false) {
    return { data: null, error: 'E necessario consentir para receber comunicacoes.' };
  }

  const insertPayload: NewsletterInsert = {
    email,
    name: normalizeName(payload.name),
    status: 'active',
    consent: true,
  };

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapNewsletterError(error.message) };
  }

  return { data, error: null };
}

export async function listNewsletterSubscribers(
  options: NewsletterQueryOptions = {},
): Promise<CmsServiceResult<NewsletterSubscriber[]>> {
  if (!supabase) {
    return missingConfigResult<NewsletterSubscriber[]>();
  }

  let query = supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.query?.trim()) {
    const sanitized = options.query.replace(/[%_,]/g, '').trim();
    if (sanitized) {
      query = query.or(`email.ilike.%${sanitized}%,name.ilike.%${sanitized}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: mapNewsletterError(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function getNewsletterSubscribers(): Promise<CmsServiceResult<NewsletterSubscriber[]>> {
  return listNewsletterSubscribers();
}

export async function updateNewsletterSubscriberStatus(
  id: string,
  status: NewsletterStatus,
): Promise<CmsServiceResult<NewsletterSubscriber>> {
  if (!supabase) {
    return missingConfigResult<NewsletterSubscriber>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do inscrito e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapNewsletterError(error.message) };
  }

  return { data, error: null };
}

export async function unsubscribeNewsletter(
  id: string,
): Promise<CmsServiceResult<NewsletterSubscriber>> {
  if (!supabase) {
    return missingConfigResult<NewsletterSubscriber>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do inscrito e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'inactive' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapNewsletterError(error.message) };
  }

  await logNewsletterAction(
    'unsubscribe_newsletter',
    {
      subscriber_id: data.id,
      email: data.email,
      status: data.status,
    },
    data.id,
  );

  return { data, error: null };
}
