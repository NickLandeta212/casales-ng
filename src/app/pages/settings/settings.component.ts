import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="settings-page">
      <header>
        <span>Mi Cuenta</span>
        <h1>Configuracion</h1>
      </header>

      <div class="settings-grid">
        <div class="settings-row">
          <label>Nombre</label>
          <p>{{ userName }}</p>
        </div>
        <div class="settings-row">
          <label>Rol</label>
          <p>{{ role }}</p>
        </div>
        <div class="settings-row">
          <label>Torres autorizadas</label>
          <p>{{ torreLabel }}</p>
        </div>
      </div>

      <button type="button" class="logout-button" (click)="logout()">Cerrar sesion</button>
    </section>
  `,
  styles: [`
    .settings-page {
      margin: 30px;
      padding: 24px;
      max-width: 640px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    header span {
      display: block;
      color: #15622d;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    h1 {
      margin: 6px 0 20px;
      font-size: 24px;
      color: #333;
    }

    .settings-grid {
      display: grid;
      gap: 12px;
      margin-bottom: 22px;
    }

    .settings-row {
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 6px;
      background: #fafafa;
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
    }

    p {
      margin: 0;
      color: #333;
    }

    .logout-button {
      padding: 10px 14px;
      border: 0;
      border-radius: 4px;
      background: #b42318;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class SettingsComponent {
  userName = 'Usuario';
  role = '';
  torreIds: number[] = [];
  torreLabel = 'Sin torres asignadas';

  constructor(private authService: AuthService) {
    this.userName = localStorage.getItem('user_display_name') || 'Usuario';
    this.role = this.authService.getUserRole();
    this.torreIds = this.authService.getAuthorizedTorreIds();
    this.torreLabel = this.torreIds.length > 0
      ? this.torreIds.map((id) => `Torre ${id}`).join(', ')
      : 'Sin torres asignadas';
  }

  logout(): void {
    this.authService.logout();
  }
}
