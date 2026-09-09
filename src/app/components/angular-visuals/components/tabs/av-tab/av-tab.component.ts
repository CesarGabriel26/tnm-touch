import { Component, Input, signal } from '@angular/core';
import { IconType } from '../../../types';

@Component({
  selector: 'av-tab',
  standalone: true,
  imports: [],
  templateUrl: './av-tab.component.html',
  styleUrl: './av-tab.component.css',
})
export class AvTabComponent {
  @Input() title?: string;
  @Input() label?: string;
  @Input() icon?: string;
  @Input() iconType: IconType = 'material';
  @Input() disabled: boolean = false;

  isActive = signal<boolean>(false);
  index = signal<number>(0);
}

// Compatibility export
export { AvTabComponent as AvTabsComponent };

