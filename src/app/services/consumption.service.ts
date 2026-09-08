import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { Observable } from 'rxjs';
import { Consumption } from '../models/consumption';

@Injectable({
  providedIn: 'root',
})
export class ConsumptionsService {
  constructor(
    private http: HttpClient
  ) { }

  list(page: number, size: number, filters?: any, orderBy?: string): Observable<Consumption[]> {
    const httpParams = buildFilters(new HttpParams(), {
      ...filters,
      page: page,
      size: size,
      orderBy: orderBy || 'orderGroup'
    })

    return this.http.get<Consumption[]>(`${configs.apiUrl}/consumption`, { params: httpParams });
  }

  get(id: string): Observable<Consumption> {
    return this.http.get<Consumption>(`${configs.apiUrl}/consumption/${id}`);
  }

}
