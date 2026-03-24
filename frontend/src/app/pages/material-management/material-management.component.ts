import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-material-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './material-management.component.html',
  styleUrls: ['./material-management.component.css']
})
export class MaterialManagementComponent implements OnInit {
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  
  myPublications: any[] = [];
  categories: any[] = [];

  // Formulario alineado con la interface Publication
  newPub = {
    titulo: '',
    descripcion: '',
    precio: 0,
    cantidad: 1,
    categoria_id: '',
    estado: 'disponible',
    ubicacion_texto: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    await this.loadInitialData();
  }

  async loadInitialData() {
    this.loading = true;
    try {
      // se cargan categorías y publicaciones en paralelo para ganar velocidad
      const [catRes, pubRes] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/categories`)),
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/users/me/publications`, { headers: this.getAuthHeaders() }))
      ]);

      this.categories = catRes?.data ?? [];
      this.myPublications = pubRes?.data ?? [];
    } catch (error: any) {
      this.errorMessage = 'Error al cargar los datos del marketplace.';
    } finally {
      this.loading = false;
    }
  }

  async createPublication() {
    if (!this.newPub.titulo || !this.newPub.categoria_id) {
      this.errorMessage = 'El título y la categoría son obligatorios.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    
    try {
      await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/publications`, this.newPub, { headers: this.getAuthHeaders() })
      );
      
      this.successMessage = '¡Publicación creada exitosamente!';
      this.resetForm();
      await this.loadInitialData(); // Recargamos la lista para ver la nueva
      
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Error al crear la publicación';
    } finally {
      this.submitting = false;
    }
  }

  async deletePub(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;

    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/publications/${id}`, { headers: this.getAuthHeaders() })
      );
      this.myPublications = this.myPublications.filter(p => p.id !== id);
      this.successMessage = 'Publicación eliminada.';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'No se pudo eliminar la publicación.';
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private resetForm() {
    this.newPub = {
      titulo: '',
      descripcion: '',
      precio: 0,
      cantidad: 1,
      categoria_id: '',
      estado: 'disponible',
      ubicacion_texto: ''
    };
  }

  getCategoryName(id: string) {
    const cat = this.categories.find(c => c.id === id);
    return cat ? cat.nombre : 'Sin categoría';
  }
}