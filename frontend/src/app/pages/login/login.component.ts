import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  credentials = {
    email: '',
    password: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  showSocialMessage(provider: string) {
    this.infoMessage = `Login con ${provider} no disponible en esta demo`;
    setTimeout(() => this.infoMessage = '', 3000);
  }

  showForgotPasswordMessage() {
    this.infoMessage = 'Funcionalidad de recuperación de contraseña no disponible en demo';
    setTimeout(() => this.infoMessage = '', 3000);
  }

  onSubmit() {
    // Validaciones básicas
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Por favor completá todos los campos';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    if (!this.isValidEmail(this.credentials.email)) {
      this.errorMessage = 'Email inválido';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>(`${environment.apiUrl}/auth/login`, this.credentials)
      .subscribe({
        next: (response) => {
          if (response.success) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            this.successMessage = '¡Login exitoso! Redirigiendo...';
            setTimeout(() => {
              this.router.navigate(['/marketplace']);
            }, 1500);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error login:', err);
          this.errorMessage = err.error?.message || 'Error al iniciar sesión';
          setTimeout(() => this.errorMessage = '', 3000);
          this.loading = false;
        }
      });
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
