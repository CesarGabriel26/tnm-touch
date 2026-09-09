import { CommonModule } from '@angular/common';
import { Component, input, Input } from '@angular/core';

@Component({
  selector: 'div[av-grid]',
  imports: [CommonModule],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.css',
})
export class AvGridComponent {
  @Input() cols: {
    'xs': number,
    'sm': number,
    'md': number,
    'lg': number,
    'xl': number,
    '2xl': number
  } = {
      'xs': 1,
      'sm': 2,
      'md': 3,
      'lg': 4,
      'xl': 5,
      '2xl': 6
    }

  empty = input<boolean>(false)
  gap = input<number>(.5)
}
