import { Component, signal } from '@angular/core';
import { AvGridComponent } from '../../../components/angular-visuals/components/av-grid/grid.component';
import { CommonModule } from '@angular/common';
import { TABLE_STATUS_LABEL, TableTicket } from '../../../models/table-ticket';
import { getTimeBetween } from '../../../utils/time.uitls';
import { TableTicketService } from '../../../services/tableticket.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LoadingOverlayService } from '../../../services/loading-overlay.service';
import { AvInput } from '../../../components/angular-visuals/components/forms';
import { AvBadgeComponent } from '../../../components/angular-visuals/components/av-badge/av-badge.component';

@Component({
  selector: 'app-tables.component',
  imports: [AvGridComponent, CommonModule, AvBadgeComponent, AvInput, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css',
})
export class TablesComponent {
  TABLE_STATUS_LABEL = TABLE_STATUS_LABEL

  tables = signal<any[]>([]);

  search = new FormControl<string>('');

  constructor(
    private readonly tableTicketService: TableTicketService,
    private readonly loadingOverlayService: LoadingOverlayService
  ) {
    this.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadTables()
    })
    this.loadTables()
  }

  loadTables() {
    this.loadingOverlayService.show('Carregando mesas...');
    this.tableTicketService
      .list(1, 50, { type: 'M', search: this.search.value || '' }).subscribe(async (data: any) => {
        this.tables.set(data.items);
        this.loadingOverlayService.hide();
      })
  }

  getOpenTime(ticket: TableTicket) {
    if (!ticket.keyOpenId || !ticket.keyOpen?.openedAt) return '00:00:00';

    const time = getTimeBetween(new Date(ticket.keyOpen?.openedAt), new Date())
    return `${time.h > 10 ? time.h : `0${time.h}`}:${time.m > 10 ? time.m : `0${time.m}`}:${time.s > 10 ? time.s : `0${time.s}`}`
  }


  getStyle(status: string) {
    switch (status) {
      case 'A':
        return 'emerald';
      case 'O':
        return 'rose';
      case 'B':
        return 'indigo';
      default:
        return 'slate';
    }
  }
}
