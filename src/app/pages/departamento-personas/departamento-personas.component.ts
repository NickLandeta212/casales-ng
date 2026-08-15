import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AlicuotaPago, AlicuotasService } from '../../services/alicuotas.service';
import { Multa, MultasService } from '../../services/multas.service';
import { Persona, PersonasService } from '../../services/personas.service';
import { SecurityUrlService } from '../../services/security-url.service';

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
  asignacionesMovilidad: Record<string, { vehiculo: string; parqueadero: string }> = {};
  personaEditando = '';
  movilidadDraft = {
    vehiculo: '',
    parqueadero: ''
  };

  constructor(
    private route: ActivatedRoute,
    private personasService: PersonasService,
    private multasService: MultasService,
    private alicuotasService: AlicuotasService,
    private securityUrlService: SecurityUrlService
  ) { }

  ngOnInit(): void {
    this.departamentoId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.torreId = Number(this.route.snapshot.queryParamMap.get('torreId')) || this.getTorreIdFromCodigo();
    this.departamentoCodigo = this.route.snapshot.queryParamMap.get('codigo') || '';
    this.cargarAsignacionesMovilidad();

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

    this.cargarPagosAlicuotas();
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
    return this.asignacionesMovilidad[this.getPersonaKey(persona)] || { vehiculo: '', parqueadero: '' };
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
    const key = this.getPersonaKey(persona);
    const vehiculo = this.movilidadDraft.vehiculo.trim();
    const parqueadero = this.movilidadDraft.parqueadero.trim();

    if (!vehiculo && !parqueadero) {
      delete this.asignacionesMovilidad[key];
    } else {
      this.asignacionesMovilidad[key] = { vehiculo, parqueadero };
    }

    this.persistirAsignacionesMovilidad();
    this.cancelarMovilidad();
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
      aprobado: 'Aprobado'
    };

    return labels[estado] || estado;
  }

  getFechaPago(pago: AlicuotaPago): string {
    return pago.fechaPago ? String(pago.fechaPago).slice(0, 10) : '-';
  }

  getComprobanteUrl(pago: AlicuotaPago): string {
    const rawUrl = String(pago.comprobanteUrl || '').trim();

    return this.securityUrlService.sanitizeResourceUrl(rawUrl, this.getApiOrigin());
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

  private getApiOrigin(): string {
    if (/^https?:\/\//i.test(environment.endpoint)) {
      return new URL(environment.endpoint).origin;
    }

    return environment.production ? window.location.origin : 'http://localhost:3000';
  }

  private cargarAsignacionesMovilidad(): void {
    try {
      this.asignacionesMovilidad = JSON.parse(localStorage.getItem(this.movilidadStorageKey) || '{}');
    } catch {
      this.asignacionesMovilidad = {};
    }
  }

  private persistirAsignacionesMovilidad(): void {
    localStorage.setItem(this.movilidadStorageKey, JSON.stringify(this.asignacionesMovilidad));
  }

  private get movilidadStorageKey(): string {
    return `casales_departamento_${this.departamentoId || 'sin_id'}_movilidad`;
  }
}
