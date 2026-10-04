import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Comunicado {
  id: number;
  titulo: string;
  contenido: string;
  fijado: boolean;
  created_at: string;
  updated_at: string;
  creado_por_nombre?: string | null;
}

export type ComunicadoDraft = Pick<Comunicado, 'titulo' | 'contenido' | 'fijado'>;

@Injectable({
  providedIn: 'root'
})
export class ComunicadosService {
  private readonly apiUrl = `${environment.endpoint}/comunicados`;

  constructor(private http: HttpClient) {}

  // Los fijados llegan primero; limit sirve para el resumen del inicio.
  listar(limit?: number): Observable<Comunicado[]> {
    const params: Record<string, string> = limit ? { limit: String(limit) } : {};
    return this.http.get<Comunicado[]>(this.apiUrl, { params });
  }

  crear(comunicado: ComunicadoDraft): Observable<Comunicado> {
    return this.http.post<Comunicado>(this.apiUrl, comunicado);
  }

  actualizar(id: number, comunicado: ComunicadoDraft): Observable<Comunicado> {
    return this.http.put<Comunicado>(`${this.apiUrl}/${id}`, comunicado);
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
