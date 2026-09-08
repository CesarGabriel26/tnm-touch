import { Component, Input, computed, signal } from '@angular/core';

export interface Chair {
  x: number;
  y: number;
  rotate: number;
}

export interface LayoutData {
  tableX: number;
  tableY: number;
  tableWidth: number;
  tableHeight: number;
  svgWidth: number;
  svgHeight: number;
  viewBox: string;
  chairs: Chair[];
}

@Component({
  selector: 'app-table-layout',
  standalone: true,
  templateUrl: './table-layout.component.html',
  styleUrl: './table-layout.component.scss',
})
export class TableLayoutComponent {

  @Input()
  set seats(value: number | string) {
    this._seats.set(Number(value) || 4);
  }

  @Input()
  set label(value: string) {
    this._label.set(value);
  }

  readonly _seats = signal(4);
  readonly _label = signal('');

  readonly layout = computed<LayoutData>(() => {
    const total = this._seats();

    let left = 0;
    let right = 0;
    if (total >= 3) left = 1;
    if (total >= 4) right = 1;

    const remaining = Math.max(0, total - left - right);
    const top = Math.ceil(remaining / 2);
    const bottom = remaining - top;

    const maxTopBottom = Math.max(top, bottom, 1);
    const tableWidth = Math.max(50, 20 + maxTopBottom * 30);
    const tableHeight = 50;

    const padding = 25;
    const svgWidth = tableWidth + padding * 2;
    const svgHeight = tableHeight + padding * 2;
    const viewBox = `0 0 ${svgWidth} ${svgHeight}`;

    const tableX = padding;
    const tableY = padding;

    const chairs: Chair[] = [];

    const distribute = (count: number, start: number, end: number): number[] => {
      if (count <= 0) return [];
      if (count === 1) return [(start + end) / 2];
      return Array.from({ length: count }, (_, i) => start + (i * (end - start)) / (count - 1));
    };

    const topBottomMargin = Math.min(20, tableWidth / (maxTopBottom + 1));
    const startX = tableX + topBottomMargin;
    const endX = tableX + tableWidth - topBottomMargin;

    // Top chairs
    distribute(top, startX, endX).forEach(x => {
      chairs.push({
        x,
        y: tableY - 7,
        rotate: 0,
      });
    });

    // Bottom chairs
    distribute(bottom, startX, endX).forEach(x => {
      chairs.push({
        x,
        y: tableY + tableHeight + 7,
        rotate: 180,
      });
    });

    const leftRightMargin = Math.min(18, tableHeight / 3);
    const startY = tableY + leftRightMargin;
    const endY = tableY + tableHeight - leftRightMargin;

    // Left chairs
    distribute(left, startY, endY).forEach(y => {
      chairs.push({
        x: tableX - 7,
        y,
        rotate: 270,
      });
    });

    // Right chairs
    distribute(right, startY, endY).forEach(y => {
      chairs.push({
        x: tableX + tableWidth + 7,
        y,
        rotate: 90,
      });
    });

    return {
      tableX,
      tableY,
      tableWidth,
      tableHeight,
      svgWidth,
      svgHeight,
      viewBox,
      chairs,
    };
  });
}