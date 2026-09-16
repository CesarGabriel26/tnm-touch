import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';

function processQueryParams(route: ActivatedRouteSnapshot): void {
  const queryCompanyId = route.queryParamMap.get('companyId')?.trim();
  const queryServer = route.queryParamMap.get('server')?.trim();
  const queryPort = route.queryParamMap.get('port')?.trim();

  if (queryPort) {
    localStorage.setItem('@port', queryPort);
  }
  if (queryServer) {
    localStorage.setItem('@server', queryServer);
  }
  if (queryCompanyId) {
    const currentCompanyId = localStorage.getItem('@companyId');
    if (currentCompanyId && currentCompanyId !== queryCompanyId) {
      localStorage.removeItem('@token');
      localStorage.removeItem('@session');
    }
    localStorage.setItem('@companyId', queryCompanyId);
  }
}

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  processQueryParams(route);

  const companyId = localStorage.getItem('@companyId');
  const token = localStorage.getItem('@token');

  if (!companyId || !token) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  processQueryParams(route);

  const companyId = localStorage.getItem('@companyId');
  const token = localStorage.getItem('@token');

  if (companyId && token) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

