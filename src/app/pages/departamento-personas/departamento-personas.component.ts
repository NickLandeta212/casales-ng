import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Persona, PersonasService } from '../../services/personas.service';

@Component({
  selector: 'app-departamento-personas',
  imports: [CommonModule, RouterLink],
  templateUrl: './departamento-personas.component.html',
  styleUrl: './departamento-personas.component.scss'
})
export class DepartamentoPersonasComponent implements OnInit {
  departamentoId: number | null = null;
  departamentoCodigo = '';
  lista: Persona[] = [];
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private personasService: PersonasService
  ) { }

  ngOnInit(): void {
    this.departamentoId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.departamentoCodigo = this.route.snapshot.queryParamMap.get('codigo') || '';

    this.personasService.personas$.subscribe(personas => {
      this.aplicarFiltro(personas);
    });

    this.personasService.loadPersonas().subscribe({
      next: () => {
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  private aplicarFiltro(personas: Persona[]) {
    if (!this.departamentoId) {
      this.lista = [];
      return;
    }

    this.lista = personas.filter((item) => item.departamentoId === this.departamentoId);
  }

  getNombreCompleto(persona: Persona): string {
    return `${persona.nombres} ${persona.apellidos}`.trim();
  }
}
