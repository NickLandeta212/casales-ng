import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { LoginService } from '../services/login.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private readonly maxFailedAttempts = 5;
  private readonly lockoutMs = 15 * 60 * 1000;
  @ViewChild('usernameInput') usernameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;
  loginForm: FormGroup;
  errorMessage: string = '';
  showPassword: boolean = false;
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.loginForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loading) {
      return;
    }

    this.syncAutofilledCredentials();

    const remainingLockMs = this.getRemainingLockMs();

    if (remainingLockMs > 0) {
      this.errorMessage = `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(remainingLockMs / 60000)} minuto(s).`;
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authService.clearSession();
    this.loading = true;
    this.errorMessage = '';
    this.submitLogin(this.getCredentialsPayload());
  }

  private submitLogin(payload: { username: string; password: string }, hasRetried = false): void {
    this.loginService.onLogin(payload).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.token && res?.user) {
          this.clearFailedAttempts();
          this.authService.setSession(
            res.token,
            [String(res.user.role || '')],
            String(res.user.nombre || 'Usuario')
          );
          this.authService.setPermissions(res.user.page_permissions || [], res.user.torre_ids || []);

          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Respuesta inválida del servidor';
        }
      },
      error: (err: any) => {
        if (!hasRetried && this.shouldRetryLogin(err)) {
          setTimeout(() => this.submitLogin(payload, true), 450);
          return;
        }

        this.loading = false;
        if (this.isCredentialError(err)) {
          this.registerFailedAttempt();
        }
        this.errorMessage = this.getLoginErrorMessage(err);
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private getSafeErrorMessage(err: any): string {
    const message = err?.error?.message || err?.error?.body;
    return typeof message === 'string' ? message.replace(/<[^>]*>/g, '').trim() : '';
  }

  private syncAutofilledCredentials(): void {
    const username = this.usernameInput?.nativeElement.value.trim().toLowerCase() || '';
    const password = this.passwordInput?.nativeElement.value || '';

    this.loginForm.patchValue({ username, password }, { emitEvent: false });
  }

  private getCredentialsPayload(): { username: string; password: string } {
    return {
      username: String(this.loginForm.get('username')?.value || '').trim().toLowerCase(),
      password: String(this.loginForm.get('password')?.value || '')
    };
  }

  private shouldRetryLogin(err: any): boolean {
    return Number(err?.status) !== 429;
  }

  private isCredentialError(err: any): boolean {
    return [400, 401, 403].includes(Number(err?.status));
  }

  private getLoginErrorMessage(err: any): string {
    const safeMessage = this.getSafeErrorMessage(err);

    if (safeMessage) {
      return safeMessage;
    }

    if (err?.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que la API este encendida e intenta de nuevo.';
    }

    if (this.isCredentialError(err)) {
      return 'Correo o contraseña incorrectos.';
    }

    return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }

  private registerFailedAttempt(): void {
    const attempts = Number(localStorage.getItem('login_failed_attempts') || 0) + 1;
    localStorage.setItem('login_failed_attempts', attempts.toString());

    if (attempts >= this.maxFailedAttempts) {
      localStorage.setItem('login_locked_until', (Date.now() + this.lockoutMs).toString());
    }
  }

  private clearFailedAttempts(): void {
    localStorage.removeItem('login_failed_attempts');
    localStorage.removeItem('login_locked_until');
  }

  private getRemainingLockMs(): number {
    const lockedUntil = Number(localStorage.getItem('login_locked_until') || 0);

    if (!lockedUntil || lockedUntil <= Date.now()) {
      this.clearFailedAttempts();
      return 0;
    }

    return lockedUntil - Date.now();
  }
}
