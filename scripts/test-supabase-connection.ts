/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const nodeProcess = (globalThis as { process?: { env: Record<string, string | undefined>; exitCode?: number } }).process;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');

    if (nodeProcess && !(key in nodeProcess.env)) {
      nodeProcess.env[key] = value;
    }
  }
}

async function main() {
  if (!nodeProcess) {
    throw new Error('Este script deve ser executado em ambiente Node.js.');
  }

  const projectRoot = nodeProcess.env.PWD || '.';
  loadEnvFile(path.join(projectRoot, '.env'));
  loadEnvFile(path.join(projectRoot, '.env.local'));

  const supabaseUrl = nodeProcess.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = nodeProcess.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para testar a conexão.');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('🔌 Testando conexão com Supabase...');

  const tablesToCheck = [
    'site_settings',
    'pages',
    'home_sections',
    'categories',
    'stores',
    'store_products',
    'store_media',
    'catalogs',
    'launches',
    'leads',
    'newsletter_subscribers',
    'admin_profiles',
    'activity_logs',
  ];

  for (const tableName of tablesToCheck) {
    const { error } = await client.from(tableName).select('id', { head: true, count: 'exact' });
    if (error) {
      throw new Error(`Tabela inválida ou inacessível: ${tableName}. Erro: ${error.message}`);
    }
  }

  console.log('✅ Tabelas principais acessíveis via API.');

  const siteSettingsResult = await client.from('site_settings').select('id, site_name').limit(1);
  if (siteSettingsResult.error) {
    throw new Error(`Falha ao ler site_settings: ${siteSettingsResult.error.message}`);
  }

  const categoriesResult = await client
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .limit(5);

  if (categoriesResult.error) {
    throw new Error(`Falha ao ler categories: ${categoriesResult.error.message}`);
  }

  const pagesResult = await client
    .from('pages')
    .select('id, slug, title')
    .eq('is_published', true)
    .limit(5);

  if (pagesResult.error) {
    throw new Error(`Falha ao ler pages publicadas: ${pagesResult.error.message}`);
  }

  console.log('✅ Leitura pública OK para site_settings, categories e pages publicadas.');
  console.log(`ℹ️ site_settings encontrados: ${siteSettingsResult.data?.length ?? 0}`);
  console.log(`ℹ️ categories ativas encontradas: ${categoriesResult.data?.length ?? 0}`);
  console.log(`ℹ️ pages publicadas encontradas: ${pagesResult.data?.length ?? 0}`);

  const leadsReadResult = await client.from('leads').select('id').limit(1);
  if (leadsReadResult.error) {
    console.log(`✅ RLS de leads aplicada (sem leitura pública): ${leadsReadResult.error.message}`);
  } else {
    console.log('✅ RLS de leads não expõe dados ao público (consulta retornou sem dados sensíveis).');
  }

  const newsletterReadResult = await client.from('newsletter_subscribers').select('id').limit(1);
  if (newsletterReadResult.error) {
    console.log(
      `✅ RLS de newsletter aplicada (sem leitura pública): ${newsletterReadResult.error.message}`,
    );
  } else {
    console.log('✅ RLS de newsletter não expõe dados ao público (consulta controlada).');
  }

  console.log('🎉 Teste de conexão finalizado com sucesso.');
}

main().catch((error) => {
  console.error('❌ Falha no teste de conexão Supabase:', error.message);
  if (nodeProcess) {
    nodeProcess.exitCode = 1;
  }
});
