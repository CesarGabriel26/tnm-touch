import { Component, contentChildren, effect, ElementRef, Input, signal, ViewChild } from '@angular/core';
import { AvCarouselItemComponent } from '../av-carousel-item/av-carousel-item.component';
import { CommonModule } from '@angular/common';
import { VariantColor } from '../../../variants';

@Component({
  imports: [CommonModule],
  selector: 'av-carousel',
  styleUrls: ['./av-carousel.component.css'],
  templateUrl: './av-carousel.component.html',
})
export class AvCarouselComponent {
  @ViewChild('content') contentContainer!: ElementRef

  @Input() auto: boolean = true;
  @Input() transition: 'scroll' | 'fade' = 'fade';
  @Input() variant: VariantColor = 'gray';
  @Input() transitionDelay?: number

  items = contentChildren(AvCarouselItemComponent, { descendants: true });

  currentItem = signal<number>(0);
  delay = signal<number>(5000);
  private intervalId: any = null;

  constructor() {
    effect(() => {
      const stepList = this.items();
      const currentIndex = this.currentItem();

      stepList.forEach((item, index) => {
        item.index.set(index);
        item.transition.set(this.transition);
        item.isActive.set(index === currentIndex);
      });


      if (this.transition === 'scroll') {
        const container = this.contentContainer?.nativeElement;
        if (container) {
          // Move o scroll horizontal multiplicando a largura pelo índice ativo
          container.scrollTo({
            left: container.clientWidth * currentIndex,
            behavior: 'smooth'
          });
        }
      }

      if (this.intervalId) {
        clearInterval(this.intervalId);
      }

      const activeItem = stepList[currentIndex];
      const currentDelay = activeItem?.duration ?? this.delay();

      if (this.auto) {
        this.intervalId = setInterval(() => {
          this.next();
        }, currentDelay);
      }
    });
  }

  getDotClasses(index: number) {
    return [
      'av-carousel__dot',
      this.currentItem() === index ? `av-carousel__dot--${this.variant}` : 'av-carousel__dot--inactive',
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
    if (this.currentItem() - 1 < 0) {
      this.currentItem.set(Math.max(0, this.items().length - 1))
    } else {
      this.currentItem.update(n => n - 1)
    }
  }

  changeTo(index: number) {
    this.currentItem.set(index)
  }
}
