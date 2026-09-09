import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

@Component({
  imports: [CommonModule],
  selector: 'av-carousel-item',
  styleUrls: ['./av-carousel-item.component.css'],
  templateUrl: './av-carousel-item.component.html',
})
export class AvCarouselItemComponent {
  @Input() duration?: number

  isActive = signal<boolean>(false);
  index = signal<number>(0);
  transition = signal<'scroll' | 'fade'>('fade');

  get itemClasses(): string {
    return [
      'av-carousel-item',
      `av-carousel-item--${this.transition()}`,
      this.isActive() ? 'av-carousel-item--active' : 'av-carousel-item--inactive',
    ].join(' ');
  }
}
