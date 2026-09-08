import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { loaderSeed } from '../utils/loader-icon-seed';
import { iconSeed } from '../utils/icons-seed';

@Injectable({
  providedIn: 'root'
})
export class AvIconRegistryService {
  private sanitizer = inject(DomSanitizer);
  private registry = new Map<string, SafeHtml>();


  constructor() {
    this.registerIcons(loaderSeed);
    this.registerIcons(iconSeed);
  }

  /** Registra um único ícone/loader SVG */
  registerIcon(name: string, svgContent: string): void {
    const safeSvg = this.sanitizer.bypassSecurityTrustHtml(svgContent);
    this.registry.set(name, safeSvg);
  }

  /** Registra vários ícones de uma vez */
  registerIcons(icons: Record<string, string>): void {
    Object.entries(icons).forEach(([name, svg]) => this.registerIcon(name, svg));
  }

  /** Retorna o SVG higienizado */
  getIcon(name: string): SafeHtml | undefined {
    return this.registry.get(name);
  }
}
