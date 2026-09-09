import { Component, OnInit, signal } from '@angular/core';
import { LoadingOverlayService } from '../../services/loading-overlay.service';
import { AvIcon } from '../angular-visuals/components/icons';
import { CommonModule } from '@angular/common';
import { AvButton } from "../angular-visuals/components/buttons";

@Component({
  selector: 'loading-overlay',
  imports: [AvIcon, CommonModule, AvButton],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.css',
})
export class LoadingOverlayComponent {
  icon = signal<string>('blocks-shuffle-3');
  visible = signal<boolean>(false);
  hidden = signal<boolean>(false);
  err = signal<boolean>(false);

  constructor(
    public readonly loadingOverlayService: LoadingOverlayService
  ) {
    loadingOverlayService.$err.subscribe((value) => {
      this.err.set(value);
      if(value) {
        this.icon.set('wifi-fade');
      } else {
        this.icon.set('blocks-shuffle-3');
      }
    })

    loadingOverlayService.$visible.subscribe((value) => {
      this.visible.set(value);
      if (!value) {
        setTimeout(() => {
          this.hidden.set(true)
        }, 310);
      } else {
        this.hidden.set(false)
      }
    })
  }

  close() {
    this.loadingOverlayService.hide()
  }
}
