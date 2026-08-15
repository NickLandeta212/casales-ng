import { Injectable } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { LocalStoreService } from './local-store.service';

export interface AuditEntry {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalle: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly storageKey = 'casales_auditoria';

  constructor(
    private authService: AuthService,
    private localStore: LocalStoreService
  ) {}

  log(modulo: string, accion: string, detalle: string): void {
    const entries = this.getEntries();
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      usuario: this.authService.getDisplayName(),
      modulo,
      accion,
      detalle
    };

    this.localStore.write(this.storageKey, [entry, ...entries].slice(0, 300));
  }

  getEntries(): AuditEntry[] {
    return this.localStore.read<AuditEntry[]>(this.storageKey, []);
  }
}
