import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingOverlayService {
  $visible = new BehaviorSubject<boolean>(false);
  $message = new BehaviorSubject<string>('');
  $err = new BehaviorSubject<boolean>(false);

  show(message?: string) {
    Promise.resolve().then(() => {
      this.$err.next(false);
      if (message) {
        this.$message.next(message);
      }
      this.$visible.next(true);
    });
  }

  error(message: string) {
    Promise.resolve().then(() => {
      if (message) {
        this.$message.next(message);
      }
      this.$visible.next(true);
      this.$err.next(true);
    });
  }

  hide() {
    Promise.resolve().then(() => {
      this.$visible.next(false);
    });
  }

}
