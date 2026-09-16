import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { filter, firstValueFrom, Subscription } from 'rxjs';
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
import { TableTicketService } from '../../services/tableticket.service';
import { ConsumptionsService } from '../../services/consumption.service';
import { StorageService } from '../../services/storage.service';

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
  private websocketSubscription!: Subscription;
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
    private readonly tableTicketService: TableTicketService,
    private readonly consumptionsService: ConsumptionsService,
    private readonly storageService: StorageService,
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

    this.websocketSubscription = this.websocketClientService.onMessage().subscribe((message) => {
      void this.handleRealtimeMessage(message);
    });

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

    if (this.websocketSubscription) {
      this.websocketSubscription.unsubscribe();
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

  goHome() {
    this.router.navigate(['/home']);
  }

  openOrder() {
    const match = this.currentPath().match(/\/table-ticket-summary\/([^/?#]+)/);

    if (match?.[1]) {
      this.router.navigate(['/order', match[1]]);
      return;
    }

    this.router.navigate(['/order']);
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

  private async handleRealtimeMessage(message: any): Promise<void> {
    if (message?.type !== 'table-ticket.changed') return;

    const data = message.data || {};
    if (!this.isSameCompanyEvent(data)) return;

    try {
      await Promise.all([
        this.refreshTableTicketsFromEvent(data),
        this.refreshConsumptionsFromEvent(data),
      ]);
    } catch (error) {
      console.error('Erro ao atualizar mesas/comandas pelo evento em tempo real:', error);
    }
  }

  private isSameCompanyEvent(data: any): boolean {
    const eventCompanyId = this.getString(data.companyId, data.tableTicket?.companyId);
    const currentCompanyId = this.getString(this.company().id);

    return !eventCompanyId || !currentCompanyId || eventCompanyId === currentCompanyId;
  }

  private async refreshTableTicketsFromEvent(data: any): Promise<void> {
    const action = this.getString(data.action) || '';
    const tableTicket = data.tableTicket || {};
    const tableTicketId = this.getString(data.tableTicketId, tableTicket.id);
    const tableTicketType = this.getString(data.tableTicketType, tableTicket.type);
    const isConsumptionChange = action.startsWith('consumption-');

    if (action === 'deleted' && tableTicketId) {
      await this.storageService.removeCachedTableTicket(tableTicketId, tableTicketType);
      await this.refreshTableTicketLists(tableTicketType);
      return;
    }

    if (tableTicketId && !isConsumptionChange) {
      try {
        await firstValueFrom(this.tableTicketService.get(tableTicketId, { forceRefresh: true }));
        return;
      } catch (error) {
        console.error(`Erro ao atualizar mesa/comanda ${tableTicketId}:`, error);
      }
    }

    await this.refreshTableTicketLists(tableTicketType);
  }

  private async refreshTableTicketLists(type?: string): Promise<void> {
    const types = type === 'M' || type === 'C' ? [type] : ['M', 'C'];

    await Promise.allSettled(types.map((currentType) => firstValueFrom(
      this.tableTicketService.list(1, 500, { type: currentType }, 'code', { forceRefresh: true })
    )));
  }

  private async refreshConsumptionsFromEvent(data: any): Promise<void> {
    const keyOpenIds = this.getStringList(data.keyOpenIds);
    if (keyOpenIds.length === 0) return;

    await Promise.allSettled(keyOpenIds.map((keyOpenId) => firstValueFrom(
      this.consumptionsService.list(0, 999999, { keyOpen: keyOpenId }, 'orderGroup', { forceRefresh: true })
    )));
  }

  private getStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return Array.from(new Set(value
      .map((item) => this.getString(item))
      .filter((item): item is string => Boolean(item))));
  }

  private getString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }

    return undefined;
  }
}
