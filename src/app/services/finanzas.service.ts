import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MovimientoTipo = 'ingreso' | 'gasto';
export type MovimientoEstado = 'pendiente' | 'pagado';
export type MovimientoAlcance = 'conjunto' | 'torre';

export interface MovimientoFinanciero {
  id: number;
  fecha: string;
  concepto: string;
  tipo: MovimientoTipo;
  valor: number;
  estado: MovimientoEstado;
  alcance: MovimientoAlcance;
  torre_id: number | null;
  torre_numero: number | null;
  creado_por_nombre?: string | null;
}

export type NuevoMovimiento = Omit<MovimientoFinanciero, 'id' | 'torre_numero' | 'creado_por_nombre'>;

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {
  private readonly apiUrl = `${environment.endpoint}/finanzas/movimientos`;

  constructor(private http: HttpClient) {}

  listar(alcance?: MovimientoAlcance): Observable<MovimientoFinanciero[]> {
    const params: Record<string, string> = alcance ? { alcance } : {};
    return this.http.get<MovimientoFinanciero[]>(this.apiUrl, { params });
  }

  crear(movimiento: NuevoMovimiento): Observable<MovimientoFinanciero> {
    return this.http.post<MovimientoFinanciero>(this.apiUrl, movimiento);
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
