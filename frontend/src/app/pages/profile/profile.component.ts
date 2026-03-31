import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';

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
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  x_handle?: string;
  puntos?: number;
  reputacion?: number | string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('profileMapEdit') profileMapEdit?: ElementRef<HTMLDivElement>;
  @ViewChild('profileMapView') profileMapView?: ElementRef<HTMLDivElement>;

  private readonly profileUrl = `${environment.apiUrl}/profile`;
  private editMap?: L.Map;
  private editMarker?: L.Marker;
  private viewMap?: L.Map;
  private geocodeTimeout: ReturnType<typeof setTimeout> | null = null;

  profile: UserProfile | null = null;
  isOwnProfile = true;
  userId: string | null = null;
  isLoading = false;
  isSavingProfile = false;
  isChangingPassword = false;
  isGeocodingLocation = false;

  errorMessage = '';
  successMessage = '';
  passwordMessage = '';
  passwordError = '';

  activeTab: 'profile' | 'edit' | 'password' = 'profile';

  token = '';

  editForm = {
    nombre: '',
    telefono: '',
    avatar_url: '',
    ubicacion_texto: '',
    latitud: '',
    longitud: '',
    bio: '',
    website: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    x_handle: ''
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.token = this.getStoredToken();
    this.userId = this.route.snapshot.params['id'];
    
    if (this.userId) {
      this.isOwnProfile = false;
      this.loadUserProfile(this.userId);
    } else {
      this.isOwnProfile = true;
      if (this.token) {
        this.loadProfile();
      } else {
        this.router.navigate(['/login']);
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.activeTab === 'profile' && this.profile?.coordinates && !this.viewMap && this.profileMapView?.nativeElement) {
      setTimeout(() => this.initializeViewMap(), 100);
    }
    
    if (this.activeTab === 'edit' && !this.editMap && this.profileMapEdit?.nativeElement) {
      setTimeout(() => this.initializeEditMap(), 100);
    }
  }

  ngOnDestroy(): void {
    if (this.geocodeTimeout) {
      clearTimeout(this.geocodeTimeout);
      this.geocodeTimeout = null;
    }
    this.editMap?.remove();
    this.viewMap?.remove();
  }

  private getStoredToken(): string {
    return localStorage.getItem('token') || '';
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });
  }

  loadProfile(): void {
    if (!this.token) {
      this.errorMessage = 'No hay sesión iniciada';
      this.router.navigate(['/login']);
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
        if (error?.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  loadUserProfile(userId: string): void {
    if (!this.token) {
      this.errorMessage = 'No hay sesión iniciada';
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<ApiResponse<UserProfile>>(`${this.profileUrl}/${userId}`, { headers: this.authHeaders() }).subscribe({
      next: (response) => {
        this.profile = response.data || null;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.profile = null;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el perfil del usuario';
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
      longitud: this.profile?.coordinates?.lng?.toString() || '',
      bio: this.profile?.bio || '',
      website: this.profile?.website || '',
      instagram: this.profile?.instagram || '',
      facebook: this.profile?.facebook || '',
      linkedin: this.profile?.linkedin || '',
      x_handle: this.profile?.x_handle || ''
    };
  }

  private syncProfilePreviewCoordinates(lat: number, lng: number): void {
    if (!this.profile) return;

    this.profile = {
      ...this.profile,
      ubicacion_texto: this.editForm.ubicacion_texto.trim() || this.profile.ubicacion_texto,
      coordinates: { lat, lng }
    };

    if (this.viewMap) {
      this.initializeViewMap();
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage = '¡Copiado al portapapeles!';
      setTimeout(() => this.successMessage = '', 2000);
    }).catch(() => {
      this.errorMessage = 'No se pudo copiar';
      setTimeout(() => this.errorMessage = '', 2000);
    });
  }

  switchTab(tab: 'profile' | 'edit' | 'password'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.passwordError = '';
    this.passwordMessage = '';
    
    if (tab === 'edit') {
      this.fillEditForm();
      setTimeout(() => this.initializeEditMap(), 100);
    } else if (tab === 'profile') {
      setTimeout(() => this.initializeViewMap(), 100);
    }
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
      avatar_url: this.editForm.avatar_url.trim(),
      ubicacion_texto: this.editForm.ubicacion_texto.trim(),
      latitud: this.editForm.latitud.trim(),
      longitud: this.editForm.longitud.trim(),
      bio: this.editForm.bio.trim(),
      website: this.editForm.website.trim(),
      instagram: this.editForm.instagram.trim(),
      facebook: this.editForm.facebook.trim(),
      linkedin: this.editForm.linkedin.trim(),
      x_handle: this.editForm.x_handle.trim()
    };

    this.http.put<ApiResponse<UserProfile>>(this.profileUrl, payload, { headers: this.authHeaders() }).subscribe({
      next: (response) => {
        this.isSavingProfile = false;
        this.profile = response.data || this.profile;
        this.successMessage = response.message || 'Perfil actualizado correctamente';
        this.fillEditForm();
        this.switchTab('profile');
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
          setTimeout(() => {
            this.switchTab('profile');
          }, 2000);
        },
        error: (error) => {
          this.isChangingPassword = false;
          this.passwordError = error?.error?.message || 'No se pudo cambiar la contraseña';
        }
      });
  }

  clearSession(): void {
    localStorage.removeItem('token');
    this.token = '';
    this.profile = null;
    this.passwordError = '';
    this.passwordMessage = '';
    this.successMessage = 'Sesión cerrada';
    this.router.navigate(['/login']);
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  }

  getAvatarSrc(avatarUrl: string | null | undefined): string {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl;
    }
    return '/assets/default-avatar.png';
  }

  getTipoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      'Cooperativa': 'fa-handshake',
      'Recicladora': 'fa-recycle',
      'Emprendedor': 'fa-chart-line',
      'Persona': 'fa-user',
      'Admin': 'fa-crown'
    };
    return icons[tipo] || 'fa-user';
  }

  getTipoColor(tipo: string): string {
    const colors: Record<string, string> = {
      'Cooperativa': '#22C55E',
      'Recicladora': '#3B82F6',
      'Emprendedor': '#F59E0B',
      'Persona': '#8B5CF6',
      'Admin': '#EF4444'
    };
    return colors[tipo] || '#9CA3AF';
  }

  formatReputacion(reputacion?: number | string): string {
    if (!reputacion) return 'Nueva';
    const num = typeof reputacion === 'string' ? parseFloat(reputacion) : reputacion;
    if (isNaN(num)) return 'Nueva';
    return num.toFixed(1);
  }

  getReputacionStars(reputacion?: number | string): number[] {
    const stars = [];
    const num = typeof reputacion === 'string' ? parseFloat(reputacion) : (reputacion || 0);
    const fullStars = Math.floor(num);
    const hasHalf = num - fullStars >= 0.5;
    
    for (let i = 0; i < fullStars; i++) stars.push(1);
    if (hasHalf) stars.push(0.5);
    while (stars.length < 5) stars.push(0);
    
    return stars;
  }

  hasReputacion(): boolean {
    if (!this.profile?.reputacion) return false;
    const num = typeof this.profile.reputacion === 'string' 
      ? parseFloat(this.profile.reputacion) 
      : this.profile.reputacion;
    return !isNaN(num) && num > 0;
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

    if (!isFinite(lat) || !isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    this.updateEditMarker(lat, lng, true);
    this.syncProfilePreviewCoordinates(lat, lng);
  }

  onLocationTextInput(): void {
    const query = this.editForm.ubicacion_texto.trim();

    if (this.geocodeTimeout) {
      clearTimeout(this.geocodeTimeout);
      this.geocodeTimeout = null;
    }

    if (query.length < 5) {
      return;
    }

    this.geocodeTimeout = setTimeout(() => {
      this.geocodeLocation(query);
    }, 800);
  }

  private async geocodeLocation(query: string): Promise<void> {
    this.isGeocodingLocation = true;

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'ar'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo consultar la ubicación');
      }

      const results = await response.json();
      const firstResult = Array.isArray(results) ? results[0] : null;

      if (!firstResult?.lat || !firstResult?.lon) {
        return;
      }

      const lat = Number(firstResult.lat);
      const lng = Number(firstResult.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      this.editForm.latitud = lat.toFixed(6);
      this.editForm.longitud = lng.toFixed(6);
      this.updateEditMarker(lat, lng, true);
      this.syncProfilePreviewCoordinates(lat, lng);
    } catch (error) {
      console.error('Error geocoding location:', error);
    } finally {
      this.isGeocodingLocation = false;
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    this.isGeocodingLocation = true;

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
        zoom: '18',
        addressdetails: '1'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener la dirección');
      }

      const result = await response.json();
      const formattedAddress = this.formatReverseGeocodeAddress(result);

      if (formattedAddress) {
        this.editForm.ubicacion_texto = formattedAddress;

        if (this.profile) {
          this.profile = {
            ...this.profile,
            ubicacion_texto: formattedAddress
          };
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding location:', error);
    } finally {
      this.isGeocodingLocation = false;
    }
  }

  private formatReverseGeocodeAddress(result: any): string {
    const address = result?.address || {};

    const streetNumber = address.house_number || '';
    const road = address.road || address.pedestrian || address.footway || '';
    const neighbourhood = address.suburb || address.neighbourhood || address.city_district || '';
    const city = address.city || address.town || address.village || address.municipality || '';
    const municipality = address.municipality || '';
    const state = address.state || '';

    const parts = [
      streetNumber,
      road,
      neighbourhood,
      city,
      municipality && municipality !== city ? municipality : '',
      state && state !== city ? state : ''
    ].filter((value, index, array) => {
      const normalized = String(value || '').trim();
      return normalized && array.findIndex((item) => String(item || '').trim() === normalized) === index;
    });

    return parts.join(', ');
  }

  private initializeViewMap(): void {
    if (!this.profileMapView?.nativeElement || !this.profile?.coordinates) return;
    
    if (this.viewMap) {
      this.viewMap.remove();
      this.viewMap = undefined;
    }
    
    const { lat, lng } = this.profile.coordinates;
    this.viewMap = L.map(this.profileMapView.nativeElement).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.viewMap);
    L.marker([lat, lng]).addTo(this.viewMap);
    setTimeout(() => this.viewMap?.invalidateSize(), 100);
  }

  private initializeEditMap(): void {
    if (!this.profileMapEdit?.nativeElement) return;
    
    if (this.editMap) {
      this.editMap.remove();
      this.editMap = undefined;
      this.editMarker = undefined;
    }
    
    const lat = Number(this.editForm.latitud);
    const lng = Number(this.editForm.longitud);
    const hasCoordinates = isFinite(lat) && isFinite(lng) && (lat !== 0 || lng !== 0);
    const initialCenter: L.LatLngTuple = hasCoordinates ? [lat, lng] : [-31.413865, -64.183882];

    this.editMap = L.map(this.profileMapEdit.nativeElement, {
      zoomControl: true,
      attributionControl: true
    }).setView(initialCenter, hasCoordinates ? 14 : 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.editMap);

    this.editMap.on('click', (event: L.LeafletMouseEvent) => {
      this.updateEditMarker(event.latlng.lat, event.latlng.lng, false);
      this.reverseGeocode(event.latlng.lat, event.latlng.lng);
    });

    if (hasCoordinates) {
      this.updateEditMarker(lat, lng, false);
    }

    setTimeout(() => this.editMap?.invalidateSize(), 0);
  }

  private updateEditMarker(lat: number, lng: number, shouldCenter: boolean): void {
    if (!this.editMap) return;

    const position: L.LatLngTuple = [lat, lng];

    if (!this.editMarker) {
      this.editMarker = L.marker(position, { draggable: true }).addTo(this.editMap);
      this.editMarker.on('dragend', () => {
        const markerPosition = this.editMarker?.getLatLng();
        if (!markerPosition) return;
        this.editForm.latitud = markerPosition.lat.toFixed(6);
        this.editForm.longitud = markerPosition.lng.toFixed(6);
        this.syncProfilePreviewCoordinates(markerPosition.lat, markerPosition.lng);
        this.reverseGeocode(markerPosition.lat, markerPosition.lng);
      });
    } else {
      this.editMarker.setLatLng(position);
    }

    this.editForm.latitud = lat.toFixed(6);
    this.editForm.longitud = lng.toFixed(6);
    this.syncProfilePreviewCoordinates(lat, lng);

    if (shouldCenter) {
      this.editMap.setView(position, Math.max(this.editMap.getZoom(), 14));
    }
  }

  goBack(): void {
     this.router.navigate(['/dashboard']);
  }

  contactUser(): void {
    if (this.profile?.id) {
      this.router.navigate(['/chat', this.profile.id]);
    }
  }
}
