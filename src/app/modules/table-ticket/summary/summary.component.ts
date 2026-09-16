import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TableTicket } from '../../../models/table-ticket';
import { TableTicketService } from '../../../services/tableticket.service';
import { LoadingOverlayService } from '../../../services/loading-overlay.service';
import { ConsumptionsService } from '../../../services/consumption.service';
import { Consumption } from '../../../models/consumption';
import { AvTableComponent } from '../../../components/angular-visuals/components/av-table/av-table.component';
import { AvSortableColumnDirective } from '../../../components/angular-visuals/directives/av-sortable-column.directive';
import { AvIcon, AvSortIcon } from '../../../components/angular-visuals/components/icons';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { KeyOpen } from '../../../models/keyOpen';
import { KeyOpenService } from '../../../services/keyopen.service';
import { AvTabs, AvTab } from '../../../components/angular-visuals/components/tabs';
import { AvButton } from "../../../components/angular-visuals/components/buttons";
import { AvCheckbox } from "../../../components/angular-visuals/components/forms";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AvBadgeComponent } from "../../../components/angular-visuals/components/av-badge/av-badge.component";
import { DialogService } from '../../../services/dialog.service';
import { TableTicketSearchComponent } from './components/table-ticket-search/table-ticket-search.component';
import { SummaryOptionsComponent } from './components/summary-options/summary-options.component';
import { StorageService } from '../../../services/storage.service';

interface tableConsumption extends Consumption {
  selected: boolean;
  local?: boolean;
}

@Component({
  selector: 'app-summary.component',
  imports: [CommonModule, AvTableComponent, AvBadgeComponent, AvSortableColumnDirective, AvSortIcon, AvIcon, CurrencyPipe, DatePipe, AvTabs, AvTab, AvButton, AvCheckbox, FormsModule, ReactiveFormsModule, AvBadgeComponent],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.css',
})
export class SummaryComponent implements OnInit {
  id = signal<string>('')

  tableTicket = signal<TableTicket | null>(null);
  keyOpen = signal<KeyOpen | null>(null)
  consumptions = signal<tableConsumption[]>([]);

  selectedItensCount = computed(() => {
    return this.consumptions().filter((c) => c.selected).length
  })

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly dialogService: DialogService,
    private readonly keyOpenService: KeyOpenService,
    private readonly tableTicketService: TableTicketService,
    private readonly consumptionsService: ConsumptionsService,
    private readonly loadingOverlayService: LoadingOverlayService,
    private readonly storageService: StorageService,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/home'])
      return
    }

    this.id.set(id)

    this.consumptionsService.updated.pipe(
      takeUntilDestroyed()
    ).subscribe(() => this.loadTable());

    this.storageService.cacheUpdated$.pipe(
      takeUntilDestroyed()
    ).subscribe((key) => {
      const tableTicket = this.tableTicket();
      const keyOpenId = tableTicket?.keyOpenId || tableTicket?.keyOpen?.id || '';

      if (key === `table-ticket:${this.id()}` || key.startsWith('table-tickets')) {
        this.loadTable(false);
      }

      if (keyOpenId && key === this.storageService.consumptionsCacheKey(keyOpenId)) {
        this.loadConsumptions(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadTable();
  }

  loadTable(showLoading = true, forceRefresh = false) {
    if (showLoading) this.loadingOverlayService.show('carregando...')

    this.tableTicketService.get(this.id(), { forceRefresh }).subscribe((data) => {
      this.tableTicket.set(data)
      if (showLoading) this.loadingOverlayService.hide();

      if (data.keyOpenId) {
        this.loadConsumptions(showLoading, forceRefresh);
        this.loadKeyOpen(showLoading, forceRefresh)
      } else {
        this.consumptions.set([]);
        this.keyOpen.set(null);
      }
    })
  }

  loadKeyOpen(showLoading = true, forceRefresh = false) {
    if (showLoading) this.loadingOverlayService.show('carregando...')

    this.keyOpenService.get(this.tableTicket()?.keyOpenId!, { forceRefresh }).subscribe((data) => {
      this.keyOpen.set(data)
      if (showLoading) this.loadingOverlayService.hide()
    })
  }

  loadConsumptions(showLoading = true, forceRefresh = false) {
    if (!this.tableTicket()?.keyOpenId) return
    if (showLoading) this.loadingOverlayService.show('carregando consumos...')

    this.consumptionsService.list(0, 999999, {
      keyOpen: this.tableTicket()?.keyOpenId
    }, 'orderGroup', { forceRefresh }).subscribe((data) => {
      this.consumptions.set(data.items.map((c) => ({ ...c, selected: false })))
      if (showLoading) this.loadingOverlayService.hide()
    })
  }

  totalStatusLabel(): string {
    const tableTicket = this.tableTicket();
    if (!tableTicket) return '';

    if (tableTicket.hasPendingLocal) {
      return 'Inclui pedido pendente de envio';
    }

    if (this.isTableTicketCacheStale(tableTicket)) {
      return 'Valor do cache pode estar desatualizado';
    }

    return '';
  }

  select(selected: boolean, target?: string | tableConsumption) {
    if (target) {
      this.consumptions.update((list) => {
        return list.map((item) => {
          if (typeof target === 'string' ? item.id === target : item === target) {
            return { ...item, selected };
          }
          return item;
        });
      });
    } else {
      this.consumptions.update((list) => list.map((item) => ({ ...item, selected })));
    }
  }

  async options(op?: string) {
    if (!op && this.selectedItensCount() > 0) {
      op = await this.dialogService.showComponent(SummaryOptionsComponent, {
        hasSelectedItems: this.selectedItensCount() > 0
      });
    }

    if (!op) {
      return
    }

    switch (op) {
      case ('split'): {
        const confirm = await this.dialogService.confirm('Desmembrar', 'Deseja desmembrar os itens selecionados?')

        if (!confirm) return;

        const selected = this.consumptions().filter(c => c.selected).map(c => c.id) as string[];
        let quantity = undefined

        if (this.selectedItensCount() === 1) {
          quantity = await this.dialogService.prompt("Desmembrar", 'Em quantas partes deseja dividir este item?',
            [
              {
                inputType: 'number',
                initialValue: 1,
                label: 'Quantidade'
              }
            ],
            "Confirmar",
            "Voltar"
          );

          if (!quantity) return

        }

        this.consumptionsService.split(selected, quantity).subscribe({
          next: () => this.loadTable(true, true)
        })
        break;
      }
      case ('transfer_selected'): {
        const selected = this.consumptions().filter(c => c.selected).map(c => c.id) as string[];
        this.transfer(selected)
        break;
      }
      case ('transfer_all'): {
        const selected = this.consumptions().map(c => c.id) as string[];
        this.transfer(selected)
        break;
      }
      case ('invoice_selected'): {
        break;
      }
      case ('invoice_all'): {
        break;
      }
    }

  }

  async transfer(items: any[]) {
    const confirm = await this.dialogService.confirm('Transferir', 'Deseja transferir os itens selecionados?')

    if (!confirm) return;

    const destination = await this.dialogService.showComponent(TableTicketSearchComponent)
    console.log(destination);

    if (!destination) return;

    this.consumptionsService.transfer(items, destination).subscribe({
      next: () => this.loadTable(true, true)
    });
  }

  invoice() {
    // this.dialogService.showComponent(InvoiceDialogComponent)
  }

  goToOrder() {
    this.router.navigate(['/order', this.id()]);
  }

  private isTableTicketCacheStale(tableTicket: TableTicket): boolean {
    if (!tableTicket.cacheUpdatedAt) return true;

    const cacheUpdatedAt = new Date(tableTicket.cacheUpdatedAt).getTime();
    if (!Number.isFinite(cacheUpdatedAt)) return true;

    return Date.now() - cacheUpdatedAt > this.storageService.cacheRefreshIntervalMs;
  }
}
