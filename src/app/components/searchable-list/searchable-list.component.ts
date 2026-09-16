import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvIcon } from '../angular-visuals/components/icons';

export interface ListItem {
  id: string;
  name: string;
  salePrice: number;
  photo: string;
  variation: string;
}

@Component({
  standalone: true,
  selector: 'app-searchable-list',
  imports: [CommonModule, FormsModule, CurrencyPipe, AvIcon],
  templateUrl: './searchable-list.component.html',
})
export class SearchableListComponent {
  searchTerm: string = '';

  @Input({ required: true })
  list = signal<ListItem[]>([]);

  @Output()
  selected = new EventEmitter<{ id: string; variation: string }>();

  @Output()
  close = new EventEmitter<void>();

  get filteredList(): ListItem[] {
    if (!this.searchTerm.trim()) {
      return this.list();
    }

    return this.list().filter((item) =>
      item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
