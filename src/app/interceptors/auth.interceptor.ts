import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Excluir la ruta de login
  if (req.url.includes('/auth/login') || !isTrustedApiRequest(req.url)) {
    return next(req);
  }

  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 403 || err.status === 401) {
        authService.clearSession();
        router.navigateByUrl('/');
      }
      return throwError(() => err);
    })
  );
};

function isTrustedApiRequest(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) {
    return true;
  }

  try {
    const requestUrl = new URL(url);
    const apiUrl = new URL(environment.endpoint, window.location.origin);
    return requestUrl.origin === apiUrl.origin;
  } catch {
    return false;
  }
}
