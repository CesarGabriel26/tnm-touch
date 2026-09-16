import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, from, map, Observable, of, tap } from 'rxjs';
import { Variation } from '../models/product/variation.model';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { PaginatedResponse } from '../types/response';
import { StorageService } from './storage.service';

interface CacheReadOptions {
  forceRefresh?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VariationsService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  getAll(filters?: any, options?: CacheReadOptions): Observable<PaginatedResponse<Variation>> {
    const params = buildFilters(new HttpParams(), filters || {});

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedVariations(filters || {}));
    }

    return this.http.get<PaginatedResponse<Variation>>(`${configs.apiUrl}/variation`, { params }).pipe(
      tap((response) => void this.storageService.cacheVariations(response.items)),
      catchError((error) => {
        console.error('Erro ao buscar grupos de variação:', error);
        return from(this.storageService.getCachedVariations(filters || {}));
      })
    );
  }

  get(variationId: string, options?: CacheReadOptions): Observable<Variation> {
    if (!variationId) return of({} as Variation);

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedVariation(variationId)).pipe(
        tap((variation) => {
          if (!variation) console.warn(`Grupo de variação ${variationId} não encontrado no cache`);
        }),
        map((variation) => variation || {} as Variation),
        catchError(() => of({} as Variation))
      );
    }

    return this.http.get<Variation | null>(`${configs.apiUrl}/variation/${variationId}`).pipe(
      tap((variation) => {
        if (variation) void this.storageService.cacheVariation(variation);
      }),
      catchError((err) => {
        console.error(`Erro ao buscar grupo de variação ${variationId}:`, err);
        return from(this.storageService.getCachedVariation(variationId));
      }),
      map((variation) => variation || {} as Variation)
    );
  }
}
