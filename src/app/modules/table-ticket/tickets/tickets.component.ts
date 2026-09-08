import { Component, signal } from '@angular/core';
import { TableTicket, TICKET_STATUS_LABEL } from '../../../models/table-ticket';
import { getTimeBetween } from '../../../utils/time.uitls';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableTicketService } from '../../../services/tableticket.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AvGridComponent } from "../../../lib/angular-visuals/components/av-grid/grid.component";
import { RouterLink } from '@angular/router';
import { LoadingOverlayService } from '../../../services/loading-overlay.service';
import { AvInput } from '../../../lib/angular-visuals/components/forms';

@Component({
  selector: 'app-tickets.component',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AvInput, AvGridComponent, RouterLink],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css',
})
export class TicketsComponent {
  TICKET_STATUS_LABEL = TICKET_STATUS_LABEL

  STATUS = ['A', 'O']

  selectedTable = signal<TableTicket | null>(null)

  page = signal<number>(1)
  search = new FormControl<string>('')

  tickets = signal<TableTicket[]>([])

  constructor(
    private tableTicketService: TableTicketService,
    private readonly loadingOverlayService: LoadingOverlayService
  ) {
    this.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.getTicketsList()
    })
    this.getTicketsList()
  }

  getTicketsList() {
    this.loadingOverlayService.show('Carregando comandas...');
    this.tableTicketService.list(this.page(), 50, { type: 'C', status: 'O' }).subscribe(async (data: any) => {
      this.tickets.set(data)
      this.loadingOverlayService.hide();
    })
  }

  getStyle(status: string) {
    switch (status) {
      case 'A':
        return 'bg-slate-50 text-slate-600 border border-slate-100';
      case 'O':
        return 'bg-rose-50 text-rose-500 border border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  }

  getOpenTime(ticket: TableTicket) {
    if (!ticket.keyOpen || !ticket.keyOpen?.openedAt) return '00:00:00';

    const time = getTimeBetween(new Date(ticket.keyOpen?.openedAt), new Date())
    return `${time.h > 10 ? time.h : `0${time.h}`}:${time.m > 10 ? time.m : `0${time.m}`}:${time.s > 10 ? time.s : `0${time.s}`}`
  }
}
