import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoaderServiceService } from '../shared/components/loader/loader-service.service';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderServiceService);
  loaderService.show();
  return next(req).pipe(
    finalize(() => loaderService.hide())
  );
};
