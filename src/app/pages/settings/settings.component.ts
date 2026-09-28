import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { LoginService } from '../../auth/services/login.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

      <form class="password-form" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
        <h2>Cambiar contrasena</h2>
        <p class="form-warning" *ngIf="mustChangePassword">
          Tu contrasena es temporal. Debes cambiarla para poder usar el sistema.
        </p>
        <label>
          Contrasena actual
          <input type="password" formControlName="currentPassword" autocomplete="current-password" />
        </label>
        <label>
          Nueva contrasena (min. 8 caracteres)
          <input type="password" formControlName="newPassword" autocomplete="new-password" />
        </label>
        <label>
          Confirmar nueva contrasena
          <input type="password" formControlName="confirmPassword" autocomplete="new-password" />
        </label>
        <p class="form-error" *ngIf="passwordForm.hasError('mismatch') && passwordForm.get('confirmPassword')?.dirty">
          Las contrasenas no coinciden.
        </p>
        <p class="form-error" *ngIf="passwordError">{{ passwordError }}</p>
        <p class="form-success" *ngIf="passwordMessage">{{ passwordMessage }}</p>
        <button type="submit" class="save-button" [disabled]="passwordForm.invalid || savingPassword">
          {{ savingPassword ? 'Guardando...' : 'Actualizar contrasena' }}
        </button>
      </form>

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

    .password-form {
      display: grid;
      gap: 12px;
      padding: 16px 0 22px;
      margin-bottom: 22px;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }

    .password-form h2 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }

    .password-form label {
      display: grid;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #555;
    }

    .password-form input {
      padding: 9px 10px;
      border: 1px solid #d0d5dd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-error {
      color: #b42318;
      font-size: 13px;
    }

    .form-warning {
      margin: 0;
      padding: 10px 12px;
      border-radius: 4px;
      background: #fff4e5;
      color: #8a4b00;
      font-size: 13px;
      font-weight: 600;
    }

    .form-success {
      color: #15622d;
      font-size: 13px;
    }

    .save-button {
      justify-self: start;
      padding: 10px 14px;
      border: 0;
      border-radius: 4px;
      background: #15622d;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    .save-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
  savingPassword = false;
  mustChangePassword = false;
  passwordMessage = '';
  passwordError = '';

  private readonly fb = inject(FormBuilder);

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  constructor(
    private authService: AuthService,
    private loginService: LoginService
  ) {
    this.userName = this.authService.getDisplayName();
    this.mustChangePassword = this.authService.mustChangePassword();
    this.role = this.authService.getUserRole();
    this.torreIds = this.authService.getAuthorizedTorreIds();
    this.torreLabel = this.torreIds.length > 0
      ? this.torreIds.map((id) => `Torre ${id}`).join(', ')
      : 'Sin torres asignadas';
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword) {
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.savingPassword = true;
    this.passwordMessage = '';
    this.passwordError = '';

    this.loginService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.savingPassword = false;

        if (res?.token) {
          this.authService.setToken(res.token);
        }

        this.authService.setMustChangePassword(false);
        this.mustChangePassword = false;
        this.passwordMessage = res?.message || 'Contrasena actualizada correctamente';
        this.passwordForm.reset();
      },
      error: (error) => {
        this.savingPassword = false;
        this.passwordError = error?.error?.message || 'No se pudo actualizar la contrasena.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
