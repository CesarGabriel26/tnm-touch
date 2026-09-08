import { Component, inject, input, Input } from '@angular/core';
import { AvTableComponent } from '../../av-table/av-table.component';


@Component({
  imports: [],
  standalone: true,
  selector: 'av-sort-icon',
  templateUrl: './av-sort-icon.component.html',
  styleUrls: ['./av-sort-icon.component.css'],
})
export class AvSortIconComponent {
  field = input.required<string>();
  table = inject(AvTableComponent);
}
