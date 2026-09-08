import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRoute } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const queryCompanyId = route.queryParamMap.get('companyId');
  const currentCompanyId = localStorage.getItem('@companyId');
  const token = localStorage.getItem('@token');

  const companyId = queryCompanyId || currentCompanyId;

  if (!companyId) {
    router.navigate(['/login']);
    return false;
  }

  if (queryCompanyId && currentCompanyId && queryCompanyId !== currentCompanyId) {
    router.navigate(['/login'], { queryParams: { companyId: queryCompanyId } });
    return false;
  }

  if (!token) {
    router.navigate(['/login'], { queryParams: { companyId } });
    return false;
  }

  return true;
};
