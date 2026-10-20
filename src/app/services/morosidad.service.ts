import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MorosidadDepartamento {
  departamento_id: number;
  departamento_numero: string;
  torre_id: number;
  torre_numero: number;
  titular: string | null;
  meses_adeudados: number[];
  meses_en_revision: number;
  multas_pendientes: number;
  valor_alicuota: number;
  alicuotas_adeudadas: number;
  multas_adeudadas: number;
  cargos_pendientes: number;
  cargos_adeudados: number;
  total_adeudado: number;
}

export interface MorosidadReporte {
  anio: number;
  mes_corte: number;
  resumen: {
    departamentos: number;
    al_dia: number;
    morosos: number;
    alicuotas_adeudadas: number;
    multas_adeudadas: number;
    cargos_adeudados: number;
    total_adeudado: number;
  };
  departamentos: MorosidadDepartamento[];
}

@Injectable({
  providedIn: 'root'
})
export class MorosidadService {
  constructor(private http: HttpClient) {}

  // Deuda del anio en curso de los departamentos de las torres del tesorero.
  obtener(): Observable<MorosidadReporte> {
    return this.http.get<MorosidadReporte>(`${environment.endpoint}/morosidad`);
  }
}
