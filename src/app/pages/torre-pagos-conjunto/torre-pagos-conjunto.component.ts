import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { AlicuotaTorrePago, AlicuotasService } from '../../services/alicuotas.service';
import { TorresService } from '../../services/torres.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { pedirMotivoRechazo } from '../../shared/utils/motivo-rechazo';

@Component({
  selector: 'app-torre-pagos-conjunto',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './torre-pagos-conjunto.component.html',
  styleUrl: '../torre-pagos-alicuota/torre-pagos-alicuota.component.scss'
})
export class TorrePagosConjuntoComponent implements OnInit {
  torres: any[] = [];
  pagosFiltrados: AlicuotaTorrePago[] = [];
  torreFilterControl = new FormControl('');
  approvingPagoId: string | number | null = null;

  constructor(
    private route: ActivatedRoute,
    private torresService: TorresService,
    private alicuotasService: AlicuotasService,
    private comprobantesService: ComprobantesService
  ) {}

  ngOnInit(): void {
    this.torreFilterControl.setValue(this.route.snapshot.queryParamMap.get('numero') || '');
    this.cargarTorres();
    this.torreFilterControl.valueChanges
      .pipe(startWith(this.torreFilterControl.value || ''))
      .subscribe(() => this.filtrarPagos());
  }

  cargarTorres(): void {
    this.torresService.list().subscribe({
      next: (res: any) => {
        this.torres = Array.isArray(res) ? res : res?.data || [];
        this.filtrarPagos();
      },
      error: () => {
        this.torres = [];
      }
    });
  }

  filtrarPagos(): void {
    const torreSeleccionada = this.torres.find((torre) =>
      torre.numero?.toString() === this.torreFilterControl.value?.toString() ||
      torre.id?.toString() === this.torreFilterControl.value?.toString()
    );

    this.alicuotasService.getPagosTorres(torreSeleccionada?.id || '').subscribe({
      next: (pagos) => {
        this.pagosFiltrados = pagos;
      },
      error: () => {
        this.pagosFiltrados = [];
      }
    });
  }

  aprobarPago(pago: AlicuotaTorrePago): void {
    if (!pago || pago.estado !== 'en_revision' || this.approvingPagoId !== null) {
      return;
    }

    const confirmar = window.confirm(`Aprobar alicuota de Torre ${pago.torreNumero} - ${pago.mes}?`);

    if (!confirmar) {
      return;
    }

    this.approvingPagoId = pago.id;

    this.alicuotasService.aprobarPagoTorre(pago.id).subscribe({
      next: () => this.filtrarPagos(),
      error: () => {
        this.approvingPagoId = null;
      },
      complete: () => {
        this.approvingPagoId = null;
      }
    });
  }

  rechazarPago(pago: AlicuotaTorrePago): void {
    if (!pago || pago.estado !== 'en_revision' || this.approvingPagoId !== null) {
      return;
    }

    const motivo = pedirMotivoRechazo(`la alicuota de Torre ${pago.torreNumero} - ${pago.mes}`);

    if (!motivo) {
      return;
    }

    this.approvingPagoId = pago.id;

    this.alicuotasService.rechazarPagoTorre(pago.id, motivo).subscribe({
      next: () => {
        this.approvingPagoId = null;
        this.filtrarPagos();
      },
      error: (error) => {
        this.approvingPagoId = null;
        window.alert(error?.error?.message || 'No se pudo rechazar el pago.');
      }
    });
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

  verComprobante(event: Event, pago: AlicuotaTorrePago): void {
    this.comprobantesService.abrir(event, pago.comprobanteUrl);
  }

}
