import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';
import { buildFilters } from '../utils/filter.urils';
import { TableTicket } from '../models/table-ticket';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TableTicketService {
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

    return this.http.get(`${configs.apiUrl}/table-ticket`, { params: httpParams });
  }

  get(id: string): Observable<TableTicket> {
    return this.http.get<TableTicket>(`${configs.apiUrl}/table-ticket/${id}`);
  }

}
