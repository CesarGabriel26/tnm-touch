import { computed, Injectable, isDevMode, signal } from '@angular/core';
import configs, { getLocalNetworkTargetAddressSpace } from '../config';
import { environment } from '@/environments/environment';

export type LocalNetworkAccessState =
  | 'idle'
  | 'checking'
  | 'granted'
  | 'denied'
  | 'insecure'
  | 'unavailable';

type LocalNetworkPermissionName =
  | 'local-network'
  | 'loopback-network'
  | 'local-network-access';

interface LocalNetworkRequestInit extends RequestInit {
  targetAddressSpace?: 'local' | 'loopback';
}

@Injectable({
  providedIn: 'root',
})
export class LocalNetworkAccessService {
  readonly state = signal<LocalNetworkAccessState>('idle');
  readonly requiresAction = computed(() => {
    
    return [
      'denied',
      'insecure',
      'unavailable',
    ].includes(this.state()) && environment.production
  });


  readonly message = computed(() => {
    switch (this.state()) {
      case 'denied':
        return 'O acesso à rede local está bloqueado no navegador. Libere a permissão deste site e tente novamente.';
      case 'insecure':
        return 'A permissão de rede local só pode ser solicitada em uma conexão segura (HTTPS).';
      default:
        return 'Não foi possível acessar o PDV Sync na rede local. Verifique se o computador do PDV está ligado e tente novamente.';
    }
  });

  private requestInProgress: Promise<boolean> | null = null;

  requestAccess(): Promise<boolean> {
    if (this.requestInProgress) return this.requestInProgress;

    this.requestInProgress = this.performRequest()
      .finally(() => {
        this.requestInProgress = null;
      });

    return this.requestInProgress;
  }

  private async performRequest(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!window.isSecureContext && !isDevMode()) {
      this.state.set('insecure');
      return false;
    }

    this.state.set('checking');

    const addressSpace = getLocalNetworkTargetAddressSpace();
    const permission = await this.getPermissionState(addressSpace);
    if (permission === 'denied') {
      this.state.set('denied');
      return false;
    }

    try {
      const requestOptions: LocalNetworkRequestInit = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        ...(window.isSecureContext ? { targetAddressSpace: addressSpace } : {}),
      };
      const separator = configs.healthUrl.includes('?') ? '&' : '?';
      const response = await fetch(
        `${configs.healthUrl}${separator}lna=${Date.now()}`,
        requestOptions
      );

      if (!response.ok) throw new Error(`PDV Sync respondeu com HTTP ${response.status}`);

      this.state.set('granted');
      return true;
    } catch (error) {
      const currentPermission = await this.getPermissionState(addressSpace);
      this.state.set(currentPermission === 'denied' ? 'denied' : 'unavailable');
      console.error('Não foi possível acessar a rede local:', error);
      return false;
    }
  }

  private async getPermissionState(
    addressSpace: 'local' | 'loopback'
  ): Promise<PermissionState | null> {
    if (typeof navigator === 'undefined' || !navigator.permissions) return null;

    const names: LocalNetworkPermissionName[] = [
      addressSpace === 'loopback' ? 'loopback-network' : 'local-network',
      'local-network-access',
    ];

    for (const name of names) {
      try {
        const status = await navigator.permissions.query(
          { name } as unknown as PermissionDescriptor
        );
        return status.state;
      } catch {
        // Browsers without LNA support reject unknown permission names.
      }
    }

    return null;
  }
}
