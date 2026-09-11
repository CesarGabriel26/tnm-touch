import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AvButton } from '../../../components/angular-visuals/components/buttons';
import { AvIcon } from '../../../components/angular-visuals/components/icons';
import { TableTicket } from '../../../models/table-ticket';
import { DialogService } from '../../../services/dialog.service';
import { LoadingOverlayService } from '../../../services/loading-overlay.service';
import { DraftConsumption, OrderDraftService } from '../../../services/order/order-draft.service';
import { OrderQueueSyncService } from '../../../services/order/order-queue-sync.service';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-basket.component',
  imports: [CommonModule, CurrencyPipe, AvButton, AvIcon],
  templateUrl: './basket.component.html',
  styleUrl: './basket.component.css',
})
export class BasketComponent {
  saving = signal(false);

  tableTicket = computed(() => this.orderDraftService.tableTicket());
  items = computed(() => this.orderDraftService.items());
  total = computed(() => this.orderDraftService.total());
  count = computed(() => this.orderDraftService.quantity());

  constructor(
    public readonly orderDraftService: OrderDraftService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly loadingOverlayService: LoadingOverlayService,
    private readonly storageService: StorageService,
    private readonly orderQueueSyncService: OrderQueueSyncService,
  ) { }

  get title(): string {
    const tableTicket = this.tableTicket();
    if (!tableTicket) return 'Pedido';

    return `${tableTicket.type === 'M' ? 'Mesa' : 'Comanda'} ${tableTicket.code}`;
  }

  increase(index: number, quantity: number) {
    this.orderDraftService.changeQuantity(index, quantity + 1);
  }

  decrease(index: number, quantity: number) {
    this.orderDraftService.changeQuantity(index, Math.max(1, quantity - 1));
  }

  remove(index: number) {
    this.orderDraftService.remove(index);
  }

  addMore() {
    const tableTicket = this.tableTicket();
    if (tableTicket?.id) {
      this.router.navigate(['/order', tableTicket.id]);
      return;
    }

    this.router.navigate(['/home']);
  }

  itemSubtotal(item: DraftConsumption): number {
    return item.unityPrice * item.quantity;
  }

  async saveOrder() {
    const tableTicket = this.tableTicket();
    const items = this.items();

    if (!tableTicket || items.length === 0 || this.saving()) return;

    this.saving.set(true);
    this.loadingOverlayService.show('Salvando pedido');

    try {
      const customers = await this.getCustomersForQueue(tableTicket);
      const keyOpenId = tableTicket.keyOpenId || tableTicket.keyOpen?.id || '';
      const queuedOrder = await this.storageService.enqueueOrder({
        tableTicket,
        customers,
        items: this.orderDraftService.prepareForSave(keyOpenId),
      });

      this.orderDraftService.finishOrder();
      this.orderQueueSyncService.syncQueue();
      this.loadingOverlayService.hide();
      this.router.navigate(['/table-ticket-summary', queuedOrder.tableTicketId]);
    } catch (err: any) {
      if (err?.message === 'Abertura cancelada') {
        this.loadingOverlayService.hide();
        return;
      }

      this.loadingOverlayService.error(err?.message || 'Nao foi possivel enviar o pedido');
    } finally {
      this.saving.set(false);
    }
  }

  private async getCustomersForQueue(tableTicket: TableTicket): Promise<number> {
    if (tableTicket.keyOpenId || tableTicket.keyOpen || tableTicket.type !== 'M') {
      return Math.max(1, Number(tableTicket.keyOpen?.customers) || 1);
    }

    const answer = await this.dialogService.prompt(
      'Abrir mesa',
      'Quantos clientes estao nesta mesa?',
      [{
        label: 'Clientes',
        inputType: 'number',
        initialValue: 1,
        step: 1,
      }],
      'Abrir',
      'Cancelar'
    );

    if (answer === false || answer === null || answer === undefined || answer === '') {
      throw new Error('Abertura cancelada');
    }

    return Math.max(1, Number(answer) || 1);
  }
}
