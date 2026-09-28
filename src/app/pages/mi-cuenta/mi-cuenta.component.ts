import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { LoginService } from '../../auth/services/login.service';
import { EstadoCuenta, MesAlicuota, MiCuentaService, MultaCuenta, PagoMultasCuenta } from '../../services/mi-cuenta.service';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MAX_COMPROBANTE_BYTES = 4 * 1024 * 1024;

interface Comprobante {
  base64: string;
  nombre: string;
}

@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mi-cuenta.component.html',
  styleUrl: './mi-cuenta.component.scss'
})
export class MiCuentaComponent implements OnInit {
  private readonly miCuentaService = inject(MiCuentaService);
  private readonly loginService = inject(LoginService);

  readonly anioActual = new Date().getFullYear();
  anio = this.anioActual;
  cuenta: EstadoCuenta | null = null;
  cargando = false;
  errorMessage = '';
  successMessage = '';
  enviando = false;

  mesesSeleccionados = new Set<number>();
  multasSeleccionadas = new Set<number>();
  comprobanteAlicuotas: Comprobante | null = null;
  comprobanteMultas: Comprobante | null = null;

  // Las cuentas de departamento usan un correo tecnico (@casales.app); la factura necesita uno real.
  readonly emailControl = new FormControl('', [Validators.required, Validators.email]);

  ngOnInit(): void {
    this.cargar();
    this.loginService.me().subscribe({
      next: ({ user }) => {
        const email = String(user?.email || '');

        if (email && !email.endsWith('@casales.app')) {
          this.emailControl.setValue(email);
        }
      }
    });
  }

  get multasPendientes(): MultaCuenta[] {
    return (this.cuenta?.multas || []).filter((multa) => multa.estado !== 'pagada');
  }

  get totalMesesSeleccionados(): number {
    return (this.cuenta?.alicuotas || [])
      .filter((mes) => this.mesesSeleccionados.has(mes.mes))
      .reduce((total, mes) => total + Number(mes.valor), 0);
  }

  get totalMultasSeleccionadas(): number {
    return this.multasPendientes
      .filter((multa) => this.multasSeleccionadas.has(multa.id))
      .reduce((total, multa) => total + Number(multa.monto), 0);
  }

  cargar(): void {
    this.cargando = true;
    this.errorMessage = '';

    this.miCuentaService.estado(this.anio).subscribe({
      next: (cuenta) => {
        this.cuenta = cuenta;
        this.cargando = false;
        this.mesesSeleccionados.clear();
        this.multasSeleccionadas.clear();
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar tu estado de cuenta.';
      }
    });
  }

  cambiarAnio(delta: number): void {
    this.anio += delta;
    this.successMessage = '';
    this.cargar();
  }

  nombreMes(mes: number): string {
    return MESES[mes - 1] || `Mes ${mes}`;
  }

  estadoMes(mes: MesAlicuota): string {
    return { pendiente: 'Pendiente', en_revision: 'En revision', aprobado: 'Pagado', rechazado: 'Rechazado' }[mes.estado];
  }

  estadoPago(pago: PagoMultasCuenta): string {
    return { en_proceso: 'En revision', aprobado: 'Aprobado', rechazado: 'Rechazado' }[pago.estado];
  }

  puedePagarMes(mes: MesAlicuota): boolean {
    return mes.estado === 'pendiente' || mes.estado === 'rechazado';
  }

  toggleMes(mes: MesAlicuota): void {
    if (!this.puedePagarMes(mes)) {
      return;
    }

    this.toggle(this.mesesSeleccionados, mes.mes);
  }

  toggleMulta(multa: MultaCuenta): void {
    if (multa.estado !== 'pendiente') {
      return;
    }

    this.toggle(this.multasSeleccionadas, multa.id);
  }

  onComprobante(event: Event, tipo: 'alicuotas' | 'multas'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.setComprobante(tipo, null);

    if (!file) {
      return;
    }

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type) || file.size > MAX_COMPROBANTE_BYTES) {
      this.errorMessage = 'El comprobante debe ser una imagen PNG, JPG o WEBP de hasta 4MB.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.errorMessage = '';
      this.setComprobante(tipo, { base64: String(reader.result), nombre: file.name });
    };
    reader.readAsDataURL(file);
  }

  pagarAlicuotas(): void {
    if (!this.validarEnvio(this.mesesSeleccionados.size, this.comprobanteAlicuotas)) {
      return;
    }

    this.enviar(this.miCuentaService.pagarAlicuotas({
      anio: this.anio,
      meses: Array.from(this.mesesSeleccionados),
      comprobante_base64: this.comprobanteAlicuotas!.base64,
      comprobante_nombre: this.comprobanteAlicuotas!.nombre,
      email_destinatario: String(this.emailControl.value || '').trim()
    }), () => { this.comprobanteAlicuotas = null; });
  }

  pagarMultas(): void {
    if (!this.validarEnvio(this.multasSeleccionadas.size, this.comprobanteMultas)) {
      return;
    }

    this.enviar(this.miCuentaService.pagarMultas({
      multa_ids: Array.from(this.multasSeleccionadas),
      total: this.totalMultasSeleccionadas,
      comprobante_base64: this.comprobanteMultas!.base64,
      email_destinatario: String(this.emailControl.value || '').trim()
    }), () => { this.comprobanteMultas = null; });
  }

  descargarFactura(tipo: 'alicuotas' | 'multas', id: number | null): void {
    if (!id) {
      return;
    }

    this.miCuentaService.descargarFactura(tipo, id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `factura-${tipo}-${id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'No se pudo descargar la factura.';
      }
    });
  }

  private validarEnvio(cantidad: number, comprobante: Comprobante | null): boolean {
    this.successMessage = '';

    if (cantidad === 0) {
      this.errorMessage = 'Selecciona lo que vas a pagar.';
      return false;
    }

    if (!comprobante) {
      this.errorMessage = 'Sube la imagen del comprobante de la transferencia.';
      return false;
    }

    if (this.emailControl.invalid) {
      this.emailControl.markAsTouched();
      this.errorMessage = 'Ingresa un correo valido para recibir la factura.';
      return false;
    }

    return !this.enviando;
  }

  private enviar(peticion: Observable<{ message: string }>, alTerminar: () => void): void {
    this.enviando = true;
    this.errorMessage = '';

    peticion.subscribe({
      next: (res) => {
        this.enviando = false;
        alTerminar();
        this.cargar();
        this.successMessage = res?.message || 'Pago enviado.';
      },
      error: (error) => {
        this.enviando = false;
        this.errorMessage = error?.error?.message || 'No se pudo enviar el pago.';
      }
    });
  }

  private setComprobante(tipo: 'alicuotas' | 'multas', valor: Comprobante | null): void {
    if (tipo === 'alicuotas') {
      this.comprobanteAlicuotas = valor;
    } else {
      this.comprobanteMultas = valor;
    }
  }

  private toggle(set: Set<number>, value: number): void {
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
  }
}
