import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { TableStatus, TableTicket } from '../models/table-ticket';
import { catchError, from, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { KeyOpenService } from './keyopen.service';
import { StorageService } from './storage.service';
import { PaginatedResponse } from '../types/response';

interface CacheReadOptions {
  forceRefresh?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TableTicketService {
  constructor(
    private http: HttpClient,
    private keyOpenService: KeyOpenService,
    private storageService: StorageService,
  ) { }

  list(page: number, size: number, filters?: any, orderBy?: string, options?: CacheReadOptions): Observable<PaginatedResponse<TableTicket>> {
    const offset = Math.max(0, page - 1) * size;
    const cacheKey = this.storageService.tableTicketsCacheKey(filters?.type);
    const httpParams = buildFilters(new HttpParams(), {
      ...filters,
      limit: size,
      offset,
      orderBy: orderBy || 'code'
    })

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedTableTickets(filters || {}, {
        limit: size,
        offset,
        orderBy: orderBy || 'code',
      }));
    }

    return this.http.get<PaginatedResponse<TableTicket>>(`${configs.apiUrl}/table-ticket`, { params: httpParams }).pipe(
      tap((tableTickets) => void this.storageService.cacheTableTickets(tableTickets.items, cacheKey)),
      catchError((error) => {
        console.error('Erro ao buscar mesas/comandas:', error);
        return from(this.storageService.getCachedTableTickets(filters || {}, {
          limit: size,
          offset,
          orderBy: orderBy || 'code',
        }));
      })
    );
  }

  get(id: string, options?: CacheReadOptions): Observable<TableTicket> {
    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedTableTicket(id)).pipe(
        switchMap((cachedTableTicket) => {
          if (cachedTableTicket) return of(cachedTableTicket);
          return throwError(() => new Error('Mesa/comanda nao encontrada no cache'));
        })
      );
    }

    return from(this.storageService.getCachedTableTicket(id)).pipe(
      switchMap((cachedTableTicket) => {
        const cachedKeyOpenId = cachedTableTicket?.keyOpenId || cachedTableTicket?.keyOpen?.id || '';
        if (cachedTableTicket && cachedKeyOpenId.startsWith('local-')) {
          return of(cachedTableTicket);
        }

        return this.http.get<TableTicket>(`${configs.apiUrl}/table-ticket/${id}`).pipe(
          tap((tableTicket) => void this.storageService.cacheTableTicket(tableTicket)),
          catchError((error) => {
            console.error(`Erro ao buscar mesa/comanda ${id}:`, error);
            return cachedTableTicket ? of(cachedTableTicket) : from(Promise.reject(error));
          })
        );
      })
    );
  }

  update(id: string, data: Partial<TableTicket>): Observable<TableTicket> {
    return this.http.put<TableTicket>(`${configs.apiUrl}/table-ticket/${id}`, data).pipe(
      tap((tableTicket) => void this.storageService.cacheTableTicket(tableTicket))
    );
  }

  create(data: Partial<TableTicket>): Observable<TableTicket> {
    return this.http.post<TableTicket>(`${configs.apiUrl}/table-ticket`, data).pipe(
      tap((tableTicket) => void this.storageService.cacheTableTicket(tableTicket))
    );
  }

  async openTable(id: string, customers: number = 1): Promise<TableTicket> {
    const table = await new Promise<TableTicket>((resolve, reject) => {
      this.get(id, { forceRefresh: true }).subscribe({ next: resolve, error: reject });
    });

    if (table.keyOpenId || table.keyOpen) {
      if (table.status === TableStatus.BOOKED) {
        const updatedTable = await new Promise<TableTicket>((resolve, reject) => {
          this.update(id, { status: TableStatus.OCCUPIED }).subscribe({ next: resolve, error: reject });
        });

        return {
          ...updatedTable,
          keyOpenId: table.keyOpenId,
          keyOpen: table.keyOpen,
        };
      }

      return table;
    }

    const keyOpen = await this.keyOpenService.create({
      companyId: table.companyId,
      tableTicketId: id,
      customers,
      openedAt: new Date().toISOString(),
    });

    const updatedTable = await new Promise<TableTicket>((resolve, reject) => {
      this.update(id, { status: TableStatus.OCCUPIED }).subscribe({ next: resolve, error: reject });
    });

    return {
      ...updatedTable,
      keyOpenId: keyOpen.id,
      keyOpen,
    };
  }

}
