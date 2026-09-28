import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlicuotaPago, AlicuotasService } from '../../services/alicuotas.service';
import { Multa, MultasService } from '../../services/multas.service';
import { Persona, PersonasService } from '../../services/personas.service';
import { SecurityUrlService } from '../../services/security-url.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-departamento-personas',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './departamento-personas.component.html',
  styleUrl: './departamento-personas.component.scss'
})
export class DepartamentoPersonasComponent implements OnInit {
  departamentoId: number | null = null;
  torreId: number | null = null;
  departamentoCodigo = '';
  lista: Persona[] = [];
  listaMultas: Multa[] = [];
  listaPagos: AlicuotaPago[] = [];
  cargando = true;
  cargandoMultas = true;
  cargandoPagos = true;
  pagosError = '';
  personaEditando = '';
  readonly esTesorero: boolean;
  guardandoMovilidad = false;
  movilidadError = '';
  movilidadDraft = {
    vehiculo: '',
    parqueadero: ''
  };

  constructor(
    private route: ActivatedRoute,
    private personasService: PersonasService,
    private multasService: MultasService,
    private alicuotasService: AlicuotasService,
    private securityUrlService: SecurityUrlService,
    authService: AuthService
  ) {
    this.esTesorero = authService.getUserRole() === 'tesorero';
  }

  ngOnInit(): void {
    this.departamentoId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.torreId = Number(this.route.snapshot.queryParamMap.get('torreId')) || this.getTorreIdFromCodigo();
    this.departamentoCodigo = this.route.snapshot.queryParamMap.get('codigo') || '';

    this.personasService.personas$.subscribe(personas => {
      this.aplicarFiltro(personas);
    });

    this.multasService.multas$.subscribe(multas => {
      this.aplicarFiltroMultas(multas);
    });

    this.personasService.loadPersonas().subscribe({
      next: () => {
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });

    this.multasService.loadMultas().subscribe({
      next: () => {
        this.cargandoMultas = false;
      },
      error: () => {
        this.cargandoMultas = false;
      }
    });

    if (this.esTesorero) {
      this.cargarPagosAlicuotas();
    }
  }

  private aplicarFiltro(personas: Persona[]) {
    if (!this.departamentoId) {
      this.lista = [];
      return;
    }

    this.lista = personas.filter((item) => item.departamentoId === this.departamentoId);
  }

  private aplicarFiltroMultas(multas: Multa[]) {
    if (!this.departamentoId) {
      this.listaMultas = [];
      return;
    }

    this.listaMultas = multas.filter((item) => item.departamentoId === this.departamentoId);
  }

  getNombreCompleto(persona: Persona): string {
    return `${persona.nombres} ${persona.apellidos}`.trim();
  }

  getPersonaKey(persona: Persona): string {
    return String((persona as any).id ?? persona.cedula ?? this.getNombreCompleto(persona));
  }

  getMovilidad(persona: Persona): { vehiculo: string; parqueadero: string } {
    return { vehiculo: persona.vehiculo || '', parqueadero: persona.parqueadero || '' };
  }

  editarMovilidad(persona: Persona): void {
    const key = this.getPersonaKey(persona);
    const movilidad = this.getMovilidad(persona);

    this.personaEditando = key;
    this.movilidadDraft = {
      vehiculo: movilidad.vehiculo,
      parqueadero: movilidad.parqueadero
    };
  }

  guardarMovilidad(persona: Persona): void {
    if (persona.id === undefined || this.guardandoMovilidad) {
      return;
    }

    this.guardandoMovilidad = true;
    this.movilidadError = '';

    this.personasService.updateMovilidad(persona.id, {
      vehiculo: this.movilidadDraft.vehiculo.trim(),
      parqueadero: this.movilidadDraft.parqueadero.trim()
    }).subscribe({
      next: () => {
        this.guardandoMovilidad = false;
        this.cancelarMovilidad();
      },
      error: (error) => {
        this.guardandoMovilidad = false;
        this.movilidadError = error?.error?.message || 'No se pudo guardar el vehiculo/parqueadero.';
      }
    });
  }

  cancelarMovilidad(): void {
    this.personaEditando = '';
    this.movilidadDraft = { vehiculo: '', parqueadero: '' };
  }

  getPersonaMulta(multa: Multa): string {
    const nombre = `${multa.personaNombre ?? ''} ${multa.personaApellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }

  getEstadoPagoLabel(estado: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      en_revision: 'En revision',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado'
    };

    return labels[estado] || estado;
  }

  getFechaPago(pago: AlicuotaPago): string {
    return pago.fechaPago ? String(pago.fechaPago).slice(0, 10) : '-';
  }

  getComprobanteUrl(pago: AlicuotaPago): string {
    const rawUrl = String(pago.comprobanteUrl || '').trim();

    return this.securityUrlService.resolveUploadUrl(rawUrl);
  }

  private cargarPagosAlicuotas(): void {
    if (!this.torreId || !this.departamentoId) {
      this.listaPagos = [];
      this.cargandoPagos = false;
      this.pagosError = 'No se pudo identificar la torre del departamento.';
      return;
    }

    this.cargandoPagos = true;
    this.pagosError = '';

    this.alicuotasService.getPagosDepartamento(this.torreId, this.departamentoId).subscribe({
      next: (pagos) => {
        this.listaPagos = pagos;
        this.cargandoPagos = false;
      },
      error: (error) => {
        this.listaPagos = [];
        this.cargandoPagos = false;
        this.pagosError = error?.error?.message || 'No se pudo cargar el historial de alicuotas.';
      }
    });
  }

  private getTorreIdFromCodigo(): number | null {
    const codigo = this.route.snapshot.queryParamMap.get('codigo') || '';
    const match = codigo.match(/^T(\d+)/i);
    return match ? Number(match[1]) : null;
  }
}
