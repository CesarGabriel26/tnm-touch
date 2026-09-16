import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import configs from '../../config';
import { Consumption } from '../../models/consumption';
import { KeyOpen } from '../../models/keyOpen';
import { TableStatus, TableTicket } from '../../models/table-ticket';
import { ConsumptionsService } from '../consumption.service';
import { QueuedOrderRecord, StorageService } from '../storage.service';

type ConsumptionPayload = Partial<Consumption> & {
  total?: number;
};

interface QueueSyncResult {
  sent: number;
  failed: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderQueueSyncService {
  private readonly retryIntervalMs = 60 * 1000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private syncing = false;

  readonly lastResult = signal<QueueSyncResult>({ sent: 0, failed: 0 });

  constructor(
    private readonly http: HttpClient,
    private readonly storageService: StorageService,
    private readonly consumptionsService: ConsumptionsService,
  ) { }

  start(intervalMs = this.retryIntervalMs) {
    if (this.intervalId || typeof window === 'undefined') return;

    void this.syncQueue();
    this.intervalId = setInterval(() => void this.syncQueue(), intervalMs);
  }

  stop() {
    if (!this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async syncQueue(): Promise<QueueSyncResult> {
    if (this.syncing) return this.lastResult();

    this.syncing = true;
    const result: QueueSyncResult = { sent: 0, failed: 0 };

    try {
      const orders = await this.getSyncableOrders();

      for (const order of orders) {
        try {
          await this.syncOrder(order);
          result.sent += 1;
        } catch (error) {
          result.failed += 1;
          await this.storageService.updateQueuedOrder(order.id, {
            status: 'failed',
            error: this.getErrorMessage(error),
          });
        }
      }

      this.lastResult.set(result);
      return result;
    } finally {
      this.syncing = false;
    }
  }

  private async getSyncableOrders(): Promise<QueuedOrderRecord[]> {
    const orders = (await Promise.all([
      this.storageService.getQueuedOrders('pending'),
      this.storageService.getQueuedOrders('processing'),
      this.storageService.getQueuedOrders('failed'),
    ])).flat();

    return orders.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  private async syncOrder(order: QueuedOrderRecord) {
    let currentOrder = await this.storageService.updateQueuedOrder(order.id, {
      status: 'processing',
      attempts: order.attempts + 1,
      error: undefined,
    }) ?? order;

    const remoteOrder = await this.resolveRemoteKeyOpen(currentOrder);
    currentOrder = remoteOrder.order;

    const sentItemIndexes = new Set(currentOrder.sentItemIndexes || []);
    const pendingItems = currentOrder.items
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => !sentItemIndexes.has(index));

    if (pendingItems.length > 0) {
      const createdConsumptions = await firstValueFrom(this.http.post<Consumption[]>(
        `${configs.apiUrl}/consumption`,
        pendingItems.map(({ item, index }) => this.toConsumptionPayload(item, remoteOrder.keyOpenId, index))
      ));

      await this.storageService.cacheConsumptions(
        createdConsumptions,
        this.storageService.consumptionsCacheKey(remoteOrder.keyOpenId)
      );
      await this.enqueuePrintQueue(createdConsumptions, currentOrder.companyId);

      for (const { index } of pendingItems) {
        sentItemIndexes.add(index);
      }

      currentOrder = await this.storageService.updateQueuedOrder(currentOrder.id, {
        sentItemIndexes: [...sentItemIndexes],
      }) ?? currentOrder;
    }

    await this.storageService.removeQueuedOrder(currentOrder.id);
    await this.refreshCachedTableTicket(currentOrder.tableTicketId);

    if (pendingItems.length > 0) {
      this.consumptionsService.updated.emit();
    }
  }

  private async enqueuePrintQueue(consumptions: Consumption[], companyId: string) {
    if (consumptions.length === 0 || !companyId) return;

    try {
      await firstValueFrom(this.http.post(`${configs.apiUrl}/print-queue/enqueue`, {
        companyId,
        type: 'consumptions',
        data: consumptions,
      }));
    } catch (error) {
      console.error('Erro ao gerar fila de impressão dos consumos:', error);
    }
  }

  private async resolveRemoteKeyOpen(order: QueuedOrderRecord): Promise<{ order: QueuedOrderRecord; keyOpenId: string }> {
    let keyOpenId = this.getRemoteKeyOpenId(order.keyOpenId)
      || this.getRemoteKeyOpenId(order.tableTicket?.keyOpenId)
      || this.getRemoteKeyOpenId(order.tableTicket?.keyOpen?.id);

    let currentOrder = order;

    if (!keyOpenId) {
      if (!order.tableTicketId) {
        const createdKeyOpen = await this.createRemoteKeyOpen(order);
        keyOpenId = createdKeyOpen.id;
        currentOrder = await this.persistResolvedAvulsoKeyOpen(order, keyOpenId);
        return { order: currentOrder, keyOpenId };
      }

      const remoteTableTicket = await this.getRemoteTableTicket(order.tableTicketId);
      const remoteKeyOpen = remoteTableTicket.keyOpen;
      const remoteKeyOpenId = this.getRemoteKeyOpenId(remoteTableTicket.keyOpenId)
        || this.getRemoteKeyOpenId(remoteKeyOpen?.id);

      if (remoteKeyOpenId) {
        keyOpenId = remoteKeyOpenId;
        currentOrder = await this.persistResolvedKeyOpen(order, remoteTableTicket, keyOpenId, true);
      } else {
        const createdKeyOpen = await this.createRemoteKeyOpen(order);
        keyOpenId = createdKeyOpen.id;
        currentOrder = await this.persistResolvedKeyOpen(order, remoteTableTicket, keyOpenId, true, createdKeyOpen);
      }
    }

    if (currentOrder.needsOpening && currentOrder.tableTicket) {
      const occupiedTableTicket = await this.setRemoteTableOccupied(currentOrder.tableTicket, keyOpenId);
      currentOrder = await this.persistResolvedKeyOpen(currentOrder, occupiedTableTicket, keyOpenId, false);
    }

    return { order: currentOrder, keyOpenId };
  }

  private async persistResolvedKeyOpen(
    order: QueuedOrderRecord,
    tableTicket: TableTicket,
    keyOpenId: string,
    needsOpening: boolean,
    keyOpen?: KeyOpen,
  ): Promise<QueuedOrderRecord> {
    const tableTicketWithKeyOpen = this.withKeyOpen(tableTicket, keyOpenId, keyOpen, TableStatus.OCCUPIED);
    const items = order.items.map((item) => ({
      ...item,
      keyOpen: keyOpenId,
    }));

    await this.storageService.cacheTableTicket(tableTicketWithKeyOpen);

    return await this.storageService.updateQueuedOrder(order.id, {
      keyOpenId,
      localKeyOpenId: undefined,
      needsOpening,
      tableTicket: tableTicketWithKeyOpen,
      items,
    }) ?? {
      ...order,
      keyOpenId,
      localKeyOpenId: undefined,
      needsOpening,
      tableTicket: tableTicketWithKeyOpen,
      items,
    };
  }

  private async persistResolvedAvulsoKeyOpen(order: QueuedOrderRecord, keyOpenId: string): Promise<QueuedOrderRecord> {
    const items = order.items.map((item) => ({
      ...item,
      keyOpen: keyOpenId,
    }));

    return await this.storageService.updateQueuedOrder(order.id, {
      keyOpenId,
      localKeyOpenId: undefined,
      items,
    }) ?? {
      ...order,
      keyOpenId,
      localKeyOpenId: undefined,
      items,
    };
  }

  private async getRemoteTableTicket(tableTicketId: string): Promise<TableTicket> {
    return firstValueFrom(this.http.get<TableTicket>(`${configs.apiUrl}/table-ticket/${tableTicketId}`));
  }

  private async createRemoteKeyOpen(order: QueuedOrderRecord): Promise<KeyOpen> {
    return firstValueFrom(this.http.post<KeyOpen>(`${configs.apiUrl}/key-open`, {
      companyId: order.companyId,
      ...(order.tableTicketId ? { tableTicketId: order.tableTicketId } : {}),
      customers: order.customers,
      openedAt: new Date().toISOString(),
    }));
  }

  private async refreshCachedTableTicket(tableTicketId?: string) {
    if (!tableTicketId) return;

    try {
      const tableTicket = await this.getRemoteTableTicket(tableTicketId);
      await this.storageService.cacheTableTicket(tableTicket);
    } catch (error) {
      console.error('Erro ao atualizar cache da mesa/comanda apos sincronizar pedido:', error);
    }
  }

  private async setRemoteTableOccupied(tableTicket: TableTicket, keyOpenId: string): Promise<TableTicket> {
    const updatedTableTicket = await firstValueFrom(this.http.put<TableTicket>(
      `${configs.apiUrl}/table-ticket/${tableTicket.id}`,
      { status: TableStatus.OCCUPIED }
    ));

    return this.withKeyOpen(updatedTableTicket, keyOpenId, tableTicket.keyOpen, TableStatus.OCCUPIED);
  }

  private withKeyOpen(
    tableTicket: TableTicket,
    keyOpenId: string,
    keyOpen?: KeyOpen,
    status = tableTicket.status,
  ): TableTicket {
    return {
      ...tableTicket,
      status,
      keyOpenId,
      keyOpen: {
        ...tableTicket.keyOpen,
        ...keyOpen,
        id: keyOpenId,
        companyId: tableTicket.companyId,
        tableTicketId: tableTicket.id,
        alias: keyOpen?.alias || tableTicket.keyOpen?.alias || '',
        bookedAt: keyOpen?.bookedAt || tableTicket.keyOpen?.bookedAt || '',
        openedAt: keyOpen?.openedAt || tableTicket.keyOpen?.openedAt || new Date().toISOString(),
        closedAt: keyOpen?.closedAt || tableTicket.keyOpen?.closedAt || '',
        customers: Number(keyOpen?.customers || tableTicket.keyOpen?.customers) || 1,
      },
    };
  }

  private toConsumptionPayload(item: Consumption, keyOpenId: string, index: number): ConsumptionPayload {
    const { id, ...payload } = item;

    return {
      ...payload,
      keyOpen: keyOpenId,
      orderItemId: item.orderItemId ?? index,
      total: this.roundMoney(item.unityPrice * item.quantity),
    };
  }

  private getRemoteKeyOpenId(id?: string): string {
    if (!id || id.startsWith('local-')) return '';
    return id;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;

    if (typeof error === 'object' && error && 'message' in error) {
      return String((error as { message?: unknown }).message || 'Erro ao sincronizar pedido');
    }

    return 'Erro ao sincronizar pedido';
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
