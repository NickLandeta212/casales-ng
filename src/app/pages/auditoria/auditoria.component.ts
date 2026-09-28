import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuditEntry, AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss'
})
export class AuditoriaComponent implements OnInit {
  entries: AuditEntry[] = [];
  modulos: string[] = [];
  moduloFiltro = '';
  cargando = false;
  errorMessage = '';

  constructor(private auditService: AuditService) {}

  ngOnInit(): void {
    this.cargar();
  }

  get entriesFiltradas(): AuditEntry[] {
    return this.moduloFiltro
      ? this.entries.filter((entry) => entry.modulo === this.moduloFiltro)
      : this.entries;
  }

  cargar(): void {
    this.cargando = true;
    this.errorMessage = '';

    this.auditService.getEntries({ limit: 500 }).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.modulos = Array.from(new Set(entries.map((entry) => entry.modulo))).sort();
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar la auditoria.';
      }
    });
  }

  filtrar(event: Event): void {
    this.moduloFiltro = (event.target as HTMLSelectElement).value;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }
}
