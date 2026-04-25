import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface PagoAlicuota {
  numeroPago: number;
  fecha: string;
  descripcion: string;
  estado: 'pendiente' | 'aprobado';
}

@Component({
  selector: 'app-torre-pagos-alicuota',
  imports: [CommonModule, RouterLink],
  templateUrl: './torre-pagos-alicuota.component.html',
  styleUrl: './torre-pagos-alicuota.component.scss'
})
export class TorrePagosAlicuotaComponent implements OnInit {
  torreId: number | null = null;
  torreNumero = '';
  pagos: PagoAlicuota[] = [];

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.torreId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.torreNumero = this.route.snapshot.queryParamMap.get('numero') || (this.torreId ? this.torreId.toString() : '');
    this.cargarPagosDemo();
  }

  private cargarPagosDemo() {
    this.pagos = [
      { numeroPago: 1, fecha: '2026-01-10', descripcion: 'Pago mensual alicuota - Enero', estado: 'aprobado' },
      { numeroPago: 2, fecha: '2026-02-10', descripcion: 'Pago mensual alicuota - Febrero', estado: 'aprobado' },
      { numeroPago: 3, fecha: '2026-03-10', descripcion: 'Pago mensual alicuota - Marzo', estado: 'pendiente' },
      { numeroPago: 4, fecha: '2026-04-10', descripcion: 'Pago mensual alicuota - Abril', estado: 'pendiente' }
    ];
  }

  cambiarEstado(index: number, estado: string) {
    const nuevoEstado = estado === 'aprobado' ? 'aprobado' : 'pendiente';
    this.pagos[index] = {
      ...this.pagos[index],
      estado: nuevoEstado
    };
  }
}
