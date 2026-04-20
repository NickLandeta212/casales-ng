import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sl-alert',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './sl-alert.component.html',
  styleUrl: './sl-alert.component.scss'
})
export class SlAlertComponent {
  @Input() type: 'success' | 'error' | 'info' = 'info';
  @Input() message: string = '';
  @Input() show: boolean = false;

  get icon(): string {
    switch (this.type) {
      case 'success': return 'bi bi-check-circle-fill';
      case 'error': return 'bi bi-x-circle-fill';
      default: return 'bi bi-info-circle-fill';
    }
  }
}
