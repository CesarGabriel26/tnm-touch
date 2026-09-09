import { Component, contentChildren, HostBinding, Input } from '@angular/core';
import { AvButtonComponent } from '../av-button/av-button.component';
@Component({
  selector: 'div[av-button-group], div[av-button-troup]',
  standalone: true,
  templateUrl: './av-button-group.component.html',
  styleUrls: ['./av-button-group.component.css'],
})
export class AvButtonGroupComponent {
  protected readonly Array = Array;
  items = contentChildren(AvButtonComponent, { descendants: true });

  @Input() rounded: boolean = true

  @HostBinding('class')
  get elementClasses() {
    return `av-button-group ${
      this.rounded ? 'round' : ''
    }`
  }



  @HostBinding('style.grid-template-columns')
  get gridCols() {
    return this.Array(this.items().length).fill('max-content').join(' ')
  }
}
