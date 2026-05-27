import type {
  ContentBlock,
  ContentBlockInsert,
  ContentBlockItem,
  ContentBlockItemInsert,
  ContentBlockItemUpdate,
  ContentBlockUpdate,
} from './cms';

export type ContentBlockRecord = ContentBlock;
export type ContentBlockItemRecord = ContentBlockItem;

export interface ContentBlockWithItems extends ContentBlockRecord {
  items: ContentBlockItemRecord[];
}

export type CreateContentBlockPayload = ContentBlockInsert;
export type UpdateContentBlockPayload = ContentBlockUpdate;

export type CreateContentBlockItemPayload = ContentBlockItemInsert;
export type UpdateContentBlockItemPayload = ContentBlockItemUpdate;

export interface ReorderContentBlockItem {
  id: string;
  sort_order: number;
}

export interface ReorderPageContentBlockItem {
  id: string;
  sort_order: number;
}
