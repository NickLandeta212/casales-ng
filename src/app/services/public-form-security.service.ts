import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PublicFormSecurityService {
  private readonly minSubmitAgeMs = 1200;
  private readonly cooldownMs = 10000;

  validateSubmission(formKey: string, startedAt: number, honeypotValue: string): string {
    if (String(honeypotValue || '').trim()) {
      return 'No se pudo validar el formulario.';
    }

    if (Date.now() - startedAt < this.minSubmitAgeMs) {
      return 'Espera un momento antes de enviar el formulario.';
    }

    const lastSubmitAt = Number(localStorage.getItem(this.getStorageKey(formKey)) || 0);
    const remainingMs = this.cooldownMs - (Date.now() - lastSubmitAt);

    if (remainingMs > 0) {
      return `Espera ${Math.ceil(remainingMs / 1000)} segundo(s) antes de volver a enviar.`;
    }

    return '';
  }

  markSubmitted(formKey: string): void {
    localStorage.setItem(this.getStorageKey(formKey), Date.now().toString());
  }

  private getStorageKey(formKey: string): string {
    return `public_form_last_submit_${formKey}`;
  }
}
