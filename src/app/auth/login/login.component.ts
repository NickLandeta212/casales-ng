import { Component, OnInit } from '@angular/core';
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
      username: ['admin@conjunto.com', [Validators.required, Validators.email]],
      password: ['Admin123*', Validators.required]
    });

    this.loginForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.loginService.onLogin(this.loginForm.value).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.token && res?.user) {
          this.authService.setToken(res.token);

          localStorage.setItem('token', res.token);
          localStorage.setItem('role', res.user.role);
          localStorage.setItem('user_id', res.user.id.toString());
          localStorage.setItem('user_email', res.user.email);
          localStorage.setItem('user_display_name', res.user.nombre);
          localStorage.setItem('user', JSON.stringify(res.user));

          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Respuesta inválida del servidor';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error?.body ||
          'Error de login, verifica tus credenciales';
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}