import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';




interface MarketplaceUser {
  id: string;
  nombre: string;
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
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.css']
})
export class MarketplaceComponent implements OnInit {
  @ViewChild('misPublicacionesSection') misPublicacionesSection?: ElementRef<HTMLElement>;
  @ViewChild('nuevaPublicacionSection') nuevaPublicacionSection?: ElementRef<HTMLElement>;
 
  loading = false;
  savingPublication = false;
  contactingPublicationId: string | null = null;
  deletingPublicationId: string | null = null;
  editingPublicationId: string | null = null;
  mostrarFormulario = false;
  mostrarMisPublicaciones = false;
  errorMessage = '';
  successMessage = '';

  allPublications: Publication[] = [];
  myPublications: Publication[] = [];
  categories: MaterialCategory[] = [];
  currentUser: MarketplaceUser | null = null;
  selectedCategoryId = '';
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
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.currentUser = JSON.parse(userRaw);
    } catch {
      this.currentUser = null;
    }

    this.loadMarketplaceData();
  }

  async loadMarketplaceData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      if (this.categories.length === 0) {
        await this.loadCategories();
      }

      this.allPublications = await this.fetchAllPublications();
      await this.loadMyPublications();
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

  async loadMyPublications(): Promise<void> {
    const headers = this.getAuthHeaders();
    const query = new URLSearchParams({ limit: '1000' });

    if (this.selectedCategoryId) {
      query.set('categoria_id', this.selectedCategoryId);
    }

    try {
      const response = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/users/me/publications?${query.toString()}`, { headers }));
      this.myPublications = response?.data ?? [];
    } catch {
      this.myPublications = this.currentUser
        ? this.allPublications.filter((publication) => publication.usuario?.id === this.currentUser?.id)
        : [];
    }
  }

  async savePublication(): Promise<void> {
    if (!this.publicationForm.titulo.trim() || !this.publicationForm.ubicacion_texto.trim()) {
      this.errorMessage = 'Título y ubicación son obligatorios';
      
      return;
     //this.mostrarFormulario = true;
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

    const request$ = this.editingPublicationId
      ? this.http.put<any>(`${environment.apiUrl}/publications/${this.editingPublicationId}`, payload, { headers })
      : this.http.post<any>(`${environment.apiUrl}/publications`, payload, { headers });

    request$.subscribe({
      next: () => {
        this.successMessage = this.editingPublicationId
          ? 'Publicación actualizada correctamente'
          : 'Publicación creada correctamente';
        this.savingPublication = false;
        this.cancelEdit();
        this.loadMarketplaceData();
      },
      error: (error) => {
        this.savingPublication = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar la publicación';
      }
    });
  }

  startEdit(publication: Publication): void {
    this.editingPublicationId = publication.id;
    this.mostrarFormulario = true;
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

    setTimeout(() => this.focusSectionWithAnimation(this.nuevaPublicacionSection?.nativeElement), 100);
  }

  cancelEdit(): void {
    this.editingPublicationId = null;
    this.mostrarFormulario = false;
    this.publicationForm = {
      titulo: '',
      descripcion: '',
      categoria_id: '',
      ubicacion_texto: '',
      precio: '',
      cantidad: '',
      estado: 'Disponible'
    };
    this.publicationImagePreview = '';
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

  toggleFormularioPublicacion(): void {
    this.mostrarFormulario = !this.mostrarFormulario;

    if (!this.mostrarFormulario) return;

    setTimeout(() => this.focusSectionWithAnimation(this.nuevaPublicacionSection?.nativeElement), 100);
  }

  toggleMisPublicaciones(): void {
    this.mostrarMisPublicaciones = !this.mostrarMisPublicaciones;

    if (!this.mostrarMisPublicaciones) return;

    setTimeout(() => this.focusSectionWithAnimation(this.misPublicacionesSection?.nativeElement), 100);
  }

  async onCategoryFilterChange(): Promise<void> {
    await this.loadMarketplaceData();
  }

  clearCategoryFilter(): void {
    if (!this.selectedCategoryId) return;

    this.selectedCategoryId = '';
    void this.loadMarketplaceData();
  }

  get selectedCategoryName(): string {
    if (!this.selectedCategoryId) {
      return 'todas las categorías';
    }

    const category = this.categories.find((item) => item.id === this.selectedCategoryId);
    return category ? this.getCategoryNameEs(category) : 'la categoría seleccionada';
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

  private focusSectionWithAnimation(section?: HTMLElement): void {
    if (!section) return;

    section.classList.remove('section-focus-animate');
    void section.offsetWidth;
    section.classList.add('section-focus-animate');

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.focus();
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
        this.loadMarketplaceData();
      },
      error: (error) => {
        this.deletingPublicationId = null;
        this.errorMessage = error?.error?.message || 'No se pudo eliminar la publicación';
      }
    });
  }

  canContact(publication: Publication): boolean {
    if (!this.currentUser || !publication?.usuario?.id) return false;
    return publication.usuario.id !== this.currentUser.id;
  }

  contactOwner(publication: Publication): void {
    if (!this.canContact(publication)) return;

    const headers = this.getAuthHeaders();
    this.contactingPublicationId = publication.id;
    this.successMessage = '';
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

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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
