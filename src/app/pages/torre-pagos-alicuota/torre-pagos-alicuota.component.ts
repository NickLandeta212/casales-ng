import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { AlicuotaPago, AlicuotasService } from '../../services/alicuotas.service';
import { TorresService } from '../../services/torres.service';
import { SecurityUrlService } from '../../services/security-url.service';
import { pedirMotivoRechazo } from '../../shared/utils/motivo-rechazo';

@Component({
  selector: 'app-torre-pagos-alicuota',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './torre-pagos-alicuota.component.html',
  styleUrl: './torre-pagos-alicuota.component.scss'
})
export class TorrePagosAlicuotaComponent implements OnInit {
  torreId: number | null = null;
  torreNumero = '';
  torres: any[] = [];
  torresAutorizadas: any[] = [];
  pagos: AlicuotaPago[] = [];
  pagosFiltrados: AlicuotaPago[] = [];
  torreFilterControl = new FormControl('');
  estadoFilterControl = new FormControl('en_revision');
  copiedTorreId: string | number | null = null;
  approvingPagoId: string | number | null = null;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private torresService: TorresService,
    private authService: AuthService,
    private alicuotasService: AlicuotasService,
    private securityUrlService: SecurityUrlService
  ) { }

  ngOnInit(): void {
    this.torreId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.torreNumero = this.route.snapshot.queryParamMap.get('numero') || (this.torreId ? this.torreId.toString() : '');
    this.cargarTorres();
    this.torreFilterControl.setValue(this.torreNumero || (this.torreId ? this.torreId.toString() : ''));
    this.torreFilterControl.valueChanges
      .pipe(startWith(this.torreFilterControl.value || ''))
      .subscribe(() => this.cargarPagos());
    this.estadoFilterControl.valueChanges.subscribe(() => this.aplicarFiltrosLocales());
  }

  cargarTorres() {
    this.torresService.list().subscribe({
      next: (res: any) => {
        this.torres = this.normalizeList(res);
        this.aplicarTorresAutorizadas();
        this.cargarPagos();
      },
      error: () => {
        this.torres = [];
        this.torresAutorizadas = [];
        this.pagos = [];
        this.pagosFiltrados = [];
      }
    });
  }

  cargarPagos() {
    const torreSeleccionada = this.torreFilterControl.value;
    const torre = this.torresAutorizadas.find((item) =>
      item.numero?.toString() === torreSeleccionada?.toString() ||
      item.id?.toString() === torreSeleccionada?.toString()
    );
    this.torreNumero = torre?.numero || this.route.snapshot.queryParamMap.get('numero') || '';
    this.errorMessage = '';

    this.alicuotasService.getPagosPorTorre(torre?.id || '').subscribe({
      next: (pagos) => {
        const torresPermitidas = new Set(this.torresAutorizadas.map((item) => String(item.id)));
        this.pagos = pagos.filter((pago) =>
          torresPermitidas.size === 0 || torresPermitidas.has(String(pago.torreId))
        );
        this.aplicarFiltrosLocales();
      },
      error: () => {
        this.pagos = [];
        this.pagosFiltrados = [];
        this.errorMessage = 'No se pudieron cargar los pagos de alicuotas por departamento.';
      }
    });
  }

  aprobarPago(pago: AlicuotaPago) {
    if (!pago || pago.estado !== 'en_revision' || this.approvingPagoId !== null) {
      return;
    }

    const confirmar = window.confirm(`Aprobar alicuota de ${pago.departamentoNumero} - ${pago.mes}?`);

    if (!confirmar) {
      return;
    }

    this.approvingPagoId = pago.id;
    this.errorMessage = '';

    this.alicuotasService.aprobarPago(pago.id).subscribe({
      next: () => this.cargarPagos(),
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo aprobar el pago seleccionado.';
        this.approvingPagoId = null;
      },
      complete: () => {
        this.approvingPagoId = null;
      }
    });
  }

  rechazarPago(pago: AlicuotaPago) {
    if (!pago || pago.estado !== 'en_revision' || this.approvingPagoId !== null) {
      return;
    }

    const motivo = pedirMotivoRechazo(`la alicuota de ${pago.departamentoNumero} - ${pago.mes}`);

    if (!motivo) {
      return;
    }

    this.approvingPagoId = pago.id;
    this.errorMessage = '';

    this.alicuotasService.rechazarPago(pago.id, motivo).subscribe({
      next: () => {
        this.approvingPagoId = null;
        this.cargarPagos();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo rechazar el pago seleccionado.';
        this.approvingPagoId = null;
      }
    });
  }

  getPaymentLink(torre: any): string {
    const id = torre?.id ?? torre?.numero;
    return this.securityUrlService.buildPublicLink(`/pago-alicuota/${id}`);
  }

  copyPaymentLink(torre: any): void {
    const link = this.getPaymentLink(torre);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        this.copiedTorreId = torre?.id ?? torre?.numero ?? null;
      });
    }
  }

  getTotalPorEstado(estado: string): number {
    return this.pagos.filter((pago) => pago.estado === estado).length;
  }

  getTotalPagos(): number {
    return this.pagos.length;
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      en_revision: 'En revision',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado'
    };

    return labels[estado] || estado;
  }

  getComprobanteUrl(pago: AlicuotaPago): string {
    const rawUrl = String(pago.comprobanteUrl || '').trim();

    return this.securityUrlService.resolveUploadUrl(rawUrl);
  }

  private aplicarTorresAutorizadas(): void {
    const authorizedIds = this.authService.getAuthorizedTorreIds();

    this.torresAutorizadas = this.authService.getUserRole() === 'admin_general' || authorizedIds.length === 0
      ? this.torres
      : this.torres.filter((torre) => authorizedIds.includes(Number(torre.id)));
  }

  private aplicarFiltrosLocales(): void {
    const estado = this.estadoFilterControl.value || 'todos';

    this.pagosFiltrados = this.pagos.filter((pago) => {
      if (estado === 'todos') {
        return true;
      }

      return pago.estado === estado;
    });
  }

  private normalizeList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  }

}
