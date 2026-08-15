import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { AlicuotasService } from '../../services/alicuotas.service';
import { AuditService } from '../../services/audit.service';
import { LocalStoreService } from '../../services/local-store.service';

type MovimientoTipo = 'ingreso' | 'gasto';
type MovimientoEstado = 'pendiente' | 'pagado';

interface MovimientoFinanciero {
  id: string;
  fecha: string;
  concepto: string;
  tipo: MovimientoTipo;
  valor: number;
  estado: MovimientoEstado;
  alcance: 'conjunto' | 'torre';
  torre: string;
}

@Component({
  selector: 'app-finanzas-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './finanzas-dashboard.component.html',
  styleUrl: './finanzas-dashboard.component.scss'
})
export class FinanzasDashboardComponent implements OnInit {
  form!: FormGroup;
  movimientos: MovimientoFinanciero[] = [];
  pagosAprobados: MovimientoFinanciero[] = [];
  filtro = 'todos';
  readonly storageKey = 'casales_finanzas_movimientos';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private alicuotasService: AlicuotasService,
    private auditService: AuditService,
    private localStore: LocalStoreService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: [this.today(), Validators.required],
      concepto: ['', Validators.required],
      tipo: ['ingreso', Validators.required],
      valor: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['pagado', Validators.required],
      alcance: [this.isConjuntoView ? 'conjunto' : 'torre', Validators.required],
      torre: [this.defaultTorreLabel()]
    });

    this.load();
    this.loadPagosAprobados();
  }

  get isConjuntoView(): boolean {
    return this.route.snapshot.data['financeScope'] === 'conjunto';
  }

  get viewTitle(): string {
    return this.isConjuntoView ? 'Finanzas del conjunto' : 'Finanzas de torres';
  }

  get viewSubtitle(): string {
    return this.isConjuntoView
      ? 'Vista exclusiva para administradores del conjunto.'
      : 'Vista exclusiva para tesorería de torres asignadas.';
  }

  get movimientosVisibles(): MovimientoFinanciero[] {
    const allMovimientos = [...this.pagosAprobados, ...this.movimientos];
    const base = this.isConjuntoView
      ? allMovimientos
      : allMovimientos.filter((item) => item.alcance === 'torre' && this.torresPermitidas().includes(item.torre));

    if (this.filtro === 'todos') {
      return base;
    }

    return base.filter((item) => item.tipo === this.filtro);
  }

  get totalIngresos(): number {
    return this.sumByType('ingreso');
  }

  get totalGastos(): number {
    return this.sumByType('gasto');
  }

  get saldo(): number {
    return this.totalIngresos - this.totalGastos;
  }

  get porcentajeGastos(): number {
    if (this.totalIngresos <= 0) {
      return this.totalGastos > 0 ? 100 : 0;
    }

    return Math.min(100, Math.round((this.totalGastos / this.totalIngresos) * 100));
  }

  get porcentajeSaldo(): number {
    if (this.totalIngresos <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((this.saldo / this.totalIngresos) * 100)));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const movimiento: MovimientoFinanciero = {
      id: crypto.randomUUID(),
      fecha: value.fecha,
      concepto: String(value.concepto || '').trim(),
      tipo: value.tipo,
      valor: Number(value.valor),
      estado: value.estado,
      alcance: this.isConjuntoView ? 'conjunto' : 'torre',
      torre: this.isConjuntoView ? '' : String(value.torre || this.defaultTorreLabel()).trim()
    };

    this.movimientos = [movimiento, ...this.movimientos];
    this.persist();
    this.auditService.log('Finanzas', 'Crear movimiento', `${movimiento.concepto} por $${movimiento.valor.toFixed(2)}`);
    this.form.patchValue({
      concepto: '',
      valor: 0,
      estado: 'pagado',
      alcance: this.isConjuntoView ? 'conjunto' : 'torre',
      torre: this.defaultTorreLabel()
    });
  }

  remove(id: string): void {
    const removed = this.movimientos.find((item) => item.id === id);
    this.movimientos = this.movimientos.filter((item) => item.id !== id);
    this.persist();

    if (removed) {
      this.auditService.log('Finanzas', 'Eliminar movimiento', `${removed.concepto} por $${removed.valor.toFixed(2)}`);
    }
  }

  exportarExcel(): void {
    const headers = ['Fecha', 'Concepto', 'Tipo', 'Valor', 'Alcance', 'Estado'];
    const rows = this.movimientosVisibles.map((item) => [
      item.fecha,
      item.concepto,
      item.tipo === 'ingreso' ? 'Ganancia' : 'Gasto',
      item.valor.toFixed(2),
      item.alcance === 'conjunto' ? 'Conjunto' : item.torre,
      item.estado === 'pagado' ? 'Pagado' : 'Pendiente'
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${this.getReportFileName()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.auditService.log('Finanzas', 'Exportar Excel', `${this.movimientosVisibles.length} movimientos exportados`);
  }

  generarInforme(): void {
    const rows = this.movimientosVisibles.map((item) => `
      <tr>
        <td>${this.escapeHtml(item.fecha)}</td>
        <td>${this.escapeHtml(item.concepto)}</td>
        <td>${item.tipo === 'ingreso' ? 'Ganancia' : 'Gasto'}</td>
        <td>$${Number(item.valor || 0).toFixed(2)}</td>
        <td>${this.escapeHtml(item.alcance === 'conjunto' ? 'Conjunto' : item.torre)}</td>
        <td>${item.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</td>
      </tr>
    `).join('');
    const report = window.open('', '_blank', 'width=960,height=720');

    if (!report) {
      return;
    }

    report.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${this.escapeHtml(this.viewTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #243528; margin: 32px; }
            h1 { margin: 0 0 6px; color: #14532d; }
            p { margin: 0 0 18px; color: #53624f; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
            .card { border: 1px solid #d7e6d1; border-radius: 8px; padding: 12px; }
            .card span { display: block; color: #53624f; font-size: 12px; }
            .card strong { display: block; margin-top: 6px; font-size: 22px; color: #14532d; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border-bottom: 1px solid #d7e6d1; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #14532d; color: #fff; }
            .actions { margin: 18px 0; }
            button { background: #3f8f31; color: #fff; border: 0; border-radius: 6px; padding: 10px 14px; font-weight: 700; }
            @media print { .actions { display: none; } body { margin: 18px; } }
          </style>
        </head>
        <body>
          <h1>${this.escapeHtml(this.viewTitle)}</h1>
          <p>Informe generado el ${new Date().toLocaleDateString('es-EC')}.</p>
          <section class="summary">
            <div class="card"><span>Ganancias</span><strong>$${this.totalIngresos.toFixed(2)}</strong></div>
            <div class="card"><span>Gastos</span><strong>$${this.totalGastos.toFixed(2)}</strong></div>
            <div class="card"><span>Saldo</span><strong>$${this.saldo.toFixed(2)}</strong></div>
          </section>
          <div class="actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>
          <table>
            <thead>
              <tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Alcance</th><th>Estado</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="6">No hay movimientos registrados.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    report.document.close();
    this.auditService.log('Finanzas', 'Generar informe', `${this.movimientosVisibles.length} movimientos incluidos`);
  }

  private sumByType(tipo: MovimientoTipo): number {
    return this.movimientosVisibles
      .filter((item) => item.tipo === tipo)
      .reduce((total, item) => total + Number(item.valor || 0), 0);
  }

  private load(): void {
    this.movimientos = this.localStore.read<MovimientoFinanciero[]>(this.storageKey, []);
  }

  private persist(): void {
    this.localStore.write(this.storageKey, this.movimientos);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private torresPermitidas(): string[] {
    const ids = this.authService.getAuthorizedTorreIds();
    return ids.length > 0 ? ids.map((id) => `Torre ${id}`) : [this.defaultTorreLabel()];
  }

  private defaultTorreLabel(): string {
    const [torreId] = this.authService.getAuthorizedTorreIds();
    return torreId ? `Torre ${torreId}` : 'Torre asignada';
  }

  private loadPagosAprobados(): void {
    this.alicuotasService.getPagosPorTorre(this.isConjuntoView ? null : this.authService.getAuthorizedTorreIds()[0]).pipe(
      catchError(() => of([]))
    ).subscribe((pagos) => {
      this.pagosAprobados = pagos
        .filter((pago) => pago.estado === 'aprobado')
        .map((pago) => ({
          id: `alicuota-${pago.id}`,
          fecha: String(pago.fechaPago || '').slice(0, 10) || this.today(),
          concepto: `Alícuota ${pago.departamentoNumero || ''} - ${pago.mes}`,
          tipo: 'ingreso' as MovimientoTipo,
          valor: Number(pago.valor || 0),
          estado: 'pagado' as MovimientoEstado,
          alcance: 'torre',
          torre: `Torre ${pago.torreId || pago.torreNumero || ''}`.trim()
        }));
    });
  }

  private escapeCsvCell(value: string | number): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getReportFileName(): string {
    const scope = this.isConjuntoView ? 'conjunto' : 'torres';
    return `casales-finanzas-${scope}-${this.today()}`;
  }
}
