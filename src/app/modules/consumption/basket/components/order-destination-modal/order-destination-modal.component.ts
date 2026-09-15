import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TableTicket } from '@/app/models/table-ticket';
import { AvSelect } from '@/app/components/angular-visuals/components/forms';
import { AvButton, AvToggleGroup } from '@/app/components/angular-visuals/components/buttons';
import { AvIcon } from '@/app/components/angular-visuals/components/icons';
import { DialogService } from '@/app/services/dialog.service';
import { TableTicketService } from '@/app/services/tableticket.service';


export interface OrderDestinationResult {
  type: 'avulso' | 'table_ticket';
  tableTicket?: TableTicket;
}

@Component({
  selector: 'app-order-destination-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvSelect, AvToggleGroup, AvButton, AvIcon],
  templateUrl: './order-destination-modal.component.html',
  styleUrl: './order-destination-modal.component.css',
})
export class OrderDestinationModalComponent {
  tableTickets = signal<TableTicket[]>([]);

  destinationTypeOptions = [
    { label: 'Mesa', value: 'M', icon: 'table_restaurant' },
    { label: 'Comanda', value: 'C', icon: 'confirmation_number' },
    { label: 'Avulso', value: 'A', icon: 'storefront' },
  ];

  type = new FormControl<'M' | 'C' | 'A'>('M', {
    nonNullable: true,
    validators: [Validators.required],
  });

  search = new FormControl<string>('', {
    nonNullable: true,
  });

  destinationId = new FormControl<string>('');

  constructor(
    private readonly dialogService: DialogService,
    private readonly tableTicketService: TableTicketService,
  ) {
    this.loadTablesTickets();

    this.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe(() => this.loadTablesTickets());

    this.type.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.destinationId.patchValue('');
        this.search.patchValue('');
        if (this.type.value !== 'A') {
          this.loadTablesTickets();
        }
      });
  }

  onSearch = (term: string) => {
    this.search.patchValue(term);
  };

  loadTablesTickets() {
    if (this.type.value === 'A') return;

    this.tableTicketService
      .list(1, 20, {
        search: this.search.value,
        type: this.type.value,
      })
      .subscribe({
        next: (value) => {
          this.tableTickets.set(value.items);
        },
      });
  }

  close() {
    this.dialogService.close(null);
  }

  confirm() {
    if (this.type.value === 'A') {
      const result: OrderDestinationResult = { type: 'avulso' };
      this.dialogService.close(result);
      return;
    }

    const selectedId = this.destinationId.value;
    const selectedTableTicket = this.tableTickets().find((t) => t.id === selectedId);

    if (!selectedTableTicket) return;

    const result: OrderDestinationResult = {
      type: 'table_ticket',
      tableTicket: selectedTableTicket,
    };

    this.dialogService.close(result);
  }

  get isValid(): boolean {
    if (this.type.value === 'A') return true;
    return Boolean(this.destinationId.value && this.destinationId.value.trim() !== '');
  }
}
