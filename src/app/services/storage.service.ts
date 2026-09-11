import { Injectable, signal } from '@angular/core';
import Dexie, { type EntityTable } from 'dexie';
import { Category } from '../models/category/category.model';
import { Consumption } from '../models/consumption';
import { KeyOpen } from '../models/keyOpen';
import { Product } from '../models/product/product.model';
import { TableStatus, TableTicket } from '../models/table-ticket';
import { PaginatedResponse } from '../types/response';

const CACHE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface CacheMetadata {
  key: string;
  updatedAt: number;
}

interface ProductCacheRecord {
  id: string;
  pdvId?: string;
  name: string;
  productType?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  enableLocal?: boolean;
  keywords?: string;
  categoryIds: string[];
  updatedAt: string;
  data: Product;
}

interface CategoryCacheRecord {
  id: string;
  name: string;
  updatedAt: string;
  data: Category;
}

interface TableTicketCacheRecord {
  id: string;
  code: number;
  type: string;
  status: string;
  keyOpenId?: string;
  companyId: string;
  updatedAt: string;
  data: TableTicket;
}

export interface StoredOrderDraft<TItem = unknown> {
  id: 'active';
  tableTicket: TableTicket | null;
  items: TItem[];
  updatedAt: string;
}

export interface QueueOrderPayload {
  tableTicket: TableTicket;
  items: Consumption[];
  customers?: number;
}

export interface QueuedOrderRecord {
  id: string;
  tableTicketId: string;
  companyId: string;
  type: string;
  code: number;
  status: 'pending' | 'processing' | 'failed' | 'sent';
  needsOpening: boolean;
  customers: number;
  keyOpenId?: string;
  localKeyOpenId?: string;
  tableTicket: TableTicket;
  items: Consumption[];
  sentItemIndexes?: number[];
  attempts: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface CacheListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
}

type PdvTouchDatabase = Dexie & {
  products: EntityTable<ProductCacheRecord, 'id'>;
  categories: EntityTable<CategoryCacheRecord, 'id'>;
  tableTickets: EntityTable<TableTicketCacheRecord, 'id'>;
  cacheMetadata: EntityTable<CacheMetadata, 'key'>;
  orderDrafts: EntityTable<StoredOrderDraft, 'id'>;
  orderQueue: EntityTable<QueuedOrderRecord, 'id'>;
};

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  readonly cacheRefreshIntervalMs = CACHE_REFRESH_INTERVAL_MS;
  db = signal<PdvTouchDatabase | null>(null);
  private readonly ready: Promise<PdvTouchDatabase>;

  constructor() {
    this.ready = this.init();
  }

  async init(): Promise<PdvTouchDatabase> {
    const db = new Dexie('pdv-touch') as PdvTouchDatabase;

    db.version(2).stores({
      products: 'id, pdvId, name, productType, isActive, isAvailable, enableLocal, updatedAt',
      categories: 'id, name, updatedAt',
      tableTickets: 'id, type, status, code, keyOpenId, companyId, updatedAt',
      cacheMetadata: 'key, updatedAt',
      orderDrafts: 'id, updatedAt',
      orderQueue: 'id, status, tableTicketId, companyId, type, createdAt',
    });

    this.db.set(db);
    await db.open();
    return db;
  }

  productsCacheKey(): string {
    return 'products';
  }

  categoriesCacheKey(): string {
    return 'categories';
  }

  tableTicketsCacheKey(type?: string): string {
    return `table-tickets:${type || 'all'}`;
  }

  async isCacheFresh(key: string, ttlMs = this.cacheRefreshIntervalMs): Promise<boolean> {
    const db = await this.database();
    const metadata = await db.cacheMetadata.get(key);
    if (!metadata) return false;

    return Date.now() - metadata.updatedAt < ttlMs;
  }

  async cacheProducts(products: Product[], cacheKey = this.productsCacheKey()) {
    const db = await this.database();
    const now = new Date().toISOString();

    await db.transaction('rw', db.products, db.cacheMetadata, async () => {
      await db.products.bulkPut(products.map((product) => this.toProductCacheRecord(product, now)));
      await db.cacheMetadata.put({ key: cacheKey, updatedAt: Date.now() });
    });
  }

  async cacheProduct(product: Product) {
    const db = await this.database();
    await db.products.put(this.toProductCacheRecord(product, new Date().toISOString()));
  }

  async getCachedProducts(filters?: Record<string, unknown>, categoryId?: string): Promise<Product[]> {
    const db = await this.database();
    const records = await db.products.toArray();

    return records
      .map((record) => record.data)
      .filter((product) => this.matchesProduct(product, filters, categoryId))
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''));
  }

  async getCachedProduct(id: string): Promise<Product | null> {
    const db = await this.database();
    const record = await db.products.get(id);
    if (record) return record.data;

    const byPdvId = await db.products.where('pdvId').equals(id).first();
    return byPdvId?.data ?? null;
  }

  async cacheCategories(categories: Category[], cacheKey = this.categoriesCacheKey()) {
    const db = await this.database();
    const now = new Date().toISOString();

    await db.transaction('rw', db.categories, db.cacheMetadata, async () => {
      await db.categories.bulkPut(categories.map((category) => this.toCategoryCacheRecord(category, now)));
      await db.cacheMetadata.put({ key: cacheKey, updatedAt: Date.now() });
    });
  }

  async cacheCategory(category: Category) {
    const db = await this.database();
    await db.categories.put(this.toCategoryCacheRecord(category, new Date().toISOString()));
  }

  async getCachedCategories(filters?: Record<string, unknown>): Promise<PaginatedResponse<Category>> {
    const db = await this.database();
    const records = await db.categories.toArray();

    return {
      items: records
        .map((record) => record.data)
        .filter((category) => this.matchesCategory(category, filters))
        .sort((left, right) => (left.name || '').localeCompare(right.name || '')),
      total: records.length,
    }
  }

  async getCachedCategory(id: string): Promise<Category | null> {
    const db = await this.database();
    const record = await db.categories.get(id);
    return record?.data ?? null;
  }

  async cacheTableTickets(tableTickets: TableTicket[], cacheKey?: string) {
    const db = await this.database();
    const now = new Date().toISOString();
    const records: TableTicketCacheRecord[] = [];

    for (const tableTicket of tableTickets) {
      const safeTableTicket = await this.keepPendingTableTicket(db, tableTicket);
      records.push(this.toTableTicketCacheRecord(safeTableTicket, now));
    }

    await db.transaction('rw', db.tableTickets, db.cacheMetadata, async () => {
      await db.tableTickets.bulkPut(records);

      if (cacheKey) {
        await db.cacheMetadata.put({ key: cacheKey, updatedAt: Date.now() });
      }
    });
  }

  async cacheTableTicket(tableTicket: TableTicket) {
    const db = await this.database();
    const safeTableTicket = await this.keepPendingTableTicket(db, tableTicket);
    await db.tableTickets.put(this.toTableTicketCacheRecord(safeTableTicket, new Date().toISOString()));
  }

  async getCachedTableTickets(filters?: Record<string, unknown>, options?: CacheListOptions): Promise<PaginatedResponse<TableTicket>> {
    const db = await this.database();
    const records = await db.tableTickets.toArray();

    let tableTickets = records
      .map((record) => record.data)
      .filter((tableTicket) => this.matchesTableTicket(tableTicket, filters));

    tableTickets = this.sortTableTickets(tableTickets, options?.orderBy);

    const offset = Math.max(0, options?.offset || 0);
    const limit = options?.limit;

    return {
      items: typeof limit === 'number'
        ? tableTickets.slice(offset, offset + limit)
        : tableTickets.slice(offset),
      total: tableTickets.length
    }
  }

  async getCachedTableTicket(id: string): Promise<TableTicket | null> {
    const db = await this.database();
    const record = await db.tableTickets.get(id);
    return record?.data ?? null;
  }

  async getCachedKeyOpen(id: string): Promise<KeyOpen | null> {
    const db = await this.database();
    const records = await db.tableTickets.toArray();
    const keyOpen = records
      .map((record) => record.data.keyOpen)
      .find((currentKeyOpen) => currentKeyOpen?.id === id);

    return keyOpen ?? null;
  }

  async getOrderDraft<TItem = unknown>(): Promise<StoredOrderDraft<TItem> | null> {
    const db = await this.database();
    const draft = await db.orderDrafts.get('active') as StoredOrderDraft<TItem> | undefined;
    return draft ?? null;
  }

  async setOrderDraft<TItem = unknown>(tableTicket: TableTicket | null, items: TItem[]) {
    const db = await this.database();
    await db.orderDrafts.put({
      id: 'active',
      tableTicket,
      items,
      updatedAt: new Date().toISOString(),
    });
  }

  async enqueueOrder(payload: QueueOrderPayload): Promise<QueuedOrderRecord> {
    const db = await this.database();
    const now = new Date().toISOString();
    const id = this.createId();
    const keyOpenId = payload.tableTicket.keyOpenId || payload.tableTicket.keyOpen?.id;
    const localKeyOpenId = keyOpenId ? undefined : `local-${id}`;
    const effectiveKeyOpenId = keyOpenId || localKeyOpenId!;
    const needsOpening = !keyOpenId || payload.tableTicket.status === TableStatus.BOOKED;
    const customers = Math.max(1, Number(payload.customers) || Number(payload.tableTicket.keyOpen?.customers) || 1);
    const tableTicket = this.buildQueuedTableTicket(payload.tableTicket, effectiveKeyOpenId, customers, now);
    const items = payload.items.map((item) => ({
      ...item,
      keyOpen: effectiveKeyOpenId,
      dateTime: now,
    }));

    const order: QueuedOrderRecord = {
      id,
      tableTicketId: payload.tableTicket.id,
      companyId: payload.tableTicket.companyId,
      type: payload.tableTicket.type,
      code: payload.tableTicket.code,
      status: 'pending',
      needsOpening,
      customers,
      keyOpenId,
      localKeyOpenId,
      tableTicket,
      items,
      sentItemIndexes: [],
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', db.orderQueue, db.tableTickets, async () => {
      await db.orderQueue.put(order);
      await db.tableTickets.put(this.toTableTicketCacheRecord(tableTicket, now));
    });

    return order;
  }

  async getQueuedOrders(status?: QueuedOrderRecord['status']): Promise<QueuedOrderRecord[]> {
    const db = await this.database();
    return status
      ? db.orderQueue.where('status').equals(status).sortBy('createdAt')
      : db.orderQueue.orderBy('createdAt').toArray();
  }

  async updateQueuedOrder(id: string, patch: Partial<QueuedOrderRecord>): Promise<QueuedOrderRecord | null> {
    const db = await this.database();
    const current = await db.orderQueue.get(id);
    if (!current) return null;

    const updated = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };

    await db.orderQueue.put(updated);
    return updated;
  }

  async removeQueuedOrder(id: string) {
    const db = await this.database();
    await db.orderQueue.delete(id);
  }

  async getQueuedConsumptions(filters?: Record<string, unknown>): Promise<Consumption[]> {
    const queuedOrders = (await Promise.all([
      this.getQueuedOrders('pending'),
      this.getQueuedOrders('processing'),
      this.getQueuedOrders('failed'),
    ])).flat();

    return queuedOrders.flatMap((order) => {
      const sentItemIndexes = new Set(order.sentItemIndexes || []);

      return order.items.filter((item, index) => {
        if (sentItemIndexes.has(index)) return false;
        if (filters?.['keyOpen'] && item.keyOpen !== filters['keyOpen']) return false;
        if (filters?.['companyId'] && item.companyId !== filters['companyId']) return false;
        return true;
      }).map(order => ({ ...order, local: true }));
    });
  }

  private async database(): Promise<PdvTouchDatabase> {
    return this.ready;
  }

  private toProductCacheRecord(product: Product, updatedAt: string): ProductCacheRecord {
    const id = this.getEntityId(product);

    return {
      id,
      pdvId: product.pdvId,
      name: product.name || '',
      productType: product.productType,
      isActive: product.isActive,
      isAvailable: product.isAvailable,
      enableLocal: product.enableLocal,
      keywords: product.keywords,
      categoryIds: this.getProductCategoryIds(product),
      updatedAt,
      data: product,
    };
  }

  private toCategoryCacheRecord(category: Category, updatedAt: string): CategoryCacheRecord {
    return {
      id: this.getEntityId(category),
      name: category.name || '',
      updatedAt,
      data: category,
    };
  }

  private toTableTicketCacheRecord(tableTicket: TableTicket, updatedAt: string): TableTicketCacheRecord {
    return {
      id: tableTicket.id,
      code: tableTicket.code,
      type: tableTicket.type,
      status: tableTicket.status,
      keyOpenId: tableTicket.keyOpenId,
      companyId: tableTicket.companyId,
      updatedAt,
      data: tableTicket,
    };
  }

  private async keepPendingTableTicket(db: PdvTouchDatabase, tableTicket: TableTicket): Promise<TableTicket> {
    const current = await db.tableTickets.get(tableTicket.id);
    const currentKeyOpenId = current?.data.keyOpenId || current?.data.keyOpen?.id || '';
    const incomingKeyOpenId = tableTicket.keyOpenId || tableTicket.keyOpen?.id || '';

    if (currentKeyOpenId.startsWith('local-') && !incomingKeyOpenId) {
      return current!.data;
    }

    return tableTicket;
  }

  private buildQueuedTableTicket(tableTicket: TableTicket, keyOpenId: string, customers: number, now: string): TableTicket {
    return {
      ...tableTicket,
      status: TableStatus.OCCUPIED,
      keyOpenId,
      keyOpen: {
        ...tableTicket.keyOpen,
        id: keyOpenId,
        companyId: tableTicket.companyId,
        tableTicketId: tableTicket.id,
        alias: tableTicket.keyOpen?.alias || '',
        bookedAt: tableTicket.keyOpen?.bookedAt || '',
        openedAt: tableTicket.keyOpen?.openedAt || now,
        closedAt: tableTicket.keyOpen?.closedAt || '',
        customers,
      },
    };
  }

  private matchesProduct(product: Product, filters?: Record<string, unknown>, categoryId?: string): boolean {
    if (categoryId && !this.getProductCategoryIds(product).includes(categoryId)) return false;
    if (!this.matchesExact(product.isActive, filters?.['isActive'])) return false;
    if (!this.matchesExact(product.isAvailable, filters?.['isAvailable'])) return false;
    if (!this.matchesExact(product.enableLocal, filters?.['enableLocal'])) return false;
    if (!this.matchesListFilter(product.productType, filters?.['productType'])) return false;

    const search = String(filters?.['search'] || '').trim();
    if (search && !this.matchesSearch(search, [
      product.name,
      product.description,
      product.keywords,
      product.gtin,
    ])) {
      return false;
    }

    return true;
  }

  private matchesCategory(category: Category, filters?: Record<string, unknown>): boolean {
    const search = String(filters?.['search'] || '').trim();
    if (!search) return true;

    return this.matchesSearch(search, [category.name]);
  }

  private matchesTableTicket(tableTicket: TableTicket, filters?: Record<string, unknown>): boolean {
    if (!this.matchesExact(tableTicket.type, filters?.['type'])) return false;
    if (!this.matchesExact(tableTicket.status, filters?.['status'])) return false;

    const search = String(filters?.['search'] || '').trim();
    if (search && !this.matchesSearch(search, [
      tableTicket.code?.toString(),
      tableTicket.keyOpen?.alias,
    ])) {
      return false;
    }

    return true;
  }

  private matchesExact(value: unknown, filter: unknown): boolean {
    if (filter === undefined || filter === null || filter === '') return true;
    return value === filter;
  }

  private matchesListFilter(value: unknown, filter: unknown): boolean {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return this.matchesExact(value, filter);

    const listFilter = filter as { blackList?: unknown[]; whiteList?: unknown[] };

    if (listFilter.blackList?.some((item) => String(item) === String(value))) return false;
    if (listFilter.whiteList?.length) return listFilter.whiteList.some((item) => String(item) === String(value));

    return true;
  }

  private matchesSearch(search: string, values: Array<string | undefined | null>): boolean {
    const normalizedSearch = this.normalize(search);
    return values.some((value) => this.normalize(value || '').includes(normalizedSearch));
  }

  private sortTableTickets(tableTickets: TableTicket[], orderBy?: string): TableTicket[] {
    const sorted = [...tableTickets];

    if (orderBy === 'code' || !orderBy) {
      sorted.sort((left, right) => Number(left.code) - Number(right.code));
    }

    return sorted;
  }

  private getProductCategoryIds(product: Product): string[] {
    return (product.categories || [])
      .flatMap((category) => [
        category.categoryId,
        category._id,
        category.category?.id,
        category.category?._id,
      ])
      .filter((id): id is string => Boolean(id));
  }

  private getEntityId(entity: { id?: string; _id?: string; pdvId?: string }): string {
    return entity.id || entity._id || entity.pdvId || this.createId();
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
