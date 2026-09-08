import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingOverlayService {
  $visible = new BehaviorSubject<boolean>(false);
  $message = new BehaviorSubject<string>('');

  show(message?: string) {
    Promise.resolve().then(() => {
      if (message) {
        this.$message.next(message);
      }
      this.$visible.next(true);
    });
  }

  hide() {
    Promise.resolve().then(() => {
      this.$visible.next(false);
    });
  }

}
