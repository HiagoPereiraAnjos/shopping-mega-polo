export type SaleType = 'Atacado' | 'Varejo' | 'Ambos';

export interface Store {
  id: string;
  slug: string;
  name: string;
  category: StoreCategory;
  segment: string;
  floor: string;
  unit: string;
  logo: string;
  image: string;
  banner?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  description?: string;
  featured?: boolean;
  saleType: SaleType;
  hasCatalog: boolean;
  catalogUrl?: string;
  tags?: string[];
  products?: Product[];
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  description: string;
  price?: number | null;
}

export type StoreCategory = 
  | 'Todos' 
  | 'Moda Feminina' 
  | 'Moda Masculina' 
  | 'Jeans' 
  | 'Plus Size'
  | 'Acessórios' 
  | 'Moda Íntima'
  | 'Fitness e Beachwear'
  | 'Festa'
  | 'Alimentação' 
  | 'Serviços';

export interface Category {
  id: string;
  name: StoreCategory;
  image: string;
  count: string;
  slug: string;
}

export interface Launch {
  id: string;
  title: string;
  storeName: string;
  storeSlug: string;
  category: StoreCategory;
  segment: string;
  image: string;
  description: string;
  createdAt: string;
  storeId?: string;
  categoryId?: string | null;
  price?: number | null;
  publishDate?: string | null;
  expirationDate?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
}

export interface PlanningItem {
  store_id: string;
  slug: string;
  name: string;
  floor: string;
  store_number: string;
  whatsapp?: string;
  note?: string;
  added_at: string;
}

export interface DashboardStats {
  views: number;
  whatsappClicks: number;
  leadsReceived: number;
  productsPublished: number;
  viewsTrend: number;
  clicksTrend: number;
  leadsTrend: number;
  productsTrend: number;
}

export interface Lead {
  id: string;
  customerName: string;
  message: string;
  date: string;
  status: 'new' | 'read' | 'replied';
}

export interface UserVisitPlan {
  date: string;
  origin: string;
  items: PlanningItem[];
}
