import { Component, HostBinding, Input } from '@angular/core';

@Component({
  imports: [],
  selector: 'form[av-form]',
  styleUrls: ['./av-form.component.css'],
  templateUrl: './av-form.component.html',
})
export class AvFormComponent {
  @Input() glass?: boolean

  @HostBinding('class')
  get elementClasses() {
    return ['av-form', this.glass ? 'av-form--glass' : 'av-form--solid'].join(' ')
  }
}
