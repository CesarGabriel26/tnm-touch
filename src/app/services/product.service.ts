import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Product } from '../models/product/product.model';
import { buildFilters } from '../utils/filter.urils';
import { catchError, from, Observable, of, switchMap, tap } from 'rxjs';
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

    return from(Promise.all([
      this.storageService.isCacheFresh(this.storageService.productsCacheKey()),
      this.storageService.getCachedProducts(filters || {}),
    ])).pipe(
      switchMap(([isFresh, cachedProducts]) => {
        if (!options?.forceRefresh && isFresh && cachedProducts.length > 0) {
          return of(cachedProducts);
        }

        return this.http.get<Product[]>(`${configs.apiUrl}/product`, { params }).pipe(
          tap((products) => void this.storageService.cacheProducts(products)),
          catchError((error) => {
            console.error('Erro ao buscar produtos:', error);
            return of(cachedProducts);
          })
        );
      })
    );
  }

  get(id: string): Observable<Product | null> {
    if (!id) return of(null);

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

    return from(Promise.all([
      this.storageService.isCacheFresh(this.storageService.productsCacheKey()),
      this.storageService.getCachedProducts(filters || {}, categoryId),
    ])).pipe(
      switchMap(([isFresh, cachedProducts]) => {
        if (!options?.forceRefresh && isFresh && cachedProducts.length > 0) {
          return of(cachedProducts);
        }

        return this.http.get<Product[]>(`${configs.apiUrl}/product/by-category/${categoryId}`, { params }).pipe(
          tap((products) => void this.storageService.cacheProducts(products)),
          catchError((error) => {
            console.error(`Erro ao buscar produtos da categoria ${categoryId}:`, error);
            return of(cachedProducts);
          })
        );
      })
    );
  }
}
