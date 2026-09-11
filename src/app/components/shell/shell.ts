import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { AvIcon } from '../angular-visuals/components/icons';
import { AvButton } from '../angular-visuals/components/buttons';
import { OrderDraftService } from '../../services/order/order-draft.service';
import { OfflineCacheRefreshService } from '../../services/offline-cache-refresh.service';
import { AvBadgeComponent } from "../angular-visuals/components/av-badge/av-badge.component";
import { OrderQueueSyncService } from '../../services/order/order-queue-sync.service';
import { User } from '../../models/user';
import { WebsocketClientService } from '../../services/websocketClient.service';
import { LocalStorageService } from '../../services/localStorage.service';
import configs from '../../config';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, AvIcon, AvButton, CommonModule, RouterLink, AvBadgeComponent],
  standalone: true,
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class AppShell implements OnDestroy, OnInit {
  drawerOpen = signal<boolean>(false);

  currentPath = signal<string>('');
  private routerSubscription!: Subscription;
  private itemAddedSubscription!: Subscription;
  private disconnected = false;

  user = signal<User>({} as User);
  company = signal<any>({} as any);

  @ViewChild('basket', { read: ElementRef }) basket?: ElementRef<HTMLButtonElement>;

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    public readonly orderDraftService: OrderDraftService,
    private readonly localStorageService: LocalStorageService,
    private readonly orderQueueSyncService: OrderQueueSyncService,
    private readonly websocketClientService: WebsocketClientService,
    private readonly offlineCacheRefreshService: OfflineCacheRefreshService,
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

    const session = this.localStorageService.getSession()
    if (!session) return;

    this.user.set(session.user);
    this.company.set(session.company);
  }

  ngOnInit(): void {
    if (!this.touchConnectionId()) return

    this.websocketClientService.connect(configs.wsUrl).onOpen(() => {
      this.websocketClientService.send({
        type: 'event',
        event: 'touch.connect',
        data: {
          id: this.touchConnectionId(),
          userId: this.user().id,
          companyId: this.company().id,
          companyName: this.company().name,
          userName: this.user().name,
          online: true
        }
      })
    })
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    if (this.itemAddedSubscription) {
      this.itemAddedSubscription.unsubscribe();
    }

    this.notifyTouchDisconnect();

    this.offlineCacheRefreshService.stop();
    this.orderQueueSyncService.stop();
  }

  get isHome() {
    return this.currentPath().includes('/home')
  }

  goBack() {
    this.location.back();
  }

  goHome(){
    this.router.navigate(['/home']);
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

  leave() {
    this.notifyTouchDisconnect();
    localStorage.removeItem('@token')
    const companyId = localStorage.getItem('@companyId')
    localStorage.removeItem('@companyId')
    localStorage.removeItem('@session')
    this.router.navigate(['/login'], { queryParams: { companyId } });
  }

  private notifyTouchDisconnect(): void {
    if (this.disconnected) return;
    this.disconnected = true;

    const id = this.touchConnectionId();
    if (id) {
      this.websocketClientService.send({
        type: 'event',
        event: 'touch.disconnect',
        data: { id }
      })
    }

    this.websocketClientService.close();
  }

  private touchConnectionId(): string {
    const companyId = this.company().id;
    const userId = this.user().id;

    if (companyId && userId) return `${companyId}_${userId}`;
    return userId || '';
  }
}
