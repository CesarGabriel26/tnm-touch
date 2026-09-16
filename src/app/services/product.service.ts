import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Product } from '../models/product/product.model';
import { buildFilters } from '../utils/filter.urils';
import { catchError, from, Observable, of, tap } from 'rxjs';
import configs from '../config';
import { StorageService } from './storage.service';

interface CacheReadOptions {
  forceRefresh?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private storageService: StorageService,
  ) { }

  getAll(filters?: any, options?: CacheReadOptions): Observable<Product[]> {
    const params = buildFilters(new HttpParams(), filters || {});

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedProducts(filters || {}));
    }

    return this.http.get<Product[]>(`${configs.apiUrl}/product`, { params }).pipe(
      tap((products) => void this.storageService.cacheProducts(products)),
      catchError((error) => {
        console.error('Erro ao buscar produtos:', error);
        return from(this.storageService.getCachedProducts(filters || {}));
      })
    );
  }

  get(id: string, options?: CacheReadOptions): Observable<Product | null> {
    if (!id) return of(null);

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedProduct(id));
    }

    return this.http.get<Product>(`${configs.apiUrl}/product/${id}`).pipe(
      tap((product) => void this.storageService.cacheProduct(product)),
      catchError((error) => {
        console.error(`Erro ao buscar produto ${id}:`, error);
        return from(this.storageService.getCachedProduct(id));
      })
    );
  }

  getByCategory(categoryId: string, filters?: any, options?: CacheReadOptions): Observable<Product[]> {
    if (!categoryId) return of([]);
    const params = buildFilters(new HttpParams(), filters || {});

    if (!options?.forceRefresh) {
      return from(this.storageService.getCachedProducts(filters || {}, categoryId));
    }

    return this.http.get<Product[]>(`${configs.apiUrl}/product/by-category/${categoryId}`, { params }).pipe(
      tap((products) => void this.storageService.cacheProducts(products)),
      catchError((error) => {
        console.error(`Erro ao buscar produtos da categoria ${categoryId}:`, error);
        return from(this.storageService.getCachedProducts(filters || {}, categoryId));
      })
    );
  }
}
