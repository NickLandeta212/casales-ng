import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlicuotaDepartamento, AlicuotaPago, AlicuotasService } from '../../services/alicuotas.service';
import { TorresService } from '../../services/torres.service';

@Component({
  selector: 'app-pago-alicuota-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pago-alicuota-form.component.html',
  styleUrl: './pago-alicuota-form.component.scss'
})
export class PagoAlicuotaFormComponent implements OnInit {
  torre: any | null = null;
  torres: any[] = [];
  departamentos: AlicuotaDepartamento[] = [];
  pagos: AlicuotaPago[] = [];
  selectedPago: AlicuotaPago | null = null;
  comprobanteBase64 = '';
  comprobanteNombre = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  torreControl = new FormControl<string>('');
  departamentoControl = new FormControl<string>('');

  constructor(
    private route: ActivatedRoute,
    private alicuotasService: AlicuotasService,
    private torresService: TorresService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.torreControl.valueChanges.subscribe((value) => this.seleccionarTorre(value || ''));
    this.departamentoControl.valueChanges.subscribe(() => this.loadPagosDepartamento());
  }

  selectPago(pago: AlicuotaPago): void {
    if (pago.estado === 'aprobado') {
      return;
    }

    this.selectedPago = pago;
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

    const reader = new FileReader();
    reader.onload = () => {
      this.comprobanteBase64 = String(reader.result);
      this.comprobanteNombre = file.name;
      this.errorMessage = '';
    };
    reader.readAsDataURL(file);
  }

  enviarComprobante(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.selectedPago || !this.comprobanteBase64) {
      this.errorMessage = 'Selecciona un mes y sube la foto del comprobante.';
      return;
    }

    this.loading = true;
    this.alicuotasService.registrarComprobante(this.selectedPago, this.comprobanteBase64, this.comprobanteNombre).subscribe({
      next: () => {
        this.successMessage = 'Pago enviado correctamente. Ahora aparece en Pagos departamentos para revision del tesorero.';
        this.comprobanteBase64 = '';
        this.comprobanteNombre = '';
        this.selectedPago = null;
        this.loading = false;
        this.loadPagosDepartamento();
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
      aprobado: 'Aprobado'
    };

    return labels[estado] || estado;
  }

  private loadData(): void {
    this.loading = true;
    const torreId = Number(this.route.snapshot.paramMap.get('torreId'));

    this.torresService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        this.torres = Array.isArray(raw) ? raw : [];
        this.loading = false;

        if (torreId) {
          this.torreControl.setValue(String(torreId));
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las torres.';
      }
    });
  }

  private seleccionarTorre(value: string): void {
    const torre = this.torres.find((item) =>
      item.id?.toString() === value ||
      item.numero?.toString() === value
    );

    if (!torre) {
      this.torre = null;
      this.departamentos = [];
      this.departamentoControl.setValue('', { emitEvent: false });
      this.pagos = [];
      this.selectedPago = null;
      return;
    }

    this.torre = {
      id: Number(torre.id),
      numero: torre.numero
    };
    this.departamentoControl.setValue('', { emitEvent: false });
    this.pagos = [];
    this.selectedPago = null;
    this.comprobanteBase64 = '';
    this.comprobanteNombre = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.loadDepartamentosTorre();
  }

  private loadDepartamentosTorre(): void {
    if (!this.torre?.id) {
      return;
    }

    this.loading = true;
    this.alicuotasService.getDepartamentosPorTorre(this.torre.id).subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
        this.loading = false;
      },
      error: (error) => {
        this.departamentos = [];
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los departamentos de esta torre.';
      }
    });
  }

  private loadPagosDepartamento(): void {
    const departamento = this.departamentos.find((item) => String(item.id) === String(this.departamentoControl.value));
    this.selectedPago = null;

    if (!this.torre || !departamento) {
      this.pagos = [];
      return;
    }

    this.loading = true;
    this.alicuotasService.getPagosDepartamento(this.torre.id, departamento.id).subscribe({
      next: (pagos) => {
        this.pagos = pagos;
        this.loading = false;
      },
      error: (error) => {
        this.pagos = [];
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las alicuotas del departamento.';
      }
    });
  }
}
