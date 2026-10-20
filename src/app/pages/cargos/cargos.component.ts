import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { CargoEmision, CargosService } from '../../services/cargos.service';
import { TorresService } from '../../services/torres.service';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

// Cargos extraordinarios del mes: la administracion los emite a todos los departamentos (o a una torre)
// y puede revertirlos con motivo mientras nadie los haya pagado. La alicuota ordinaria no se toca aqui.
@Component({
  selector: 'app-cargos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cargos.component.html',
  styleUrl: './cargos.component.scss'
})
export class CargosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cargosService = inject(CargosService);
  private readonly torresService = inject(TorresService);
  private readonly authService = inject(AuthService);

  readonly puedeEmitir = this.authService.hasRole(ADMINS);
  emisiones: CargoEmision[] = [];
  torres: Array<{ id: number; numero: number }> = [];
  cargando = false;
  guardando = false;
  revirtiendoId: number | null = null;
  errorMessage = '';
  successMessage = '';
  mostrarRevertidas = false;

  readonly form = this.fb.group({
    periodo: [mesActual(), Validators.required],
    torre_id: [null as number | null],
    concepto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.cargar();

    if (this.puedeEmitir) {
      this.torresService.list().subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          this.torres = lista
            .map((torre: any) => ({ id: Number(torre.id), numero: Number(torre.numero) }))
            .sort((a: { numero: number }, b: { numero: number }) => a.numero - b.numero);
        }
      });
    }
  }

  get emisionesVisibles(): CargoEmision[] {
    return this.mostrarRevertidas ? this.emisiones : this.emisiones.filter((e) => e.estado === 'activa');
  }

  get totalRevertidas(): number {
    return this.emisiones.filter((e) => e.estado === 'revertida').length;
  }

  cargar(): void {
    this.cargando = true;

    this.cargosService.listarEmisiones().subscribe({
      next: (emisiones) => {
        this.emisiones = emisiones;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los cargos.';
      }
    });
  }

  periodo(emision: CargoEmision): string {
    return `${MESES[emision.mes - 1]} ${emision.anio}`;
  }

  alcance(emision: CargoEmision): string {
    return emision.torre_numero ? `Torre ${emision.torre_numero}` : 'Todas las torres';
  }

  puedeRevertir(emision: CargoEmision): boolean {
    return this.puedeEmitir && emision.estado === 'activa' && emision.en_pago + emision.pagados === 0;
  }

  emitir(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const { periodo, torre_id, concepto, valor } = this.form.getRawValue();
    const [anio, mes] = String(periodo).split('-').map(Number);
    const torre = this.torres.find((t) => t.id === Number(torre_id));
    const alcance = torre ? `los departamentos de la Torre ${torre.numero}` : 'todos los departamentos del conjunto';

    if (!window.confirm(`Emitir "${String(concepto).trim()}" de $${Number(valor).toFixed(2)} (${MESES[mes - 1]} ${anio}) a ${alcance}?`)) {
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cargosService.emitir({
      anio,
      mes,
      concepto: String(concepto).trim(),
      valor: Number(valor),
      torre_id: torre_id ? Number(torre_id) : null
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.successMessage = res.message;
        this.form.patchValue({ concepto: '', valor: null });
        this.form.markAsPristine();
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo emitir el cargo.';
      }
    });
  }

  revertir(emision: CargoEmision): void {
    if (!this.puedeRevertir(emision) || this.revirtiendoId !== null) {
      return;
    }

    const motivo = window.prompt(
      `Motivo para revertir "${emision.concepto}" (${this.periodo(emision)}). Se anulará en ${emision.departamentos} departamento(s):`
    );

    if (motivo === null) {
      return;
    }

    if (motivo.trim().length < 10) {
      window.alert('El motivo debe tener al menos 10 caracteres.');
      return;
    }

    this.revirtiendoId = emision.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.cargosService.revertir(emision.id, motivo.trim().slice(0, 500)).subscribe({
      next: () => {
        this.revirtiendoId = null;
        this.successMessage = 'Cargo revertido.';
        this.cargar();
      },
      error: (error) => {
        this.revirtiendoId = null;
        this.errorMessage = error?.error?.message || 'No se pudo revertir el cargo.';
      }
    });
  }
}
