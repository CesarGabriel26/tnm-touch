import { OrderStatus } from "./orderDetail";

export type InternalStatus = 0 | 1 | 2 | 3 | 4 | 5;

export const InternalStatusText: Record<InternalStatus, string> = {
    0: 'Cancelado',
    1: 'Aguardando confirmação',
    2: 'Em produção',
    3: 'Pronto para entrega',
    4: 'Em entrega',
    5: 'Entregue'
};

export const OrderToInternalStatus: Record<number | OrderStatus, InternalStatus> = {
    0: 0, // cancelado -> cancelado
    1: 1, // aguardando confirmação -> aguardando confirmação
    2: 2, // pedido aceito -> em produção
    3: 4, // saiu para entrega -> em entrega
    4: 5  // pedido entregue -> entregue
};