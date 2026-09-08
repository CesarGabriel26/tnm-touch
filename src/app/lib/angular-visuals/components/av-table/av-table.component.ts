import { CommonModule } from '@angular/common';
import { Component, computed, contentChild, Input, input, output, TemplateRef } from '@angular/core';
import { AvSelect } from '../forms';
import { AvPaginatorComponent } from '../av-paginator/av-paginator.component';
import { VariantColor } from '../../variants';

export interface SortEvent {
  field: string;
  order: 'asc' | 'desc';
}

export interface PageChangeEvent {
  page: number; // 0-based (0, 1, 2...)
  pageSize: number;
}

@Component({
  selector: 'av-table',
  standalone: true,
  imports: [CommonModule, AvSelect, AvPaginatorComponent],
  templateUrl: './av-table.component.html',
  styleUrls: ['./av-table.component.css'],
})
export class AvTableComponent<T = any> {
  @Input() variant: VariantColor = 'orange'

  value = input<T[]>([]);

  // Paginator Inputs (Padronizados como Signals)
  paginator = input<boolean>(false);
  pageSize = input<number>(25);
  pageIndex = input<number>(0);
  totalRecords = input<number>(0);
  rowsPerPageOptions = input<number[]>([]);
  currentPageLabel = input<string>('Página {currentPage} de {totalPages} · {totalRecords} itens');

  // Outputs
  onSort = output<SortEvent>();
  onPage = output<PageChangeEvent>();

  // Sort Inputs
  sortField = input<string>('');
  sortOrder = input<'asc' | 'desc'>('asc');

  // Templates
  headerTemplate = contentChild<TemplateRef<any>>('header');
  bodyTemplate = contentChild<TemplateRef<any>>('body');

  // Cálculos Reativos Computados
  totalPages = computed(() => {
    const size = this.pageSize();
    const total = this.totalRecords();
    if (!size || size <= 0) return 0;
    return Math.ceil(total / size);
  });

  formattedPageLabel = computed(() => {
    const current = this.pageIndex() + 1; // Ajusta para exibir 1-based no label
    const total = this.totalPages();
    const records = this.totalRecords();

    return this.currentPageLabel()
      .replace('{currentPage}', String(current))
      .replace('{totalPages}', String(total))
      .replace('{totalRecords}', String(records));
  });

  // Métodos de Navegação
  sort(field: string) {
    const currentField = this.sortField();
    const currentOrder = this.sortOrder();
    const newOrder: 'asc' | 'desc' = currentField === field && currentOrder === 'asc' ? 'desc' : 'asc';

    this.onSort.emit({ field, order: newOrder });
  }

  changePage(newPage: number) {
    if (newPage < 0 || newPage >= this.totalPages()) return;
    this.onPage.emit({ page: newPage, pageSize: this.pageSize() });
  }

  changePageSize(value: number) {
    const newSize = Number(value);
    this.onPage.emit({ page: 0, pageSize: newSize });
  }
}
