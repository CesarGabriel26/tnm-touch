import { TableTicket } from "./table-ticket";

export interface KeyOpen {
    id: string;
    companyId: string;

    tableTicketId: string;
    tableTicket?: TableTicket

    alias: string;
    bookedAt: string;
    openedAt: string;
    closedAt: string;
    customers: number;
    customerId?: string;

    consumptions?: Consumption[];

    masterId?: string;
    master?: TableTicket;

    service?: number;
    couvert?: number;
};