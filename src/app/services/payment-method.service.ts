import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import configs from '../config';
import { PaymentMethod } from '../types/order/PayMethod';
import { buildFilters } from '../utils/filter.urils';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService {
  constructor(private http: HttpClient) {}

  async getAll(filters?: any): Promise<PaymentMethod[]> {
    const params = buildFilters(new HttpParams(), filters || {});
    try {
      const res = await firstValueFrom(
        this.http.get<PaymentMethod[] | { data: PaymentMethod[] }>(`${configs.apiUrl}/payment-method`, { params })
      );
      if (Array.isArray(res)) {
        return res;
      }
      return (res as any)?.data || [];
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      return [];
    }
  }

  async get(id: string): Promise<PaymentMethod | null> {
    if (!id) return null;
    try {
      return await firstValueFrom(
        this.http.get<PaymentMethod>(`${configs.apiUrl}/payment-method/${id}`)
      );
    } catch (error) {
      console.error(`Erro ao buscar forma de pagamento ${id}:`, error);
      return null;
    }
  }
}
