import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import * as L from 'leaflet';



interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  tipo: string;
  telefono?: string;
  avatar_url?: string;
  ubicacion_texto?: string;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
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
  @ViewChild('profileMapContainer') profileMapContainer?: ElementRef<HTMLDivElement>;

  private readonly profileUrl = 'http://localhost:3000/api/profile';
  private profileMap?: L.Map;
  private profileMarker?: L.Marker;

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
    ubicacion_texto: '',
    latitud: '',
    longitud: ''
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

  ngAfterViewChecked(): void {
    if (!this.isEditing || this.profileMap || !this.profileMapContainer) {
      return;
    }

    this.initializeProfileMap();
  }

  ngOnDestroy(): void {
    this.profileMap?.remove();
  }

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
      ubicacion_texto: this.profile?.ubicacion_texto || '',
      latitud: this.profile?.coordinates?.lat?.toString() || '',
      longitud: this.profile?.coordinates?.lng?.toString() || ''
    };
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.passwordError = '';
    this.passwordMessage = '';
  }

  startEdit(): void {
    this.isEditing = true;
    this.destroyProfileMap();
    this.fillEditForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.destroyProfileMap();
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
      ubicacion_texto: this.editForm.ubicacion_texto.trim(),
      latitud: this.editForm.latitud.trim(),
      longitud: this.editForm.longitud.trim()
    };

    this.http.put<ApiResponse<UserProfile>>(this.profileUrl, payload, { headers: this.authHeaders() }).subscribe({
      next: (response) => {
        this.isSavingProfile = false;
        this.profile = response.data || this.profile;
        this.isEditing = false;
        this.destroyProfileMap();
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

  onCoordinatesInputChange(): void {
    const lat = Number(this.editForm.latitud);
    const lng = Number(this.editForm.longitud);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    this.updateMapMarker(lat, lng, true);
  }

  private initializeProfileMap(): void {
    if (!this.profileMapContainer) {
      return;
    }

    const lat = Number(this.editForm.latitud);
    const lng = Number(this.editForm.longitud);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
    const initialCenter: L.LatLngTuple = hasCoordinates ? [lat, lng] : [-31.413865, -64.183882];

    this.profileMap = L.map(this.profileMapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: true
    }).setView(initialCenter, hasCoordinates ? 14 : 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.profileMap);

    this.profileMap.on('click', (event: L.LeafletMouseEvent) => {
      this.updateMapMarker(event.latlng.lat, event.latlng.lng, false);
    });

    if (hasCoordinates) {
      this.updateMapMarker(lat, lng, false);
    }

    setTimeout(() => this.profileMap?.invalidateSize(), 0);
  }

  private updateMapMarker(lat: number, lng: number, shouldCenter: boolean): void {
    if (!this.profileMap) {
      return;
    }

    const position: L.LatLngTuple = [lat, lng];

    if (!this.profileMarker) {
      this.profileMarker = L.marker(position, { draggable: true }).addTo(this.profileMap);
      this.profileMarker.on('dragend', () => {
        const markerPosition = this.profileMarker?.getLatLng();
        if (!markerPosition) {
          return;
        }

        this.editForm.latitud = markerPosition.lat.toFixed(6);
        this.editForm.longitud = markerPosition.lng.toFixed(6);
      });
    } else {
      this.profileMarker.setLatLng(position);
    }

    this.editForm.latitud = lat.toFixed(6);
    this.editForm.longitud = lng.toFixed(6);

    if (shouldCenter) {
      this.profileMap.setView(position, Math.max(this.profileMap.getZoom(), 14));
    }
  }

  private destroyProfileMap(): void {
    this.profileMap?.remove();
    this.profileMap = undefined;
    this.profileMarker = undefined;
  }

}
