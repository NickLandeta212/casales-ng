import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    turnstile?: {
      render(element: HTMLElement, options: Record<string, unknown>): string;
      reset(widgetId?: string): void;
    };
  }
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// CAPTCHA opcional (Cloudflare Turnstile) para los formularios publicos.
// Solo se activa si el backend expone una site key en /public/config.
@Injectable({
  providedIn: 'root'
})
export class CaptchaService {
  private siteKeyPromise: Promise<string | null> | null = null;
  private scriptPromise: Promise<void> | null = null;

  constructor(private http: HttpClient, private zone: NgZone) {}

  // Dibuja el widget en el elemento y devuelve una funcion para leer el token vigente.
  async render(element: HTMLElement): Promise<CaptchaHandle> {
    const siteKey = await this.getSiteKey();

    if (!siteKey) {
      return { enabled: false, token: () => '', reset: () => undefined };
    }

    await this.loadScript();
    let token = '';
    const widgetId = window.turnstile!.render(element, {
      sitekey: siteKey,
      language: 'es',
      callback: (value: string) => this.zone.run(() => { token = value; }),
      'expired-callback': () => this.zone.run(() => { token = ''; })
    });

    return {
      enabled: true,
      token: () => token,
      reset: () => {
        token = '';
        window.turnstile?.reset(widgetId);
      }
    };
  }

  private getSiteKey(): Promise<string | null> {
    this.siteKeyPromise ??= new Promise((resolve) => {
      this.http.get<{ captcha_site_key: string | null }>(`${environment.endpoint}/public/config`).subscribe({
        next: (config) => resolve(config?.captcha_site_key || null),
        error: () => resolve(null)
      });
    });

    return this.siteKeyPromise;
  }

  private loadScript(): Promise<void> {
    this.scriptPromise ??= new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el captcha'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}

export interface CaptchaHandle {
  enabled: boolean;
  token(): string;
  reset(): void;
}
