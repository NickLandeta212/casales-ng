import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EncuestaOpcion {
  id: number;
  texto: string;
  // null mientras los resultados no son visibles para quien consulta.
  votos: number | null;
}

export interface Encuesta {
  id: number;
  titulo: string;
  descripcion: string | null;
  estado: 'abierta' | 'cerrada';
  created_at: string;
  cerrada_at: string | null;
  creado_por_nombre: string | null;
  total_votos: number | null;
  total_departamentos: number;
  // Opcion que eligio el departamento del condomino; null si no ha votado (o no es condomino).
  mi_voto: number | null;
  resultados_visibles: boolean;
  opciones: EncuestaOpcion[];
}

@Injectable({
  providedIn: 'root'
})
export class EncuestasService {
  private readonly apiUrl = `${environment.endpoint}/encuestas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Encuesta[]> {
    return this.http.get<Encuesta[]>(this.apiUrl);
  }

  crear(encuesta: { titulo: string; descripcion: string; opciones: string[] }): Observable<Encuesta> {
    return this.http.post<Encuesta>(this.apiUrl, encuesta);
  }

  // Un voto por departamento; no se puede cambiar.
  votar(id: number, opcion_id: number): Observable<Encuesta> {
    return this.http.post<Encuesta>(`${this.apiUrl}/${id}/votar`, { opcion_id });
  }

  cerrar(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/cerrar`, {});
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
