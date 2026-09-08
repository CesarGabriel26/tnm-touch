import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import currency from 'currency.js';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentMethodService } from '../../../../services/payment-method.service';
import {
  InvoiceBreakdownItem,
  InvoiceBreakdownType,
  InvoicePaymentGroup,
  InvoicePaymentMethod,
  InvoicePaymentMethodSnapshot,
  InvoicePaymentMovement,
  InvoicePaymentStatus,
  InvoiceResult
} from '../../../../types/order/invoice';
import { AvButtonComponent } from '../../../../lib/angular-visuals/components/buttons/av-button/av-button.component';
import { AvSelectComponent } from '../../../../lib/angular-visuals/components/forms/av-select/av-select.component';
import { AvCurrencyInputComponent } from '../../../../lib/angular-visuals/components/forms/av-currency-input/av-currency-input.component';
import { AvStepperComponent } from '../../../../lib/angular-visuals/components/stepper/av-stepper/av-stepper.component';
import { AvStepComponent } from '../../../../lib/angular-visuals/components/stepper/av-step/av-step.component';
import { AvIconComponent } from '../../../../lib/angular-visuals/components/icons/av-icon/av-icon.component';
import { DialogService } from '../../../../services/dialog.service';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-invoice-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    AvButtonComponent,
    AvSelectComponent,
    AvCurrencyInputComponent,
    AvStepperComponent,
    AvStepComponent,
    AvIconComponent,
  ],
  templateUrl: './invoice-dialog.component.html',
  styleUrl: './invoice-dialog.component.scss',
})
export class InvoiceDialogComponent implements OnInit {
  @Input({ required: true }) type: 'order' | 'key_open' = 'order';
  @Input({ required: true }) data!: any;

  currentStep = signal<number>(0);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  summaryItems = signal<InvoicePaymentMovement[]>([]);
  addedPayments = signal<InvoicePaymentGroup[]>([]);
  errorMessage = signal<string>('');

  totalAmount = signal<number>(0);

  paymentMethods = signal<InvoicePaymentMethod[]>([]);
  paymentMethodsOptions = signal<SelectOption[]>([]);

  selectedPaymentMethod = signal<InvoicePaymentMethod | null>(null);
  paymentMethodControl = new FormControl<string | null>(null);
  paymentParcelsControl = new FormControl<number>(1, { nonNullable: true });
  paymentAmount = new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0.01)] });

  billingBreakdown = computed<InvoiceBreakdownItem[]>(() => {
    const providedBreakdown = this.data?.invoiceBreakdown;

    if (Array.isArray(providedBreakdown) && providedBreakdown.length > 0) {
      return providedBreakdown
        .map((item) => this.normalizeBreakdownItem(item))
        .filter((item) => item.amount > 0);
    }

    const tableTicket = this.data?.tableTicket;
    if (!tableTicket) return [];

    const service = this.normalizeMoney(
      tableTicket.invoiceService ??
      tableTicket.totalServicePending ??
      currency(tableTicket.totalService || 0).subtract(tableTicket.totalServicePaid || 0).value
    );
    const couvert = this.normalizeMoney(
      tableTicket.invoiceCouvert ??
      tableTicket.totalCouvertPending ??
      currency(tableTicket.totalCouvert || 0).subtract(tableTicket.totalCouvertPaid || 0).value
    );
    const products = this.normalizeMoney(
      tableTicket.invoiceProducts ??
      currency(this.totalAmount() || this.resolveTotalAmount()).subtract(service).subtract(couvert).value
    );

    return [
      { type: 'products' as const, label: 'Produtos', amount: products, icon: 'restaurant' },
      { type: 'service' as const, label: 'Taxa de Serviço', amount: service, icon: 'room_service' },
      { type: 'couvert' as const, label: 'Couvert Artístico', amount: couvert, icon: 'music_note' },
    ].filter((item) => item.amount > 0);
  });

  allocatedAmount = computed(() => {
    return this.addedPayments().reduce((acc, payment) => {
      return currency(acc).add(payment.grossAmount).value;
    }, 0);
  });

  totalPaid = computed(() => {
    return this.summaryItems().reduce((acc, item) => {
      return currency(acc).add(item.amount).value;
    }, 0);
  });

  totalInstallmentAdjustment = computed(() => {
    return this.addedPayments().reduce((acc, payment) => {
      return currency(acc).add(payment.adjustmentAmount).value;
    }, 0);
  });

  totalAdjustedPayments = computed(() => {
    return currency(this.totalAmount())
      .add(this.totalInstallmentAdjustment())
      .value;
  });

  remainingAmount = computed(() => {
    return currency(this.totalAmount())
      .subtract(this.allocatedAmount())
      .value;
  });

  constructor(
    private dialogService: DialogService,
    private paymentMethodService: PaymentMethodService
  ) { }

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      await this.loadPaymentMethods();
    } finally {
      this.isLoading.set(false);
    }

    this.totalAmount.set(this.resolveTotalAmount());
    this.paymentAmount.patchValue(this.totalAmount());
  }

  async loadPaymentMethods() {
    const methods = await this.paymentMethodService.getAll();
    this.paymentMethods.set(methods);

    this.paymentMethodsOptions.set(
      methods
        .filter((method) => method.isActive !== false)
        .map((method) => ({
          value: this.getPaymentMethodId(method),
          label: method.description || method.code || 'Sem descrição'
        }))
        .filter((option) => !!option.value)
    );
  }

  getParcelOptions(): SelectOption[] {
    const maxParcels = this.getMaxParcels(this.selectedPaymentMethod());

    return Array.from({ length: maxParcels }, (_, index) => {
      const value = index + 1;
      return {
        value,
        label: value === 1 ? '1x' : `${value}x`
      };
    });
  }

  addPayment() {
    this.errorMessage.set('');

    if (!this.canAddPayment()) {
      this.errorMessage.set('Informe uma forma de pagamento e um valor válido.');
      return;
    }

    const method = this.selectedPaymentMethod();
    if (!method) return;

    const amount = this.normalizeMoney(this.paymentAmount.value);
    const remaining = this.remainingAmount();

    if (amount > currency(remaining).add(0.009).value) {
      this.paymentAmount.patchValue(remaining);
      this.errorMessage.set('O valor informado ultrapassa o restante do pedido.');
      return;
    }

    const payment = this.buildPaymentGroup(method, amount, this.currentParcels());

    this.summaryItems.update((items) => [...items, ...payment.movements]);
    this.addedPayments.update((payments) => [...payments, payment]);

    const nextAmount = Math.max(0, this.remainingAmount());
    this.paymentAmount.patchValue(nextAmount);
    this.paymentParcelsControl.patchValue(1);
  }

  removePayment(groupId: string) {
    this.summaryItems.update((payments) => payments.filter((payment) => payment.groupId !== groupId));
    this.addedPayments.update((payments) => payments.filter((payment) => payment.id !== groupId));
    this.paymentAmount.patchValue(Math.max(0, this.remainingAmount()));
  }

  async onPaymentMethodChange(event: any) {
    this.errorMessage.set('');
    const methodId = String(event || '');

    const cachedMethod = this.paymentMethods().find((method) => this.getPaymentMethodId(method) === methodId);
    const method = cachedMethod || (await this.paymentMethodService.get(methodId));
    this.selectedPaymentMethod.set(method);

    const maxParcels = this.getMaxParcels(method);
    if (this.currentParcels() > maxParcels) {
      this.paymentParcelsControl.patchValue(1);
    }
  }

  close() {
    this.dialogService.close();
  }

  onSubmit() {
    this.errorMessage.set('');

    if (!this.canSubmit()) {
      this.errorMessage.set('Complete o valor do pedido antes de faturar.');
      return;
    }

    const result: InvoiceResult = {
      totalAmount: this.totalAmount(),
      totalAdjustment: this.totalInstallmentAdjustment(),
      totalToReceive: this.totalAdjustedPayments(),
      totalPaid: this.totalPaid(),
      remainingAmount: this.remainingAmount(),
      breakdown: this.billingBreakdown(),
      payments: this.addedPayments(),
      movements: this.summaryItems(),
    };

    this.dialogService.close(result);
  }

  canAddPayment(): boolean {
    const amount = this.normalizeMoney(this.paymentAmount.value);
    const remaining = this.remainingAmount();

    return !!this.selectedPaymentMethod()
      && amount > 0
      && amount <= currency(remaining).add(0.009).value;
  }

  canSubmit(): boolean {
    return this.summaryItems().length > 0 && Math.abs(this.remainingAmount()) < 0.01;
  }

  isBalanced(): boolean {
    return Math.abs(this.remainingAmount()) < 0.01;
  }

  hasTableBreakdown(): boolean {
    return this.type === 'key_open'
      && this.billingBreakdown().some((item) => item.type === 'service' || item.type === 'couvert');
  }

  breakdownClasses(type: InvoiceBreakdownType): string {
    if (type === 'service') return 'text-blue-800';
    if (type === 'couvert') return 'text-violet-800';
    return 'text-slate-700';
  }

  currentParcels(): number {
    return Math.max(1, Number(this.paymentParcelsControl.value) || 1);
  }

  getMaxParcels(method: InvoicePaymentMethod | null): number {
    if (!method) return 1;

    const rawMax = Number((method as any).maxParcels ?? (method as any).max_parcels);
    if (Number.isFinite(rawMax) && rawMax > 0) return Math.min(Math.floor(rawMax), 36);

    const code = String(method.code || '').toUpperCase();
    if (code === 'CDC' || code === 'CAR') return 12;

    return 1;
  }

  getPaymentRate(method: InvoicePaymentMethod | null): number {
    if (!method) return 0;
    const rate = Number((method as any).rate ?? (method as any).installmentRate ?? (method as any).installment_rate ?? 0);
    return Number.isFinite(rate) ? rate : 0;
  }

  private buildPaymentGroup(method: InvoicePaymentMethod, grossAmount: number, installments: number): InvoicePaymentGroup {
    const groupId = crypto.randomUUID();
    const adjustmentAmount = this.getInstallmentAdjustment(grossAmount, installments, method);
    const totalAmount = currency(grossAmount).add(adjustmentAmount).value;
    const openOnBilling = this.isOpenOnBilling(method, installments);
    const status: InvoicePaymentStatus = openOnBilling ? 'OPEN' : 'PAID';

    const grossInstallments = currency(grossAmount).distribute(installments).map((value) => value.value);
    const paymentInstallments = currency(totalAmount).distribute(installments).map((value) => value.value);
    const methodSnapshot = this.snapshotPaymentMethod(method);
    const now = new Date().toISOString();

    const movements: InvoicePaymentMovement[] = paymentInstallments.map((amount, index) => {
      const dueAt = this.getDueAt(index + 1);

      return {
        groupId,
        paymentMethod: methodSnapshot,
        installmentNumber: index + 1,
        installments,
        grossAmount: grossInstallments[index] || 0,
        adjustmentAmount: currency(amount).subtract(grossInstallments[index] || 0).value,
        amount,
        status,
        openOnBilling,
        dueAt,
        paidAt: openOnBilling ? null : now,
      };
    });

    return {
      id: groupId,
      paymentMethod: methodSnapshot,
      grossAmount,
      adjustmentAmount,
      amount: totalAmount,
      installments,
      status,
      openOnBilling,
      movements,
    };
  }

  private getInstallmentAdjustment(amount: number, installments: number, method: InvoicePaymentMethod): number {
    const rate = this.getPaymentRate(method);
    if (installments <= 1 || rate <= 0) return 0;
    return currency(amount).multiply(rate).divide(100).value;
  }

  private isOpenOnBilling(method: InvoicePaymentMethod, installments: number): boolean {
    const code = String(method.code || '').toUpperCase();
    return installments > 1 || code === 'CDC' || code === 'CAR';
  }

  private snapshotPaymentMethod(method: InvoicePaymentMethod): InvoicePaymentMethodSnapshot {
    return {
      id: this.getPaymentMethodId(method),
      description: method.description || 'Não informado',
      code: method.code || 'N/A',
      isOnline: method.isOnline,
      isLocal: method.isLocal,
      isActive: method.isActive,
      maxParcels: this.getMaxParcels(method),
      rate: this.getPaymentRate(method),
    };
  }

  private getDueAt(installmentNumber: number): string {
    const due = new Date();
    due.setMonth(due.getMonth() + Math.max(0, installmentNumber - 1));
    return due.toISOString();
  }

  private resolveTotalAmount(): number {
    const values = [
      this.data?.totalAmount,
      this.data?.tableTicket?.totalPending,
      this.data?.basket?.total,
      this.data?.total,
      this.data?.amount,
    ];

    const firstValid = values.find((value) => value !== null && value !== undefined && Number.isFinite(Number(value)));
    return this.normalizeMoney(firstValid ?? 0);
  }

  private normalizeMoney(value: unknown): number {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return 0;
    return currency(amount).value;
  }

  private getPaymentMethodId(method: InvoicePaymentMethod | null): string {
    if (!method) return '';
    return String(method.id || '');
  }

  private normalizeBreakdownItem(item: any): InvoiceBreakdownItem {
    return {
      type: item.type || 'other',
      label: item.label || 'Outros',
      amount: this.normalizeMoney(item.amount),
      icon: item.icon,
    };
  }

  nextStep() {
    if (this.currentStep() < 2) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }
}
