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

export function applyServerParamsFromCurrentUrl(): void {
    if (typeof window === 'undefined') return;

    const params = new URL(window.location.href).searchParams;
    const server = params.get('server')?.trim();
    const port = params.get('port')?.trim();

    if (server) window.localStorage.setItem('@server', server);
    if (port) window.localStorage.setItem('@port', port);
}

export function getLocalNetworkTargetAddressSpace(): 'local' | 'loopback' {
    const host = getServerHost().toLowerCase().replace(/^\[|\]$/g, '');
    const isLoopback = host === 'localhost'
        || host === '::1'
        || /^127(?:\.[0-9]{1,3}){0,3}$/.test(host);

    return isLoopback ? 'loopback' : 'local';
}

export default {
    get apiUrl() {
        return `http://${getHostWithPort()}/api`;
    },
    get wsUrl() {
        return `ws://${getHostWithPort()}`;
    },
    get healthUrl() {
        return `http://${getHostWithPort()}/health`;
    }
}
