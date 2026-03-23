import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Publication {
  id: string;
  titulo: string;
  descripcion?: string;
  precio?: number | string;
  cantidad?: number | string;
  estado?: string;
  categoria_id?: string | null;
  ubicacion_texto?: string;
  imagenes?: string[];
  categoria?: {
    id: string;
    nombre: string;
    icono?: string;
    descripcion?: string;
    color?: string;
  };
}

interface MaterialCategory {
  id: string;
  nombre: string;
  icono?: string;
  descripcion?: string;
  color?: string;
}

@Component({
  selector: 'app-my-publications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-publications.component.html',
  styleUrls: ['./my-publications.component.css']
})
export class MyPublicationsComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  myPublications: Publication[] = [];
  categories: MaterialCategory[] = [];
  selectedCategoryId = '';
  deletingPublicationId: string | null = null;
  expandedPublicationId: string | null = null;
  isAuthenticated = false;

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
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.syncSessionState();

    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    void this.loadData();
  }

  get selectedCategoryName(): string {
    if (!this.selectedCategoryId) {
      return 'todas las categorías';
    }

    const category = this.categories.find((item) => item.id === this.selectedCategoryId);
    return category ? this.getCategoryNameEs(category) : 'la categoría seleccionada';
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      if (this.categories.length === 0) {
        await this.loadCategories();
      }

      await this.loadMyPublications();
      this.loading = false;
    } catch (error: any) {
      this.loading = false;
      this.errorMessage = error?.error?.message || 'No se pudieron cargar tus publicaciones';
    }
  }

  async loadCategories(): Promise<void> {
    const response = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/categories`));
    this.categories = response?.data ?? [];
  }

  async loadMyPublications(): Promise<void> {
    const headers = this.getAuthHeaders();
    const query = new URLSearchParams({ limit: '1000' });

    if (this.selectedCategoryId) {
      query.set('categoria_id', this.selectedCategoryId);
    }

    const response = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/users/me/publications?${query.toString()}`, { headers })
    );

    this.myPublications = response?.data ?? [];
  }

  async onCategoryFilterChange(): Promise<void> {
    await this.loadData();
  }

  togglePublicationDetail(publicationId: string): void {
    this.expandedPublicationId = this.expandedPublicationId === publicationId ? null : publicationId;
  }

  isPublicationDetailVisible(publicationId: string): boolean {
    return this.expandedPublicationId === publicationId;
  }

  goToCreatePublication(): void {
    this.router.navigate(['/marketplace/publicar']);
  }

  goToMarketplace(): void {
    this.router.navigate(['/marketplace']);
  }

  goToEditPublication(publicationId: string): void {
    this.router.navigate(['/marketplace/publicar'], { queryParams: { edit: publicationId } });
  }

  deletePublication(publicationId: string): void {
    const headers = this.getAuthHeaders();
    this.deletingPublicationId = publicationId;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.delete<any>(`${environment.apiUrl}/publications/${publicationId}`, { headers }).subscribe({
      next: () => {
        this.successMessage = 'Publicación eliminada correctamente';
        this.deletingPublicationId = null;
        void this.loadData();
      },
      error: (error) => {
        this.deletingPublicationId = null;
        this.errorMessage = error?.error?.message || 'No se pudo eliminar la publicación';
      }
    });
  }

  getCategoryNameEs(category?: { nombre?: string | null }): string {
    const rawName = category?.nombre?.trim();
    if (!rawName) {
      return 'Sin categoría';
    }

    const key = this.normalizeCategoryKey(rawName);
    return this.categoryNameEsMap[key] || rawName;
  }

  isFontAwesomeIcon(icon?: string | null): boolean {
    if (!icon) return false;
    const value = icon.trim();
    return value.startsWith('fa-') || /\bfa-[a-z0-9-]+\b/i.test(value);
  }

  getFontAwesomeIconClass(icon?: string | null): string {
    const value = icon?.trim() || '';
    if (!value) return '';

    if (value.includes(' ')) {
      return value;
    }

    if (value.startsWith('fa-')) {
      return `fa-solid ${value}`;
    }

    return value;
  }

  private normalizeCategoryKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
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
