import { Component, HostBinding, input, Input } from '@angular/core';
import { IconSize, IconType } from '../../../types';
import { CommonModule } from '@angular/common';
import { AvIconRegistryService } from '../../../services/av-icon-registry.service';


@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'div[av-icon], span[av-icon], i[av-icon]',
  templateUrl: './av-icon.component.html',
  styleUrls: ['./av-icon.component.css'],
})
export class AvIconComponent {
  /** Nome do ícone (ex: 'search', 'user', 'settings') */
  name = input.required<string>()

  /** Biblioteca / Fonte */
  @Input() type: IconType = 'av';

  /** Tamanho */
  @Input() size: IconSize = 'md';

  /** Aplica rotação contínua (útil para spinners e carregamentos) */
  @Input() spin: boolean = false;

  private readonly sizeMap: Record<string, string> = {
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    '2xl': '40px',
  };


  constructor(
    public iconRegistry: AvIconRegistryService
  ) { }

  get parsedSize(): string {
    return this.sizeMap[this.size] || this.size;
  }

  @HostBinding('class')
  get elementClasses() {
    return 'flex items-center justify-center'
  }
}
