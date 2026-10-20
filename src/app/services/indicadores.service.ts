import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Indicadores {
  anio: number;
  mes_corte: number;
  alcance: 'conjunto' | 'torres';
  departamentos: { total: number; al_dia: number; morosos: number; porcentaje_al_dia: number };
  cartera: { alicuotas: number; multas: number; cargos: number; total: number };
  recaudacion: { semana: number; mes: number };
  recaudacion_mensual: Array<{ anio: number; mes: number; total: number }>;
  por_revisar: { alicuotas: number; multas: number; cargos: number; torres: number; total: number };
}

@Injectable({
  providedIn: 'root'
})
export class IndicadoresService {
  constructor(private http: HttpClient) {}

  obtener(): Observable<Indicadores> {
    return this.http.get<Indicadores>(`${environment.endpoint}/indicadores`);
  }
}
