import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type CategoriaDocumento = 'reglamento' | 'acta' | 'contrato' | 'otro';

export interface Documento {
  id: number;
  titulo: string;
  categoria: CategoriaDocumento;
  descripcion: string | null;
  archivo_url: string;
  visibilidad: 'todos' | 'gestion';
  subido_por_nombre: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {
  private readonly apiUrl = `${environment.endpoint}/documentos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Documento[]> {
    return this.http.get<Documento[]>(this.apiUrl);
  }

  subir(body: { titulo: string; categoria: CategoriaDocumento; descripcion: string | null; visibilidad: string; archivo_base64: string }) {
    return this.http.post<Documento>(this.apiUrl, body);
  }

  eliminar(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  enlace(id: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/${id}/enlace`);
  }
}
