import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { buildFilters } from '../utils/filter.urils';
import { catchError, from, Observable, of, tap } from 'rxjs';
import configs from '../config';
import { Category } from '../models/category/category.model';
import { StorageService } from './storage.service';
import { PaginatedResponse } from '../types/response';

interface CacheReadOptions {
  forceRefresh?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(
    private http: HttpClient,
    private storageService: StorageService,
  ) { }

  getAll(filters?: any, options?: CacheReadOptions): Observable<PaginatedResponse<Category>> {
    const params = buildFilters(new HttpParams(), filters || {});

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedCategories(filters || {}));
    }

    return this.http.get<PaginatedResponse<Category>>(`${configs.apiUrl}/category`, { params }).pipe(
      tap((categories) => void this.storageService.cacheCategories(categories.items)),
      catchError((error) => {
        console.error('Erro ao buscar categorias:', error);
        return from(this.storageService.getCachedCategories(filters || {}));
      })
    );
  }

  get(id: string, options?: CacheReadOptions): Observable<Category | null> {
    if (!id) return of(null);

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedCategory(id));
    }

    return this.http.get<Category>(`${configs.apiUrl}/category/${id}`).pipe(
      tap((category) => void this.storageService.cacheCategory(category)),
      catchError((error) => {
        console.error(`Erro ao buscar categoria ${id}:`, error);
        return from(this.storageService.getCachedCategory(id));
      })
    );
  }
}
