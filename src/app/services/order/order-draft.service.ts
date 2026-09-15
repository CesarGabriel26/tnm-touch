import { computed, effect, EventEmitter, Injectable, signal } from '@angular/core';
import { Consumption } from '../../models/consumption';
import { TableTicket } from '../../models/table-ticket';
import { IOrderItem } from '../../models/order/orderItem';
import { areComplementsEqual } from '../../utils/product.utils';
import { StorageService } from '../storage.service';

export interface DraftConsumption extends Consumption {
  isNew: true;
  snapshot: IOrderItem;
}

@Injectable({
  providedIn: 'root'
})
export class OrderDraftService {
  itemAdded = new EventEmitter<void>();

  private readonly activeTableTicket = signal<TableTicket | null>(null);
  private readonly draftItems = signal<DraftConsumption[]>([]);
  private restored = false;
  private touchedBeforeRestore = false;

  readonly tableTicket = computed(() => this.activeTableTicket());
  readonly items = computed(() => this.draftItems());
  readonly total = computed(() => this.draftItems().reduce((acc, item) => acc + item.unityPrice * item.quantity, 0));
  readonly count = computed(() => this.draftItems().length);
  readonly quantity = computed(() => this.draftItems().reduce((acc, item) => acc + item.quantity, 0));
  readonly quantitiesByProduct = computed(() => {
    return this.draftItems().reduce<Record<string, number>>((acc, item) => {
      if (!item.productId) return acc;
      acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
      return acc;
    }, {});
  });

  constructor(
    private readonly storageService: StorageService,
  ) {
    void this.restore();
    effect(() => {
      const tableTicket = this.activeTableTicket();
      const items = this.draftItems();

      if (!this.restored) return;

      void this.storageService.setOrderDraft(tableTicket, items);
    });
  }

  setTableTicket(table: TableTicket) {
    this.markTouched();
    this.activeTableTicket.set(table);
  }

  startOrder(table: TableTicket | null) {
    this.markTouched();
    const active = this.activeTableTicket();
    const activeId = active?.id || null;
    const nextId = table?.id || null;

    if (activeId !== nextId) {
      this.draftItems.set([]);
    }

    this.activeTableTicket.set(table);
  }

  updateTableTicket(table: TableTicket) {
    this.markTouched();
    const active = this.activeTableTicket();
    if (active?.id === table.id) {
      this.activeTableTicket.set(table);
    }
  }

  add(table: TableTicket | null, item: IOrderItem) {
    this.startOrder(table);

    const productId = this.getProductId(item);
    if (!productId || !item.data?.[0]) return;

    const existingIndex = this.draftItems().findIndex((draft) => this.isSameItem(draft.snapshot, item));

    if (existingIndex >= 0) {
      this.changeQuantity(existingIndex, this.draftItems()[existingIndex].quantity + item.quantity);
      this.itemAdded.emit();
      return;
    }

    const companyId = table?.companyId || localStorage.getItem('@companyId') || '';
    const keyOpen = table?.keyOpenId || table?.keyOpen?.id || '';

    const newItem: DraftConsumption = {
      companyId,
      keyOpen,
      productId,
      snapshot: item,
      orderGroup: 1,
      productGroup: 0,
      dateTime: new Date().toISOString(),
      product: this.getItemName(item),
      unityPrice: item.price,
      unity: item.data[0].measure || 'UN',
      quantity: item.quantity,
      obs: item.obs,
      status: 0,
      isNew: true,
    };

    this.draftItems.update((items) => [...items, newItem]);
    this.itemAdded.emit();
  }

  remove(index: number) {
    this.markTouched();
    this.draftItems.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  changeQuantity(index: number, quantity: number) {
    this.markTouched();
    const normalizedQuantity = Math.max(1, Number(quantity) || 1);

    this.draftItems.update((items) => {
      const next = [...items];
      const current = next[index];
      if (!current) return items;

      const snapshot = {
        ...current.snapshot,
        quantity: normalizedQuantity,
        total: this.roundMoney(current.snapshot.price * normalizedQuantity),
      };

      next[index] = {
        ...current,
        quantity: normalizedQuantity,
        snapshot,
      };

      return next;
    });
  }

  clear() {
    this.markTouched();
    this.draftItems.set([]);
  }

  finishOrder() {
    this.markTouched();
    this.draftItems.set([]);
    this.activeTableTicket.set(null);
  }

  prepareForSave(keyOpenId: string): Consumption[] {
    return this.draftItems().map((item) => {
      const { isNew, ...consumption } = item;
      return {
        ...consumption,
        keyOpen: keyOpenId,
        dateTime: new Date().toISOString(),
        snapshot: {
          ...item.snapshot,
          quantity: item.quantity,
          total: this.roundMoney(item.snapshot.price * item.quantity),
        },
      };
    });
  }

  getItemName(item: IOrderItem): string {
    if (!item.data || item.data.length === 0) return 'Produto';
    return item.data.map((data) => data.name).join(' / ');
  }

  private isSameItem(left: IOrderItem, right: IOrderItem): boolean {
    const leftProductId = this.getProductId(left);
    const rightProductId = this.getProductId(right);
    const leftVariationId = left.variation?.variationItemPdvId || '';
    const rightVariationId = right.variation?.variationItemPdvId || '';
    const leftObs = (left.obs || '').trim();
    const rightObs = (right.obs || '').trim();

    return leftProductId === rightProductId
      && leftVariationId === rightVariationId
      && leftObs === rightObs
      && areComplementsEqual(left.complements || [], right.complements || []);
  }

  private getProductId(item: IOrderItem): string {
    return item.data?.[0]?._id || item.data?.[0]?.pdvId || '';
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private async restore() {
    try {
      const restored = await this.storageService.getOrderDraft<DraftConsumption>();

      if (restored && !this.touchedBeforeRestore) {
        this.activeTableTicket.set(restored.tableTicket);
        this.draftItems.set(Array.isArray(restored.items) ? restored.items : []);
      }
    } catch {
      // Persistencia em memoria continua funcionando se o IndexedDB nao estiver disponivel.
    } finally {
      this.restored = true;
      if (this.touchedBeforeRestore) {
        void this.storageService.setOrderDraft(this.activeTableTicket(), this.draftItems());
      }
    }
  }

  private markTouched() {
    if (!this.restored) {
      this.touchedBeforeRestore = true;
    }
  }
}
