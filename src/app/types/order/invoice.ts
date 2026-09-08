import { PaymentMethod } from './PayMethod';

export type InvoicePaymentStatus = 'PAID' | 'OPEN';
export type InvoiceBreakdownType = 'products' | 'service' | 'couvert' | 'other';

export interface InvoiceBreakdownItem {
  type: InvoiceBreakdownType;
  label: string;
  amount: number;
  icon?: string;
}

export interface InvoicePaymentMethodSnapshot {
  id: string;
  description: string;
  code: string;
  isOnline?: boolean;
  isLocal?: boolean;
  isActive?: boolean;
  maxParcels?: number;
  rate?: number;
}

export interface InvoicePaymentMovement {
  groupId: string;
  paymentMethod: InvoicePaymentMethodSnapshot;
  installmentNumber: number;
  installments: number;
  grossAmount: number;
  adjustmentAmount: number;
  amount: number;
  status: InvoicePaymentStatus;
  openOnBilling: boolean;
  dueAt: string;
  paidAt: string | null;
}

export interface InvoicePaymentGroup {
  id: string;
  paymentMethod: InvoicePaymentMethodSnapshot;
  grossAmount: number;
  adjustmentAmount: number;
  amount: number;
  installments: number;
  status: InvoicePaymentStatus;
  openOnBilling: boolean;
  movements: InvoicePaymentMovement[];
}

export interface InvoiceResult {
  totalAmount: number;
  totalAdjustment: number;
  totalToReceive: number;
  totalPaid: number;
  remainingAmount: number;
  breakdown: InvoiceBreakdownItem[];
  payments: InvoicePaymentGroup[];
  movements: InvoicePaymentMovement[];
}

export type InvoicePaymentMethod = PaymentMethod & {
  id?: string;
  maxParcels?: number;
  rate?: number;
};
