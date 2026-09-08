import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient
  ) { }

  login(companyId: string, username: string, pin: string) {
    return this.http.post(`${configs.apiUrl}/auth/login`, { companyId, username, pin });
  }

}
