import { Directive, HostListener, input, inject } from '@angular/core';
import { AvTableComponent } from '../components/av-table/av-table.component';

@Directive({
  selector: '[avSortableColumn]',
  standalone: true,
})
export class AvSortableColumnDirective {
  field = input.required<string>({ alias: 'avSortableColumn' });

  private table = inject(AvTableComponent);

  @HostListener('click')
  onClick() {
    this.table.sort(this.field());
  }
}
