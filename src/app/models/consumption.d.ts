export interface Consumption {
    id?: string;
    companyId: string;
    keyOpen: string;

    productId?: string;
    snapshot: any;


    productGroup?: number;
    orderGroup?: number;

    dateTime: string;

    product: string;
    unityPrice: number;
    unity?: string;
    quantity: number;
    obs?: string;

    professionalId?: string;

    status: number; // 0 pendente, 1 quitado, 2 cancelado, 3 estornado

    orderId?: string;
    orderItemId?: number;
}
