import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, switchMap, tap } from 'rxjs/operators';

export interface Persona {
  id?: number | string;
  departamentoId: number;
  departamentoCodigo?: string;
  torreNumero: number;
  departamentoNumero: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  tipoResidencia: 'dueno' | 'arrendatario';
}

export interface PersonaDraft {
  departamentoId: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  tipoResidencia: 'dueno' | 'arrendatario';
}

@Injectable({
  providedIn: 'root'
})
export class PersonasService {
  private readonly apiUrl = `${environment.endpoint}/personas`;
  private readonly personasSubject = new BehaviorSubject<Persona[]>([]);
  readonly personas$ = this.personasSubject.asObservable();

  constructor(private http: HttpClient) { }

  getSnapshot(): Persona[] {
    return this.personasSubject.value;
  }

  loadPersonas() {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => this.normalizeList(res)),
      tap((lista) => this.personasSubject.next(lista))
    );
  }

  addPersona(persona: PersonaDraft) {
    return this.http.post<any>(this.apiUrl, this.toApiPayload(persona)).pipe(
      switchMap(() => this.loadPersonas())
    );
  }

  updatePersona(id: number | string, persona: PersonaDraft) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, this.toApiPayload(persona)).pipe(
      switchMap(() => this.loadPersonas())
    );
  }

  deletePersona(id: number | string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      switchMap(() => this.loadPersonas())
    );
  }

  private normalizeList(res: any): Persona[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];
    return lista.map(item => this.toPersona(item));
  }

  private toPersona(raw: any): Persona {
    const departamentoCodigo = (raw.departamento_numero ?? raw.departamentoNumero ?? '').toString();
    const departamentoNumero = this.extractDepartamentoNumero(departamentoCodigo);

    return {
      id: raw.id ?? raw._id,
      departamentoId: Number(raw.departamento_id ?? raw.departamentoId ?? 0),
      departamentoCodigo: departamentoCodigo || undefined,
      torreNumero: Number(raw.torreNumero ?? raw.torre_numero ?? raw.torre ?? 0),
      departamentoNumero,
      nombres: (raw.nombres ?? '').toString(),
      apellidos: (raw.apellidos ?? '').toString(),
      cedula: (raw.documento ?? raw.cedula ?? '').toString(),
      telefono: (raw.telefono ?? raw.celular ?? '').toString(),
      tipoResidencia: (raw.tipo_ocupacion ?? raw.tipoResidencia) === 'arrendatario' ? 'arrendatario' : 'dueno'
    };
  }

  private toApiPayload(persona: PersonaDraft) {
    return {
      departamento_id: persona.departamentoId,
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      documento: persona.cedula,
      telefono: persona.telefono,
      tipo_ocupacion: persona.tipoResidencia
    };
  }

  private extractDepartamentoNumero(codigo: string): string {
    if (!codigo) {
      return '';
    }

    const match = codigo.match(/(?:SS|PB|D)(\d+)$/i);
    if (match?.[1]) {
      return match[1];
    }

    return codigo;
  }
}
