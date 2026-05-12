import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.torreService.list().subscribe((res: any) => {
      this.lista = res;
      this.listaFiltrada = res;
      console.log(res)
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

  cerrarDetalles() {
    this.torreSeleccionada = null;
  }

}
