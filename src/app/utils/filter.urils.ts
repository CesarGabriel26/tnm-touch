import { HttpParams } from "@angular/common/http";

export function buildFilters(query: HttpParams, filters?: any) {
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== '' && value !== null && value !== undefined) {
                query = query.set(key, value.toString());
            }
        });
    }
    return query
}