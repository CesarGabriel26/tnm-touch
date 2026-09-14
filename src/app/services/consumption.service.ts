import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { Consumption } from '../models/consumption';
import { StorageService } from './storage.service';
import { PaginatedResponse } from '../types/response';

@Injectable({
  providedIn: 'root',
})
export class ConsumptionsService {
  constructor(
    private http: HttpClient,
    private storageService: StorageService,
  ) { }

  list(page: number, size: number, filters?: any, orderBy?: string): Observable<PaginatedResponse<Consumption>> {
    const httpParams = buildFilters(new HttpParams(), {
      ...filters,
      limit: size,
      offset: Math.max(0, page) * size,
      orderBy: orderBy || 'orderGroup'
    })

    return this.http.get<PaginatedResponse<Consumption>>(`${configs.apiUrl}/consumption`, { params: httpParams }).pipe(
      switchMap((consumptions) => from(this.storageService.getQueuedConsumptions(filters || {})).pipe(
        map((queuedConsumptions) => {
          return {
            items: [...consumptions.items, ...queuedConsumptions],
            total: consumptions.total + queuedConsumptions.length
          }
        })
      )),
      catchError((error) => {
        console.error('Erro ao buscar consumos:', error);
        return from(this.storageService.getQueuedConsumptions(filters || {})).pipe(
          map((queuedConsumptions) => {
            return {
              items: queuedConsumptions,
              total: queuedConsumptions.length
            }
          })
        );
      })
    );
  }

  get(id: string): Observable<Consumption> {
    return this.http.get<Consumption>(`${configs.apiUrl}/consumption/${id}`);
  }

  create(consumption: Partial<Consumption>): Observable<Consumption> {
    return this.http.post<Consumption>(`${configs.apiUrl}/consumption`, consumption);
  }

  update(id: string, consumption: Partial<Consumption>): Observable<Consumption> {
    return this.http.put<Consumption>(`${configs.apiUrl}/consumption/${id}`, consumption);
  }

  createOrUpdate(consumption: Partial<Consumption>): Observable<Consumption> {
    return consumption.id ? this.update(consumption.id, consumption) : this.create(consumption);
  }

  createBatch(consumptions: Partial<Consumption>[]): Observable<Consumption[]> {
    if (consumptions.length === 0) return of([]);
    return forkJoin(consumptions.map((consumption) => this.createOrUpdate(consumption)));
  }

  split(consumptions: string[], parts?: number): Observable<any> {
    return this.http.post(`${configs.apiUrl}consumption/split`, { consumptions, parts });
  }
}
