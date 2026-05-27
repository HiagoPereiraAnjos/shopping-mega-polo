import type React from 'react';

export type StoreAdminTab =
  | 'main'
  | 'media'
  | 'products'
  | 'catalogs'
  | 'seo'
  | 'publication';

export type StoreStatusFilter = 'all' | 'published' | 'unpublished';

export interface StoreFormState {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  segment: string;
  floor: string;
  store_number: string;
  whatsapp: string;
  phone: string;
  email: string;
  instagram: string;
  website: string;
  logo_url: string;
  banner_url: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  is_featured: boolean;
  is_published: boolean;
}

export interface ProductFormState {
  name: string;
  description: string;
  image_url: string;
  category: string;
  price: string;
  sort_order: string;
  is_active: boolean;
}

export type SetStoreFormState = React.Dispatch<React.SetStateAction<StoreFormState>>;
export type SetProductFormState = React.Dispatch<React.SetStateAction<ProductFormState>>;
