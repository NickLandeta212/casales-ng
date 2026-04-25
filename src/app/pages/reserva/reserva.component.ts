import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap } from 'rxjs';
import { DepartamentosService } from '../../services/departamentos.service';
import { ReservasService } from '../../services/reservas.service';
import { TorresService } from '../../services/torres.service';

interface ReservaTorre {
  id: number;
  numero: number;
}

interface ReservaDepartamento {
  id: number;
  numero: string;
  torre_id: number | null;
  torre_numero: number | null;
}

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
  private torresService = inject(TorresService);
  private departamentosService = inject(DepartamentosService);
  private reservasService = inject(ReservasService);

  torres: ReservaTorre[] = [];
  departamentos: ReservaDepartamento[] = [];
  calendarDays: CalendarDay[] = [];
  currentMonth = new Date();
  selectedDate = '';
  reservedDates = new Set<string>();
  submitted = false;
  loadingData = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';
  comprobanteBase64: string | null = null;
  comprobanteName = '';

  reservaForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellido: ['', [Validators.required, Validators.maxLength(80)]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    torre: ['', Validators.required],
    departamento: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadOptions();
    this.loadReservedDates();
    this.buildCalendar();

    this.reservaForm.get('torre')?.valueChanges.subscribe(() => {
      this.reservaForm.get('departamento')?.setValue('');
    });
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat('es-EC', {
      month: 'long',
      year: 'numeric'
    }).format(this.currentMonth);
  }

  get departamentosFiltrados(): ReservaDepartamento[] {
    const torreValue = this.reservaForm.get('torre')?.value;

    if (!torreValue) {
      return [];
    }

    return this.departamentos.filter((departamento) =>
      departamento.torre_id?.toString() === torreValue.toString() ||
      departamento.torre_numero?.toString() === torreValue.toString()
    );
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
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.reservaForm.invalid || !this.selectedDate || this.reservedDates.has(this.selectedDate)) {
      this.reservaForm.markAllAsTouched();
      if (this.selectedDate && this.reservedDates.has(this.selectedDate)) {
        this.errorMessage = 'La fecha seleccionada ya tiene una reserva aprobada.';
      }
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
    this.reservasService.crear({
      departamento_id: Number(raw.departamento),
      fecha: this.selectedDate,
      estado: 'en_proceso',
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
        this.successMessage = 'Reserva enviada correctamente. Queda pendiente de revision.';
        this.reservaForm.reset();
        this.selectedDate = '';
        this.comprobanteBase64 = null;
        this.comprobanteName = '';
        this.submitted = false;
      },
      error: (error) => {
        this.submitting = false;
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

    this.torresService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        const lista = Array.isArray(raw) ? raw : [];

        this.torres = lista
          .map((item: any) => ({
            id: Number(item.id),
            numero: Number(item.numero)
          }))
          .filter((item: ReservaTorre) => item.id > 0 && item.numero > 0)
          .sort((a: ReservaTorre, b: ReservaTorre) => a.numero - b.numero);

        this.loadingData = false;
      },
      error: () => {
        this.torres = [];
        this.loadingData = false;
      }
    });

    this.departamentosService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        const lista = Array.isArray(raw) ? raw : [];

        this.departamentos = lista
          .map((item: any) => ({
            id: Number(item.id),
            numero: String(item.numero ?? ''),
            torre_id: item.torre_id !== undefined && item.torre_id !== null ? Number(item.torre_id) : null,
            torre_numero: item.torre_numero !== undefined && item.torre_numero !== null ? Number(item.torre_numero) : null
          }))
          .filter((item: ReservaDepartamento) => item.id > 0 && item.numero);
      },
      error: () => {
        this.departamentos = [];
      }
    });
  }

  private loadReservedDates(): void {
    this.reservasService.listar().subscribe({
      next: (reservas) => {
        this.reservedDates = new Set(
          (Array.isArray(reservas) ? reservas : [])
            .filter((reserva) => reserva.estado === 'reservado')
            .map((reserva) => String(reserva.fecha || '').slice(0, 10))
            .filter(Boolean)
        );
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
