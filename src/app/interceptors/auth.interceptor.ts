import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Excluir la ruta de login
  if (req.url.includes('api/auth/login')) {
    return next(req);
  }

  const token = localStorage.getItem('token');

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
      console.log(err)
      if (err.status === 403 || err.status === 401) {
        //router.navigateByUrl('/');
      }
      return throwError(() => err);
    })
  );
};
