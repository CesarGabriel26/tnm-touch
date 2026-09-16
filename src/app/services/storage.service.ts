import { Injectable, signal } from '@angular/core';
import Dexie, { type EntityTable } from 'dexie';
import { Subject } from 'rxjs';
import { Category } from '../models/category/category.model';
import { Consumption } from '../models/consumption';
import { KeyOpen } from '../models/keyOpen';
import { Complement } from '../models/product/complement.model';
import { Product } from '../models/product/product.model';
import { Variation } from '../models/product/variation.model';
import { TableStatus, TableTicket } from '../models/table-ticket';
import { PaginatedResponse } from '../types/response';

const CACHE_REFRESH_INTERVAL_MS = 60 * 1000;

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

interface ComplementCacheRecord {
  id: string;
  companyId?: string;
  name: string;
  updatedAt: string;
  data: Complement;
}

interface VariationCacheRecord {
  id: string;
  companyId?: string;
  name: string;
  updatedAt: string;
  data: Variation;
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

interface ConsumptionCacheRecord {
  id: string;
  companyId: string;
  keyOpen: string;
  status: number;
  dateTime: string;
  updatedAt: string;
  data: Consumption;
}

export interface StoredOrderDraft<TItem = unknown> {
  id: 'active';
  tableTicket: TableTicket | null;
  items: TItem[];
  updatedAt: string;
}

export interface QueueOrderPayload {
  tableTicket?: TableTicket | null;
  keyOpenId?: string;
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
  tableTicket?: TableTicket;
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
  complements: EntityTable<ComplementCacheRecord, 'id'>;
  variations: EntityTable<VariationCacheRecord, 'id'>;
  tableTickets: EntityTable<TableTicketCacheRecord, 'id'>;
  consumptions: EntityTable<ConsumptionCacheRecord, 'id'>;
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
  private readonly cacheUpdatedSubject = new Subject<string>();
  readonly cacheUpdated$ = this.cacheUpdatedSubject.asObservable();
  private readonly ready: Promise<PdvTouchDatabase>;

  constructor() {
    this.ready = this.init();
  }

  async init(): Promise<PdvTouchDatabase> {
    const db = new Dexie('pdv-touch') as PdvTouchDatabase;

    db.version(3).stores({
      products: 'id, pdvId, name, productType, isActive, isAvailable, enableLocal, updatedAt',
      categories: 'id, name, updatedAt',
      complements: 'id, companyId, name, updatedAt',
      variations: 'id, companyId, name, updatedAt',
      tableTickets: 'id, type, status, code, keyOpenId, companyId, updatedAt',
      consumptions: 'id, companyId, keyOpen, status, dateTime, updatedAt',
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

  complementsCacheKey(): string {
    return 'complements';
  }

  variationsCacheKey(): string {
    return 'variations';
  }

  tableTicketsCacheKey(type?: string): string {
    return `table-tickets:${type || 'all'}`;
  }

  consumptionsCacheKey(keyOpen?: string): string {
    return `consumptions:${keyOpen || 'all'}`;
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

    this.notifyCacheUpdated(cacheKey);
  }

  async cacheProduct(product: Product) {
    const db = await this.database();
    await db.products.put(this.toProductCacheRecord(product, new Date().toISOString()));
    this.notifyCacheUpdated(this.productsCacheKey());
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

    this.notifyCacheUpdated(cacheKey);
  }

  async cacheCategory(category: Category) {
    const db = await this.database();
    await db.categories.put(this.toCategoryCacheRecord(category, new Date().toISOString()));
    this.notifyCacheUpdated(this.categoriesCacheKey());
  }

  async getCachedCategories(filters?: Record<string, unknown>): Promise<PaginatedResponse<Category>> {
    const db = await this.database();
    const records = await db.categories.toArray();
    const items = records
      .map((record) => record.data)
      .filter((category) => this.matchesCategory(category, filters))
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''));

    return {
      items,
      total: items.length,
    }
  }

  async getCachedCategory(id: string): Promise<Category | null> {
    const db = await this.database();
    const record = await db.categories.get(id);
    return record?.data ?? null;
  }

  async cacheComplements(complements: Complement[], cacheKey = this.complementsCacheKey()) {
    const db = await this.database();
    const now = new Date().toISOString();

    await db.transaction('rw', db.complements, db.cacheMetadata, async () => {
      const records = await Promise.all(complements.map(async (complement) => {
        const data = this.withEntityId(complement);
        const current = await db.complements.get(this.getEntityId(data));
        return this.toComplementCacheRecord(this.keepComplementOptions(current?.data, data), now);
      }));

      await db.complements.bulkPut(records);
      await db.cacheMetadata.put({ key: cacheKey, updatedAt: Date.now() });
    });

    this.notifyCacheUpdated(cacheKey);
  }

  async cacheComplement(complement: Complement) {
    const db = await this.database();
    const data = this.withEntityId(complement);
    const current = await db.complements.get(this.getEntityId(data));
    await db.complements.put(this.toComplementCacheRecord(this.keepComplementOptions(current?.data, data), new Date().toISOString()));
    this.notifyCacheUpdated(this.complementsCacheKey());
  }

  async getCachedComplements(ids?: string[]): Promise<Complement[]> {
    const db = await this.database();
    const records = ids?.length
      ? (await Promise.all(ids.map((id) => db.complements.get(id)))).filter((record): record is ComplementCacheRecord => !!record)
      : await db.complements.toArray();

    return records
      .map((record) => record.data)
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''));
  }

  async getCachedComplement(id: string): Promise<Complement | null> {
    const db = await this.database();
    const record = await db.complements.get(id);
    return record?.data ?? null;
  }

  async cacheVariations(variations: Variation[], cacheKey = this.variationsCacheKey()) {
    const db = await this.database();
    const now = new Date().toISOString();

    await db.transaction('rw', db.variations, db.cacheMetadata, async () => {
      await db.variations.bulkPut(variations.map((variation) => this.toVariationCacheRecord(variation, now)));
      await db.cacheMetadata.put({ key: cacheKey, updatedAt: Date.now() });
    });

    this.notifyCacheUpdated(cacheKey);
  }

  async cacheVariation(variation: Variation) {
    const db = await this.database();
    await db.variations.put(this.toVariationCacheRecord(variation, new Date().toISOString()));
    this.notifyCacheUpdated(this.variationsCacheKey());
  }

  async getCachedVariations(filters?: Record<string, unknown>): Promise<PaginatedResponse<Variation>> {
    const db = await this.database();
    const records = await db.variations.toArray();

    const items = records
      .map((record) => record.data)
      .filter((variation) => this.matchesVariation(variation, filters))
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''));

    return {
      items,
      total: items.length,
    };
  }

  async getCachedVariation(id: string): Promise<Variation | null> {
    const db = await this.database();
    const record = await db.variations.get(id);
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

    this.notifyCacheUpdated(cacheKey || this.tableTicketsCacheKey());
  }

  async cacheTableTicket(tableTicket: TableTicket) {
    const db = await this.database();
    const safeTableTicket = await this.keepPendingTableTicket(db, tableTicket);
    await db.tableTickets.put(this.toTableTicketCacheRecord(safeTableTicket, new Date().toISOString()));
    this.notifyCacheUpdated(`table-ticket:${tableTicket.id}`);
    this.notifyCacheUpdated(this.tableTicketsCacheKey(tableTicket.type));
  }

  async removeCachedTableTicket(id: string, type?: string) {
    const db = await this.database();
    const current = await db.tableTickets.get(id);
    await db.tableTickets.delete(id);

    this.notifyCacheUpdated(`table-ticket:${id}`);
    this.notifyCacheUpdated(this.tableTicketsCacheKey(type || current?.type));
    this.notifyCacheUpdated(this.tableTicketsCacheKey());
  }

  async getCachedTableTickets(filters?: Record<string, unknown>, options?: CacheListOptions): Promise<PaginatedResponse<TableTicket>> {
    const db = await this.database();
    const records = await db.tableTickets.toArray();

    let tableTickets = await Promise.all(records
      .map((record) => this.withCacheState(db, record))
    );

    tableTickets = tableTickets
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
    return record ? this.withCacheState(db, record) : null;
  }

  async getCachedKeyOpen(id: string): Promise<KeyOpen | null> {
    const db = await this.database();
    const records = await db.tableTickets.toArray();
    const keyOpen = records
      .map((record) => record.data.keyOpen)
      .find((currentKeyOpen) => currentKeyOpen?.id === id);

    return keyOpen ?? null;
  }

  async cacheConsumptions(consumptions: Consumption[], cacheKey?: string, replaceKeyOpen?: string) {
    const db = await this.database();
    const now = new Date().toISOString();

    await db.transaction('rw', db.consumptions, db.cacheMetadata, async () => {
      if (replaceKeyOpen) {
        await db.consumptions.where('keyOpen').equals(replaceKeyOpen).delete();
      }

      await db.consumptions.bulkPut(consumptions.map((consumption) => this.toConsumptionCacheRecord(consumption, now)));

      if (cacheKey) {
        await db.cacheMetadata.put({ key: cacheKey, updatedAt: Date.now() });
      }
    });

    this.notifyCacheUpdated(cacheKey || this.consumptionsCacheKey(replaceKeyOpen));
  }

  async getCachedConsumptions(filters?: Record<string, unknown>, options?: CacheListOptions): Promise<PaginatedResponse<Consumption>> {
    const db = await this.database();
    const records = await db.consumptions.toArray();
    let consumptions = records
      .map((record) => record.data)
      .filter((consumption) => this.matchesConsumption(consumption, filters));

    consumptions = this.sortConsumptions(consumptions, options?.orderBy);

    const offset = Math.max(0, options?.offset || 0);
    const limit = options?.limit;

    return {
      items: typeof limit === 'number'
        ? consumptions.slice(offset, offset + limit)
        : consumptions.slice(offset),
      total: consumptions.length,
    };
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
    const keyOpenId = payload.keyOpenId || payload.tableTicket?.keyOpenId || payload.tableTicket?.keyOpen?.id;
    const localKeyOpenId = keyOpenId ? undefined : `local-${id}`;
    const effectiveKeyOpenId = keyOpenId || localKeyOpenId!;
    const needsOpening = payload.tableTicket ? (!keyOpenId || payload.tableTicket.status === TableStatus.BOOKED) : false;
    const customers = Math.max(1, Number(payload.customers) || Number(payload.tableTicket?.keyOpen?.customers) || 1);
    const tableTicket = payload.tableTicket ? this.buildQueuedTableTicket(payload.tableTicket, effectiveKeyOpenId, customers, now) : undefined;
    const companyId = payload.tableTicket?.companyId || localStorage.getItem('@companyId') || '';
    const items = payload.items.map((item) => ({
      ...item,
      companyId,
      keyOpen: effectiveKeyOpenId,
      dateTime: now,
    }));

    const order: QueuedOrderRecord = {
      id,
      tableTicketId: payload.tableTicket?.id || '',
      companyId,
      type: payload.tableTicket?.type || 'A',
      code: payload.tableTicket?.code || 0,
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
      if (tableTicket) {
        await db.tableTickets.put(this.toTableTicketCacheRecord(tableTicket, now));
      }
    });

    if (tableTicket) {
      this.notifyCacheUpdated(`table-ticket:${tableTicket.id}`);
      this.notifyCacheUpdated(this.tableTicketsCacheKey(tableTicket.type));
    }

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
    if (updated.tableTicketId) {
      this.notifyCacheUpdated(`table-ticket:${updated.tableTicketId}`);
      this.notifyCacheUpdated(this.consumptionsCacheKey(updated.keyOpenId || updated.localKeyOpenId));
    }
    return updated;
  }

  async removeQueuedOrder(id: string) {
    const db = await this.database();
    const current = await db.orderQueue.get(id);
    await db.orderQueue.delete(id);

    if (current?.tableTicketId) {
      this.notifyCacheUpdated(`table-ticket:${current.tableTicketId}`);
      this.notifyCacheUpdated(this.consumptionsCacheKey(current.keyOpenId || current.localKeyOpenId));
    }
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

  private toComplementCacheRecord(complement: Complement, updatedAt: string): ComplementCacheRecord {
    const data = this.withEntityId(complement);
    const id = this.getEntityId(data);

    return {
      id,
      companyId: (data as Complement & { companyId?: string }).companyId,
      name: data.name || '',
      updatedAt,
      data,
    };
  }

  private keepComplementOptions(current: Complement | undefined, incoming: Complement): Complement {
    if (Array.isArray(current?.options) && !Array.isArray(incoming.options)) {
      return {
        ...incoming,
        options: current!.options,
        optionsLoaded: (current as Complement & { optionsLoaded?: boolean }).optionsLoaded,
      } as Complement & {
        optionsLoaded?: boolean;
      };
    }

    return incoming;
  }

  private toVariationCacheRecord(variation: Variation, updatedAt: string): VariationCacheRecord {
    const data = this.withEntityId(variation);
    const id = this.getEntityId(data);

    return {
      id,
      companyId: data.companyId,
      name: data.name || '',
      updatedAt,
      data,
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

  private toConsumptionCacheRecord(consumption: Consumption, updatedAt: string): ConsumptionCacheRecord {
    const id = consumption.id || this.createId();

    return {
      id,
      companyId: consumption.companyId,
      keyOpen: consumption.keyOpen,
      status: consumption.status,
      dateTime: consumption.dateTime,
      updatedAt,
      data: {
        ...consumption,
        id,
      },
    };
  }

  private async withCacheState(db: PdvTouchDatabase, record: TableTicketCacheRecord): Promise<TableTicket> {
    const tableTicket = {
      ...record.data,
      cacheUpdatedAt: record.updatedAt,
    } as TableTicket;

    const pendingOrders = (await db.orderQueue.where('tableTicketId').equals(record.id).toArray())
      .filter((order) => order.status !== 'sent');

    const pendingItems = pendingOrders.flatMap((order) => {
      const sentItemIndexes = new Set(order.sentItemIndexes || []);
      return order.items.filter((_, index) => !sentItemIndexes.has(index));
    });

    if (pendingItems.length === 0) {
      return tableTicket;
    }

    const pendingTotal = pendingItems.reduce((acc, item) => acc + Number(item.unityPrice || 0) * Number(item.quantity || 0), 0);
    const localTableTicket = pendingOrders.find((order) => order.tableTicket)?.tableTicket;
    const keyOpen = tableTicket.keyOpen || localTableTicket?.keyOpen;
    const keyOpenId = tableTicket.keyOpenId || localTableTicket?.keyOpenId || localTableTicket?.keyOpen?.id;

    return {
      ...tableTicket,
      status: TableStatus.OCCUPIED,
      keyOpenId,
      keyOpen,
      consumptionsCount: Number(tableTicket.consumptionsCount || 0) + pendingItems.length,
      total: this.roundMoney(Number(tableTicket.total || 0) + pendingTotal),
      totalPending: this.roundMoney(Number(tableTicket.totalPending || 0) + pendingTotal),
      totalProducts: this.roundMoney(Number(tableTicket.totalProducts || 0) + pendingTotal),
      totalProductsPending: this.roundMoney(Number((tableTicket as any).totalProductsPending || 0) + pendingTotal),
      hasPendingLocal: true,
      totalEstimated: true,
      cacheUpdatedAt: record.updatedAt,
    } as TableTicket;
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

  private matchesVariation(variation: Variation, filters?: Record<string, unknown>): boolean {
    if (!this.matchesExact(variation.companyId, filters?.['companyId'])) return false;

    const search = String(filters?.['search'] || '').trim();
    if (!search) return true;

    return this.matchesSearch(search, [variation.name]);
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

  private matchesConsumption(consumption: Consumption, filters?: Record<string, unknown>): boolean {
    if (!this.matchesExact(consumption.keyOpen, filters?.['keyOpen'])) return false;
    if (!this.matchesExact(consumption.companyId, filters?.['companyId'])) return false;
    if (!this.matchesExact(consumption.status, filters?.['status'])) return false;

    const search = String(filters?.['search'] || '').trim();
    if (search && !this.matchesSearch(search, [
      consumption.product,
      consumption.obs,
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

  private sortConsumptions(consumptions: Consumption[], orderBy?: string): Consumption[] {
    const sorted = [...consumptions];

    if (orderBy === 'dateTime') {
      sorted.sort((left, right) => this.getTime(right.dateTime) - this.getTime(left.dateTime));
      return sorted;
    }

    sorted.sort((left, right) => {
      const orderGroupDiff = Number(right.orderGroup || 0) - Number(left.orderGroup || 0);
      if (orderGroupDiff !== 0) return orderGroupDiff;
      return this.getTime(right.dateTime) - this.getTime(left.dateTime);
    });

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

  private withEntityId<T extends { id?: string; _id?: string }>(entity: T): T {
    const id = entity.id || entity._id;
    if (!id) return entity;

    return {
      ...entity,
      id,
      _id: id,
    };
  }

  private notifyCacheUpdated(key?: string) {
    if (!key) return;
    this.cacheUpdatedSubject.next(key);
  }

  private getTime(value?: string): number {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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
