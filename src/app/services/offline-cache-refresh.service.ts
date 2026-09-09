import { Injectable } from '@angular/core';
import { ProductType } from '../models/order/catalogItem';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { StorageService } from './storage.service';
import { TableTicketService } from './tableticket.service';

@Injectable({
  providedIn: 'root',
})
export class OfflineCacheRefreshService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly tableTicketService: TableTicketService,
    private readonly storageService: StorageService,
  ) { }

  start(intervalMs = this.storageService.cacheRefreshIntervalMs) {
    if (this.intervalId || typeof window === 'undefined') return;

    void this.refresh();
    this.intervalId = setInterval(() => void this.refresh(), intervalMs);
  }

  stop() {
    if (!this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async refresh() {
    this.categoryService.getAll(undefined, { forceRefresh: true }).subscribe();
    this.productService.getAll({
      isActive: true,
      isAvailable: true,
      enableLocal: true,
      productType: {
        blackList: [
          ProductType.INGREDIENT,
          ProductType.ADDITIONAL,
          ProductType.BORDER,
          ProductType.DOUGH,
        ],
      },
    }, { forceRefresh: true }).subscribe();
    this.tableTicketService.list(1, 500, { type: 'M' }, 'code', { forceRefresh: true }).subscribe();
    this.tableTicketService.list(1, 500, { type: 'C' }, 'code', { forceRefresh: true }).subscribe();
  }
}
