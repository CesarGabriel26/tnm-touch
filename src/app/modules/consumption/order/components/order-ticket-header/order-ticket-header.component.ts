import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AvIcon } from '../../../../../components/angular-visuals/components/icons';
import { TableTicket, TABLE_STATUS_LABEL, TICKET_STATUS_LABEL } from '../../../../../models/table-ticket';

@Component({
  selector: 'app-order-ticket-header',
  imports: [CommonModule, CurrencyPipe, AvIcon],
  templateUrl: './order-ticket-header.component.html',
  styleUrl: './order-ticket-header.component.css',
})
export class OrderTicketHeaderComponent {
  @Input() tableTicket: TableTicket | null = null;
  @Input() itemsCount = 0;
  @Input() itemsTotal = 0;

  @Output() openBasket = new EventEmitter<void>();

  readonly tableStatusLabel = TABLE_STATUS_LABEL;
  readonly ticketStatusLabel = TICKET_STATUS_LABEL;

  get title(): string {
    if (!this.tableTicket) return 'Pedido';
    return `${this.tableTicket.type === 'M' ? 'Mesa' : 'Comanda'} ${this.tableTicket.code}`;
  }

  get statusLabel(): string {
    if (!this.tableTicket) return '';
    const labels = this.tableTicket.type === 'M' ? this.tableStatusLabel : this.ticketStatusLabel;
    return labels[this.tableTicket.status] || this.tableTicket.status;
  }

  get statusClass(): string {
    switch (this.tableTicket?.status) {
      case 'O':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'B':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'C':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  }
}
