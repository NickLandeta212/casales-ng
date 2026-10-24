import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoNovedad = 'ronda' | 'incidente' | 'mantenimiento' | 'entrega_turno' | 'otro';

export interface Novedad {
  id: number;
  tipo: TipoNovedad;
  descripcion: string;
  departamento_id: number | null;
  departamento_numero: string | null;
  torre_numero: number | null;
  fotos: string[];
  registrado_por_nombre: string | null;
  created_at: string;
}

// Bitacora de novedades de la guardia.
@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
  private readonly apiUrl = `${environment.endpoint}/bitacora`;

  constructor(private http: HttpClient) {}

  listar(filtros: { desde?: string; hasta?: string; tipo?: string }): Observable<Novedad[]> {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => !!valor)) as Record<string, string>;
    return this.http.get<Novedad[]>(this.apiUrl, { params });
  }

  registrar(body: { tipo: TipoNovedad; descripcion: string; departamento_id: number | null; fotos_base64: string[] }) {
    return this.http.post<Novedad>(this.apiUrl, body);
  }

  enlaceFoto(fotoUrl: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/fotos/${String(fotoUrl).split('/').pop()}/enlace`);
  }
}
