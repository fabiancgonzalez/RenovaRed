import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface MaterialCategory {
  id: string;
  nombre: string;
  icono?: string;
  descripcion?: string;
  color?: string;
}

interface PublicationResponse {
  id: string;
  titulo: string;
  descripcion?: string;
  categoria_id?: string | null;
  ubicacion_texto?: string;
  precio?: number | string;
  cantidad?: number | string;
  estado?: string;
  imagenes?: string[];
  categoria?: { id: string };
}

interface PublicationForm {
  titulo: string;
  descripcion: string;
  categoria_id: string;
  ubicacion_texto: string;
  precio: string;
  cantidad: string;
  estado: string;
}

@Component({
  selector: 'app-publication-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publication-form.component.html',
  styleUrls: ['./publication-form.component.css']
})
export class PublicationFormComponent implements OnInit {
  loading = false;
  loadingPublication = false;
  savingPublication = false;
  errorMessage = '';
  successMessage = '';
  isAuthenticated = false;
  isEditMode = false;
  editingPublicationId: string | null = null;

  categories: MaterialCategory[] = [];
  publicationImagePreview = '';

  publicationForm: PublicationForm = {
    titulo: '',
    descripcion: '',
    categoria_id: '',
    ubicacion_texto: '',
    precio: '',
    cantidad: '',
    estado: 'Disponible'
  };

  private readonly categoryNameEsMap: Record<string, string> = {
    plastico: 'Plástico',
    plastic: 'Plástico',
    papel: 'Papel',
    paper: 'Papel',
    carton: 'Cartón',
    cardboard: 'Cartón',
    vidrio: 'Vidrio',
    glass: 'Vidrio',
    metal: 'Metal',
    metals: 'Metal',
    aluminio: 'Aluminio',
    aluminum: 'Aluminio',
    organico: 'Orgánico',
    organic: 'Orgánico',
    electronicos: 'Electrónicos',
    electronics: 'Electrónicos',
    textil: 'Textil',
    textile: 'Textil',
    madera: 'Madera',
    wood: 'Madera'
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.syncSessionState();

    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    this.editingPublicationId = this.route.snapshot.queryParamMap.get('edit');
    this.isEditMode = !!this.editingPublicationId;

    try {
      this.loading = true;
      await this.loadCategories();

      if (this.isEditMode && this.editingPublicationId) {
        await this.loadPublicationToEdit(this.editingPublicationId);
      }

      this.loading = false;
    } catch (error: any) {
      this.loading = false;
      this.errorMessage = error?.error?.message || 'No se pudo cargar el formulario de publicación';
    }
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Editar publicación' : 'Nueva publicación';
  }

  get submitLabel(): string {
    if (this.savingPublication) {
      return 'Guardando...';
    }

    return this.isEditMode ? 'Actualizar publicación' : 'Crear publicación';
  }

  async savePublication(): Promise<void> {
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.publicationForm.titulo.trim() || !this.publicationForm.ubicacion_texto.trim()) {
      this.errorMessage = 'Título y ubicación son obligatorios';
      return;
    }

    const headers = this.getAuthHeaders();
    const payload = {
      titulo: this.publicationForm.titulo.trim(),
      descripcion: this.publicationForm.descripcion.trim() || null,
      categoria_id: this.publicationForm.categoria_id || null,
      ubicacion_texto: this.publicationForm.ubicacion_texto.trim(),
      precio: this.publicationForm.precio ? Number(this.publicationForm.precio) : null,
      cantidad: this.publicationForm.cantidad ? Number(this.publicationForm.cantidad) : null,
      imagenes: this.publicationImagePreview ? [this.publicationImagePreview] : [],
      estado: this.publicationForm.estado || 'Disponible'
    };

    this.savingPublication = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.isEditMode && this.editingPublicationId
      ? this.http.put<any>(`${environment.apiUrl}/publications/${this.editingPublicationId}`, payload, { headers })
      : this.http.post<any>(`${environment.apiUrl}/publications`, payload, { headers });

    request$.subscribe({
      next: () => {
        this.savingPublication = false;
        this.router.navigate(['/marketplace'], { queryParams: { section: 'mine' } });
      },
      error: (error) => {
        this.savingPublication = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar la publicación';
      }
    });
  }

  onPublicationImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.publicationImagePreview = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  removePublicationImage(): void {
    this.publicationImagePreview = '';
  }

  goBackToMarketplace(): void {
    this.router.navigate(['/marketplace']);
  }

  getCategoryNameEs(category?: { nombre?: string | null }): string {
    const rawName = category?.nombre?.trim();
    if (!rawName) {
      return 'Sin categoría';
    }

    const key = this.normalizeCategoryKey(rawName);
    return this.categoryNameEsMap[key] || rawName;
  }

  private normalizeCategoryKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async loadCategories(): Promise<void> {
    const response = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/categories`));
    this.categories = response?.data ?? [];
  }

  private async loadPublicationToEdit(publicationId: string): Promise<void> {
    this.loadingPublication = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/publications/${publicationId}`)
      );

      const publication = response?.data as PublicationResponse | undefined;
      if (!publication) {
        this.errorMessage = 'No se encontró la publicación solicitada';
        this.loadingPublication = false;
        return;
      }

      this.publicationForm = {
        titulo: publication.titulo || '',
        descripcion: publication.descripcion || '',
        categoria_id: publication.categoria?.id || publication.categoria_id || '',
        ubicacion_texto: publication.ubicacion_texto || '',
        precio: publication.precio ? String(publication.precio) : '',
        cantidad: publication.cantidad ? String(publication.cantidad) : '',
        estado: publication.estado || 'Disponible'
      };
      this.publicationImagePreview = publication.imagenes?.[0] || '';
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'No se pudo cargar la publicación para editar';
    } finally {
      this.loadingPublication = false;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private syncSessionState(): void {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    this.isAuthenticated = !!token && !!userRaw;
  }
}
