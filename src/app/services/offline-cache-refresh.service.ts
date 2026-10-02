import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProductType } from '../models/order/catalogItem';
import { CategoryService } from './category.service';
import { ComplementsService } from './complements.service';
import { ConsumptionsService } from './consumption.service';
import { ProductService } from './product.service';
import { StorageService } from './storage.service';
import { TableTicketService } from './tableticket.service';
import { VariationsService } from './variations.service';

@Injectable({
  providedIn: 'root',
})
export class OfflineCacheRefreshService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;
  private readonly handleOnline = () => void this.refresh();

  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly tableTicketService: TableTicketService,
    private readonly storageService: StorageService,
    private readonly complementsService: ComplementsService,
    private readonly variationsService: VariationsService,
    private readonly consumptionsService: ConsumptionsService,
  ) { }

  start(intervalMs = this.storageService.cacheRefreshIntervalMs) {
    if (this.intervalId || typeof window === 'undefined') return;

    window.addEventListener('online', this.handleOnline);
    void this.refresh();
    this.intervalId = setInterval(() => void this.refresh(), intervalMs);
  }

  stop() {
    if (!this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
    window.removeEventListener('online', this.handleOnline);
  }

  async refresh() {
    if (this.refreshing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    this.refreshing = true;

    try {
      await Promise.allSettled([
        firstValueFrom(this.categoryService.getAll(undefined, { forceRefresh: true })),
        firstValueFrom(this.productService.getAll({
          isActive: true,
          isAvailable: true,
          productType: {
            blackList: [
              ProductType.INGREDIENT,
              ProductType.DOUGH,
            ],
          },
        }, { forceRefresh: true })),
        firstValueFrom(this.complementsService.getAll({ limit: 999999 }, { forceRefresh: true })),
        firstValueFrom(this.variationsService.getAll({ limit: 999999 }, { forceRefresh: true })),
        firstValueFrom(this.tableTicketService.list(1, 500, { type: 'M' }, 'code', { forceRefresh: true })),
        firstValueFrom(this.tableTicketService.list(1, 500, { type: 'C' }, 'code', { forceRefresh: true })),
      ]);

      await this.refreshOpenConsumptions();
    } finally {
      this.refreshing = false;
    }
  }

  private async refreshOpenConsumptions() {
    const tableTickets = await this.storageService.getCachedTableTickets({ status: 'O' });
    const keyOpenIds = Array.from(new Set(tableTickets.items
      .map((tableTicket) => tableTicket.keyOpenId || tableTicket.keyOpen?.id || '')
      .filter((keyOpenId) => keyOpenId && !keyOpenId.startsWith('local-'))));

    await Promise.allSettled(keyOpenIds.map((keyOpenId) => firstValueFrom(
      this.consumptionsService.list(0, 999999, { keyOpen: keyOpenId }, 'orderGroup', { forceRefresh: true })
    )));
  }
}
