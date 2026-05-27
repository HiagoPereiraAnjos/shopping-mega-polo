import { Store, Category, Launch } from '../types';

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Moda Feminina', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'feminino' },
  { id: '2', name: 'Moda Masculina', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'masculino' },
  { id: '3', name: 'Jeans', image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'jeans' },
  { id: '4', name: 'Plus Size', image: 'https://images.unsplash.com/photo-1514096702362-21e28c091ee0?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'plus-size' },
  { id: '5', name: 'Acessórios', image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'acessorios' },
  { id: '6', name: 'Moda Íntima', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'intima' },
  { id: '7', name: 'Fitness e Beachwear', image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'fitness' },
  { id: '8', name: 'Festa', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'festa' },
  { id: '9', name: 'Alimentação', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'alimentacao' },
  { id: '10', name: 'Serviços', image: 'https://images.unsplash.com/photo-1521791136064-7986c295944c?auto=format&fit=crop&q=80&w=1000', count: 'Diversas', slug: 'servicos' },
];

export const STORES: Store[] = [
  { 
    id: '1', 
    slug: 'rosa-fina',
    name: 'Rosa Fina', 
    category: 'Moda Feminina', 
    segment: 'Casual Chic',
    floor: '1º Andar', 
    unit: 'Loja 102',
    logo: 'RF', 
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
    banner: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600',
    whatsapp: '551133112887',
    instagram: '@rosafina',
    featured: true,
    saleType: 'Atacado',
    hasCatalog: true,
    catalogUrl: '/catalogos/rosa-fina.pdf',
    description: 'A Rosa Fina é sinônimo de elegância e sofisticação. Nossa marca foi criada para mulheres que buscam exclusividade e design contemporâneo.',
    tags: ['Trend', 'Inverno 24', 'Party'],
    products: [
      { id: 'p1', name: 'Vestido Midi Seda', category: 'Vestidos', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800', description: 'Vestido em seda pura com caimento impecável.' },
      { id: 'p2', name: 'Conjunto Alfaiataria', category: 'Conjuntos', image: 'https://images.unsplash.com/photo-1539008835279-4346ee3982ce?auto=format&fit=crop&q=80&w=800', description: 'Conjunto em linho com corte moderno.' },
      { id: 'p3', name: 'Blazer Estruturado', category: 'Casacos', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800', description: 'Blazer com ombreras e forro acetinado.' }
    ]
  },
  { 
    id: '2', 
    slug: 'revanche',
    name: 'Revanche', 
    category: 'Jeans', 
    segment: 'Moda Casual',
    floor: 'Térreo', 
    unit: 'Loja 05',
    logo: 'RE', 
    image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&q=80&w=800',
    banner: 'https://images.unsplash.com/photo-1523398334822-f7ef310c144e?auto=format&fit=crop&q=80&w=1600',
    whatsapp: '5511988888888',
    instagram: '@revanche_jeans',
    featured: true,
    saleType: 'Atacado',
    hasCatalog: true,
    description: 'Moda jeans com atitude. A Revanche traz as últimas tendências do denim para o público jovem.',
    tags: ['Casual', 'Jeans', 'Jovem'],
    products: [
      { id: 'p4', name: 'Calça Wide Leg', category: 'Jeans', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800', description: 'Lavagem clara com cintura alta.' },
      { id: 'p5', name: 'Jaqueta Oversized', category: 'Jeans', image: 'https://images.unsplash.com/photo-1527010154944-f2241763d806?auto=format&fit=crop&q=80&w=800', description: 'Jaqueta jeans com detalhes destroyed.' },
      { id: 'p6', name: 'Shorts Mom', category: 'Jeans', image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=800', description: 'Corte clássico dos anos 90.' }
    ]
  },
  { 
    id: '3', 
    slug: 'quebela',
    name: 'Quebela', 
    category: 'Plus Size', 
    segment: 'Moda Plus Size',
    floor: '2º Andar', 
    unit: 'Loja 210',
    logo: 'QB', 
    image: 'https://images.unsplash.com/photo-1514096702362-21e28c091ee0?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511977777777',
    saleType: 'Ambos',
    hasCatalog: false,
    description: 'Realçando a beleza em todas as curvas com moda plus size de alta qualidade.',
    products: [
      { id: 'p7', name: 'Macacão Pantalona', category: 'Plus Size', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800', description: 'Caimento fluido e elegante.' },
      { id: 'p8', name: 'Blusa Drapeada', category: 'Plus Size', image: 'https://images.unsplash.com/photo-1604176354204-926873ff34b1?auto=format&fit=crop&q=80&w=800', description: 'Conforto e estilo para o dia a dia.' },
      { id: 'p9', name: 'Saia Plissada', category: 'Plus Size', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=800', description: 'Vibrante e cheia de movimento.' }
    ]
  },
  { 
    id: '4', 
    slug: 'perola-oriental',
    name: 'Pérola Oriental', 
    category: 'Acessórios', 
    segment: 'Bijuterias Finas',
    floor: 'Térreo', 
    unit: 'Quiosque 05',
    logo: 'PO', 
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511966666666',
    saleType: 'Varejo',
    hasCatalog: true,
    description: 'Acessórios que iluminam seu visual com o brilho do oriente.',
    products: [
      { id: 'p10', name: 'Maxi Colar Pérolas', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800', description: 'Design exclusivo com pérolas cultivadas.' },
      { id: 'p11', name: 'Brincos Dourados', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&q=80&w=800', description: 'Leves e modernos para qualquer ocasião.' },
      { id: 'p12', name: 'Pulseira Esmaltada', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800', description: 'Cores vibrantes para o verão.' }
    ]
  },
  { 
    id: '5', 
    slug: 'donna-classe',
    name: 'Donna Classe', 
    category: 'Moda Feminina', 
    segment: 'Executiva',
    floor: '1º Andar', 
    unit: 'Loja 145',
    logo: 'DC', 
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511955555555',
    saleType: 'Atacado',
    hasCatalog: true,
    description: 'Moda para a mulher profissional que não abre mão do estilo.',
    products: [
      { id: 'p13', name: 'Camisa de Seda', category: 'Camisas', image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&q=80&w=800', description: 'Clássica e versátil.' },
      { id: 'p14', name: 'Calça Alfaiataria', category: 'Calças', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800', description: 'Corte reto impecável.' },
      { id: 'p15', name: 'Vestido Tubinho', category: 'Vestidos', image: 'https://images.unsplash.com/photo-1539106604051-930460938676?auto=format&fit=crop&q=80&w=800', description: 'A peça curinga do closet executivo.' }
    ]
  },
  { 
    id: '6', 
    slug: 'urban-jeans',
    name: 'Urban Jeans', 
    category: 'Jeans', 
    segment: 'Jeans Premium',
    floor: '1º Andar', 
    unit: 'Loja 150',
    logo: 'UJ', 
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511944444444',
    saleType: 'Atacado',
    hasCatalog: true,
    description: 'Jeans premium com lavagens atuais e foco em revenda.',
    products: [
      { id: 'p16', name: 'Jeans Skinny', category: 'Jeans', image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&q=80&w=800', description: 'Conforto e ajuste perfeito.' },
      { id: 'p17', name: 'Bermuda Jeans', category: 'Jeans', image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=800', description: 'Ideal para os dias de sol.' },
      { id: 'p18', name: 'Colete Jeans', category: 'Jeans', image: 'https://images.unsplash.com/photo-1576995811123-539c852171fc?auto=format&fit=crop&q=80&w=800', description: 'A sobreposição perfeita.' }
    ]
  },
  { 
    id: '7', 
    slug: 'bella-intima',
    name: 'Bella Íntima', 
    category: 'Moda Íntima', 
    segment: 'Lingerie',
    floor: '2º Andar', 
    unit: 'Loja 202',
    logo: 'BI', 
    image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511933333333',
    saleType: 'Ambos',
    hasCatalog: true,
    description: 'Conforto e sensualidade na medida certa.',
    products: [
      { id: 'p19', name: 'Conjunto Renda', category: 'Íntima', image: 'https://images.unsplash.com/photo-1594433030835-a92446c7f66a?auto=format&fit=crop&q=80&w=800', description: 'Renda importada super macia.' },
      { id: 'p20', name: 'Pijama de Seda', category: 'Íntima', image: 'https://images.unsplash.com/photo-1582533089852-0243ed2ad977?auto=format&fit=crop&q=80&w=800', description: 'Noites de sono com luxo.' },
      { id: 'p21', name: 'Body Modelador', category: 'Íntima', image: 'https://images.unsplash.com/photo-1582232503980-fc021950d60d?auto=format&fit=crop&q=80&w=800', description: 'Invisível sob a roupa.' }
    ]
  },
  { 
    id: '8', 
    slug: 'top-fitness',
    name: 'Top Fitness', 
    category: 'Fitness e Beachwear', 
    segment: 'Moda Fitness',
    floor: 'Térreo', 
    unit: 'Loja 42',
    logo: 'TF', 
    image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511922222222',
    saleType: 'Atacado',
    hasCatalog: true,
    description: 'Moda fitness de alta performance.',
    products: [
      { id: 'p22', name: 'Legging Speed', category: 'Fitness', image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&q=80&w=800', description: 'Tecido com compressão e brilho.' },
      { id: 'p23', name: 'Top Sustentação', category: 'Fitness', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800', description: 'Ideal para treinos intensos.' },
      { id: 'p24', name: 'Short Saia', category: 'Fitness', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800', description: 'Conforto e feminilidade.' }
    ]
  },
  { 
    id: '9', 
    slug: 'elegance-plus',
    name: 'Elegance Plus', 
    category: 'Plus Size', 
    segment: 'Casual Modern',
    floor: '3º Andar', 
    unit: 'Loja 315',
    logo: 'EP', 
    image: 'https://images.unsplash.com/photo-1589151550107-59a4bb31bb6c?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511911111111',
    saleType: 'Ambos',
    hasCatalog: true,
    description: 'Estilo sem limites de tamanho.',
    products: [
      { id: 'p25', name: 'Vestido Envelope', category: 'Plus Size', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=800', description: 'Valoriza a silhueta.' },
      { id: 'p26', name: 'Jeans Resinada', category: 'Plus Size', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800', description: 'Visual moderno com brilho.' },
      { id: 'p27', name: 'Camiseta Acetinada', category: 'Plus Size', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', description: 'Malha premium com toque suave.' }
    ]
  },
  { 
    id: '10', 
    slug: 'festa-chic',
    name: 'Festa Chic', 
    category: 'Festa', 
    segment: 'Moda Festa',
    floor: '3º Andar', 
    unit: 'Loja 305',
    logo: 'FC', 
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511900000000',
    saleType: 'Atacado',
    hasCatalog: true,
    description: 'Os vestidos de festa mais desejados do Brás.',
    products: [
      { id: 'p28', name: 'Vestido Longo Sereia', category: 'Festa', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800', description: 'Bordado manual em vidrilhos.' },
      { id: 'p29', name: 'Clutch Pedraria', category: 'Festa', image: 'https://images.unsplash.com/photo-1566150905458-1bf1fe113f5d?auto=format&fit=crop&q=80&w=800', description: 'O acessório final perfeito.' },
      { id: 'p30', name: 'Vestido Cocktail', category: 'Festa', image: 'https://images.unsplash.com/photo-1539106604051-930460938676?auto=format&fit=crop&q=80&w=800', description: 'Elegância para arrasar.' }
    ]
  },
  { 
    id: '11', 
    slug: 'moda-bras',
    name: 'Moda Brás', 
    category: 'Moda Masculina', 
    segment: 'Urban',
    floor: '2º Andar', 
    unit: 'Loja 250',
    logo: 'MB', 
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511987654321',
    saleType: 'Atacado',
    hasCatalog: true,
    description: 'Moda masculina com preço baixo e qualidade elevada.',
    products: [
      { id: 'p31', name: 'Camisa Polo', category: 'Masculina', image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=800', description: 'Piquet de alta gramatura.' },
      { id: 'p32', name: 'Bermuda Sarja', category: 'Masculina', image: 'https://images.unsplash.com/photo-1565084888279-aff9969794b2?auto=format&fit=crop&q=80&w=800', description: 'Cores modernas e vibrantes.' },
      { id: 'p33', name: 'T-shirt Básica', category: 'Masculina', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', description: 'Algodão 30.1 penteado.' }
    ]
  },
  { 
    id: '12', 
    slug: 'acessorios-prime',
    name: 'Acessórios Prime', 
    category: 'Acessórios', 
    segment: 'Bolsas Premium',
    floor: 'Térreo', 
    unit: 'Loja 55',
    logo: 'AP', 
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800',
    whatsapp: '5511912345678',
    saleType: 'Ambos',
    hasCatalog: true,
    description: 'Bolsas e acessórios de luxo para completar seu look.',
    products: [
      { id: 'p34', name: 'Bolsa de Couro', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800', description: 'Couro legítimo texturizado.' },
      { id: 'p35', name: 'Carteira Slim', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=800', description: 'Praticidade e elegância.' },
      { id: 'p36', name: 'Cinto Fivela', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800', description: 'O detalhe que faz a diferença.' }
    ]
  }
];

export const LAUNCHES: Launch[] = [
  {
    id: 'l1',
    title: 'Lançamento Inverno',
    storeName: 'Rosa Fina',
    storeSlug: 'rosa-fina',
    category: 'Moda Feminina',
    segment: 'Premium',
    image: 'https://images.unsplash.com/photo-1490129330617-0025a1d0ba0c?auto=format&fit=crop&q=80&w=1200',
    description: 'A sofisticação do inverno traduzida em peças de veludo e seda.',
    createdAt: '2024-05-10'
  },
  {
    id: 'l2',
    title: 'Nova Coleção Jeans',
    storeName: 'Revanche',
    storeSlug: 'revanche',
    category: 'Jeans',
    segment: 'Jovem',
    image: 'https://images.unsplash.com/photo-1523398334822-f7ef310c144e?auto=format&fit=crop&q=80&w=1200',
    description: 'Novas lavagens e modelagens para a moda jeans brasileira.',
    createdAt: '2024-05-12'
  },
  {
    id: 'l3',
    title: 'Curvas Elegantes',
    storeName: 'Quebela',
    storeSlug: 'quebela',
    category: 'Plus Size',
    segment: 'Plus Size',
    image: 'https://images.unsplash.com/photo-1514096702362-21e28c091ee0?auto=format&fit=crop&q=80&w=1200',
    description: 'Modelagem que abraça e valoriza cada movimento.',
    createdAt: '2024-05-13'
  },
  {
    id: 'l4',
    title: 'Brilho Boho',
    storeName: 'Pérola Oriental',
    storeSlug: 'perola-oriental',
    category: 'Acessórios',
    segment: 'Boho',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=1200',
    description: 'Semijóias inspiradas na liberdade e na natureza.',
    createdAt: '2024-05-14'
  },
  {
    id: 'l5',
    title: 'Executiva Moderna',
    storeName: 'Donna Classe',
    storeSlug: 'donna-classe',
    category: 'Moda Feminina',
    segment: 'Executivo',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80&w=1200',
    description: 'A combinação certa para os seus compromissos comerciais.',
    createdAt: '2024-05-15'
  },
  {
    id: 'l6',
    title: 'Moda Íntima Conforto',
    storeName: 'Bella Íntima',
    storeSlug: 'bella-intima',
    category: 'Moda Íntima',
    segment: 'Conforto',
    image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=1200',
    description: 'Lingeries que você esquece que está usando.',
    createdAt: '2024-05-16'
  },
  {
    id: 'l7',
    title: 'Fitness Verão',
    storeName: 'Top Fitness',
    storeSlug: 'top-fitness',
    category: 'Fitness e Beachwear',
    segment: 'Fitness',
    image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=1200',
    description: 'Energia máxima para o seu treino com cores vibrantes.',
    createdAt: '2024-05-17'
  },
  {
    id: 'l8',
    title: 'Moda Festa',
    storeName: 'Festa Chic',
    storeSlug: 'festa-chic',
    category: 'Festa',
    segment: 'Premium',
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=1200',
    description: 'Momentos inesquecíveis pedem vestidos inesquecíveis.',
    createdAt: '2024-05-18'
  }
];


