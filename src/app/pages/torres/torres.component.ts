import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { TorresService } from '../../services/torres.service';

@Component({
  selector: 'app-torres',
  imports: [CommonModule],
  templateUrl: './torres.component.html',
  styleUrl: './torres.component.scss'
})
export class TorresComponent implements OnInit {

  lista: any[] = [];
  listaFiltrada: any[] = [];
  torreSeleccionada: any = null;

  constructor(
    private torreService: TorresService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.torreService.list().subscribe((res: any) => {
      const lista = Array.isArray(res) ? res : [];
      const role = this.authService.getUserRole();
      const authorizedTorreIds = this.authService.getAuthorizedTorreIds();
      const filtrada = role === 'admin_general' || role === 'admin_conjunto'
        ? lista
        : lista.filter((torre) => authorizedTorreIds.includes(Number(torre.id)));

      this.lista = filtrada;
      this.listaFiltrada = filtrada;
    });
  }

  seleccionarTorre(torre: any) {
    const torreId = torre?.id ?? torre?.numero;
    if (!torreId) {
      return;
    }

    this.router.navigate(['/dashboard/torres/pagos-alicuota'], {
      queryParams: {
        numero: torre?.numero ?? torreId
      }
    });
  }

  puedeVerLinkPago(): boolean {
    return this.authService.getUserRole() === 'tesorero';
  }

  getLinkPagoTorre(torre: any): string {
    const torreId = torre?.id ?? torre?.numero;
    return torreId ? `/pago-alicuota-torre/${torreId}` : '/pago-alicuota-torre';
  }

  cerrarDetalles() {
    this.torreSeleccionada = null;
  }

}
