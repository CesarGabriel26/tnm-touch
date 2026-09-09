import { Component, Input, input, output } from '@angular/core';
import { AvIconComponent as AvIcon } from '../icons/av-icon/av-icon.component';

import { AvButtonGroupComponent } from '../buttons/av-button-group/av-button-group.component';
import { AvButtonComponent } from '../buttons/av-button/av-button.component';
import { VariantColor } from '../../variants';

@Component({
  standalone: true,
  imports: [AvIcon, AvButtonGroupComponent, AvButtonComponent],
  selector: 'av-paginator',
  styleUrls: ['./av-paginator.component.css'],
  templateUrl: './av-paginator.component.html',
})
export class AvPaginatorComponent {
  protected readonly Array = Array;

  @Input() variant: VariantColor = 'gray';

  pageIndex = input.required<number>();
  totalPages = input.required<number>();
  pageChanged = output<number>();

  changePage(page: number) {
    this.pageChanged.emit(page);
  }

  get gridCols() {
    return this.Array(this.totalPages() + 4).fill('1fr').join(' ')
  }
}
