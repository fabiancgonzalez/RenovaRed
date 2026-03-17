import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';



interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  tipo: string;
  telefono?: string;
  avatar_url?: string;
  ubicacion_texto?: string;
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private readonly profileUrl = 'http://localhost:3000/api/profile';

  profile: UserProfile | null = null;
  isLoading = false;
  isSavingProfile = false;
  isChangingPassword = false;

  errorMessage = '';
  successMessage = '';
  passwordMessage = '';
  passwordError = '';

  isEditing = false;
  showPasswordForm = false;

  token = '';
  tokenInput = '';

  editForm = {
    nombre: '',
    telefono: '',
    avatar_url: '',
    ubicacion_texto: ''
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.getStoredToken();
    this.tokenInput = this.token;
    if (this.token) {
      this.loadProfile();
    }
  }

  private getStoredToken(): string {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken') ||
      ''
    );
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });
  }

  saveTokenAndLoad(): void {
    const cleaned = this.tokenInput.trim();
    this.errorMessage = '';
    this.successMessage = '';

    if (!cleaned) {
      this.errorMessage = 'Ingresá un token JWT para cargar el perfil';
      return;
    }

    this.token = cleaned;
    localStorage.setItem('token', cleaned);
    this.loadProfile();
  }

  loadProfile(): void {
    if (!this.token) {
      this.errorMessage = 'No hay token para consultar el perfil';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.get<ApiResponse<UserProfile>>(this.profileUrl, { headers: this.authHeaders() }).subscribe({
      next: (response) => {
        this.profile = response.data || null;
        this.isLoading = false;
        this.fillEditForm();
      },
      error: (error) => {
        this.isLoading = false;
        this.profile = null;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el perfil';
      }
    });
  }

  private fillEditForm(): void {
    this.editForm = {
      nombre: this.profile?.nombre || '',
      telefono: this.profile?.telefono || '',
      avatar_url: this.profile?.avatar_url || '',
      ubicacion_texto: this.profile?.ubicacion_texto || ''
    };
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.passwordError = '';
    this.passwordMessage = '';
  }

  startEdit(): void {
    this.isEditing = true;
    this.fillEditForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.fillEditForm();
  }

  saveProfile(): void {
    if (!this.token) {
      this.errorMessage = 'No hay token para actualizar el perfil';
      return;
    }

    if (!this.editForm.nombre.trim()) {
      this.errorMessage = 'El nombre es obligatorio';
      return;
    }

    this.isSavingProfile = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      nombre: this.editForm.nombre.trim(),
      telefono: this.editForm.telefono.trim(),
      email: this.profile?.email || '',
      avatar_url: this.editForm.avatar_url.trim(),
      ubicacion_texto: this.editForm.ubicacion_texto.trim()
    };

    this.http.put<ApiResponse<UserProfile>>(this.profileUrl, payload, { headers: this.authHeaders() }).subscribe({
      next: (response) => {
        this.isSavingProfile = false;
        this.profile = response.data || this.profile;
        this.isEditing = false;
        this.successMessage = response.message || 'Perfil actualizado correctamente';
        this.fillEditForm();
      },
      error: (error) => {
        this.isSavingProfile = false;
        this.errorMessage = error?.error?.message || 'No se pudo actualizar el perfil';
      }
    });
  }

  changePassword(): void {
    if (!this.token) {
      this.passwordError = 'No hay token para cambiar contraseña';
      return;
    }

    this.passwordError = '';
    this.passwordMessage = '';

    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.passwordError = 'Completá los tres campos de contraseña';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError = 'La nueva contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'La confirmación no coincide con la nueva contraseña';
      return;
    }

    this.isChangingPassword = true;

    this.http
      .post<ApiResponse<null>>(
        `${this.profileUrl}/change-password`,
        {
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword
        },
        { headers: this.authHeaders() }
      )
      .subscribe({
        next: (response) => {
          this.isChangingPassword = false;
          this.passwordMessage = response.message || 'Contraseña actualizada correctamente';
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
        },
        error: (error) => {
          this.isChangingPassword = false;
          this.passwordError = error?.error?.message || 'No se pudo cambiar la contraseña';
        }
      });
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authToken');
    this.token = '';
    this.profile = null;
    this.passwordError = '';
    this.passwordMessage = '';
    this.successMessage = 'Sesión local cerrada';
    void this.router.navigate(['/login']);
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) {
      return 'N/A';
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleString();
  }


  onImageSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = () => {
    this.editForm.avatar_url = reader.result as string;
  };
  reader.readAsDataURL(file);
}

}
