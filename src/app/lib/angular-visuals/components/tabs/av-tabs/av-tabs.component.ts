import { CommonModule } from '@angular/common';
import { Component, contentChildren, effect, EventEmitter, input, Input, Output, signal } from '@angular/core';
import { AvTabComponent } from '../av-tab/av-tab.component';
import { VariantColor } from '../../../variants';
import { AvIcon } from '../../icons';

@Component({
  selector: 'av-tabs, av-tab-container',
  standalone: true,
  imports: [CommonModule, AvIcon],
  styleUrls: ['./av-tabs.component.css'],
  templateUrl: './av-tabs.component.html',
})
export class AvTabsComponent {
  @Input() variant: VariantColor = 'orange';
  activeTab = input<number>();

  @Output() tabChange = new EventEmitter<number>();
  @Output() activeTabChange = new EventEmitter<number>();

  items = contentChildren(AvTabComponent, { descendants: true });
  currentItem = signal<number>(0);

  constructor() {
    effect(() => {
      if (this.activeTab() !== undefined) {
        this.currentItem.set(this.activeTab() || 0);
      }
    });

    effect(() => {
      const tabList = this.items();
      const currentIndex = this.currentItem();

      tabList.forEach((item, index) => {
        item.index.set(index);
        item.isActive.set(index === currentIndex);
      });
    });
  }

  selectTab(index: number, item?: AvTabComponent) {
    if (item?.disabled) return;

    this.currentItem.set(index);
    this.tabChange.emit(index);
    this.activeTabChange.emit(index);
  }

  tabClassFor(index: number, item: AvTabComponent): string {
    const classes = ['av-tabs__tab'];
    if (item.disabled) {
      classes.push('av-tabs__tab--disabled');
    }
    if (this.currentItem() === index) {
      const color = this.variant ? this.variant.split('-')[0] : 'orange';
      classes.push('av-tabs__tab--active', `av-tabs__tab--${color}`);
    } else {
      classes.push('av-tabs__tab--inactive');
    }
    return classes.join(' ');
  }
}


// Backward compatibility export
export { AvTabsComponent as AvTabContainerComponent };

