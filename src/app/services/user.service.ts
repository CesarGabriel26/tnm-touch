import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import configs from '../config'
import { User } from '../models/user';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    constructor(
        private http: HttpClient,
    ) { }

    me() {
        return this.http.get<User>(`${configs.apiUrl}/user/me`);
    }
}
