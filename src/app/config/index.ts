const DEFAULT_SYNC_PORT = '3000';

function getStoredValue(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
}

function getServerHost(): string {
    if (typeof window === 'undefined') return '127.0.0.1';
    return getStoredValue('@server') || window.location.hostname || '127.0.0.1';
}

function getServerPort(): string {
    if (typeof window === 'undefined') return DEFAULT_SYNC_PORT;
    return getStoredValue('@port') || window.location.port || DEFAULT_SYNC_PORT;
}

function getHostWithPort(): string {
    const host = getServerHost();
    const port = getServerPort();
    return port ? `${host}:${port}` : host;
}

export default {
    get apiUrl() {
        return `http://${getHostWithPort()}/api`;
    },
    get wsUrl() {
        return `ws://${getHostWithPort()}`;
    }
}
