import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { Observable } from 'rxjs';
import { KeyOpen } from '../models/keyOpen';

@Injectable({
  providedIn: 'root',
})
export class KeyOpenService {
  constructor(
    private http: HttpClient
  ) { }

  list(page: number, size: number, filters?: any, orderBy?: string) {
    const httpParams = buildFilters(new HttpParams(), {
      ...filters,
      page: page,
      size: size,
      orderBy: orderBy || 'code'
    })

    return this.http.get(`${configs.apiUrl}/key-open`, { params: httpParams });
  }

  get(id: string): Observable<KeyOpen> {
    return this.http.get<KeyOpen>(`${configs.apiUrl}/key-open/${id}`);
  }

}
