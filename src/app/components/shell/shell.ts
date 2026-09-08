import { Component, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { AvIcon } from '../../lib/angular-visuals/components/icons';
import { AvButton } from '../../lib/angular-visuals/components/buttons';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, AvIcon, AvButton, CommonModule, RouterLink],
  standalone: true,
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class AppShell implements OnDestroy {
  drawerOpen = signal<boolean>(false);

  currentPath = signal<string>('');
  private routerSubscription!: Subscription;

  constructor(
    private readonly router: Router,
    private readonly location: Location
  ) {
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath.set(this.router.url);
    })
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  get isHome() {
    return this.currentPath().includes('/home')
  }

  goBack() {
    this.location.back();
  }
}
