import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MultasService } from '../../services/multas.service';
import { PublicDepartamento, PublicMultaPendiente, PublicService, PublicTorre } from '../../services/public.service';
import { PublicFormSecurityService } from '../../services/public-form-security.service';
import { CaptchaHandle, CaptchaService } from '../../services/captcha.service';

@Component({
  selector: 'app-pago-multa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pago-multa.component.html',
  styleUrl: './pago-multa.component.scss',
})
export class PagoMultaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private publicService = inject(PublicService);
  private multasService = inject(MultasService);
  private publicFormSecurity = inject(PublicFormSecurityService);
  private captchaService = inject(CaptchaService);
  private readonly formStartedAt = Date.now();

  torres: PublicTorre[] = [];
  departamentos: PublicDepartamento[] = [];
  multas: PublicMultaPendiente[] = [];
  multasSeleccionadasIds = new Set<string>();
  comprobanteBase64: string | null = null;
  comprobanteName = '';
  submitted = false;
  loadingData = false;
  submitting = false;
  website = '';
  successMessage = '';
  errorMessage = '';

  captcha: CaptchaHandle | null = null;
  private captchaRendered = false;

  // El contenedor del captcha puede aparecer despues (ngIf); se dibuja una sola vez.
  @ViewChild('captchaSlot') set captchaSlot(ref: ElementRef<HTMLElement> | undefined) {
    if (!ref || this.captchaRendered) {
      return;
    }

    this.captchaRendered = true;
    this.captchaService.render(ref.nativeElement)
      .then((handle) => { this.captcha = handle; })
      .catch(() => { this.captcha = null; });
  }

  private captchaPendiente(): boolean {
    return Boolean(this.captcha?.enabled && !this.captcha.token());
  }

  pagoForm = this.fb.group({
    torre: ['', Validators.required],
    departamento: ['', Validators.required],
    email_destinatario: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.loadTorres();

    this.pagoForm.get('torre')?.valueChanges.subscribe((torreId) => {
      this.pagoForm.get('departamento')?.setValue('');
      this.loadDepartamentos(torreId || '');
      this.successMessage = '';
      this.errorMessage = '';
    });

    this.pagoForm.get('departamento')?.valueChanges.subscribe((departamentoId) => {
      this.loadMultas(departamentoId || '');
      this.successMessage = '';
      this.errorMessage = '';
    });
  }

  get departamentosFiltrados(): PublicDepartamento[] {
    return this.departamentos;
  }

  get multasDepartamento(): PublicMultaPendiente[] {
    return this.multas;
  }

  get totalCancelar(): number {
    return this.multasSeleccionadas.reduce(
      (total, multa) => total + Number(multa.monto || 0),
      0,
    );
  }

  get multasSeleccionadas(): PublicMultaPendiente[] {
    return this.multasDepartamento.filter((multa) =>
      this.isMultaSeleccionada(multa),
    );
  }

  enviarPago(): void {
    if (this.submitting) {
      return;
    }

    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';
    const securityError = this.publicFormSecurity.validateSubmission('pago-multa', this.formStartedAt, this.website);

    if (securityError) {
      this.errorMessage = securityError;
      return;
    }

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

    if (this.captchaPendiente()) {
      this.errorMessage = 'Completa la verificacion de seguridad.';
      return;
    }

    const departamentoId = Number(this.pagoForm.get('departamento')?.value);
    const multaIds = this.multasSeleccionadas.map((multa) => multa.id);

    this.submitting = true;
    this.publicFormSecurity.markSubmitted('pago-multa');
    this.multasService
      .registrarPagoMultas({
        departamento_id: departamentoId,
        multa_ids: multaIds,
        total: this.totalCancelar,
        comprobante_base64: this.comprobanteBase64,
        email_destinatario: String(this.pagoForm.get('email_destinatario')?.value || '').trim(),
        captcha_token: this.captcha?.token() || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.captcha?.reset();
          this.successMessage =
            'Pago enviado correctamente. Queda pendiente de revision.';
          this.pagoForm.reset({ torre: '', departamento: '', email_destinatario: '' });
          this.multas = [];
          this.limpiarSeleccionMultas();
          this.comprobanteBase64 = null;
          this.comprobanteName = '';
          this.submitted = false;
        },
        error: (error) => {
          this.submitting = false;
          this.captcha?.reset();
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

  getMultaDetalle(multa: PublicMultaPendiente): string {
    const fecha = multa.fecha ? String(multa.fecha).slice(0, 10) : '';
    return [fecha, multa.descripcion].filter(Boolean).join(' - ');
  }

  isMultaSeleccionada(multa: PublicMultaPendiente): boolean {
    return this.multasSeleccionadasIds.has(this.getMultaKey(multa));
  }

  toggleMulta(multa: PublicMultaPendiente, event: Event): void {
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

  private getMultaKey(multa: PublicMultaPendiente): string {
    return multa.id !== undefined && multa.id !== null
      ? multa.id.toString()
      : '';
  }

  private loadTorres(): void {
    this.loadingData = true;

    this.publicService.getTorres().subscribe({
      next: (torres) => {
        this.torres = [...torres].sort((a, b) => a.numero - b.numero);
        this.loadingData = false;
      },
      error: () => {
        this.torres = [];
        this.loadingData = false;
        this.errorMessage = 'No se pudieron cargar las torres. Intenta nuevamente.';
      },
    });
  }

  private loadDepartamentos(torreId: string): void {
    this.departamentos = [];
    this.multas = [];
    this.limpiarSeleccionMultas();

    if (!torreId) {
      return;
    }

    this.publicService.getDepartamentos(torreId).subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los departamentos.';
      },
    });
  }

  private loadMultas(departamentoId: string): void {
    this.multas = [];
    this.limpiarSeleccionMultas();

    if (!departamentoId) {
      return;
    }

    this.publicService.getMultasPendientes(departamentoId).subscribe({
      next: (multas) => {
        this.multas = multas;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las multas del departamento.';
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
