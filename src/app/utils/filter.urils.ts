import { HttpParams } from "@angular/common/http";

export function buildFilters(query: HttpParams, filters?: any) {
    if (!filters) return query;

    Object.entries(filters).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;

        // Suporte a { blackList: [], whiteList: [] }
        if (typeof value === 'object' && !Array.isArray(value)) {
            const obj = value as Record<string, any>;
            if (Array.isArray(obj['blackList']) && obj['blackList'].length > 0) {
                query = query.set(`${key}_blackList`, obj['blackList'].join(','));
            }
            if (Array.isArray(obj['whiteList']) && obj['whiteList'].length > 0) {
                query = query.set(`${key}_whiteList`, obj['whiteList'].join(','));
            }
            return;
        }

        // Arrays simples → lista separada por vírgula (whiteList implícita)
        if (Array.isArray(value)) {
            if (value.length > 0) {
                query = query.set(`${key}_whiteList`, value.join(','));
            }
            return;
        }

        query = query.set(key, (value as any).toString());
    });

    return query;
}