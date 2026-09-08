import { CommonModule } from '@angular/common';
import { Component, contentChildren, effect, input, Input, signal } from '@angular/core';
import { AvStepComponent } from '../av-step/av-step.component';
import { VariantColor } from '../../../variants';

@Component({
  imports: [CommonModule],
  selector: 'av-stepper',
  styleUrls: ['./av-stepper.component.css'],
  templateUrl: './av-stepper.component.html',
})
export class AvStepperComponent {
  @Input() canSetStep?: boolean
  @Input() noContent?: boolean
  @Input() variant: VariantColor = 'orange'
  currentStep = input<number>()

  items = contentChildren(AvStepComponent, { descendants: true });
  currentItem = signal<number>(0);

  constructor() {
    effect(()=>{
        if(this.currentStep() !== undefined) {
        this.currentItem.set(this.currentStep() || 0)
      }
    })

    effect(() => {
      const stepList = this.items();
      const currentIndex = this.currentItem();

      stepList.forEach((item, index) => {
        item.index.set(index);
        item.isActive.set(index === currentIndex);
      });

    });
  }

  activeClassFor(index: number, item: AvStepComponent) {
    const classes = ['av-stepper__bullet'];
    if (item.hasError()) {
      classes.push('av-stepper__bullet--error');
    } else if (this.currentItem() === index) {
      classes.push(`av-stepper__bullet--${this.variant}`, 'av-stepper__bullet--active');
    } else if (this.currentItem() > index) {
      classes.push(`av-stepper__bullet--${this.variant}`, 'av-stepper__bullet--done');
    }
    return classes.join(' ');
  }

  lineFillClassFor(index: number, item: AvStepComponent) {
    return [
      'av-stepper__line-fill',
      item.hasError() ? 'av-stepper__line-fill--error' : `av-stepper__line-fill--${this.variant}`,
      this.currentItem() > index ? 'av-stepper__line-fill--complete' : 'av-stepper__line-fill--pending',
    ].join(' ');
  }

  next() {
    if (this.currentItem() + 1 >= this.items().length) {
      this.currentItem.set(0)
    } else {
      this.currentItem.update(n => n + 1)
    }
  }

  previous() {
    if (this.currentItem() - 1 <= 0) {
      this.currentItem.set(this.items().length)
    } else {
      this.currentItem.update(n => n - 1)
    }
  }

  changeTo(index: number) {
    if(!this.canSetStep) return;

    this.currentItem.set(index)
  }
}
