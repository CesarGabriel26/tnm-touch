import { KeyOpen } from "./keyOpen";

export const TABLE_STATUS_LABEL: Record<string, string> = {
    'A': 'Disponivel',
    'O': 'Ocupado',
    'B': 'Reservado',
    'C': 'Limpando'
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
    'A': 'Disponivel',
    'O': 'Em Uso',
}

export enum TableStatus {
    AVAILABLE = 'A',
    BOOKED = 'B',
    OCCUPIED = 'O',
    CLOSING = 'C',
}

export interface TableTicket {
    id: string;
    companyId: string;
    code: number;
    type: string;
    status: TableStatus;

    // key_open
    consumptionsCount: number;
    keyOpenId?: string;
    keyOpen?: KeyOpen

    masterTable?: TableTicket;

    // populated
    total: number;
    totalPaid: number;
    totalPending: number;
    totalProducts: number;
    totalProductsPending?: number;
    totalProductsPaid?: number;
    totalService: number;
    totalServicePaid: number;
    totalServicePending?: number;
    totalCouvert: number;
    totalCouvertPaid: number;
    totalCouvertPending?: number;

    cacheUpdatedAt?: string;
    hasPendingLocal?: boolean;
    totalEstimated?: boolean;
}
