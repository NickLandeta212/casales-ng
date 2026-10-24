import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { comprimirImagen } from '../../shared/utils/leer-archivo';
import {
  SOLICITUD_ESTADO_LABELS,
  SOLICITUD_TIPO_LABELS,
  Solicitud,
  SolicitudDestino,
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
  private readonly comprobantesService = inject(ComprobantesService);

  // Envian solicitudes el condomino, el tesorero y la guardia. Las del conjunto (areas comunales) las atiende
  // la administracion y las de una torre su tesorero. Cada solicitud trae puede_atender, calculado por la API.
  readonly rol = this.authService.getUserRole();
  readonly esResidente = this.rol === 'condomino';
  readonly puedeEnviar = ['condomino', 'tesorero', 'guardia'].includes(this.rol);
  readonly rolLabels: Record<string, string> = { tesorero: 'Tesorería', guardia: 'Guardia', condomino: 'Residente' };

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

  // Destinos permitidos para el rol y foto de evidencia de la nueva solicitud (ya reducida).
  destinos: SolicitudDestino[] = [];
  foto: string | null = null;

  readonly form = this.fb.nonNullable.group({
    destino: [null as SolicitudDestino | null, Validators.required],
    tipo: ['mantenimiento' as SolicitudTipo, Validators.required],
    asunto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  ngOnInit(): void {
    this.cargar();

    if (this.puedeEnviar) {
      this.solicitudesService.destinos().subscribe({
        next: (destinos) => {
          this.destinos = destinos;
          // Si solo hay un destino (tesorero: la administracion) queda elegido.
          if (destinos.length === 1) {
            this.form.controls.destino.setValue(destinos[0]);
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudieron cargar los destinos.';
        }
      });
    }
  }

  // Texto de a quien va dirigida una solicitud o un destino.
  destinoLabel(destino: SolicitudDestino): string {
    return destino.alcance === 'torre'
      ? `Tesorería de la Torre ${destino.torre_numero}`
      : 'Administración (áreas comunales o todo el conjunto)';
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

  async elegirFoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    this.errorMessage = '';

    if (archivo) {
      try {
        this.foto = await comprimirImagen(archivo);
      } catch (mensaje) {
        this.errorMessage = String(mensaje);
      }
    }

    input.value = '';
  }

  quitarFoto(): void {
    this.foto = null;
  }

  verFoto(event: Event, foto: string): void {
    this.comprobantesService.abrirEnlace(this.solicitudesService.enlaceFoto(foto), event);
  }

  // Quien la envio: el departamento si es de un residente, o la persona y su rol si no.
  origen(solicitud: Solicitud): string {
    if (solicitud.departamento_numero) {
      return `Torre ${solicitud.departamento_torre_numero}, ${solicitud.departamento_numero}`;
    }

    const rol = this.rolLabels[solicitud.creado_por_role || ''] || solicitud.creado_por_role || '';
    return `${solicitud.creado_por_nombre || 'Usuario eliminado'}${rol ? ` (${rol})` : ''}`;
  }

  enviar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { destino, tipo, asunto, descripcion } = this.form.getRawValue();

    this.solicitudesService.crear({
      alcance: destino!.alcance,
      torre_id: destino!.torre_id,
      tipo,
      asunto,
      descripcion,
      fotos_base64: this.foto ? [this.foto] : []
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = 'Solicitud enviada. Aquí verás la respuesta cuando la atiendan.';
        this.form.reset({
          destino: this.destinos.length === 1 ? this.destinos[0] : null,
          tipo: 'mantenimiento',
          asunto: '',
          descripcion: ''
        });
        this.foto = null;
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
      this.errorMessage = 'Escribe una respuesta antes de marcarla como resuelta.';
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
