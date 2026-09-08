import { Component, HostBinding } from '@angular/core';
@Component({
  selector: 'div[av-button-group], div[av-button-troup]',
  standalone: true,
  templateUrl: './av-button-group.component.html',
  styleUrls: ['./av-button-group.component.css'],
})
export class AvButtonGroupComponent {
  @HostBinding('class')
  get elementClasses() {
    return 'av-button-group'
  }

}
