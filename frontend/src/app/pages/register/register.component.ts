import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  tipo: string;
  telefono?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly apiUrl = `${environment.apiUrl}/auth/register`;

  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  form = {
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    tipo: '',
    telefono: '',
    aceptaTerminos: false
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  showLoginMessage() {
    this.infoMessage = 'Ya tenés una cuenta? Usá el login desde la página principal';
    setTimeout(() => this.infoMessage = '', 4000);
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onSubmit(): void {
    // Limpiar mensajes
    this.errorMessage = '';
    this.successMessage = '';

    // Validaciones
    if (!this.form.nombre?.trim()) {
      this.errorMessage = 'El nombre es obligatorio';
      return;
    }

    if (!this.form.email?.trim()) {
      this.errorMessage = 'El email es obligatorio';
      return;
    }

    if (!this.isValidEmail(this.form.email)) {
      this.errorMessage = 'El email no es válido';
      return;
    }

    if (!this.form.password) {
      this.errorMessage = 'La contraseña es obligatoria';
      return;
    }

    if (this.form.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (!this.form.tipo) {
      this.errorMessage = 'Seleccioná un tipo de usuario';
      return;
    }

    if (!this.form.aceptaTerminos) {
      this.errorMessage = 'Debés aceptar los términos y condiciones';
      return;
    }

    const payload: RegisterPayload = {
      nombre: this.form.nombre.trim(),
      email: this.form.email.trim().toLowerCase(),
      password: this.form.password,
      tipo: this.form.tipo
    };

    // Solo incluir teléfono si tiene valor
    if (this.form.telefono?.trim()) {
      payload.telefono = this.form.telefono.trim();
    }

    this.isSubmitting = true;

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = '¡Registro exitoso! Redirigiendo...';
          setTimeout(() => {
            this.router.navigate(['/marketplace']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Error en el registro';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'No se pudo completar el registro';
        console.error('Error registro:', error);
      }
    });
  }
}

