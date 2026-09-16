import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, from, map, Observable, of } from 'rxjs';
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

    return from(this.fetchAndCacheComplements(params)).pipe(
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

    return from(this.getCachedOrRemoteComplements(complementsIds, !!options?.forceRefresh));
  }

  private async fetchAndCacheComplements(params: HttpParams): Promise<PaginatedResponse<Complement>> {
    const response = await firstValueFrom(this.http.get<PaginatedResponse<Complement>>(`${configs.apiUrl}/complement`, { params }));
    const items = await Promise.all(response.items.map((complement) => this.fetchComplementWithFallback(complement)));

    await this.storageService.cacheComplements(items);

    return {
      ...response,
      items,
    };
  }

  private async getCachedOrRemoteComplements(complementIds: string[], forceRefresh: boolean): Promise<Complement[]> {
    const cached = forceRefresh ? [] : await this.storageService.getCachedComplements(complementIds);
    const complementsById = new Map(cached.map((complement) => [this.getComplementId(complement), complement]));
    const idsToRefresh = complementIds.filter((id) => forceRefresh || !this.hasCachedOptions(complementsById.get(id)));

    if (!idsToRefresh.length || !this.isOnline()) {
      return this.sortRequestedComplements(complementIds, complementsById);
    }

    const remoteComplements = await Promise.all(idsToRefresh.map((id) => this.fetchAndCacheComplement(id)));

    remoteComplements
      .filter((complement): complement is Complement => !!complement)
      .forEach((complement) => complementsById.set(this.getComplementId(complement), complement));

    return this.sortRequestedComplements(complementIds, complementsById);
  }

  private async fetchComplementWithFallback(complement: Complement): Promise<Complement> {
    const id = this.getComplementId(complement);
    if (!id) return complement;

    try {
      return await this.fetchComplement(id) ?? complement;
    } catch (error) {
      console.error(`Erro ao buscar detalhes do complemento ${id}:`, error);
      return complement;
    }
  }

  private async fetchAndCacheComplement(id: string): Promise<Complement | null> {
    try {
      const complement = await this.fetchComplement(id);
      if (complement) {
        await this.storageService.cacheComplement(complement);
      }
      return complement;
    } catch (err) {
      console.error(`Erro ao buscar complemento ${id}:`, err);
      return await this.storageService.getCachedComplement(id);
    }
  }

  private async fetchComplement(id: string): Promise<Complement | null> {
    const complement = await firstValueFrom(this.http.get<Complement | null>(`${configs.apiUrl}/complement/${id}`));
    return complement ? this.markOptionsLoaded(complement) : null;
  }

  private sortRequestedComplements(complementIds: string[], complementsById: Map<string, Complement>): Complement[] {
    return complementIds
      .map((id) => complementsById.get(id))
      .filter((complement): complement is Complement => !!complement);
  }

  private hasCachedOptions(complement?: Complement): boolean {
    if (!complement || !Array.isArray(complement.options)) return false;

    return complement.options.length > 0 || !!(complement as Complement & { optionsLoaded?: boolean }).optionsLoaded;
  }

  private getComplementId(complement: Complement): string {
    return (complement as Complement & { id?: string }).id || complement._id || '';
  }

  private markOptionsLoaded(complement: Complement): Complement {
    return {
      ...complement,
      options: Array.isArray(complement.options) ? complement.options : [],
      optionsLoaded: true,
    } as Complement & { optionsLoaded: boolean };
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }
}
