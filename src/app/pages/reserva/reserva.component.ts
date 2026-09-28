import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap } from 'rxjs';
import { PublicDepartamento, PublicService, PublicTorre } from '../../services/public.service';
import { ReservasService } from '../../services/reservas.service';
import { PublicFormSecurityService } from '../../services/public-form-security.service';
import { CaptchaHandle, CaptchaService } from '../../services/captcha.service';

interface CalendarDay {
  label: number;
  value: string;
  muted: boolean;
  today: boolean;
  past: boolean;
  reserved: boolean;
}

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reserva.component.html',
  styleUrl: './reserva.component.scss'
})
export class ReservaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private publicService = inject(PublicService);
  private reservasService = inject(ReservasService);
  private publicFormSecurity = inject(PublicFormSecurityService);
  private captchaService = inject(CaptchaService);
  private readonly formStartedAt = Date.now();

  torres: PublicTorre[] = [];
  departamentos: PublicDepartamento[] = [];
  calendarDays: CalendarDay[] = [];
  currentMonth = new Date();
  selectedDate = '';
  reservedDates = new Set<string>();
  submitted = false;
  loadingData = false;
  submitting = false;
  website = '';
  successMessage = '';
  errorMessage = '';
  comprobanteBase64: string | null = null;
  comprobanteName = '';

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

  reservaForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellido: ['', [Validators.required, Validators.maxLength(80)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,30}$/)]],
    torre: ['', Validators.required],
    departamento: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadOptions();
    this.loadReservedDates();
    this.buildCalendar();

    this.reservaForm.get('torre')?.valueChanges.subscribe((torreId) => {
      this.reservaForm.get('departamento')?.setValue('');
      this.loadDepartamentos(torreId || '');
    });
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat('es-EC', {
      month: 'long',
      year: 'numeric'
    }).format(this.currentMonth);
  }

  get departamentosFiltrados(): PublicDepartamento[] {
    return this.departamentos;
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  selectDate(day: CalendarDay): void {
    if (day.past || day.reserved) {
      return;
    }

    if (day.muted) {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + (day.label < 15 ? 1 : -1), 1);
      this.buildCalendar();
    }

    this.selectedDate = day.value;
  }

  isSelected(day: CalendarDay): boolean {
    return this.selectedDate === day.value;
  }

  guardarReserva(): void {
    if (this.submitting) {
      return;
    }

    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';
    const securityError = this.publicFormSecurity.validateSubmission('reserva', this.formStartedAt, this.website);

    if (securityError) {
      this.errorMessage = securityError;
      return;
    }

    if (this.reservaForm.invalid || !this.selectedDate || this.reservedDates.has(this.selectedDate)) {
      this.reservaForm.markAllAsTouched();
      if (this.selectedDate && this.reservedDates.has(this.selectedDate)) {
        this.errorMessage = 'La fecha seleccionada ya tiene una reserva.';
      }
      return;
    }

    if (this.captchaPendiente()) {
      this.errorMessage = 'Completa la verificacion de seguridad.';
      return;
    }

    const raw = this.reservaForm.getRawValue();
    const observaciones = [
      `Solicitante: ${raw.nombre} ${raw.apellido}`,
      `Telefono: ${raw.telefono}`,
      `Torre: ${this.getTorreEtiqueta(raw.torre || '')}`,
      `Departamento: ${this.getDepartamentoEtiqueta(raw.departamento || '')}`
    ].join(' | ');

    this.submitting = true;
    this.publicFormSecurity.markSubmitted('reserva');
    this.reservasService.crear({
      departamento_id: Number(raw.departamento),
      fecha: this.selectedDate,
      captcha_token: this.captcha?.token() || undefined,
      observaciones
    }).pipe(
      switchMap((reserva) => {
        if (!this.comprobanteBase64) {
          return of(reserva);
        }

        return this.reservasService.subirComprobante(reserva.id, this.comprobanteBase64);
      })
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.captcha?.reset();
        this.successMessage = 'Reserva enviada correctamente. Queda pendiente de revision.';
        this.reservedDates.add(this.selectedDate);
        this.reservaForm.reset({ nombre: '', apellido: '', telefono: '', torre: '', departamento: '' });
        this.selectedDate = '';
        this.buildCalendar();
        this.comprobanteBase64 = null;
        this.comprobanteName = '';
        this.submitted = false;
      },
      error: (error) => {
        this.submitting = false;
        this.captcha?.reset();
        this.errorMessage = error?.error?.message || 'No se pudo registrar la reserva. Intenta nuevamente.';
      }
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
      this.errorMessage = 'La evidencia debe ser una imagen PNG, JPG o WEBP.';
      input.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      this.errorMessage = 'La evidencia no debe superar 4MB.';
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

  private getTorreEtiqueta(value: string): string {
    const torre = this.torres.find((item) => item.id.toString() === value.toString());
    return torre ? `Torre ${torre.numero}` : value;
  }

  private getDepartamentoEtiqueta(value: string): string {
    const departamento = this.departamentos.find((item) => item.id.toString() === value.toString());
    return departamento ? departamento.numero : value;
  }

  private loadOptions(): void {
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
      }
    });
  }

  private loadDepartamentos(torreId: string): void {
    this.departamentos = [];

    if (!torreId) {
      return;
    }

    this.publicService.getDepartamentos(torreId).subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los departamentos.';
      }
    });
  }

  // Incluye reservas en revision: la fecha queda bloqueada hasta que se aprueben o rechacen.
  private loadReservedDates(): void {
    this.publicService.getFechasOcupadas().subscribe({
      next: (fechas) => {
        this.reservedDates = new Set(Array.isArray(fechas) ? fechas : []);
        this.buildCalendar();
      },
      error: () => {
        this.reservedDates = new Set<string>();
      }
    });
  }

  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());
    const todayValue = this.formatDate(new Date());

    this.calendarDays = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      const value = this.formatDate(date);

      return {
        label: date.getDate(),
        value,
        muted: date.getMonth() !== month,
        today: value === todayValue,
        past: value < todayValue,
        reserved: this.reservedDates.has(value)
      };
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
