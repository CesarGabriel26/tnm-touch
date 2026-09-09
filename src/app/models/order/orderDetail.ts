import { IOrderItem } from "./orderItem";

// Status de sincronização do pedido
export type SyncStatus = 'D' | 'P' | 'S';

// Status do pedido
export type OrderStatus = 0 | 1 | 2 | 3 | 4;

// Mapeamento de status para texto legível
export const OrderStatusText: Record<OrderStatus, string> = {
  0: 'Pedido cancelado',
  1: 'Aguardando confirmação',
  2: 'Pedido aceito',
  3: 'Saiu para entrega',
  4: 'Pedido entregue'
};

// Retorna o texto correto considerando se o pedido é para entrega ou retirada
export const resolveOrderStatusText = (status: OrderStatus, isDelivery: boolean): string => {
  if (!isDelivery) {
    if (status === 3) return 'Pedido pronto para retirada';
    if (status === 4) return 'Pedido retirado';
  }

  return OrderStatusText[status];
};

// Mapeamento de syncStatus para texto legível
export const SyncStatusText: Record<SyncStatus, string> = {
  'D': 'Erro de sincronização',
  'P': 'Processando',
  'S': 'Sincronizado'
};

// Interface para o endereço de entrega
export interface OrderDeliveryAddress {
  street: string;
  city: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
  center: {
    type: string;
  };
}

// Interface para informações da empresa no pedido
export interface OrderCompanyInfo {
  name: string;
  uri: string;
  urlLogo: string;
  pickupTime: number;
  phone: string;
  deliveryFee: number;
  cnpj: string;
  location: {
    address: string;
    timezone: string;
    center: {
      type: string;
      coordinates: [number, number];
    };
  };
}

// Interface para o basket (carrinho) do pedido
export interface OrderBasket {
  total: number;
  totalItems: number;
  items: IOrderItem[];
  area: any;
  hasData: boolean;
  deliveryFee: number;
  canDeliver: boolean;
  isFreeDelivery: boolean;
  minOrderValue: number;
}

export type OrderArea = any;

// Interface principal para o detalhe do pedido
export interface OrderDetail {
  _id: string;
  basket: OrderBasket;
  companyId: string;
  address: OrderDeliveryAddress & {
    zipCode?: string;
    coordinates?: [number, number];
  };
  isDelivery: boolean;
  userId: string;
  name: string;
  cpf: string;
  payMethod: {
    code: string;
    description: string;
    _id: string;
    isLocal: boolean;
  };
  phone: string;
  hash: string;
  obs: string;
  area: OrderArea
  syncStatus: SyncStatus;
  orderStatus: OrderStatus;
  company: OrderCompanyInfo;
  version: string;
  pdvId?: string;
  shippingDate?: string;
  createdAt?: string;
  updatedAt?: string;
  orderNumber?: string;
  estimatedTime?: number;
}

// Interface para resumo do pedido (usado em listas)
export interface OrderSummaryInfo {
  _id: string;
  orderNumber?: string;
  orderStatus: OrderStatus;
  syncStatus: SyncStatus;
  total: number;
  companyName: string;
  companyLogo: string;
  isDelivery: boolean;
  createdAt: string;
  estimatedTime?: number;
}
