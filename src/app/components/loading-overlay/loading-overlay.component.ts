import { Component, OnInit, signal } from '@angular/core';
import { LoadingOverlayService } from '../../services/loading-overlay.service';
import { AvIcon } from '../../lib/angular-visuals/components/icons';

@Component({
  selector: 'loading-overlay',
  imports: [AvIcon],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.css',
})
export class LoadingOverlayComponent {
  icon = signal<string>('blocks-shuffle-3');
  visible = signal<boolean>(false);
  hidden = signal<boolean>(false);

  constructor(
    public readonly loadingOverlayService: LoadingOverlayService
  ) {
    loadingOverlayService.$visible.subscribe((value) => {
      this.visible.set(value);
      if(!value) {
        setTimeout(() => {
          this.hidden.set(true)
        }, 310);
      } else {
        this.hidden.set(false)
      }
    })
  }

}
