import { GenericData } from "../../types/generic";
import { InternalStatus } from "./internal-status";
import { InvoicePaymentMovement, InvoiceResult } from "../invoice";
import { OrderStatus } from "./orderDetail";

export enum OrderOrigin {
    tanamao = 'tanamao',
    ifood = 'ifood',
    pdv = 'pdv',
    pdvDelivery = 'pdv-delivery',
    pdvTableTicket = 'pdv-table-ticket',
    pdvQuickSale = 'pdv-quick-sale'
}

export const OrderOriginNameMap: Record<OrderOrigin, string> = {
    [OrderOrigin.tanamao]: 'Tanamao',
    [OrderOrigin.ifood]: 'iFood',
    [OrderOrigin.pdv]: 'PDV',
    [OrderOrigin.pdvDelivery]: 'PDV Delivery',
    [OrderOrigin.pdvTableTicket]: 'PDV Mesa/Comanda',
    [OrderOrigin.pdvQuickSale]: 'PDV Venda Rápida',
}

type OrderType = string | 'DELIVERY' | 'PICKUP' | 'LOCAL' | OrderOrigin.pdvTableTicket | OrderOrigin.pdvQuickSale;

export const orderTypeNameMap: Record<OrderType, string> = {
    'DELIVERY': 'Delivery',
    'PICKUP': 'Retirada',
    'LOCAL': 'Local',
    [OrderOrigin.pdvTableTicket]: 'Mesa/Comanda',
    [OrderOrigin.pdvQuickSale]: 'Venda Rápida',
}

type SyncStatus = string | 'D' | 'P' | 'S'

export interface OrderAddress {
    zipCode: string;
    street: string;
    city: string;
    number: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
    uf: string;
    country?: string;
    center: {
        type: string;
        coordinates: [number, number];
    };
};

export interface Order extends GenericData {
    id?: string;
    code?: number;
    tnmId?: string;

    // tanamao, ifood, gecom
    origin: OrderOrigin;
    orderType: OrderType;
    isDelivery: boolean;

    // Itens e valores
    basket: {
        items: any[];
        totalItems: number;
        deliveryFee: number;
        total: number;
    };

    // Customer
    userId?: string;
    name?: string;
    phone?: string;
    cpf?: string;

    // Pagamento
    payMethod: any;
    payMethodName?: string;
    invoice?: InvoiceResult;
    paymentMovements?: InvoicePaymentMovement[];

    // Observações
    obs?: string;

    // Status
    syncStatus: SyncStatus;
    orderStatus: OrderStatus;
    internalStatus: InternalStatus;

    // Delivery
    address?: OrderAddress;
    areaId?: string;
    area?: {
        name: string;
        config: {
            deliveryTime: string;
        };
    };
    distance?: number;

    deliverymanId?: string;
    deliveryman?: string // name

    entregadorNotified?: boolean;
    assignedAt?: Date;
    pickedUpAt?: Date;
    shippingDate?: Date;
    deliveredAt?: Date;

    approvedAt?: Date;
    readyAt?: Date;

    // Pickup
    pickupCode?: string;

    // PDV
    pdvId?: string;

    // Mesa / comanda
    keyOpen?: string
    tableTicketId?: string

    // Empresa
    companyId: string;
    company?: {
        name: string;
        uri: string;
        urlLogo: string;
        pickupTime: number;
        phone: string;
        deliveryFee: number;
        cnpj: string;
        location: any;
    };

    hash?: string;
    version: string;
}
