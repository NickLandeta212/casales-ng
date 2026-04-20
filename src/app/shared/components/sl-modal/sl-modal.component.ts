import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sl-modal',
  imports: [CommonModule],
  templateUrl: './sl-modal.component.html',
  styleUrl: './sl-modal.component.scss'
})
export class SlModalComponent {

  @Input() mostrar: boolean = false;          // control para mostrar/ocultar
  @Input() titulo: string = 'Modal';
  @Input() footerVisible: boolean = true;     // mostrar u ocultar footer
  @Input() body: any;                         // contenido dinámico en el body
  @Output() cerrar = new EventEmitter<void>(); // evento al cerrar
  @Output() accion = new EventEmitter<void>(); // evento del botón principal

  cerrarModal() {
    this.mostrar = false;
    this.cerrar.emit();
  }

  ejecutarAccion() {
    this.accion.emit();
  }
}
