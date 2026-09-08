import { Component, HostBinding, Input } from '@angular/core';

@Component({
  imports: [],
  selector: 'span[av-badge]',
  styleUrls: ['./av-badge.component.css'],
  templateUrl: './av-badge.component.html',
})
export class AvBadgeComponent {
  @Input() variant: string = 'gray';

  @HostBinding('class')
  get elementClasses() {
    const base = 'av-badge';
    const variantClass = `av-badge--${this.variant}`;
    return [base, variantClass].join(' ');
  }
}
