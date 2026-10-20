import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartamentosService } from '../../services/departamentos.service';
import { Certificado, EstadoCuentaService } from '../../services/estado-cuenta.service';
import { EstadoCuenta, MesAlicuota } from '../../services/mi-cuenta.service';
import { descargarArchivo, mensajeDeErrorBlob } from '../../shared/utils/descargar-archivo';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DepartamentoOpcion {
  id: number;
  numero: string;
  torre_numero: number;
}

// Estado de cuenta de un departamento para la administracion y el tesorero, con descarga en PDF
// y emision del certificado de paz y salvo cuando no hay deuda ni pagos en revision.
@Component({
  selector: 'app-estado-cuenta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estado-cuenta.component.html',
  styleUrl: './estado-cuenta.component.scss'
})
export class EstadoCuentaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly departamentosService = inject(DepartamentosService);
  private readonly estadoCuentaService = inject(EstadoCuentaService);

  readonly anioActual = new Date().getFullYear();
  anio = this.anioActual;
  departamentos: DepartamentoOpcion[] = [];
  departamentoId: number | null = null;
  cuenta: EstadoCuenta | null = null;
  certificados: Certificado[] = [];
  cargando = false;
  emitiendo = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.departamentosService.list().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.departamentos = lista
          .map((d: any) => ({ id: Number(d.id), numero: String(d.numero), torre_numero: Number(d.torre_numero) }))
          .sort((a: DepartamentoOpcion, b: DepartamentoOpcion) => a.torre_numero - b.torre_numero || a.numero.localeCompare(b.numero, 'es', { numeric: true }));
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los departamentos.';
      }
    });

    const inicial = Number(this.route.snapshot.queryParamMap.get('departamento')) || null;

    if (inicial) {
      this.seleccionar(inicial);
    }

    this.cargarCertificados();
  }

  get puedeEmitirPazYSalvo(): boolean {
    return !!this.cuenta && this.cuenta.resumen.total_adeudado === 0 && this.cuenta.resumen.pagos_en_revision === 0;
  }

  get motivoBloqueo(): string {
    if (!this.cuenta) {
      return '';
    }

    if (this.cuenta.resumen.total_adeudado > 0) {
      return 'El departamento tiene deuda pendiente.';
    }

    if (this.cuenta.resumen.pagos_en_revision > 0) {
      return 'Primero revisa los pagos que están en revisión.';
    }

    return '';
  }

  get cargosVigentes() {
    return (this.cuenta?.cargos || []).filter((cargo) => cargo.estado !== 'anulado');
  }

  get certificadosDelDepartamento(): Certificado[] {
    return this.departamentoId ? this.certificados.filter((c) => c.departamento_id === this.departamentoId) : this.certificados;
  }

  onSeleccion(valor: string): void {
    this.seleccionar(Number(valor) || null);
  }

  seleccionar(id: number | null): void {
    this.departamentoId = id;
    this.cuenta = null;
    this.successMessage = '';
    this.router.navigate([], { queryParams: { departamento: id || null }, replaceUrl: true });

    if (id) {
      this.cargar();
    }
  }

  cambiarAnio(delta: number): void {
    this.anio += delta;
    this.cargar();
  }

  cargar(): void {
    if (!this.departamentoId) {
      return;
    }

    this.cargando = true;
    this.errorMessage = '';

    this.estadoCuentaService.obtener(this.departamentoId, this.anio).subscribe({
      next: (cuenta) => {
        this.cuenta = cuenta;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el estado de cuenta.';
      }
    });
  }

  cargarCertificados(): void {
    this.estadoCuentaService.listarCertificados().subscribe({
      next: (certificados) => {
        this.certificados = certificados;
      },
      error: () => {
        this.certificados = [];
      }
    });
  }

  descargarPdf(): void {
    if (!this.cuenta) {
      return;
    }

    const { id, numero } = this.cuenta.departamento;

    this.estadoCuentaService.descargarPdf(id, this.anio).subscribe({
      next: (blob) => descargarArchivo(blob, `estado-cuenta-${numero}-${this.anio}.pdf`),
      error: async (error) => {
        this.errorMessage = await mensajeDeErrorBlob(error, 'No se pudo descargar el estado de cuenta.');
      }
    });
  }

  emitirPazYSalvo(): void {
    if (!this.cuenta || !this.puedeEmitirPazYSalvo || this.emitiendo) {
      return;
    }

    if (!window.confirm(`Emitir el certificado de paz y salvo del departamento ${this.cuenta.departamento.numero}? Quedará registrado con tu nombre.`)) {
      return;
    }

    this.emitiendo = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.estadoCuentaService.emitirPazYSalvo(this.cuenta.departamento.id).subscribe({
      next: (blob) => {
        this.emitiendo = false;
        descargarArchivo(blob, `paz-y-salvo-${this.cuenta?.departamento.numero}.pdf`);
        this.successMessage = 'Certificado emitido y descargado.';
        this.cargarCertificados();
      },
      error: async (error) => {
        this.emitiendo = false;
        this.errorMessage = await mensajeDeErrorBlob(error, 'No se pudo emitir el certificado.');
        this.cargar();
      }
    });
  }

  descargarCertificado(certificado: Certificado): void {
    this.estadoCuentaService.descargarCertificado(certificado.id).subscribe({
      next: (blob) => descargarArchivo(blob, `${certificado.numero}.pdf`),
      error: async (error) => {
        this.errorMessage = await mensajeDeErrorBlob(error, 'No se pudo descargar el certificado.');
      }
    });
  }

  nombreMes(mes: number): string {
    return MESES[mes - 1] || `Mes ${mes}`;
  }

  estadoMes(mes: MesAlicuota): string {
    return { pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Pagado', rechazado: 'Rechazado' }[mes.estado];
  }

  vencido(mes: MesAlicuota): boolean {
    const hoy = new Date();
    return (mes.estado === 'pendiente' || mes.estado === 'rechazado')
      && (this.anio < hoy.getFullYear() || (this.anio === hoy.getFullYear() && mes.mes <= hoy.getMonth() + 1));
  }

  estadoItem(estado: string): string {
    return {
      pendiente: 'Pendiente', en_pago: 'En revisión', pagado: 'Pagado', pagada: 'Pagada', anulado: 'Anulado',
      en_proceso: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado'
    }[estado] || estado;
  }
}
