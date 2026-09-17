import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingOverlayComponent } from "./components/loading-overlay/loading-overlay.component";
import { DialogComponent } from "./components/utils/dialog/dialog.component";
import { LocalNetworkAccessService } from './services/local-network-access.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent, DialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('pdv-touch');

  constructor(readonly localNetworkAccess: LocalNetworkAccessService) { }
}
