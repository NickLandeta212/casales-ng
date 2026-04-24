import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  constructor(private torreService: TorresService) { }

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
    this.torreSeleccionada = torre;
  }

  cerrarDetalles() {
    this.torreSeleccionada = null;
  }

}
