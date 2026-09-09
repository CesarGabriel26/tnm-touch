import { Component, computed, effect, OnInit, signal } from '@angular/core';
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
import { SummaryOptionsComponent } from '../../../components/utils/dialog-models/summary-options/summary-options.component';

interface tableConsumption extends Consumption {
  selected: boolean;
}

@Component({
  selector: 'app-summary.component',
  imports: [CommonModule, AvTableComponent, AvSortableColumnDirective, AvSortIcon, AvIcon, CurrencyPipe, DatePipe, AvTabs, AvTab, AvButton, AvCheckbox, FormsModule, ReactiveFormsModule, AvBadgeComponent],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.css',
})
export class SummaryComponent implements OnInit {
  pageSize = 8
  id = signal<string>('')

  tableTicket = signal<TableTicket | null>(null);
  keyOpen = signal<KeyOpen | null>(null)
  consumptions = signal<tableConsumption[]>([]);

  page = signal<number>(0)
  totalItems = signal<number>(0)

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
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/home'])
      return
    }

    this.id.set(id)

    effect(() => {
      this.page()
      if (!this.keyOpen()) {
        this.loadConsumptions()
      }
    })
  }

  ngOnInit(): void {
    this.loadTable();
  }

  loadTable() {
    this.loadingOverlayService.show('carregando...')

    this.tableTicketService.get(this.id()).subscribe((data) => {
      this.tableTicket.set(data)
      this.loadingOverlayService.hide();

      if (data.keyOpenId) {
        this.loadConsumptions();
        this.loadKeyOpen()
      }
    })
  }

  loadKeyOpen() {
    this.loadingOverlayService.show('carregando...')

    this.keyOpenService.get(this.tableTicket()?.keyOpenId!).subscribe((data) => {
      this.keyOpen.set(data)
      this.loadingOverlayService.hide()
    })
  }

  loadConsumptions() {
    this.loadingOverlayService.show('carregando consumos...')

    this.consumptionsService.list(this.page(), this.pageSize, {
      keyOpen: this.tableTicket()?.keyOpenId
    }).subscribe((data) => {
      this.totalItems.set(data.total)
      this.consumptions.set(data.items.map((c) => ({ ...c, selected: false })))
      this.loadingOverlayService.hide()
    })
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

  async options() {
    const op = await this.dialogService.showComponent(SummaryOptionsComponent);
    console.log(op);

  }

  invoice() {
    // this.dialogService.showComponent(InvoiceDialogComponent)
  }

  goToOrder() {
    this.router.navigate(['/order', this.id()]);
  }
}
