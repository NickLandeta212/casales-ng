import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Multa {
  id?: number | string;
  numeroConsecutivo?: number;
  departamentoId: number;
  departamentoNumero?: string;
  torreNumero: number;
  motivoId: number;
  motivoNombre?: string;
  personaNombre?: string;
  personaApellidos?: string;
  personaCedula?: string;
  descripcion: string;
  monto: number;
  aprobada?: boolean;
  fecha?: string;
}

export interface MultaDraft {
  departamentoId: number;
  motivoId: number;
  personaNombre: string;
  personaApellidos: string;
  personaCedula: string;
  descripcion: string;
  monto: number;
  aprobada?: boolean;
  fecha?: string;
}

export interface MotivoOption {
  id: number;
  nombre: string;
}

export interface PagoMultasPayload {
  departamento_id: number;
  multa_ids: Array<number | string>;
  total: number;
  comprobante_base64: string;
}

export interface PagoMultaDetalle {
  multa_id?: number | string | null;
  monto: number;
  descripcion?: string;
  persona_nombre?: string;
  persona_apellidos?: string;
  motivo_nombre?: string;
}

export interface PagoMulta {
  id: number | string;
  departamento_id: number;
  departamento_numero?: string;
  torre_numero?: string;
  total: number;
  comprobante_url: string;
  estado: 'en_proceso' | 'aprobado' | string;
  created_at?: string;
  updated_at?: string;
  multas?: PagoMultaDetalle[];
}

@Injectable({
  providedIn: 'root'
})
export class MultasService {
  private readonly apiUrl = `${environment.endpoint}/multas`;
  private readonly multasSubject = new BehaviorSubject<Multa[]>([]);
  private readonly motivosSubject = new BehaviorSubject<MotivoOption[]>([]);
  readonly multas$ = this.multasSubject.asObservable();
  readonly motivos$ = this.motivosSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSnapshot(): Multa[] {
    return this.multasSubject.value;
  }

  loadMultas() {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => this.normalizeList(res)),
      tap((lista) => this.multasSubject.next(lista))
    );
  }

  loadMotivos() {
    return this.http.get<any>(`${this.apiUrl}/motivos`).pipe(
      map((res) => this.normalizeMotivos(res)),
      tap((lista) => this.motivosSubject.next(lista))
    );
  }

  addMulta(multa: MultaDraft) {
    return this.http.post<any>(this.apiUrl, this.toApiPayload(multa)).pipe(
      switchMap(() => this.loadMultas())
    );
  }

  updateMulta(id: number | string, multa: MultaDraft) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, this.toApiPayload(multa)).pipe(
      switchMap(() => this.loadMultas())
    );
  }

  deleteMulta(id: number | string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      switchMap(() => this.loadMultas())
    );
  }

  registrarPagoMultas(payload: PagoMultasPayload) {
    return this.http.post<any>(`${this.apiUrl}/pagos`, payload);
  }

  loadPagosMultas() {
    return this.http.get<any>(`${this.apiUrl}/pagos`).pipe(
      map((res) => this.normalizePagos(res))
    );
  }

  aprobarPagoMultas(id: number | string) {
    return this.http.put<any>(`${this.apiUrl}/pagos/${id}/aprobar`, {});
  }

  private normalizeList(res: any): Multa[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];
    return lista.map(item => this.toMulta(item));
  }

  private normalizeMotivos(res: any): MotivoOption[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre || '').trim()
      }))
      .filter((item: MotivoOption) => item.id > 0 && Boolean(item.nombre));
  }

  private toMulta(raw: any): Multa {
    return {
      id: raw.id ?? raw._id,
      numeroConsecutivo: Number(raw.numero_consecutivo ?? raw.numeroConsecutivo ?? raw.id ?? 0),
      departamentoId: Number(raw.departamento_id ?? raw.departamentoId ?? 0),
      departamentoNumero: (raw.departamento_numero ?? raw.departamentoNumero ?? '').toString(),
      torreNumero: Number(raw.torre_numero ?? raw.torreNumero ?? 0),
      motivoId: Number(raw.motivo_id ?? raw.motivoId ?? 0),
      motivoNombre: (raw.motivo_nombre ?? raw.motivoNombre ?? '').toString(),
      personaNombre: (raw.persona_nombre ?? raw.personaNombre ?? '').toString(),
      personaApellidos: (raw.persona_apellidos ?? raw.personaApellidos ?? '').toString(),
      personaCedula: (raw.persona_cedula ?? raw.personaCedula ?? '').toString(),
      descripcion: (raw.descripcion ?? '').toString(),
      monto: Number(raw.monto ?? 0),
      aprobada: Boolean(raw.aprobada),
      fecha: raw.fecha
    };
  }

  private toApiPayload(multa: MultaDraft) {
    return {
      departamento_id: multa.departamentoId,
      motivo_id: multa.motivoId,
      persona_nombre: multa.personaNombre,
      persona_apellidos: multa.personaApellidos,
      persona_cedula: multa.personaCedula,
      descripcion: multa.descripcion,
      monto: multa.monto,
      aprobada: multa.aprobada,
      fecha: multa.fecha
    };
  }

  private normalizePagos(res: any): PagoMulta[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista.map((item: any) => ({
      id: item.id ?? item._id,
      departamento_id: Number(item.departamento_id ?? item.departamentoId ?? 0),
      departamento_numero: (item.departamento_numero ?? item.departamentoNumero ?? '').toString(),
      torre_numero: (item.torre_numero ?? item.torreNumero ?? '').toString(),
      total: Number(item.total ?? 0),
      comprobante_url: (item.comprobante_url ?? item.comprobanteUrl ?? '').toString(),
      estado: (item.estado ?? 'en_proceso').toString(),
      created_at: item.created_at ?? item.createdAt,
      updated_at: item.updated_at ?? item.updatedAt,
      multas: this.normalizePagoDetalle(item.multas)
    }));
  }

  private normalizePagoDetalle(res: any): PagoMultaDetalle[] {
    const lista = Array.isArray(res) ? res : [];

    return lista.map((item: any) => ({
      multa_id: item.multa_id ?? item.multaId ?? null,
      monto: Number(item.monto ?? 0),
      descripcion: (item.descripcion ?? '').toString(),
      persona_nombre: (item.persona_nombre ?? item.personaNombre ?? '').toString(),
      persona_apellidos: (item.persona_apellidos ?? item.personaApellidos ?? '').toString(),
      motivo_nombre: (item.motivo_nombre ?? item.motivoNombre ?? '').toString()
    }));
  }
}
