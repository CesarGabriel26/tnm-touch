import { Component, Input, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'av-step',
  styleUrls: ['./av-step.component.css'],
  templateUrl: './av-step.component.html',
})
export class AvStepComponent {
  @Input({required: true}) title!: string
  @Input() icon?: string

  isActive = signal<boolean>(false);
  index = signal<number>(0);
  hasError = signal<boolean>(false)
}
