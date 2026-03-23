import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

interface HomeData {
  metrics: {
    intercambios: number;
    reutilizados: number;
    activos: number;
    co2: number;
  };
  actors: {
    cooperativas: number;
    recicladoras: number;
    emprendedores: number;
  };
  lastUpdated: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  data: HomeData | null = null;
  loading = true;
  error = false;
  imagesLoaded = 0;
  totalImages = 3;
  isAuthenticated = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.isAuthenticated = !!localStorage.getItem('token');
    this.loadHomeData();
  }

  loadHomeData() {
    this.loading = true;
    
    this.http.get<any>(`${environment.apiUrl}/home`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.data = response.data;
          }
          this.loading = false;
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.setupCardObserver();
          }, 200);
        },
        error: (err) => {
          console.error('Error:', err);
          this.error = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  setupCardObserver() {
    const cards = document.querySelectorAll('.card');
    if (cards.length === 0) {
      setTimeout(() => this.setupCardObserver(), 200);
      return;
    }
    
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('show');
        }
      });
    }, { threshold: 0.3 });
    
    cards.forEach(card => observer.observe(card));
  }

  onImageLoad() {
    this.imagesLoaded++;
    if (this.imagesLoaded === this.totalImages) {
      this.setupCardObserver();
    }
  }

  getActorsList() {
    if (!this.data) return [];
    return [
      { name: 'Cooperativas', image: 'cooperativa.png', count: this.data.actors.cooperativas },
      { name: 'Recicladoras', image: 'recicladoras.png', count: this.data.actors.recicladoras },
      { name: 'Emprendedores', image: 'emprendedores.png', count: this.data.actors.emprendedores }
    ];
  }

  exploreMaterials(): void {
    this.router.navigate(['/materiales']);
  }

  publishResources(): void {
    const isLoggedIn = !!localStorage.getItem('token');

    if (isLoggedIn) {
      this.router.navigate(['/marketplace'], { queryParams: { action: 'new' } });
      return;
    }

    this.router.navigate(['/login']);
  }
}