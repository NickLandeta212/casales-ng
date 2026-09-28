import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SecurityUrlService {
  // Origen desde el que la API sirve los archivos subidos (/uploads).
  get apiOrigin(): string {
    if (/^https?:\/\//i.test(environment.endpoint)) {
      return new URL(environment.endpoint).origin;
    }

    return environment.production ? window.location.origin : 'http://localhost:3000';
  }

  // URL segura de un archivo subido (comprobantes), o '' si no es confiable.
  resolveUploadUrl(rawUrl: string | null | undefined): string {
    return this.sanitizeResourceUrl(String(rawUrl || ''), this.apiOrigin);
  }

  // Enlace absoluto a una ruta publica de la app (la app usa HashLocationStrategy).
  buildPublicLink(path: string): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#${path.startsWith('/') ? path : `/${path}`}`;
  }

  sanitizeResourceUrl(rawUrl: string, trustedApiOrigin: string): string {
    const trimmed = String(rawUrl || '').trim();

    if (!trimmed || /^(javascript|data|vbscript|file):/i.test(trimmed)) {
      return '';
    }

    if (trimmed.startsWith('/')) {
      return `${trustedApiOrigin}${trimmed}`;
    }

    try {
      const url = new URL(trimmed);
      const allowedOrigins = new Set([window.location.origin, trustedApiOrigin]);

      return /^https?:$/i.test(url.protocol) && allowedOrigins.has(url.origin)
        ? url.href
        : '';
    } catch {
      return '';
    }
  }
}
