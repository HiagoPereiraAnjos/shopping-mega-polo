-- Seed data for Mega Polo Moda CMS

insert into public.site_settings (
  site_name,
  short_description,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  whatsapp,
  email,
  phone,
  address,
  instagram_url,
  facebook_url,
  linkedin_url,
  opening_hours,
  institutional_image_url,
  footer_newsletter_title,
  footer_newsletter_text,
  footer_newsletter_button_label,
  footer_copyright_text,
  footer_institutional_phrase,
  youtube_url,
  footer_legal_text,
  copyright_text,
  copyright_year,
  default_whatsapp_message,
  leasing_whatsapp_message,
  planning_whatsapp_message,
  hotel_whatsapp_message,
  business_center_whatsapp_message,
  login_title,
  login_subtitle,
  login_image_url,
  default_og_image_url,
  google_analytics_id,
  google_tag_manager_id,
  meta_pixel_id,
  custom_head_scripts,
  custom_body_scripts
)
select
  'Shopping Mega Polo Moda',
  'Shopping de moda atacadista no Brás.',
  '/images/logo-mega-polo.png',
  '#E30613',
  '#1A1A1A',
  '#D4AF37',
  '5511999999999',
  'contato@megapolomoda.com.br',
  '(11) 3311-2800',
  'Rua Barão de Ladário, 670 - Brás, São Paulo - SP',
  'https://www.instagram.com/megapolomoda',
  null,
  null,
  'Segunda a sábado, das 6h às 18h',
  null,
  'Insights',
  'Receba os destaques do Bras em seu e-mail.',
  'Cadastrar',
  'Shopping Mega Polo Moda',
  'Referencia em moda atacadista no Bras.',
  'https://www.youtube.com/@megapolomoda',
  'Informacoes sujeitas a alteracao sem aviso previo.',
  'Mega Polo Moda',
  to_char(now(), 'YYYY'),
  'Ola, gostaria de mais informacoes sobre o Mega Polo Moda.',
  'Ola, tenho interesse em abrir uma loja no Mega Polo Moda e gostaria de mais informacoes.',
  'Ola, gostaria de mais informacoes sobre o planejamento de visita ao Mega Polo Moda.',
  'Ola, gostaria de informacoes sobre hospedagem no Hotel Mega Polo.',
  'Ola, gostaria de informacoes sobre o Centro Empresarial do Mega Polo Moda.',
  'Area do Lojista',
  'Acesse para gerenciar sua loja, lancamentos e informacoes comerciais.',
  '/images/logo-mega-polo.png',
  '/images/logo-mega-polo.png',
  null,
  null,
  null,
  null,
  null
where not exists (select 1 from public.site_settings);

update public.site_settings
set
  footer_newsletter_title = coalesce(nullif(footer_newsletter_title, ''), 'Insights'),
  footer_newsletter_text = coalesce(nullif(footer_newsletter_text, ''), 'Receba os destaques do Bras em seu e-mail.'),
  footer_newsletter_button_label = coalesce(nullif(footer_newsletter_button_label, ''), 'Cadastrar'),
  footer_copyright_text = coalesce(nullif(footer_copyright_text, ''), 'Shopping Mega Polo Moda'),
  footer_institutional_phrase = coalesce(nullif(footer_institutional_phrase, ''), 'Referencia em moda atacadista no Bras.'),
  youtube_url = coalesce(nullif(youtube_url, ''), 'https://www.youtube.com/@megapolomoda'),
  footer_legal_text = coalesce(nullif(footer_legal_text, ''), 'Informacoes sujeitas a alteracao sem aviso previo.'),
  copyright_text = coalesce(nullif(copyright_text, ''), nullif(footer_copyright_text, ''), 'Mega Polo Moda'),
  copyright_year = coalesce(nullif(copyright_year, ''), to_char(now(), 'YYYY')),
  default_whatsapp_message = coalesce(
    nullif(default_whatsapp_message, ''),
    'Ola, gostaria de mais informacoes sobre o Mega Polo Moda.'
  ),
  leasing_whatsapp_message = coalesce(
    nullif(leasing_whatsapp_message, ''),
    'Ola, tenho interesse em abrir uma loja no Mega Polo Moda e gostaria de mais informacoes.'
  ),
  planning_whatsapp_message = coalesce(
    nullif(planning_whatsapp_message, ''),
    'Ola, gostaria de mais informacoes sobre o planejamento de visita ao Mega Polo Moda.'
  ),
  hotel_whatsapp_message = coalesce(
    nullif(hotel_whatsapp_message, ''),
    'Ola, gostaria de informacoes sobre hospedagem no Hotel Mega Polo.'
  ),
  business_center_whatsapp_message = coalesce(
    nullif(business_center_whatsapp_message, ''),
    'Ola, gostaria de informacoes sobre o Centro Empresarial do Mega Polo Moda.'
  ),
  login_title = coalesce(nullif(login_title, ''), 'Area do Lojista'),
  login_subtitle = coalesce(
    nullif(login_subtitle, ''),
    'Acesse para gerenciar sua loja, lancamentos e informacoes comerciais.'
  ),
  login_image_url = coalesce(nullif(login_image_url, ''), nullif(logo_url, ''), '/images/logo-mega-polo.png'),
  default_og_image_url = coalesce(
    nullif(default_og_image_url, ''),
    nullif(institutional_image_url, ''),
    nullif(logo_url, ''),
    '/images/logo-mega-polo.png'
  );

insert into public.categories (name, slug, description, icon, color, sort_order, is_active)
values
  ('Moda Feminina', 'moda-feminina', 'Lojas de moda feminina atacadista.', 'shirt', '#E30613', 1, true),
  ('Moda Masculina', 'moda-masculina', 'Marcas e lojas de moda masculina.', 'shirt', '#1A1A1A', 2, true),
  ('Moda Infantil', 'moda-infantil', 'Moda infantil para diferentes faixas etárias.', 'baby', '#4A90E2', 3, true),
  ('Moda Íntima', 'moda-intima', 'Moda íntima, lingerie e pijamas.', 'sparkles', '#C2185B', 4, true),
  ('Jeans', 'jeans', 'Jeanswear e denim para revenda.', 'badge', '#1E3A8A', 5, true),
  ('Calçados', 'calcados', 'Calçados e acessórios para lojistas.', 'footprints', '#7C3AED', 6, true),
  ('Acessórios', 'acessorios', 'Bolsas, bijuterias e acessórios de moda.', 'gem', '#0F766E', 7, true),
  ('Plus Size', 'plus-size', 'Moda plus size atacadista.', 'circle', '#B45309', 8, true),
  ('Moda Festa', 'moda-festa', 'Vestidos e peças para festa.', 'star', '#BE123C', 9, true),
  ('Alimentação', 'alimentacao', 'Praça de alimentação e serviços.', 'utensils', '#166534', 10, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.home_sections (
  section_key,
  title,
  subtitle,
  content,
  button_label,
  button_url,
  sort_order,
  is_active
)
values
  (
    'hero',
    'Encontre lojas e marcas de moda atacadista no Brás',
    'Shopping de moda atacadista no Brás',
    'Explore categorias, lançamentos e planeje sua visita ao Mega Polo Moda.',
    'Encontrar lojas',
    '/lojas',
    1,
    true
  ),
  (
    'categories_highlight',
    'Categorias em destaque',
    'Navegue pelos principais segmentos',
    'Acesse rapidamente as categorias mais buscadas por compradores.',
    'Ver categorias',
    '/lojas',
    2,
    true
  ),
  (
    'featured_stores',
    'Lojas em destaque',
    'Seleção de marcas de moda atacadista',
    'Conheça vitrines e oportunidades comerciais do shopping.',
    'Ver lojas',
    '/lojas',
    3,
    true
  ),
  (
    'launches_highlight',
    'Novidades das marcas',
    'Lançamentos e coleções',
    'Acompanhe as novidades das lojas do Mega Polo Moda.',
    'Ver lançamentos',
    '/lancamentos',
    4,
    true
  ),
  (
    'how_to_buy',
    'Como comprar no Mega Polo',
    'Passo a passo para compradores',
    'Busque lojas, veja lançamentos, salve no roteiro e planeje sua visita.',
    'Planejar visita',
    '/planeje-sua-visita',
    5,
    true
  ),
  (
    'planning_visit',
    'Planeje sua visita',
    'Estrutura completa no Brás',
    'Confira horários, endereço, hotel, estacionamento e alimentação.',
    'Planeje sua visita',
    '/planeje-sua-visita',
    6,
    true
  ),
  (
    'leasing_cta',
    'Abra sua loja no Mega Polo Moda',
    'Mais visibilidade para sua marca',
    'Conheça o espaço e envie seu interesse comercial para locação.',
    'Abrir minha loja',
    '/abra-sua-loja',
    7,
    true
  ),
  (
    'newsletter_cta',
    'Receba novidades do Mega Polo Moda',
    'Conteúdo comercial e lançamentos',
    'Cadastre-se para acompanhar novidades das lojas e do shopping.',
    'Cadastrar e-mail',
    '/#newsletter',
    8,
    true
  )
on conflict (section_key) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  content = excluded.content,
  button_label = excluded.button_label,
  button_url = excluded.button_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.pages (
  slug,
  title,
  subtitle,
  content,
  seo_title,
  seo_description,
  is_published
)
values
  (
    'sobre',
    'Sobre o Mega Polo Moda',
    'Referência em moda atacadista no Brás',
    'Conheça a história, estrutura e diferenciais do Shopping Mega Polo Moda.',
    'Sobre o Mega Polo Moda',
    'Informações institucionais sobre o Shopping Mega Polo Moda no Brás.',
    true
  ),
  (
    'planeje-sua-visita',
    'Planeje sua visita',
    'Informações úteis para compradores',
    'Veja como chegar, horários, hotel, estacionamento e alimentação.',
    'Planeje sua visita | Mega Polo Moda',
    'Organize sua visita ao Shopping Mega Polo Moda com praticidade.',
    true
  ),
  (
    'abra-sua-loja',
    'Abra sua loja',
    'Seja lojista no Mega Polo Moda',
    'Envie seu interesse comercial para locação de espaço no shopping.',
    'Abra sua loja | Mega Polo Moda',
    'Saiba como abrir sua loja no Shopping Mega Polo Moda.',
    true
  ),
  (
    'privacidade',
    'Política de Privacidade',
    null,
    'Consulte como tratamos os dados pessoais no portal do Mega Polo Moda.',
    'Política de Privacidade | Mega Polo Moda',
    'Política de Privacidade do portal Shopping Mega Polo Moda.',
    true
  ),
  (
    'termos',
    'Termos de Uso',
    null,
    'Regras de uso do portal Shopping Mega Polo Moda.',
    'Termos de Uso | Mega Polo Moda',
    'Termos e condições de uso do portal Shopping Mega Polo Moda.',
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  content = excluded.content,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_published = excluded.is_published;

insert into public.content_blocks (
  page_key,
  block_key,
  block_type,
  title,
  subtitle,
  content,
  button_label,
  button_url,
  secondary_button_label,
  secondary_button_url,
  settings,
  sort_order,
  is_active
)
values
  (
    'home',
    'hero_banner',
    'hero',
    'Encontre lojas e marcas de moda atacadista no Bras',
    'Shopping de moda atacadista no Bras',
    'Explore categorias, lancamentos e organize sua visita com mais agilidade.',
    'Encontrar lojas',
    '/lojas',
    'Ver lancamentos',
    '/lancamentos',
    '{"theme":"premium-light","show_search":true}'::jsonb,
    1,
    true
  ),
  (
    'home',
    'commercial_steps',
    'steps',
    'Como comprar no Mega Polo',
    'Passo a passo para compradores',
    'Do planejamento ate o contato com as lojas.',
    null,
    null,
    null,
    null,
    '{"layout":"cards"}'::jsonb,
    2,
    true
  ),
  (
    'stores',
    'stores_intro',
    'intro',
    'Guia de lojas',
    'Lojas e marcas de diversos segmentos',
    'Use filtros por categoria, piso e catalogo digital para encontrar oportunidades.',
    'Ver lancamentos',
    '/lancamentos',
    null,
    null,
    '{}'::jsonb,
    1,
    true
  ),
  (
    'store_detail',
    'store_contact_cta',
    'cta',
    'Atendimento comercial da loja',
    'Fale com a equipe e consulte condicoes',
    'Use os canais oficiais para tirar duvidas e solicitar atendimento.',
    'Falar no WhatsApp',
    '',
    'Ver outras lojas',
    '/lojas',
    '{"dynamic_whatsapp":true}'::jsonb,
    1,
    true
  ),
  (
    'launches',
    'launches_intro',
    'intro',
    'Novidades das marcas',
    'Colecoes e destaques do atacado',
    'Acompanhe os lancamentos publicados pelas lojas do Mega Polo Moda.',
    'Ver lojas',
    '/lojas',
    null,
    null,
    '{}'::jsonb,
    1,
    true
  ),
  (
    'planning',
    'planning_visit_info',
    'institutional',
    'Planeje sua visita',
    'Estrutura completa no Bras',
    'Endereco, horarios e facilidades para compradores de diferentes regioes.',
    'Abrir no mapa',
    'https://maps.google.com',
    'Meu roteiro',
    '/meu-roteiro',
    '{"show_hotel":true,"show_parking":true}'::jsonb,
    1,
    true
  ),
  (
    'leasing',
    'leasing_intro',
    'form_intro',
    'Abra sua loja no Mega Polo Moda',
    'Mais visibilidade para sua marca',
    'Preencha o formulario para iniciar seu atendimento comercial.',
    'Enviar interesse',
    '/abra-sua-loja',
    null,
    null,
    '{"requires_lgpd_consent":true}'::jsonb,
    1,
    true
  ),
  (
    'my_route',
    'route_summary',
    'summary',
    'Meu roteiro de compras',
    'Organize lojas por piso',
    'Salve, edite e compartilhe seu roteiro com praticidade.',
    'Copiar roteiro',
    '/meu-roteiro',
    null,
    null,
    '{"group_by_floor":true}'::jsonb,
    1,
    true
  ),
  (
    'login',
    'admin_login_intro',
    'auth',
    'Acesso administrativo',
    'Painel CMS Mega Polo Moda',
    'Entre com suas credenciais para gerenciar o conteudo institucional.',
    'Entrar',
    '/login',
    'Recuperar senha',
    '/login?reset=true',
    '{"noindex":true}'::jsonb,
    1,
    true
  ),
  (
    'not_found',
    'not_found_cta',
    'error',
    'Pagina nao encontrada',
    'Este conteudo nao esta disponivel',
    'A pagina procurada nao existe ou foi movida.',
    'Voltar para Home',
    '/',
    'Ver lojas',
    '/lojas',
    '{}'::jsonb,
    1,
    true
  ),
  (
    'navbar',
    'main_navigation',
    'navigation',
    'Navegacao principal',
    null,
    null,
    null,
    null,
    null,
    null,
    '{"mobile_menu":true}'::jsonb,
    1,
    true
  ),
  (
    'footer',
    'footer_links',
    'footer',
    'Links institucionais',
    null,
    null,
    null,
    null,
    null,
    null,
    '{"show_social":true}'::jsonb,
    1,
    true
  )
on conflict (page_key, block_key) do update
set
  block_type = excluded.block_type,
  title = excluded.title,
  subtitle = excluded.subtitle,
  content = excluded.content,
  button_label = excluded.button_label,
  button_url = excluded.button_url,
  secondary_button_label = excluded.secondary_button_label,
  secondary_button_url = excluded.secondary_button_url,
  settings = excluded.settings,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.content_block_items (
  block_id,
  title,
  subtitle,
  content,
  icon,
  sort_order,
  is_active
)
select
  cb.id,
  item.title,
  item.subtitle,
  item.content,
  item.icon,
  item.sort_order,
  true
from public.content_blocks cb
join (
  values
    ('home', 'commercial_steps', 'Busque lojas por categoria', null, 'Encontre segmentos e marcas com filtros rapidos.', 'search', 1),
    ('home', 'commercial_steps', 'Veja lancamentos das marcas', null, 'Acompanhe novidades e colecoes por loja.', 'sparkles', 2),
    ('home', 'commercial_steps', 'Adicione lojas ao roteiro', null, 'Organize sua visita por piso e prioridade.', 'route', 3),
    ('home', 'commercial_steps', 'Visite ou fale por WhatsApp', null, 'Escolha o melhor canal para fechar pedidos.', 'message-circle', 4),
    ('navbar', 'main_navigation', 'Lojas', null, '/lojas', null, 1),
    ('navbar', 'main_navigation', 'Lancamentos', null, '/lancamentos', null, 2),
    ('navbar', 'main_navigation', 'Planeje sua visita', null, '/planeje-sua-visita', null, 3),
    ('footer', 'footer_links', 'Guia de Lojas', null, '/lojas', null, 1),
    ('footer', 'footer_links', 'Area do Lojista', null, '/login', null, 2),
    ('footer', 'footer_links', 'Termos de Uso', null, '/termos', null, 3),
    ('footer', 'footer_links', 'Politica de Privacidade', null, '/privacidade', null, 4)
) as item(page_key, block_key, title, subtitle, content, icon, sort_order)
  on cb.page_key = item.page_key
 and cb.block_key = item.block_key
where not exists (
  select 1
  from public.content_block_items cbi
  where cbi.block_id = cb.id
    and cbi.sort_order = item.sort_order
    and coalesce(cbi.title, '') = coalesce(item.title, '')
);

insert into public.navigation_items (
  label,
  url,
  location,
  icon,
  style,
  sort_order,
  is_active,
  open_in_new_tab,
  requires_auth
)
select
  item.label,
  item.url,
  item.location,
  item.icon,
  item.style,
  item.sort_order,
  true,
  item.open_in_new_tab,
  item.requires_auth
from (
  values
    ('Lojas', '/lojas', 'main_nav', null, 'default', 1, false, false),
    ('Lancamentos', '/lancamentos', 'main_nav', null, 'default', 2, false, false),
    ('Planeje sua visita', '/planeje-sua-visita', 'main_nav', null, 'default', 3, false, false),
    ('Abra sua loja', '/abra-sua-loja', 'main_nav', null, 'default', 4, false, false),
    ('Lojas', '/lojas', 'header_cta', null, 'primary', 1, false, false),
    ('WhatsApp', '#whatsapp', 'header_secondary', 'message-circle', 'whatsapp', 1, true, false),
    ('Meu roteiro', '/meu-roteiro', 'header_secondary', 'shopping-bag', 'route', 2, false, false),
    ('Area do Lojista', '/login', 'account_area', 'user', 'account', 1, false, false),
    ('Lojas', '/lojas', 'mobile_nav', null, 'primary', 1, false, false),
    ('Lancamentos', '/lancamentos', 'mobile_nav', null, 'default', 2, false, false),
    ('Planeje sua visita', '/planeje-sua-visita', 'mobile_nav', null, 'default', 3, false, false),
    ('Abra sua loja', '/abra-sua-loja', 'mobile_nav', null, 'default', 4, false, false),
    ('Meu roteiro', '/meu-roteiro', 'mobile_nav', 'shopping-bag', 'route', 5, false, false),
    ('Area do Lojista', '/login', 'mobile_nav', 'user', 'account', 6, false, false),
    ('WhatsApp', '#whatsapp', 'mobile_nav', 'message-circle', 'whatsapp', 7, true, false)
) as item(label, url, location, icon, style, sort_order, open_in_new_tab, requires_auth)
where not exists (
  select 1
  from public.navigation_items ni
  where ni.location = item.location
    and ni.label = item.label
    and ni.url = item.url
);

insert into public.footer_sections (
  title,
  sort_order,
  is_active
)
select
  section.title,
  section.sort_order,
  section.is_active
from (
  values
    ('Plataforma Mega Polo', 1, true),
    ('Visite o Mega Polo', 2, true)
) as section(title, sort_order, is_active)
where not exists (
  select 1
  from public.footer_sections fs
  where fs.title = section.title
);

insert into public.footer_links (
  footer_section_id,
  label,
  url,
  sort_order,
  is_active,
  open_in_new_tab
)
select
  fs.id,
  link_data.label,
  link_data.url,
  link_data.sort_order,
  link_data.is_active,
  link_data.open_in_new_tab
from (
  values
    ('Plataforma Mega Polo', 'Guia de Lojas', '/lojas', 1, true, false),
    ('Plataforma Mega Polo', 'Lancamentos', '/lancamentos', 2, true, false),
    ('Plataforma Mega Polo', 'Abra sua loja', '/abra-sua-loja', 3, true, false),
    ('Plataforma Mega Polo', 'Area do Lojista', '/login', 4, true, false),
    ('Visite o Mega Polo', 'Planeje sua visita', '/planeje-sua-visita', 1, true, false),
    ('Visite o Mega Polo', 'Meu Roteiro', '/meu-roteiro', 2, true, false),
    ('Visite o Mega Polo', 'Hotel Mega Polo', '/planeje-sua-visita#hotel', 3, true, false),
    ('Visite o Mega Polo', 'Centro Empresarial', '/planeje-sua-visita#centro-empresarial', 4, true, false)
) as link_data(section_title, label, url, sort_order, is_active, open_in_new_tab)
join public.footer_sections fs on fs.title = link_data.section_title
where not exists (
  select 1
  from public.footer_links fl
  where fl.footer_section_id = fs.id
    and fl.label = link_data.label
    and fl.url = link_data.url
);

-- Planning page blocks and items (CMS)
insert into public.content_blocks (
  page_key,
  block_key,
  block_type,
  title,
  subtitle,
  content,
  image_url,
  button_label,
  button_url,
  secondary_button_label,
  secondary_button_url,
  settings,
  sort_order,
  is_active
)
values
  (
    'planning',
    'hero',
    'hero',
    'Planeje sua visita ao Mega Polo Moda',
    'Experiencia de compra',
    'Organize sua visita comercial, encontre lojas e otimize seu tempo no shopping de moda atacadista no Bras.',
    null,
    'Montar roteiro de compras',
    '/lojas',
    'Ver meu roteiro',
    '/meu-roteiro',
    '{}'::jsonb,
    1,
    true
  ),
  (
    'planning',
    'info_cards',
    'cards',
    'Informacoes essenciais',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '{}'::jsonb,
    2,
    true
  ),
  (
    'planning',
    'visit_steps',
    'steps',
    'Como organizar sua visita',
    'Praticidade',
    null,
    null,
    'Comecar planejamento',
    '/lojas',
    null,
    null,
    '{}'::jsonb,
    3,
    true
  ),
  (
    'planning',
    'map_block',
    'map',
    'Como chegar',
    null,
    'Abra a rota no Google Maps e planeje sua chegada ao Mega Polo Moda.',
    null,
    'Abrir no Google Maps',
    'https://www.google.com/maps/search/?api=1&query=Rua%20Barao%20de%20Ladario%2C%20670%20Bras%20Sao%20Paulo',
    null,
    null,
    '{}'::jsonb,
    4,
    true
  ),
  (
    'planning',
    'hotel_block',
    'institutional',
    'Hotel Mega Polo',
    'Hospedagem',
    'Mais praticidade para compradores que vem de outras cidades e querem aproveitar melhor sua visita ao Bras.',
    null,
    'Saiba mais sobre o hotel',
    null,
    null,
    null,
    '{"whatsapp_message":"Ola, gostaria de informacoes sobre hospedagem no Hotel Mega Polo."}'::jsonb,
    5,
    true
  ),
  (
    'planning',
    'business_center_block',
    'institutional',
    'Centro Empresarial',
    'Centro empresarial',
    'Estrutura para empresas, reunioes e operacoes comerciais conectadas a plataforma comercial do Bras.',
    null,
    'Conhecer Centro Empresarial',
    null,
    null,
    null,
    '{"whatsapp_message":"Ola, gostaria de informacoes sobre o Centro Empresarial do Mega Polo Moda."}'::jsonb,
    6,
    true
  ),
  (
    'planning',
    'final_cta',
    'cta',
    'Precisa de ajuda para planejar sua visita?',
    'Suporte',
    'Nosso time de atendimento esta disponivel para tirar suas duvidas.',
    null,
    'Falar no canal de suporte',
    null,
    null,
    null,
    '{"whatsapp_message":"Ola, gostaria de mais informacoes sobre o planejamento de visita ao Mega Polo Moda."}'::jsonb,
    7,
    true
  )
on conflict (page_key, block_key) do update
set
  block_type = excluded.block_type,
  title = excluded.title,
  subtitle = excluded.subtitle,
  content = excluded.content,
  image_url = excluded.image_url,
  button_label = excluded.button_label,
  button_url = excluded.button_url,
  secondary_button_label = excluded.secondary_button_label,
  secondary_button_url = excluded.secondary_button_url,
  settings = excluded.settings,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

with planning_blocks as (
  select id, block_key
  from public.content_blocks
  where page_key = 'planning'
    and block_key in (
      'info_cards',
      'visit_steps',
      'hotel_block',
      'business_center_block',
      'final_cta'
    )
),
planning_items as (
  select *
  from (
    values
      ('info_cards', 1, 'Endereco', null, '{{address}}', null, 'map-pin', null, null, '{}'::jsonb, true),
      ('info_cards', 2, 'Horarios', null, '{{opening_hours}}', null, 'clock', null, null, '{}'::jsonb, true),
      ('info_cards', 3, 'Estacionamento', null, 'Vagas para carros e onibus de compradores.', null, 'car', null, null, '{}'::jsonb, true),
      ('info_cards', 4, 'Atendimento', null, 'Suporte via WhatsApp para informacoes rapidas.', null, 'message-circle', null, null, '{}'::jsonb, true),

      ('visit_steps', 1, 'Busque lojas por categoria', null, 'Encontre as melhores marcas de atacado filtrando por segmento.', null, 'search', null, null, '{}'::jsonb, true),
      ('visit_steps', 2, 'Adicione lojas ao roteiro', null, 'Salve suas preferidas para otimizar seu tempo de caminhada.', null, 'plus-square', null, null, '{}'::jsonb, true),
      ('visit_steps', 3, 'Fale com as marcas', null, 'Tire duvidas via WhatsApp antes mesmo de chegar ao shopping.', null, 'message-circle', null, null, '{}'::jsonb, true),
      ('visit_steps', 4, 'Visite com praticidade', null, 'Aproveite a estrutura completa do Bras com tudo organizado.', null, 'shopping-bag', null, null, '{}'::jsonb, true),

      ('hotel_block', 1, 'Hospedagem integrada ao complexo', null, null, null, 'check', null, null, '{}'::jsonb, true),
      ('hotel_block', 2, 'Praticidade para compradores de outras regioes', null, null, null, 'check', null, null, '{}'::jsonb, true),

      ('business_center_block', 1, 'Salas para reunioes e operacoes comerciais', null, null, null, 'check', null, null, '{}'::jsonb, true),
      ('business_center_block', 2, 'Infraestrutura corporativa no Bras', null, null, null, 'check', null, null, '{}'::jsonb, true),

      ('final_cta', 1, 'Praca de alimentacao', null, 'Diversas opcoes gastronomicas para sua visita.', null, 'utensils-crossed', null, null, '{}'::jsonb, true),
      ('final_cta', 2, 'Lojas e marcas', null, 'Lojas de diferentes segmentos com novidades para atacado.', null, 'store', null, null, '{}'::jsonb, true),
      ('final_cta', 3, 'Localizacao no Bras', null, 'Acesso facilitado no coracao do Bras.', null, 'map-pin', null, null, '{}'::jsonb, true)
  ) as item(
    block_key,
    sort_order,
    title,
    subtitle,
    content,
    image_url,
    icon,
    button_label,
    button_url,
    metadata,
    is_active
  )
)
insert into public.content_block_items (
  block_id,
  title,
  subtitle,
  content,
  image_url,
  icon,
  button_label,
  button_url,
  metadata,
  sort_order,
  is_active
)
select
  pb.id,
  pi.title,
  pi.subtitle,
  pi.content,
  pi.image_url,
  pi.icon,
  pi.button_label,
  pi.button_url,
  pi.metadata,
  pi.sort_order,
  pi.is_active
from planning_blocks pb
join planning_items pi on pi.block_key = pb.block_key
where not exists (
  select 1
  from public.content_block_items cbi
  where cbi.block_id = pb.id
    and cbi.sort_order = pi.sort_order
);
