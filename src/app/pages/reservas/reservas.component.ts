import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ReservaResponse, ReservasService } from '../../services/reservas.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { AuthService } from '../../auth/services/auth.service';
import { pedirMotivoRechazo } from '../../shared/utils/motivo-rechazo';

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
  readonly puedeGestionar: boolean;
  errorMessage = '';
  successMessage = '';

  constructor(
    private reservasService: ReservasService,
    private comprobantesService: ComprobantesService,
    authService: AuthService
  ) {
    this.puedeGestionar = authService.hasRole(['admin_general', 'admin_conjunto']);
  }

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
    if (reserva.estado !== 'en_proceso' || this.approvingId) {
      return;
    }

    if (!window.confirm(`Deseas aprobar la reserva #${reserva.id}?`)) {
      return;
    }

    this.ejecutarAccion(reserva, this.reservasService.aprobar(reserva.id), 'Reserva aprobada correctamente.');
  }

  rechazarReserva(reserva: ReservaResponse): void {
    if (reserva.estado === 'rechazado' || this.approvingId) {
      return;
    }

    const motivo = pedirMotivoRechazo(`la reserva del ${reserva.fecha}`);

    if (!motivo) {
      return;
    }

    this.ejecutarAccion(reserva, this.reservasService.rechazar(reserva.id, motivo), 'Reserva rechazada. La fecha queda disponible.');
  }

  private ejecutarAccion(reserva: ReservaResponse, accion: Observable<ReservaResponse>, mensaje: string): void {
    this.approvingId = reserva.id;
    this.errorMessage = '';
    this.successMessage = '';

    accion.subscribe({
      next: (actualizada) => {
        this.approvingId = null;
        this.successMessage = mensaje;
        this.reservas = this.reservas.map((item) => (item.id === reserva.id ? { ...item, ...actualizada } : item));

        if (this.reservaSeleccionada?.id === reserva.id) {
          this.reservaSeleccionada = { ...this.reservaSeleccionada, ...actualizada };
        }
      },
      error: (error) => {
        this.approvingId = null;
        this.errorMessage = error?.error?.message || 'No se pudo actualizar la reserva.';
      }
    });
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      disponible: 'Disponible',
      en_proceso: 'En proceso',
      reservado: 'Reservado',
      rechazado: 'Rechazado'
    };

    return labels[estado] || estado;
  }

  // La API guarda el comprobante de la reserva dentro de las observaciones.
  private getComprobante(reserva: ReservaResponse): string {
    const match = String(reserva.observaciones || '').match(/Comprobante:\s*([^|]+)/i);

    return this.comprobantesService.getArchivo(match?.[1]);
  }

  tieneComprobante(reserva: ReservaResponse): boolean {
    return !!this.getComprobante(reserva);
  }

  verComprobante(event: Event, reserva: ReservaResponse): void {
    this.comprobantesService.abrir(event, this.getComprobante(reserva));
  }

}
