import { AvButton, AvToggleGroup } from '@/app/components/angular-visuals/components/buttons';
import { AvSelect } from '@/app/components/angular-visuals/components/forms';
import { TableTicket } from '@/app/models/table-ticket';
import { TableTicketService } from '@/app/services/tableticket.service';
import { Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-table-ticket-search.component',
  imports: [ReactiveFormsModule, AvSelect, AvToggleGroup, AvButton],
  templateUrl: './table-ticket-search.component.html',
  styleUrl: './table-ticket-search.component.css',
})
export class TableTicketSearchComponent {
  tableTickets = signal<TableTicket[]>([]);
  typeOptions = [
    { label: 'Mesa', value: 'M', icon: 'table_restaurant' },
    { label: 'Comanda', value: 'C', icon: 'confirmation_number' },
  ];

  type = new FormControl<string>('M', {
    nonNullable: true,
    validators: [Validators.required]
  });
  search = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  constructor(
    private readonly tableTicketService: TableTicketService
  ) {
    this.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(() => this.loadTablesTickets())

    this.type.valueChanges.pipe(
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(() => this.loadTablesTickets())
  }

  onSearch = (term: string) => {
    this.search.patchValue(term);
  };

  loadTablesTickets() {
    this.tableTicketService.list(1, 10, {
      search: this.search.value,
      type: this.type.value
    }).subscribe({
      next: (value) => {
        this.tableTickets.set(value.items)
      }
    })
  }
}
