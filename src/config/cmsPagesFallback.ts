import type { Page } from '../types/cms';

function createFallbackPage(
  slug: string,
  title: string,
  subtitle: string,
  content: string,
  seoTitle: string,
  seoDescription: string,
): Page {
  return {
    id: `fallback-page-${slug}`,
    slug,
    title,
    subtitle,
    content,
    hero_image_url: null,
    seo_title: seoTitle,
    seo_description: seoDescription,
    og_image_url: null,
    og_title: seoTitle,
    og_description: seoDescription,
    canonical_url: `/${slug}`,
    robots_index: true,
    robots_follow: true,
    is_published: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

const CMS_PAGES_FALLBACK: Record<string, Page> = {
  sobre: createFallbackPage(
    'sobre',
    'Sobre o Mega Polo Moda',
    'Shopping de moda atacadista no Bras',
    [
      'O Mega Polo Moda e uma plataforma comercial de moda atacadista localizada no Bras, em Sao Paulo.',
      'Aqui, compradores encontram lojas e marcas de diversos segmentos para montar pedidos com mais eficiencia.',
      'O portal integra guia de lojas, lancamentos e planejamento de visita para apoiar a jornada de compra.',
    ].join('\n\n'),
    'Sobre o Mega Polo Moda',
    'Conheca a estrutura comercial e os diferenciais do Mega Polo Moda no Bras.',
  ),
  privacidade: createFallbackPage(
    'privacidade',
    'Politica de Privacidade',
    'Uso de dados no portal Mega Polo Moda',
    [
      'Os dados informados nos formularios sao utilizados para contato comercial e atendimento das solicitacoes enviadas.',
      'As informacoes sao tratadas com controles de acesso e politicas de seguranca para reduzir riscos de acesso indevido.',
      'Para exercicio de direitos relacionados a dados pessoais, entre em contato pelos canais oficiais do Mega Polo Moda.',
    ].join('\n\n'),
    'Politica de Privacidade | Mega Polo Moda',
    'Entenda como o Mega Polo Moda trata dados pessoais no portal.',
  ),
  termos: createFallbackPage(
    'termos',
    'Termos de Uso',
    'Regras de utilizacao do portal',
    [
      'Ao utilizar o portal Mega Polo Moda, o usuario concorda com as condicoes de uso e com as politicas publicadas.',
      'As informacoes de lojas, lancamentos e contatos podem ser atualizadas sem aviso previo conforme disponibilidade.',
      'O uso de conteudos e marcas do portal deve respeitar direitos autorais e legislacao aplicavel.',
    ].join('\n\n'),
    'Termos de Uso | Mega Polo Moda',
    'Regras e condicoes para utilizacao do portal Shopping Mega Polo Moda.',
  ),
};

export function getFallbackCmsPage(slug: string): Page | null {
  return CMS_PAGES_FALLBACK[slug] ?? null;
}
