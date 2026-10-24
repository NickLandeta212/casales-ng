import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LineaPresupuesto {
  categoria: string;
  label: string;
  presupuesto: number;
  ejecutado: number;
  comprometido: number;
  disponible: number;
  porcentaje: number | null;
}

export interface ResumenPresupuesto {
  anio: number;
  alcance: 'conjunto' | 'torre';
  torre_id: number | null;
  categorias: LineaPresupuesto[];
  totales: Omit<LineaPresupuesto, 'categoria' | 'label'>;
}

// Presupuesto anual por categoria y su ejecucion (egresos pagados y pendientes).
@Injectable({
  providedIn: 'root'
})
export class PresupuestosService {
  private readonly apiUrl = `${environment.endpoint}/presupuestos`;

  constructor(private http: HttpClient) {}

  resumen(anio: number, torreId: number | null): Observable<ResumenPresupuesto> {
    const params: Record<string, number> = { anio };

    if (torreId) {
      params['torre_id'] = torreId;
    }

    return this.http.get<ResumenPresupuesto>(this.apiUrl, { params });
  }

  guardar(anio: number, torreId: number | null, montos: Array<{ categoria: string; monto: number }>) {
    return this.http.put<{ message: string }>(this.apiUrl, { anio, torre_id: torreId, montos });
  }
}
