export const PAGE_BUILDER_BLOCK_TYPES = [
  'hero',
  'text',
  'image',
  'text_image',
  'cards',
  'cta',
  'faq',
  'gallery',
  'benefits_list',
] as const;

export type PageBuilderBlockType = (typeof PAGE_BUILDER_BLOCK_TYPES)[number];

export interface PageBuilderBlockTypeOption {
  value: PageBuilderBlockType;
  label: string;
  supportsItems: boolean;
}

export const PAGE_BUILDER_BLOCK_TYPE_OPTIONS: PageBuilderBlockTypeOption[] = [
  { value: 'hero', label: 'Hero', supportsItems: false },
  { value: 'text', label: 'Texto', supportsItems: false },
  { value: 'image', label: 'Imagem', supportsItems: false },
  { value: 'text_image', label: 'Texto + Imagem', supportsItems: false },
  { value: 'cards', label: 'Cards', supportsItems: true },
  { value: 'cta', label: 'CTA', supportsItems: false },
  { value: 'faq', label: 'FAQ', supportsItems: true },
  { value: 'gallery', label: 'Galeria', supportsItems: true },
  { value: 'benefits_list', label: 'Lista de Beneficios', supportsItems: true },
];

export function buildPageContentKey(slug: string): string {
  return `page:${slug.trim().toLowerCase()}`;
}

export function isPageBuilderBlockType(value: string | null | undefined): value is PageBuilderBlockType {
  if (!value) {
    return false;
  }

  return PAGE_BUILDER_BLOCK_TYPES.includes(value as PageBuilderBlockType);
}

export function getPageBuilderBlockTypeLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Bloco';
  }

  const option = PAGE_BUILDER_BLOCK_TYPE_OPTIONS.find((item) => item.value === value);
  return option?.label ?? value;
}

export function blockTypeSupportsItems(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const option = PAGE_BUILDER_BLOCK_TYPE_OPTIONS.find((item) => item.value === value);
  return option?.supportsItems ?? false;
}

