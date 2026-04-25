import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { TorresService } from '../../services/torres.service';

interface PagoAlicuota {
  torreId: number;
  torreNumero: string;
  numeroPago: number;
  fecha: string;
  descripcion: string;
  estado: 'pendiente' | 'aprobado';
}

@Component({
  selector: 'app-torre-pagos-alicuota',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './torre-pagos-alicuota.component.html',
  styleUrl: './torre-pagos-alicuota.component.scss'
})
export class TorrePagosAlicuotaComponent implements OnInit {
  torreId: number | null = null;
  torreNumero = '';
  torres: any[] = [];
  pagos: PagoAlicuota[] = [];
  pagosFiltrados: PagoAlicuota[] = [];
  torreFilterControl = new FormControl('');

  constructor(
    private route: ActivatedRoute,
    private torresService: TorresService
  ) { }

  ngOnInit(): void {
    this.torreId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.torreNumero = this.route.snapshot.queryParamMap.get('numero') || (this.torreId ? this.torreId.toString() : '');
    this.cargarTorres();
    this.cargarPagosDemo();
    this.torreFilterControl.setValue(this.torreNumero || (this.torreId ? this.torreId.toString() : ''));
    this.torreFilterControl.valueChanges
      .pipe(startWith(this.torreFilterControl.value || ''))
      .subscribe(() => this.filtrarPagos());
  }

  private cargarPagosDemo() {
    this.pagos = [
      { torreId: 1, torreNumero: '1', numeroPago: 1, fecha: '2026-01-10', descripcion: 'Pago mensual alicuota - Enero', estado: 'aprobado' },
      { torreId: 1, torreNumero: '1', numeroPago: 2, fecha: '2026-02-10', descripcion: 'Pago mensual alicuota - Febrero', estado: 'aprobado' },
      { torreId: 1, torreNumero: '1', numeroPago: 3, fecha: '2026-03-10', descripcion: 'Pago mensual alicuota - Marzo', estado: 'pendiente' },
      { torreId: 2, torreNumero: '2', numeroPago: 4, fecha: '2026-03-12', descripcion: 'Pago mensual alicuota - Marzo', estado: 'pendiente' },
      { torreId: 2, torreNumero: '2', numeroPago: 5, fecha: '2026-04-10', descripcion: 'Pago mensual alicuota - Abril', estado: 'pendiente' },
      { torreId: 3, torreNumero: '3', numeroPago: 6, fecha: '2026-04-14', descripcion: 'Pago mensual alicuota - Abril', estado: 'aprobado' }
    ];
    this.filtrarPagos();
  }

  cargarTorres() {
    this.torresService.list().subscribe({
      next: (res: any) => {
        this.torres = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.torres = [];
      }
    });
  }

  filtrarPagos() {
    const torreSeleccionada = this.torreFilterControl.value;

    this.pagosFiltrados = this.pagos.filter((pago) => {
      return !torreSeleccionada ||
        pago.torreNumero.toString() === torreSeleccionada.toString() ||
        pago.torreId.toString() === torreSeleccionada.toString();
    });

    const pago = this.pagos.find((item) =>
      item.torreNumero.toString() === torreSeleccionada?.toString() ||
      item.torreId.toString() === torreSeleccionada?.toString()
    );
    this.torreNumero = pago?.torreNumero || this.route.snapshot.queryParamMap.get('numero') || '';
  }

  aprobarPago(index: number) {
    const pago = this.pagosFiltrados[index];

    if (!pago || pago.estado === 'aprobado') {
      return;
    }

    const confirmar = window.confirm(`Deseas aprobar el pago #${pago.numeroPago} de la Torre ${pago.torreNumero}?`);

    if (!confirmar) {
      return;
    }

    this.actualizarPagoAprobado(pago);
  }

  private actualizarPagoAprobado(pago: PagoAlicuota) {
    const pagoIndex = this.pagos.findIndex((item) => item.numeroPago === pago.numeroPago);

    if (pagoIndex < 0) {
      return;
    }

    // Aqui se integrara el servicio que actualice el registro en el backend.
    this.pagos[pagoIndex] = {
      ...this.pagos[pagoIndex],
      estado: 'aprobado'
    };
    this.filtrarPagos();
  }
}
