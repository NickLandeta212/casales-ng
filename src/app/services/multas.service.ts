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
}