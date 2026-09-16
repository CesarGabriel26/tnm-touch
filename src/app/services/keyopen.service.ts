import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { catchError, from, Observable, of } from 'rxjs';
import { KeyOpen } from '../models/keyOpen';
import { StorageService } from './storage.service';

interface CacheReadOptions {
  forceRefresh?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class KeyOpenService {
  constructor(
    private http: HttpClient,
    private storageService: StorageService,
  ) { }

  list(page: number, size: number, filters?: any, orderBy?: string) {
    const httpParams = buildFilters(new HttpParams(), {
      ...filters,
      limit: size,
      offset: Math.max(0, page - 1) * size,
      orderBy: orderBy || 'code'
    })

    return this.http.get(`${configs.apiUrl}/key-open`, { params: httpParams });
  }

  get(id: string, options?: CacheReadOptions): Observable<KeyOpen | null> {
    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedKeyOpen(id));
    }

    return this.http.get<KeyOpen>(`${configs.apiUrl}/key-open/${id}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar abertura ${id}:`, error);
        return from(this.storageService.getCachedKeyOpen(id)).pipe(
          catchError(() => of(null))
        );
      })
    );
  }

  create(data: Partial<KeyOpen>): Promise<KeyOpen> {
    return new Promise((resolve, reject) => {
      this.http.post<KeyOpen>(`${configs.apiUrl}/key-open`, data).subscribe({ next: resolve, error: reject });
    });
  }

  update(id: string, data: Partial<KeyOpen>): Observable<KeyOpen> {
    return this.http.put<KeyOpen>(`${configs.apiUrl}/key-open/${id}`, data);
  }

}
