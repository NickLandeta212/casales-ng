import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityUrlService {
  // Enlace absoluto a una ruta publica de la app (la app usa HashLocationStrategy).
  buildPublicLink(path: string): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#${path.startsWith('/') ? path : `/${path}`}`;
  }
}
