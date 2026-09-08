import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
// CSS-driven variants: classes are applied from component CSS

@Component({
  imports: [CommonModule],
  selector: 'av-progress-bar',
  standalone: true,
  styleUrls: ['./av-progress-bar.component.css'],
  templateUrl: './av-progress-bar.component.html',
})
export class AvProgressBarComponent {
  value = input.required<number>();
  max = input.required<number>();

  variant = input<string>('gray');
  striped = input<boolean>(false);

  showPercent = input<boolean>(true);
  percentPos = input<'fill' | 'center'>('center');

  gradient = input<boolean>(false);
  from = input<string>('var(--av-progress-gradient-from-default)');
  to = input<string>('var(--av-progress-gradient-to-default)');


  /**
   * height in pixels. Default is 5.
  */
  height = input<number>(20);

  get trackClasses() {
    return `av-progress__track--${this.variant()}`;
  }

  get fillClasses() {
    const classes = [`av-progress__fill--${this.variant()}`];
    if (this.gradient()) classes.push('av-progress__fill--gradient');
    if (this.striped()) classes.push('av-progress__fill--striped');
    return classes.join(' ');
  }

  get textClasses() {
    return `av-progress__text--${this.variant()}`;
  }

  get percentValue(): number {
    if (this.max() <= 0) return 0;
    return Math.min(100, Math.max(0, (this.value() / this.max()) * 100));
  }
}
