import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { LineaPresupuesto, PresupuestosService, ResumenPresupuesto } from '../../services/presupuestos.service';
import { TorresService } from '../../services/torres.service';

// Presupuesto anual por categoria y su ejecucion.
// Ejecutado = egresos pagados en el anio. Comprometido = egresos registrados como "por pagar".
// La administracion arma el del conjunto; cada tesorero, el de sus torres.
@Component({
  selector: 'app-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presupuesto.component.html',
  styleUrl: './presupuesto.component.scss'
})
export class PresupuestoComponent implements OnInit {
  private readonly presupuestosService = inject(PresupuestosService);
  private readonly torresService = inject(TorresService);
  private readonly authService = inject(AuthService);

  readonly esAdmin = this.authService.hasRole(ADMINS);
  readonly anioActual = new Date().getFullYear();
  anio = this.anioActual;
  torreId: number | null = null;
  torres: Array<{ id: number; numero: number }> = [];

  resumen: ResumenPresupuesto | null = null;
  // Montos que se estan editando, por categoria.
  montos: Record<string, number> = {};
  editando = false;
  cargando = false;
  guardando = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    if (this.esAdmin) {
      this.cargar();
      return;
    }

    const propias = this.authService.getAuthorizedTorreIds();
    this.torresService.list().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.torres = lista
          .map((torre: any) => ({ id: Number(torre.id), numero: Number(torre.numero) }))
          .filter((torre: { id: number }) => propias.includes(torre.id))
          .sort((a: { numero: number }, b: { numero: number }) => a.numero - b.numero);
        this.torreId = this.torres[0]?.id ?? null;
        this.cargar();
      }
    });
  }

  cargar(): void {
    if (!this.esAdmin && !this.torreId) {
      this.errorMessage = 'No tienes torres asignadas.';
      return;
    }

    this.cargando = true;
    this.editando = false;
    this.errorMessage = '';

    this.presupuestosService.resumen(this.anio, this.esAdmin ? null : this.torreId).subscribe({
      next: (resumen) => {
        this.resumen = resumen;
        this.montos = Object.fromEntries(resumen.categorias.map((c) => [c.categoria, c.presupuesto]));
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el presupuesto.';
      }
    });
  }

  get totalEditado(): number {
    return Object.values(this.montos).reduce((acc, monto) => acc + (Number(monto) || 0), 0);
  }

  excedido(linea: LineaPresupuesto): boolean {
    return linea.presupuesto > 0 ? linea.ejecutado + linea.comprometido > linea.presupuesto : linea.ejecutado > 0;
  }

  anchoBarra(linea: LineaPresupuesto): number {
    return linea.presupuesto > 0 ? Math.min(100, (linea.ejecutado / linea.presupuesto) * 100) : linea.ejecutado > 0 ? 100 : 0;
  }

  guardar(): void {
    if (!this.resumen || this.guardando) {
      return;
    }

    const montos = this.resumen.categorias.map((c) => ({ categoria: c.categoria, monto: Math.max(0, Number(this.montos[c.categoria]) || 0) }));
    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.presupuestosService.guardar(this.anio, this.esAdmin ? null : this.torreId, montos).subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = `Presupuesto ${this.anio} guardado.`;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el presupuesto.';
      }
    });
  }
}
