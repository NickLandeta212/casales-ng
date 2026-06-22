import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityUrlService {
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
