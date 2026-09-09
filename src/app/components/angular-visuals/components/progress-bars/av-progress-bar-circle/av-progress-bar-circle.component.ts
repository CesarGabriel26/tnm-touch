import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'av-progress-bar-circle',
  standalone: true,
  styleUrls: ['./av-progress-bar-circle.component.css'],
  templateUrl: './av-progress-bar-circle.component.html',
})
export class AvProgressBarCircleComponent {
  private readonly circumference = 565.48;

  value = input.required<number>();
  max = input.required<number>();

  variant = input<string>('gray');
  striped = input<boolean>(false);

  showPercent = input<boolean>(true);

  get trackClasses() {
    return `av-progress-circle__track--${this.variant()}`;
  }

  get fillClasses() {
    return [
      `av-progress-circle__fill--${this.variant()}`,
      this.striped() ? 'av-progress-circle__fill--striped' : '',
    ].filter(Boolean).join(' ');
  }

  get textClasses() {
    return `av-progress-circle__text--${this.variant()}`;
  }

  get percentValue(): number {
    if (this.max() <= 0) return 0;
    return Math.min(100, Math.max(0, (this.value() / this.max()) * 100));
  }

  get dashOffset(): number {
    return this.circumference * (1 - this.percentValue / 100);
  }
}
