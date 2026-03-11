import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  tipo: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})

export class RegisterComponent {
  private readonly apiUrl = 'http://localhost:3000/api/auth/register';

  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  form: RegisterPayload & { confirmPassword: string } = {
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    tipo: 'Recicladora'
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  togglePassword(){
    this.showPassword = !this.showPassword
  }

  toggleConfirmPassword(){
    this.showConfirmPassword = !this.showConfirmPassword
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.nombre || !this.form.email || !this.form.password || !this.form.confirmPassword || !this.form.tipo) {
      this.errorMessage = 'Completa todos los campos obligatorios';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.form.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    const payload: RegisterPayload = {
      nombre: this.form.nombre.trim(),
      email: this.form.email.trim().toLowerCase(),
      password: this.form.password,
      tipo: this.form.tipo
    };

    this.isSubmitting = true;

    this.http.post<AuthResponse>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'Registro exitoso';
        void this.router.navigate(['/marketplace']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error?.error?.message || 'No se pudo completar el registro';
      }
    });
  }
}

