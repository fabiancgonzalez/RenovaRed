import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface MarketplaceUser {
  id: string;
  nombre: string;
  tipo?: string;
}

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
  usuario?: {
    id: string;
    nombre: string;
    tipo?: string;
    telefono?: string;
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
  selector: 'app-materials-explore',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './materials-explore.component.html',
  styleUrls: ['./materials-explore.component.css']
})
export class MaterialsExploreComponent implements OnInit {
  loading = false;
  errorMessage = '';
  allPublications: Publication[] = [];
  categories: MaterialCategory[] = [];
  currentUser: MarketplaceUser | null = null;
  selectedCategoryId = '';
  searchTerm = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  contactingPublicationId: string | null = null;
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
    void this.loadMarketplaceData();
  }

  get hasActiveFilters(): boolean {
    return !!this.selectedCategoryId || !!this.searchTerm.trim() || this.minPrice != null || this.maxPrice != null;
  }

  get selectedCategoryName(): string {
    if (!this.selectedCategoryId) {
      return 'todas las categorías';
    }

    const category = this.categories.find((item) => item.id === this.selectedCategoryId);
    return category ? this.getCategoryNameEs(category) : 'la categoría seleccionada';
  }

  async loadMarketplaceData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      if (this.categories.length === 0) {
        await this.loadCategories();
      }

      this.allPublications = await this.fetchAllPublications();
      this.loading = false;
    } catch (error: any) {
      this.loading = false;
      this.errorMessage = error?.error?.message || 'No se pudieron cargar las publicaciones';
    }
  }

  async loadCategories(): Promise<void> {
    const response = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/categories`));
    this.categories = response?.data ?? [];
  }

  async onCategoryFilterChange(): Promise<void> {
    await this.loadMarketplaceData();
  }

  async applyFilters(): Promise<void> {
    await this.loadMarketplaceData();
  }

  clearAllFilters(): void {
    if (!this.hasActiveFilters) return;

    this.selectedCategoryId = '';
    this.searchTerm = '';
    this.minPrice = null;
    this.maxPrice = null;
    void this.loadMarketplaceData();
  }

  canContact(publication: Publication): boolean {
    if (!this.currentUser || !publication?.usuario?.id) return false;
    return publication.usuario.id !== this.currentUser.id;
  }

  shouldPromptLoginForContact(publication: Publication): boolean {
    return !this.isAuthenticated && !!publication?.usuario?.id;
  }

  togglePublicationDetail(publicationId: string): void {
    this.expandedPublicationId = this.expandedPublicationId === publicationId ? null : publicationId;
  }

  isPublicationDetailVisible(publicationId: string): boolean {
    return this.expandedPublicationId === publicationId;
  }

  contactOwner(publication: Publication): void {
    if (!this.isAuthenticated) {
      this.goToLogin();
      return;
    }

    if (!this.canContact(publication)) return;

    const headers = this.getAuthHeaders();
    this.contactingPublicationId = publication.id;
    this.errorMessage = '';

    this.http.post<any>(`${environment.apiUrl}/conversations`, {
      publication_id: publication.id,
      seller_id: publication.usuario?.id
    }, { headers }).subscribe({
      next: (response) => {
        this.contactingPublicationId = null;
        this.router.navigate(['/chat', response.data.id]);
      },
      error: (error) => {
        this.contactingPublicationId = null;
        this.errorMessage = error?.error?.message || 'No se pudo iniciar la conversación';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToManagement(): void {
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

    if (!this.isAuthenticated) {
      this.currentUser = null;
      return;
    }

    try {
      this.currentUser = JSON.parse(userRaw || 'null');
    } catch {
      this.currentUser = null;
      this.isAuthenticated = false;
    }
  }

  private async fetchAllPublications(): Promise<Publication[]> {
    const publications: Publication[] = [];
    let page = 1;
    let pages = 1;

    do {
      const query = new URLSearchParams({
        page: String(page),
        limit: '50'
      });

      if (this.selectedCategoryId) {
        query.set('categoria_id', this.selectedCategoryId);
      }

      if (this.searchTerm.trim()) {
        query.set('search', this.searchTerm.trim());
      }

      if (this.minPrice != null && !Number.isNaN(this.minPrice)) {
        query.set('precio_min', String(this.minPrice));
      }

      if (this.maxPrice != null && !Number.isNaN(this.maxPrice)) {
        query.set('precio_max', String(this.maxPrice));
      }

      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/publications?${query.toString()}`)
      );

      publications.push(...(response?.data ?? []));
      pages = response?.pagination?.pages ?? 1;
      page += 1;
    } while (page <= pages);

    return publications;
  }
}
