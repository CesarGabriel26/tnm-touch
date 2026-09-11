import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {
    private storageCache: { [key: string]: any } = {};

    setItem(key: string, value: any): void {
        this.storageCache[key] = value;
        window.localStorage.setItem(key, JSON.stringify(value));
    }

    getItem(key: string): any {
        if (this.storageCache[key]) {
            return this.storageCache[key];
        }
        const storedValue = window.localStorage.getItem(key);
        if (storedValue) {
            this.storageCache[key] = JSON.parse(storedValue);
            return this.storageCache[key];
        }
        return null;
    }

    removeItem(key: string): void {
        delete this.storageCache[key];
        window.localStorage.removeItem(key);
    }

    clear(): void {
        this.storageCache = {};
        window.localStorage.clear();
    }

    getSession() {
        return this.getItem('@session');
    }
}
