import { Component, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TableTicket } from '../../../models/table-ticket';
import { TableTicketService } from '../../../services/tableticket.service';
import { LoadingOverlayService } from '../../../services/loading-overlay.service';
import { ConsumptionsService } from '../../../services/consumption.service';
import { Consumption } from '../../../models/consumption';
import { AvTableComponent } from '../../../lib/angular-visuals/components/av-table/av-table.component';
import { AvSortableColumnDirective } from '../../../lib/angular-visuals/directives/av-sortable-column.directive';
import { AvIcon, AvSortIcon } from '../../../lib/angular-visuals/components/icons';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { KeyOpen } from '../../../models/keyOpen';
import { KeyOpenService } from '../../../services/keyopen.service';
import { AvTabs, AvTab } from '../../../lib/angular-visuals/components/tabs';
import { AvButton } from "../../../lib/angular-visuals/components/buttons";
import { AvCheckbox } from "../../../lib/angular-visuals/components/forms";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AvBadgeComponent } from "../../../lib/angular-visuals/components/av-badge/av-badge.component";
import { DialogService } from '../../../services/dialog.service';
import { InvoiceDialogComponent } from '../../../components/utils/dialog-models/invoice-dialog/invoice-dialog.component';
import { SummaryOptionsComponent } from './components/summary-options/summary-options.component';

interface tableConsumption extends Consumption {
  selected: boolean;
}

@Component({
  selector: 'app-summary.component',
  imports: [AvTableComponent, AvSortableColumnDirective, AvSortIcon, AvIcon, CurrencyPipe, DatePipe, AvTabs, AvTab, AvButton, AvCheckbox, FormsModule, ReactiveFormsModule, AvBadgeComponent],
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
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/home'])
      return
    }

    this.id.set(id)
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

    this.consumptionsService.list(1, 500, {
      keyOpen: this.tableTicket()?.keyOpenId
    }).subscribe((data) => {
      this.consumptions.set(data.map((c) => ({ ...c, selected: false })))
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

  async options(){
    const op = await this.dialogService.showComponent(SummaryOptionsComponent);
    console.log(op);
    
  }

  invoice(){
    this.dialogService.showComponent(InvoiceDialogComponent)
  }
}
