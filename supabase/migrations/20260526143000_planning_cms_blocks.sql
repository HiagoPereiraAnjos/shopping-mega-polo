-- Planeje sua visita: blocos e itens administraveis via content_blocks/content_block_items

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
