import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { GESTION } from '../../auth/permisos';
import {
  SOLICITUD_ESTADO_LABELS,
  SOLICITUD_TIPO_LABELS,
  Solicitud,
  SolicitudEstado,
  SolicitudTipo,
  SolicitudesService
} from '../../services/solicitudes.service';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.scss'
})
export class SolicitudesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly authService = inject(AuthService);

  // El condomino envia solicitudes; tesoreria y administracion las atienden.
  readonly esResidente = this.authService.getUserRole() === 'condomino';
  readonly puedeAtender = this.authService.hasRole(GESTION);

  readonly tipos = Object.keys(SOLICITUD_TIPO_LABELS) as SolicitudTipo[];
  readonly estados = Object.keys(SOLICITUD_ESTADO_LABELS) as SolicitudEstado[];
  readonly tipoLabels = SOLICITUD_TIPO_LABELS;
  readonly estadoLabels = SOLICITUD_ESTADO_LABELS;

  solicitudes: Solicitud[] = [];
  filtroEstado: SolicitudEstado | '' = '';
  cargando = true;
  guardando = false;
  errorMessage = '';
  successMessage = '';

  // Solicitud que la gestion esta respondiendo, con su borrador.
  atendiendo: Solicitud | null = null;
  borradorEstado: SolicitudEstado = 'en_proceso';
  borradorRespuesta = '';

  readonly form = this.fb.nonNullable.group({
    tipo: ['mantenimiento' as SolicitudTipo, Validators.required],
    asunto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  ngOnInit(): void {
    this.cargar();
  }

  get solicitudesFiltradas(): Solicitud[] {
    return this.filtroEstado ? this.solicitudes.filter((s) => s.estado === this.filtroEstado) : this.solicitudes;
  }

  contar(estado: SolicitudEstado): number {
    return this.solicitudes.filter((s) => s.estado === estado).length;
  }

  cargar(): void {
    this.solicitudesService.listar().subscribe({
      next: (solicitudes) => {
        this.solicitudes = solicitudes;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las solicitudes.';
      }
    });
  }

  enviar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.solicitudesService.crear(this.form.getRawValue()).subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = 'Solicitud enviada. Aquí verás la respuesta cuando la atiendan.';
        this.form.reset({ tipo: 'mantenimiento', asunto: '', descripcion: '' });
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo enviar la solicitud.';
      }
    });
  }

  abrirAtencion(solicitud: Solicitud): void {
    this.atendiendo = solicitud;
    this.borradorEstado = solicitud.estado === 'recibida' ? 'en_proceso' : solicitud.estado;
    this.borradorRespuesta = solicitud.respuesta || '';
    this.errorMessage = '';
  }

  cancelarAtencion(): void {
    this.atendiendo = null;
  }

  guardarAtencion(): void {
    if (!this.atendiendo || this.guardando) {
      return;
    }

    if (this.borradorEstado === 'resuelta' && !this.borradorRespuesta.trim()) {
      this.errorMessage = 'Escribe una respuesta para el residente antes de marcarla como resuelta.';
      return;
    }

    this.guardando = true;
    this.errorMessage = '';

    this.solicitudesService.atender(this.atendiendo.id, {
      estado: this.borradorEstado,
      respuesta: this.borradorRespuesta.trim()
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.atendiendo = null;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar la respuesta.';
      }
    });
  }
}
