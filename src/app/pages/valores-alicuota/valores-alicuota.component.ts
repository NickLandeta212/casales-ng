import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { AlicuotasService, AlicuotaValor } from '../../services/alicuotas.service';
import { TorresService } from '../../services/torres.service';

// Valor mensual de la alicuota. La administracion define el valor general y el de cualquier torre;
// el tesorero solo el de sus torres (ve el general, pero no lo cambia). El servidor aplica la misma regla.
@Component({
  selector: 'app-valores-alicuota',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './valores-alicuota.component.html',
  styleUrl: './valores-alicuota.component.scss'
})
export class ValoresAlicuotaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly alicuotasService = inject(AlicuotasService);
  private readonly torresService = inject(TorresService);
  readonly esAdmin = inject(AuthService).hasRole(ADMINS);

  valores: AlicuotaValor[] = [];
  torres: Array<{ id: number; numero: number }> = [];
  guardando = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    torre_id: [null as number | null],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2200)]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.cargar();
    this.torresService.list().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.torres = lista
          .map((torre: any) => ({ id: Number(torre.id), numero: Number(torre.numero) }))
          .sort((a: { numero: number }, b: { numero: number }) => a.numero - b.numero);

        // El tesorero no puede usar "Todas las torres": se preselecciona su primera torre.
        if (!this.esAdmin && this.torres.length) {
          this.form.patchValue({ torre_id: this.torres[0].id });
        }
      }
    });
  }

  // Valor que aplica hoy para cada torre, con la misma regla que usa el servidor.
  get valoresVigentes(): Array<{ torre: string; valor: number; desde: number }> {
    const anioActual = new Date().getFullYear();
    const vigente = (torreId: number | null) => this.valores
      .filter((v) => (v.torre_id === torreId || v.torre_id === null) && v.anio <= anioActual)
      .sort((a, b) => b.anio - a.anio || (a.torre_id === null ? 1 : 0) - (b.torre_id === null ? 1 : 0))[0];

    return this.torres.map((torre) => {
      const v = vigente(torre.id);
      return { torre: `Torre ${torre.numero}`, valor: v ? Number(v.valor) : 45, desde: v?.anio ?? 0 };
    });
  }

  // El tesorero solo modifica los valores de sus torres (el servidor solo le muestra esas y el general).
  puedeEditar(valor: AlicuotaValor): boolean {
    return this.esAdmin || valor.torre_id !== null;
  }

  cargar(): void {
    this.alicuotasService.getValores().subscribe({
      next: (valores) => {
        this.valores = valores;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los valores.';
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const { torre_id, anio, valor } = this.form.getRawValue();
    const alcance = torre_id ? `la Torre ${this.torres.find((t) => t.id === Number(torre_id))?.numero}` : 'todas las torres';

    if (!window.confirm(`Definir $${Number(valor).toFixed(2)} mensual desde ${anio} para ${alcance}? Los pagos ya enviados conservan su valor.`)) {
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.alicuotasService.guardarValor({
      torre_id: torre_id ? Number(torre_id) : null,
      anio: Number(anio),
      valor: Number(valor)
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = 'Valor guardado correctamente.';
        this.form.patchValue({ valor: null });
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el valor.';
      }
    });
  }

  eliminar(valor: AlicuotaValor): void {
    if (!window.confirm(`Eliminar el valor de $${Number(valor.valor).toFixed(2)} de ${valor.anio}?`)) {
      return;
    }

    this.alicuotasService.eliminarValor(valor.id).subscribe({
      next: () => this.cargar(),
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo eliminar el valor.';
      }
    });
  }
}
