import { Component, ElementRef, OnDestroy, signal, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { AvIcon } from '../angular-visuals/components/icons';
import { AvButton } from '../angular-visuals/components/buttons';
import { OrderDraftService } from '../../services/order/order-draft.service';
import { OfflineCacheRefreshService } from '../../services/offline-cache-refresh.service';
import { AvBadgeComponent } from "../angular-visuals/components/av-badge/av-badge.component";
import { OrderQueueSyncService } from '../../services/order/order-queue-sync.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, AvIcon, AvButton, CommonModule, RouterLink, AvBadgeComponent],
  standalone: true,
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class AppShell implements OnDestroy {
  drawerOpen = signal<boolean>(false);

  currentPath = signal<string>('');
  private routerSubscription!: Subscription;
  private itemAddedSubscription!: Subscription;

  @ViewChild('basket', { read: ElementRef }) basket?: ElementRef<HTMLButtonElement>;

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    public readonly orderDraftService: OrderDraftService,
    private readonly offlineCacheRefreshService: OfflineCacheRefreshService,
    private readonly orderQueueSyncService: OrderQueueSyncService,
  ) {
    this.currentPath.set(this.router.url);
    this.offlineCacheRefreshService.start();
    this.orderQueueSyncService.start();

    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath.set(this.router.url);
    });

    this.itemAddedSubscription = orderDraftService.itemAdded.subscribe(() => {
      const basket = this.basket?.nativeElement;
      if (!basket) return;

      basket.classList.remove('shake');
      void basket.offsetWidth;
      basket.classList.add('shake');
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    if (this.itemAddedSubscription) {
      this.itemAddedSubscription.unsubscribe();
    }

    this.offlineCacheRefreshService.stop();
    this.orderQueueSyncService.stop();
  }

  get isHome() {
    return this.currentPath().includes('/home')
  }

  goBack() {
    this.location.back();
  }

  openOrder() {
    const match = this.currentPath().match(/\/table-ticket-summary\/([^/?#]+)/);

    if (match?.[1]) {
      this.router.navigate(['/order', match[1]]);
      return;
    }

    const activeTableTicket = this.orderDraftService.tableTicket();

    if (activeTableTicket?.id) {
      this.router.navigate(['/order', activeTableTicket.id]);
      return;
    }

    this.router.navigate(['/home']);
  }
}
