import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import configs from '../config';
import { PaymentMethod } from '../models/PayMethod';
import { buildFilters } from '../utils/filter.urils';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService {
  constructor(private http: HttpClient) { }

  getAll(filters?: any): Observable<PaymentMethod[]> {
    const params = buildFilters(new HttpParams(), filters || {});
    try {
      return this.http.get<PaymentMethod[]>(`${configs.apiUrl}/payment-method`, { params })
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      return of([]);
    }
  }

  get(id: string): Observable<PaymentMethod | null> {
    if (!id) return of(null);
    try {
      return this.http.get<PaymentMethod>(`${configs.apiUrl}/payment-method/${id}`)
    } catch (error) {
      console.error(`Erro ao buscar forma de pagamento ${id}:`, error);
      return of(null);
    }
  }
}
