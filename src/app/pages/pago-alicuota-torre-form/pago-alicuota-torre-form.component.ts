import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlicuotaTorrePago, AlicuotasService } from '../../services/alicuotas.service';
import { TorresService } from '../../services/torres.service';

// Pago que una torre hace al conjunto: el tesorero (o la administracion) escoge el mes,
// sube el comprobante y queda en revision para la administracion.
// Esta dentro del panel, asi que usa la sesion abierta: no pide iniciar sesion otra vez.

@Component({
  selector: 'app-pago-alicuota-torre-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pago-alicuota-torre-form.component.html',
  styleUrl: './pago-alicuota-torre-form.component.scss'
})
export class PagoAlicuotaTorreFormComponent implements OnInit {
  private readonly maxComprobanteSize = 4 * 1024 * 1024;
  torreId = 0;
  torreNumero = '';
  torres: any[] = [];
  pagos: AlicuotaTorrePago[] = [];
  selectedPago: AlicuotaTorrePago | null = null;
  torreControl = new FormControl<string>('');
  valorControl = new FormControl<number | null>(null, [Validators.required, Validators.min(0.01), Validators.max(100000)]);
  comprobanteBase64 = '';
  comprobanteNombre = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private alicuotasService: AlicuotasService,
    private torresService: TorresService
  ) {}

  ngOnInit(): void {
    this.torreId = Number(this.route.snapshot.paramMap.get('torreId')) || 0;
    this.cargarTorres();
    this.torreControl.valueChanges.subscribe((value) => this.seleccionarTorre(value || ''));
  }

  selectPago(pago: AlicuotaTorrePago): void {
    if (pago.estado === 'aprobado' || pago.estado === 'en_revision') {
      return;
    }

    this.selectedPago = pago;
    this.valorControl.setValue(pago.valor || null);
    this.successMessage = '';
    this.errorMessage = '';
  }

  onComprobanteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.comprobanteBase64 = '';
    this.comprobanteNombre = '';

    if (!file) {
      return;
    }

    if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
      this.errorMessage = 'El comprobante debe ser una imagen PNG, JPG o WEBP.';
      input.value = '';
      return;
    }

    if (file.size > this.maxComprobanteSize) {
      this.errorMessage = 'El comprobante no debe superar 4MB.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.comprobanteBase64 = String(reader.result);
      this.comprobanteNombre = file.name;
      this.errorMessage = '';
    };
    reader.readAsDataURL(file);
  }

  enviarComprobante(): void {
    if (this.loading) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    const valor = Number(this.valorControl.value);

    if (!this.selectedPago || !this.comprobanteBase64 || this.valorControl.invalid || !Number.isFinite(valor)) {
      this.valorControl.markAsTouched();
      this.errorMessage = 'Selecciona un mes, ingresa el valor y sube la foto del comprobante.';
      return;
    }

    this.loading = true;
    this.alicuotasService.registrarComprobanteTorre(this.selectedPago, this.comprobanteBase64, this.comprobanteNombre, valor).subscribe({
      next: () => {
        this.successMessage = 'Pago enviado correctamente. Ahora aparece en Aprobar pagos para que el administrador del conjunto lo revise.';
        this.comprobanteBase64 = '';
        this.comprobanteNombre = '';
        this.selectedPago = null;
        this.valorControl.setValue(null);
        this.loading = false;
        this.loadMeses();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo enviar el comprobante.';
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

  private loadMeses(): void {
    if (!this.torreId) {
      this.pagos = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.alicuotasService.getMesesTorre(this.torreId).subscribe({
      next: (pagos) => {
        this.pagos = pagos;
        this.torreNumero = pagos[0]?.torreNumero || String(this.torreId);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las alicuotas de la torre.';
      }
    });
  }

  // El servidor ya devuelve solo las torres que el usuario puede ver (el tesorero, las suyas).
  // Si el enlace no trae torre, se preselecciona la primera.
  private cargarTorres(): void {
    this.loading = true;

    this.torresService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        this.torres = Array.isArray(raw) ? raw : [];
        this.loading = false;

        const torreInicial = this.torreId || Number(this.torres[0]?.id) || 0;

        if (torreInicial) {
          this.torreControl.setValue(String(torreInicial));
        } else {
          this.errorMessage = 'No tienes torres asignadas para registrar pagos.';
        }
      },
      error: () => {
        this.torres = [];
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar las torres.';
      }
    });
  }

  private seleccionarTorre(value: string): void {
    const torre = this.torres.find((item) =>
      item.id?.toString() === value ||
      item.numero?.toString() === value
    );

    this.torreId = Number(torre?.id || value || 0);
    this.torreNumero = torre?.numero ? String(torre.numero) : '';
    this.selectedPago = null;
    this.valorControl.setValue(null);
    this.comprobanteBase64 = '';
    this.comprobanteNombre = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.loadMeses();
  }
}
