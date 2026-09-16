import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, from, map, Observable, of, tap } from 'rxjs';
import { Complement } from '../models/product/complement.model';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { PaginatedResponse } from '../types/response';
import { StorageService } from './storage.service';

interface CacheReadOptions {
  forceRefresh?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ComplementsService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  getAll(filters?: any, options?: CacheReadOptions): Observable<PaginatedResponse<Complement>> {
    const params = buildFilters(new HttpParams(), filters || {});

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedComplements()).pipe(
        map((items) => ({ items, total: items.length }))
      );
    }

    return this.http.get<PaginatedResponse<Complement>>(`${configs.apiUrl}/complement`, { params }).pipe(
      tap((response) => void this.storageService.cacheComplements(response.items)),
      catchError((error) => {
        console.error('Erro ao buscar complementos:', error);
        return from(this.storageService.getCachedComplements()).pipe(
          map((items) => ({ items, total: items.length }))
        );
      })
    );
  }

  get(complementsIds: Array<string>, options?: CacheReadOptions): Observable<Complement[]> {
    if (!complementsIds || !complementsIds.length) return of([]);

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedComplements(complementsIds));
    }

    return from(
      Promise.all(
        complementsIds.map(async (id) => {
          try {
            const complement = await firstValueFrom(this.http.get<Complement | null>(`${configs.apiUrl}/complement/${id}`));
            if (complement) {
              await this.storageService.cacheComplement(complement);
            }
            return complement;
          } catch (err) {
            console.error(`Erro ao buscar complemento ${id}:`, err);
            return await this.storageService.getCachedComplement(id);
          }
        })
      ).then((complements) => complements.filter((complement): complement is Complement => !!complement))
    );
  }
}
