import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ReservaResponse, ReservasService } from '../../services/reservas.service';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reservas.component.html',
  styleUrl: './reservas.component.scss'
})
export class ReservasComponent implements OnInit {
  reservas: ReservaResponse[] = [];
  reservaSeleccionada: ReservaResponse | null = null;
  cargando = false;
  approvingId: number | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(private reservasService: ReservasService) { }

  ngOnInit(): void {
    this.cargarReservas();
  }

  cargarReservas(): void {
    this.cargando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.reservasService.listar().subscribe({
      next: (reservas) => {
        this.reservas = Array.isArray(reservas) ? reservas : [];
        this.cargando = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las reservas.';
        this.reservas = [];
        this.reservaSeleccionada = null;
        this.cargando = false;
      }
    });
  }

  seleccionarReserva(reserva: ReservaResponse): void {
    this.reservaSeleccionada = reserva;
  }

  cerrarDetalles(): void {
    this.reservaSeleccionada = null;
  }

  aprobarReserva(reserva: ReservaResponse): void {
    if (reserva.estado === 'reservado' || this.approvingId) {
      return;
    }

    const confirmar = window.confirm(`Deseas aprobar la reserva #${reserva.id}?`);

    if (!confirmar) {
      return;
    }

    this.approvingId = reserva.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.reservasService.actualizarEstado(reserva.id, 'reservado').subscribe({
      next: (reservaActualizada) => {
        this.approvingId = null;
        this.successMessage = 'Reserva aprobada correctamente.';
        this.reservas = this.reservas.map((item) =>
          item.id === reserva.id ? { ...item, ...reservaActualizada, estado: 'reservado' } : item
        );

        if (this.reservaSeleccionada?.id === reserva.id) {
          this.reservaSeleccionada = {
            ...this.reservaSeleccionada,
            ...reservaActualizada,
            estado: 'reservado'
          };
        }
      },
      error: (error) => {
        this.approvingId = null;
        this.errorMessage = error?.error?.message || 'No se pudo aprobar la reserva.';
      }
    });
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      disponible: 'Disponible',
      en_proceso: 'En proceso',
      reservado: 'Reservado'
    };

    return labels[estado] || estado;
  }

  getComprobanteUrl(reserva: ReservaResponse): string {
    const match = String(reserva.observaciones || '').match(/Comprobante:\s*([^|]+)/i);
    const rawUrl = match?.[1]?.trim() || '';

    if (!rawUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }

    if (rawUrl.startsWith('/')) {
      return `${this.getApiOrigin()}${rawUrl}`;
    }

    return rawUrl;
  }

  tieneComprobante(reserva: ReservaResponse): boolean {
    return !!this.getComprobanteUrl(reserva);
  }

  private getApiOrigin(): string {
    if (/^https?:\/\//i.test(environment.endpoint)) {
      return new URL(environment.endpoint).origin;
    }

    return environment.production ? window.location.origin : 'http://localhost:3000';
  }
}
