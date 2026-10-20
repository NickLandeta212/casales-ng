import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MorosidadDepartamento, MorosidadReporte, MorosidadService } from '../../services/morosidad.service';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-morosidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './morosidad.component.html',
  styleUrl: './morosidad.component.scss'
})
export class MorosidadComponent implements OnInit {
  private readonly morosidadService = inject(MorosidadService);

  reporte: MorosidadReporte | null = null;
  soloMorosos = true;
  busqueda = '';
  cargando = true;
  errorMessage = '';

  ngOnInit(): void {
    this.morosidadService.obtener().subscribe({
      next: (reporte) => {
        this.reporte = reporte;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar la morosidad.';
      }
    });
  }

  // Mayor deuda primero.
  get departamentos(): MorosidadDepartamento[] {
    const texto = this.busqueda.trim().toLowerCase();

    return (this.reporte?.departamentos || [])
      .filter((d) => !this.soloMorosos || d.total_adeudado > 0)
      .filter((d) => !texto || d.departamento_numero.toLowerCase().includes(texto) || (d.titular || '').toLowerCase().includes(texto))
      .sort((a, b) => b.total_adeudado - a.total_adeudado || a.departamento_numero.localeCompare(b.departamento_numero));
  }

  get mesCorteLabel(): string {
    return this.reporte ? `${MESES[this.reporte.mes_corte - 1]} ${this.reporte.anio}` : '';
  }

  mesesLabel(meses: number[]): string {
    return meses.map((mes) => MESES[mes - 1]).join(', ');
  }

  // Descarga lo que se ve en la tabla, para abrirlo en Excel.
  exportarCsv(): void {
    const filas = [
      ['Torre', 'Departamento', 'Titular', 'Meses adeudados', 'Alicuotas', 'Multas', 'Cargos', 'Total'],
      ...this.departamentos.map((d) => [
        `Torre ${d.torre_numero}`,
        d.departamento_numero,
        d.titular || '',
        this.mesesLabel(d.meses_adeudados),
        d.alicuotas_adeudadas.toFixed(2),
        d.multas_adeudadas.toFixed(2),
        (d.cargos_adeudados || 0).toFixed(2),
        d.total_adeudado.toFixed(2)
      ])
    ];
    const csv = filas.map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = `morosidad-${this.reporte?.anio}-${String(this.reporte?.mes_corte).padStart(2, '0')}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
