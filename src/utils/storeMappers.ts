import type { Store as PublicStore, Product as PublicProduct } from '../types';
import type { Catalog, Category, Store, StoreProduct } from '../types/cms';

const DEFAULT_STORE_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200';

function toTitleOrFallback(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized || fallback;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'LP';
  }

  return parts.map((item) => item[0]).join('').toUpperCase();
}

function mapProducts(products: StoreProduct[] | undefined): PublicProduct[] | undefined {
  if (!products?.length) {
    return undefined;
  }

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category ?? 'Produtos',
    image: product.image_url ?? DEFAULT_STORE_IMAGE,
    description: product.description ?? 'Produto em destaque da loja.',
    price: product.price,
  }));
}

export interface PublicStoreMapInput {
  store: Store;
  category?: Category | null;
  catalogs?: Catalog[];
  products?: StoreProduct[];
}

export function mapCmsStoreToPublicStore(input: PublicStoreMapInput): PublicStore {
  const { store, category, catalogs, products } = input;

  const firstValidCatalog =
    catalogs?.find((catalog) => catalog.is_active && !!catalog.file_url?.trim()) ?? null;

  const image = store.logo_url || store.banner_url || DEFAULT_STORE_IMAGE;
  const banner = store.banner_url || store.logo_url || DEFAULT_STORE_IMAGE;

  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    category: (category?.name ?? 'Moda Feminina') as PublicStore['category'],
    segment: toTitleOrFallback(store.segment, 'Moda atacadista'),
    floor: toTitleOrFallback(store.floor, 'Piso nao informado'),
    unit: toTitleOrFallback(store.store_number, 'Loja sem numero'),
    logo: getInitials(store.name),
    image,
    banner,
    whatsapp: store.whatsapp ?? undefined,
    phone: store.phone ?? undefined,
    email: store.email ?? undefined,
    website: store.website ?? undefined,
    instagram: store.instagram ? `@${store.instagram.replace(/^@+/, '')}` : undefined,
    description: store.description ?? undefined,
    featured: store.is_featured,
    saleType: 'Atacado',
    hasCatalog: !!firstValidCatalog,
    catalogUrl: firstValidCatalog?.file_url ?? undefined,
    tags: store.tags ?? undefined,
    products: mapProducts(products),
    seoTitle: store.seo_title ?? undefined,
    seoDescription: store.seo_description ?? undefined,
    ogImageUrl: store.og_image_url ?? undefined,
  };
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
