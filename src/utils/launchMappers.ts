import type { Launch as PublicLaunch } from '../types';
import type { Category, Launch as CmsLaunch, Store } from '../types/cms';

const DEFAULT_LAUNCH_IMAGE =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1400';

interface LaunchMapInput {
  launch: CmsLaunch;
  store?: Store | null;
  category?: Category | null;
}

function asStoreCategory(value: string): PublicLaunch['category'] {
  return value as PublicLaunch['category'];
}

export function mapCmsLaunchToPublicLaunch(input: LaunchMapInput): PublicLaunch {
  const { launch, store, category } = input;
  const resolvedCategory = category?.name ?? 'Moda Feminina';

  return {
    id: launch.id,
    title: launch.title,
    storeName: store?.name ?? 'Loja',
    storeSlug: store?.slug ?? '',
    category: asStoreCategory(resolvedCategory),
    segment: store?.segment ?? resolvedCategory,
    image: launch.image_url ?? store?.banner_url ?? store?.logo_url ?? DEFAULT_LAUNCH_IMAGE,
    description: launch.description ?? 'Conheca o lancamento desta loja no Mega Polo Moda.',
    createdAt: launch.publish_date ?? launch.created_at,
    storeId: launch.store_id ?? undefined,
    categoryId: launch.category_id,
    price: launch.price,
    publishDate: launch.publish_date,
    expirationDate: launch.expiration_date,
    isFeatured: launch.is_featured,
    isPublished: launch.is_published,
    seoTitle: launch.seo_title ?? undefined,
    seoDescription: launch.seo_description ?? undefined,
    ogImageUrl: launch.og_image_url ?? undefined,
  };
}
