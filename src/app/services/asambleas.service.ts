import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Asamblea {
  id: number;
  titulo: string;
  tipo: 'ordinaria' | 'extraordinaria';
  fecha_hora: string;
  lugar: string;
  orden_del_dia: string[];
  estado: 'convocada' | 'realizada' | 'cancelada';
  resultado: string | null;
  comunicado_id: number | null;
  correos_enviados: number;
  creado_por_nombre: string | null;
  created_at: string;
}

export interface NuevaAsamblea {
  titulo: string;
  tipo: 'ordinaria' | 'extraordinaria';
  fecha_hora: string;
  lugar: string;
  orden_del_dia: string[];
  publicar_comunicado: boolean;
  enviar_correo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AsambleasService {
  private readonly apiUrl = `${environment.endpoint}/asambleas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Asamblea[]> {
    return this.http.get<Asamblea[]>(this.apiUrl);
  }

  convocar(body: NuevaAsamblea) {
    return this.http.post<{ message: string; asamblea: Asamblea }>(this.apiUrl, body);
  }

  cerrar(id: number, body: { estado: 'realizada' | 'cancelada'; resultado: string; enviar_correo?: boolean }) {
    return this.http.put<{ message: string; asamblea: Asamblea }>(`${this.apiUrl}/${id}/estado`, body);
  }

  convocatoriaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/convocatoria`, { responseType: 'blob' });
  }
}
