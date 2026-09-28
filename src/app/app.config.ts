import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { LocalNetworkAccessService } from './services/local-network-access.service';
import { provideAngularVisuals } from 'angular-visuals';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(LocalNetworkAccessService).requestAccess()),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerImmediately',
    }),
    provideAngularVisuals({
      theme: {
        mode: 'light',
        defaultVariant: 'orange'
      }
    }),
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ],
};
