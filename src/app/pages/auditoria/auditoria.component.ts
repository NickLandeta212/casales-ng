import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuditEntry, AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss'
})
export class AuditoriaComponent {
  entries: AuditEntry[] = [];

  constructor(private auditService: AuditService) {
    this.entries = this.auditService.getEntries();
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }
}
