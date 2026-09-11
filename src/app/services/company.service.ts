import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config'
import { User } from '../models/user';

@Injectable({
    providedIn: 'root',
})
export class CompanyService {

    constructor(
        private http: HttpClient,
    ) { }

    me() {
        return this.http.get<User>(`${configs.apiUrl}/company/me`);
    }

    get(id: string) {
        return this.http.get<User>(`${configs.apiUrl}/company/byid/${id}`);
    }
}
