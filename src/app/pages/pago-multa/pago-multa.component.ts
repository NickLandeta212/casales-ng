import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartamentosService } from '../../services/departamentos.service';
import { Multa, MultasService } from '../../services/multas.service';
import { TorresService } from '../../services/torres.service';

interface PagoMultaTorre {
  id: number;
  numero: number;
}

interface PagoMultaDepartamento {
  id: number;
  numero: string;
  torre_id: number | null;
  torre_numero: number | null;
}

@Component({
  selector: 'app-pago-multa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pago-multa.component.html',
  styleUrl: './pago-multa.component.scss',
})
export class PagoMultaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private torresService = inject(TorresService);
  private departamentosService = inject(DepartamentosService);
  private multasService = inject(MultasService);

  torres: PagoMultaTorre[] = [];
  departamentos: PagoMultaDepartamento[] = [];
  multas: Multa[] = [];
  multasSeleccionadasIds = new Set<string>();
  comprobanteBase64: string | null = null;
  comprobanteName = '';
  submitted = false;
  loadingData = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  pagoForm = this.fb.group({
    torre: ['', Validators.required],
    departamento: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadOptions();
    this.loadMultas();

    this.pagoForm.get('torre')?.valueChanges.subscribe(() => {
      this.pagoForm.get('departamento')?.setValue('');
      this.limpiarSeleccionMultas();
      this.successMessage = '';
      this.errorMessage = '';
    });

    this.pagoForm.get('departamento')?.valueChanges.subscribe(() => {
      this.limpiarSeleccionMultas();
      this.successMessage = '';
      this.errorMessage = '';
    });
  }

  get departamentosFiltrados(): PagoMultaDepartamento[] {
    const torreValue = this.pagoForm.get('torre')?.value;

    if (!torreValue) {
      return [];
    }

    return this.departamentos.filter(
      (departamento) =>
        departamento.torre_id?.toString() === torreValue.toString() ||
        departamento.torre_numero?.toString() === torreValue.toString(),
    );
  }

  get multasDepartamento(): Multa[] {
    const departamentoValue = this.pagoForm.get('departamento')?.value;

    if (!departamentoValue) {
      return [];
    }

    return this.multas.filter(
      (multa) =>
        multa.departamentoId.toString() === departamentoValue.toString(),
    );
  }

  get totalCancelar(): number {
    return this.multasSeleccionadas.reduce(
      (total, multa) => total + Number(multa.monto || 0),
      0,
    );
  }

  get multasSeleccionadas(): Multa[] {
    return this.multasDepartamento.filter((multa) =>
      this.isMultaSeleccionada(multa),
    );
  }

  enviarPago(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (
      this.pagoForm.invalid ||
      !this.comprobanteBase64 ||
      this.multasSeleccionadas.length === 0
    ) {
      this.pagoForm.markAllAsTouched();

      if (
        this.multasDepartamento.length === 0 &&
        this.pagoForm.get('departamento')?.value
      ) {
        this.errorMessage =
          'No hay multas registradas para el departamento seleccionado.';
      }

      if (
        this.multasDepartamento.length > 0 &&
        this.multasSeleccionadas.length === 0
      ) {
        this.errorMessage = 'Selecciona al menos una multa para pagar.';
      }

      return;
    }

    const departamentoId = Number(this.pagoForm.get('departamento')?.value);
    const multaIds = this.multasSeleccionadas
      .map((multa) => multa.id)
      .filter((id): id is number | string => id !== undefined && id !== null);

    this.submitting = true;
    this.multasService
      .registrarPagoMultas({
        departamento_id: departamentoId,
        multa_ids: multaIds,
        total: this.totalCancelar,
        comprobante_base64: this.comprobanteBase64,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage =
            'Pago enviado correctamente. Queda pendiente de revision.';
          this.pagoForm.reset();
          this.limpiarSeleccionMultas();
          this.comprobanteBase64 = null;
          this.comprobanteName = '';
          this.submitted = false;
        },
        error: (error) => {
          this.submitting = false;
          this.errorMessage = this.getErrorMessage(error);
        },
      });
  }

  onComprobanteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.comprobanteBase64 = null;
    this.comprobanteName = '';

    if (!file) {
      return;
    }

    if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
      this.errorMessage = 'El comprobante debe ser una imagen PNG, JPG o WEBP.';
      input.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      this.errorMessage = 'El comprobante no debe superar 4MB.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.comprobanteBase64 = String(reader.result);
      this.comprobanteName = file.name;
      this.errorMessage = '';
    };
    reader.readAsDataURL(file);
  }

  getDepartamentoEtiqueta(): string {
    const value = this.pagoForm.get('departamento')?.value;
    const departamento = this.departamentos.find(
      (item) => item.id.toString() === value?.toString(),
    );

    return departamento ? departamento.numero : 'Sin seleccionar';
  }

  getPersonaEtiqueta(multa: Multa): string {
    const nombre =
      `${multa.personaNombre ?? ''} ${multa.personaApellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }

  isMultaSeleccionada(multa: Multa): boolean {
    return this.multasSeleccionadasIds.has(this.getMultaKey(multa));
  }

  toggleMulta(multa: Multa, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const key = this.getMultaKey(multa);

    if (!key) {
      return;
    }

    if (checked) {
      this.multasSeleccionadasIds.add(key);
    } else {
      this.multasSeleccionadasIds.delete(key);
    }

    this.successMessage = '';
    this.errorMessage = '';
  }

  private limpiarSeleccionMultas(): void {
    this.multasSeleccionadasIds.clear();
  }

  private getMultaKey(multa: Multa): string {
    return multa.id !== undefined && multa.id !== null
      ? multa.id.toString()
      : '';
  }

  private loadOptions(): void {
    this.loadingData = true;

    this.torresService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        const lista = Array.isArray(raw) ? raw : [];

        this.torres = lista
          .map((item: any) => ({
            id: Number(item.id),
            numero: Number(item.numero),
          }))
          .filter((item: PagoMultaTorre) => item.id > 0 && item.numero > 0)
          .sort((a: PagoMultaTorre, b: PagoMultaTorre) => a.numero - b.numero);

        this.loadingData = false;
      },
      error: () => {
        this.torres = [];
        this.loadingData = false;
      },
    });

    this.departamentosService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        const lista = Array.isArray(raw) ? raw : [];

        this.departamentos = lista
          .map((item: any) => ({
            id: Number(item.id),
            numero: String(item.numero ?? ''),
            torre_id:
              item.torre_id !== undefined && item.torre_id !== null
                ? Number(item.torre_id)
                : null,
            torre_numero:
              item.torre_numero !== undefined && item.torre_numero !== null
                ? Number(item.torre_numero)
                : null,
          }))
          .filter((item: PagoMultaDepartamento) => item.id > 0 && item.numero);
      },
      error: () => {
        this.departamentos = [];
      },
    });
  }

  private loadMultas(): void {
    this.multasService.loadMultas().subscribe({
      next: (multas) => {
        this.multas = multas;
      },
      error: () => {
        this.multas = [];
      },
    });
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      return `No se pudo enviar el pago (${error.status || 'sin codigo'}). Revisa que el frontend este corriendo con proxy hacia el backend.`;
    }

    if (error?.status === 0) {
      return 'No se pudo conectar con el backend. Verifica que la API este encendida en el puerto 3000.';
    }

    if (error?.status) {
      return `No se pudo enviar el pago. Error HTTP ${error.status}.`;
    }

    return 'No se pudo enviar el pago. Intenta nuevamente.';
  }
}
