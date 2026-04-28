import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Multa, MultasService } from '../../services/multas.service';
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
  listaMultas: Multa[] = [];
  cargando = true;
  cargandoMultas = true;

  constructor(
    private route: ActivatedRoute,
    private personasService: PersonasService,
    private multasService: MultasService
  ) { }

  ngOnInit(): void {
    this.departamentoId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.departamentoCodigo = this.route.snapshot.queryParamMap.get('codigo') || '';

    this.personasService.personas$.subscribe(personas => {
      this.aplicarFiltro(personas);
    });

    this.multasService.multas$.subscribe(multas => {
      this.aplicarFiltroMultas(multas);
    });

    this.personasService.loadPersonas().subscribe({
      next: () => {
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });

    this.multasService.loadMultas().subscribe({
      next: () => {
        this.cargandoMultas = false;
      },
      error: () => {
        this.cargandoMultas = false;
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

  private aplicarFiltroMultas(multas: Multa[]) {
    if (!this.departamentoId) {
      this.listaMultas = [];
      return;
    }

    this.listaMultas = multas.filter((item) => item.departamentoId === this.departamentoId);
  }

  getNombreCompleto(persona: Persona): string {
    return `${persona.nombres} ${persona.apellidos}`.trim();
  }

  getPersonaMulta(multa: Multa): string {
    const nombre = `${multa.personaNombre ?? ''} ${multa.personaApellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }
}
