import { Component, HostBinding, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvIconRegistryService } from '../../../services/av-icon-registry.service';
import { LoaderIcons } from '../../../utils/loader-icon-seed';
import { IconType } from '../../../types';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';
import { VariantColor, VariantRounded } from '../../../variants';

@Component({
  imports: [CommonModule, AvIcon],
  standalone: true,
  selector: 'button[av-button], a[av-button]',
  templateUrl: './av-button.component.html',
  styleUrl: './av-button.component.css'
})
export class AvButtonComponent {
  @Input() variant: VariantColor | string = 'gray';
  @Input() rounded: VariantRounded | string = 'md';

  @Input() icon?: string;
  @Input() iconProvider: IconType = 'material';


  loading = input<boolean>(false);
  @Input() loadingIcon: LoaderIcons = 'bars-rotate-fade'

  @Input() hoverAnimation: 'color' | 'fill' = 'color';

  fillByValue = input<boolean>(false);

  fillValue = input<number>(0);
  fillTotal = input<number>(100);

  constructor(
    public iconRegistry: AvIconRegistryService
  ) { }

  @HostBinding('class')
  get elementClasses() {
    const animationClass = this.hoverAnimation === 'fill' ? 'av-btn--fill-animation' : 'av-btn--hover-animation';
    return ['av-btn shadow-xl', animationClass, `av-btn--${this.variant}`, `av-btn--rounded-${this.rounded}`].join(' ');
  }

  get fillClass() {
    return [
      'av-btn__value-fill',
      `av-btn__value-fill--${this.variant}`,
      `av-btn__value-fill--rounded-${this.rounded}`,
    ].join(' ');
  }

  get fillPercent(): number {
    const total = this.fillTotal();
    if (total <= 0) return 0;
    const percent = (this.fillValue() / total) * 100;
    return Math.min(100, Math.max(0, percent));
  }
}
