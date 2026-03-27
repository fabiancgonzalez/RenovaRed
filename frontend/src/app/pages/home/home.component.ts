import { Component, OnInit, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import * as L from 'leaflet';

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

interface UserLocation {
  id: string;
  nombre: string;
  tipo: string;
  avatar_url: string;
  ubicacion_texto: string;
  coordinates: { lat: number; lng: number };
  reputacion: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  data: HomeData | null = null;
  loading = true;
  error = false;
  private homeMap: L.Map | null = null;
  private mapMarkers: L.CircleMarker[] = [];
  private locations: UserLocation[] = [];
  private statInterval: any;
  private partnerInterval: any;
  private testimonialInterval: any;
  private videoPlayAttempted = false;
  
  // Stats slider
  currentStatIndex = 0;
  animatedStats = {
    intercambios: 0,
    reutilizados: 0,
    activos: 0,
    co2: 0
  };
  
  // Partners slider
  currentPartnerIndex = 0;
  partnersGroups: any[][] = [];
  
  // Testimonials slider - grupos de 3
  currentTestimonialIndex = 0;
  testimonialGroups: any[][] = [];
  
  teamMembers = [
    {
      name: 'Rodrigo Muñoz',
      role: 'Frontend/Backend Developer',
      image: 'assets/team/3.png',
      linkedin: 'https://linkedin.com/',
      email: 'mailto:rodrigo@renovared.com.ar',
      website: 'https://github.com/D3PA'
    },
    {
      name: 'Fabian Ceferino',
      role: 'Frontend/Backend Developer',
      image: 'assets/team/1.png',
      linkedin: 'https://linkedin.com/',
      email: 'mailto:fabian@renovared.com',
      website: 'https://github.com/fabiancgonzalez'
    },
    {
      name: 'Luana Lencina',
      role: 'Frontend Developer',
      image: 'assets/team/2.jpg',
      linkedin: 'https://linkedin.com/',
      email: 'mailto:luana@renovared.com.ar',
      website: 'https://github.com/Lulencina'
    },
    {
      name: 'Matías Orona',
      role: 'Frontend Developer',
      image: 'assets/team/default.png',
      linkedin: 'https://linkedin.com/',
      email: 'mailto:matias@renovared.com',
      website: 'https://github.com/matiasorona'
    }
  ];
  
  partners = [
    { name: 'Municipalidad de Córdoba', logo: 'assets/partners/cordoba.png', url: 'https://cordoba.gob.ar' },
    { name: 'Technology with Purpose', logo: 'assets/partners/technology.svg', url: 'https://technologywithpurpose.org' },
    { name: 'EcoCórdoba', logo: 'assets/partners/ecocordoba.png', url: 'https://ecocordoba.com.ar' },
    { name: 'xAcademy Reciclar', logo: 'assets/partners/xacademyreciclar.png', url: 'https://technologywithpurpose.org/xacademy/' },
    { name: 'Greenpeace Argentina', logo: 'assets/partners/greenpeace.svg', url: 'https://www.greenpeace.org/argentina/' },
    { name: 'Fundación Ambiente', logo: 'assets/partners/fundacionambiente.png', url: 'https://ambienteargentino.org/' },
    { name: 'CEAMSE', logo: 'assets/partners/ceamse.png', url: 'https://www.ceamse.gov.ar/' },
    { name: 'TetraPak', logo: 'assets/partners/tetrapak.png', url: 'https://www.tetrapak.com/' },
    { name: 'Coca-Cola Argentina', logo: 'assets/partners/cocacola.png', url: 'https://coca-cola.com.ar' },
    { name: 'Banco Galicia', logo: 'assets/partners/galicia.png', url: 'https://galicia.com.ar' },
    { name: 'YPF', logo: 'assets/partners/ypf.svg', url: 'https://ypf.com.ar' },
    { name: 'Personal Tech', logo: 'assets/partners/personal.png', url: 'https://telecom.com.ar' }
  ];
  
  allTestimonials = [
    {
      text: 'RenovaRed transformó la forma en que gestionamos nuestros materiales reciclables. ¡Una plataforma increíble!',
      author: 'María González',
      role: 'Cooperativa Reciclar'
    },
    {
      text: 'Gracias a la plataforma encontramos nuevos mercados para nuestros productos sustentables.',
      author: 'Carlos Rodríguez',
      role: 'EcoEmprende'
    },
    {
      text: 'La red de contactos que generamos a través de RenovaRed es invaluable para nuestro negocio.',
      author: 'Laura Martínez',
      role: 'Recicladora del Sur'
    },
    {
      text: 'Una herramienta esencial para cualquier organización comprometida con el medio ambiente.',
      author: 'Javier Fernández',
      role: 'Fundación Ambiente'
    },
    {
      text: 'La mejor plataforma de economía circular que hemos utilizado. Muy intuitiva y completa.',
      author: 'Sofía Morales',
      role: 'GreenTech Argentina'
    },
    {
      text: 'El equipo de RenovaRed es excelente y la plataforma supera todas las expectativas.',
      author: 'Martín López',
      role: 'EcoCórdoba'
    }
  ];
  
  steps = [
    { icon: 'fa-solid fa-user-plus', title: 'Registrate', description: 'Creá tu cuenta como cooperativa, recicladora o emprendedor' },
    { icon: 'fa-solid fa-box-open', title: 'Publicá', description: 'Ofrecé materiales, productos o servicios disponibles' },
    { icon: 'fa-solid fa-handshake', title: 'Conectate', description: 'Contactate con otros actores y concretá intercambios' }
  ];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadHomeData();
    this.startStatAnimation();
    
    for (let i = 0; i < this.allTestimonials.length; i += 3) {
      this.testimonialGroups.push(this.allTestimonials.slice(i, i + 3));
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.loadMapLocations(), 500);
  }

  ngOnDestroy() {
    if (this.statInterval) {
      clearInterval(this.statInterval);
    }
    if (this.partnerInterval) {
      clearInterval(this.partnerInterval);
    }
    if (this.testimonialInterval) {
      clearInterval(this.testimonialInterval);
    }
    if (this.homeMap) {
      this.homeMap.remove();
    }
  }

  initVideos() {
    const heroVideo = document.querySelector('.hero-video') as HTMLVideoElement;
    const ctaVideo = document.querySelector('.cta-video') as HTMLVideoElement;
    
    const tryPlayVideo = (video: HTMLVideoElement) => {
      if (!video) return;
      
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('loop', 'true');
      video.preload = 'auto';
      
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
        }).catch(() => {
          if (!this.videoPlayAttempted) {
            this.videoPlayAttempted = true;
            
            const playOnInteraction = () => {
              if (heroVideo) heroVideo.play().catch(() => {});
              if (ctaVideo) ctaVideo.play().catch(() => {});
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('touchstart', playOnInteraction);
              document.removeEventListener('scroll', playOnInteraction);
            };
            
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('touchstart', playOnInteraction);
            document.addEventListener('scroll', playOnInteraction, { once: true });
          }
        });
      }
    };
    
    if (heroVideo) {
      if (heroVideo.readyState >= 2) {
        tryPlayVideo(heroVideo);
      } else {
        heroVideo.addEventListener('canplay', () => {
          tryPlayVideo(heroVideo);
        }, { once: true });
      }
    }
    
    if (ctaVideo) {
      if (ctaVideo.readyState >= 2) {
        tryPlayVideo(ctaVideo);
      } else {
        ctaVideo.addEventListener('canplay', () => {
          tryPlayVideo(ctaVideo);
        }, { once: true });
      }
    }
  }

  startStatAnimation() {
    this.statInterval = setInterval(() => {
      this.currentStatIndex = (this.currentStatIndex + 1) % 4;
      this.cdr.detectChanges();
    }, 4000);
  }

  goToStatSlide(index: number) {
    this.currentStatIndex = index;
    clearInterval(this.statInterval);
    this.startStatAnimation();
  }

  startPartnerAutoSlide() {
    this.partnerInterval = setInterval(() => {
      if (this.partnersGroups.length > 0) {
        this.currentPartnerIndex = (this.currentPartnerIndex + 1) % this.partnersGroups.length;
        this.cdr.detectChanges();
      }
    }, 8000);
  }

  startTestimonialAutoSlide() {
    this.testimonialInterval = setInterval(() => {
      if (this.testimonialGroups.length > 0) {
        this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonialGroups.length;
        this.cdr.detectChanges();
      }
    }, 8000);
  }

  resetPartnerInterval() {
    if (this.partnerInterval) {
      clearInterval(this.partnerInterval);
    }
    this.startPartnerAutoSlide();
  }

  resetTestimonialInterval() {
    if (this.testimonialInterval) {
      clearInterval(this.testimonialInterval);
    }
    this.startTestimonialAutoSlide();
  }

  nextPartnerSlide() {
    this.currentPartnerIndex = (this.currentPartnerIndex + 1) % this.partnersGroups.length;
    this.resetPartnerInterval();
  }

  prevPartnerSlide() {
    this.currentPartnerIndex = (this.currentPartnerIndex - 1 + this.partnersGroups.length) % this.partnersGroups.length;
    this.resetPartnerInterval();
  }

  goToPartnerSlide(index: number) {
    this.currentPartnerIndex = index;
    this.resetPartnerInterval();
  }

  nextTestimonial() {
    this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonialGroups.length;
    this.resetTestimonialInterval();
  }

  prevTestimonial() {
    this.currentTestimonialIndex = (this.currentTestimonialIndex - 1 + this.testimonialGroups.length) % this.testimonialGroups.length;
    this.resetTestimonialInterval();
  }

  goToTestimonialSlide(index: number) {
    this.currentTestimonialIndex = index;
    this.resetTestimonialInterval();
  }

  loadHomeData() {
    this.loading = true;
    
    this.http.get<any>(`${environment.apiUrl}/home`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.data = response.data;
            this.animateStats();
            
            const chunkSize = 4;
            for (let i = 0; i < this.partners.length; i += chunkSize) {
              this.partnersGroups.push(this.partners.slice(i, i + chunkSize));
            }
            
            setTimeout(() => {
              this.startPartnerAutoSlide();
              this.startTestimonialAutoSlide();
              setTimeout(() => this.initVideos(), 100);
            }, 1000);
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error:', err);
          this.error = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  animateStats() {
    if (!this.data) return;
    
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    const targetIntercambios = this.data.metrics.intercambios;
    const targetReutilizados = this.data.metrics.reutilizados;
    const targetActivos = this.data.metrics.activos;
    const targetCo2 = this.data.metrics.co2;
    
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      this.animatedStats.intercambios = Math.floor(targetIntercambios * progress);
      this.animatedStats.reutilizados = Math.floor(targetReutilizados * progress);
      this.animatedStats.activos = Math.floor(targetActivos * progress);
      this.animatedStats.co2 = Math.floor(targetCo2 * progress);
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
      this.cdr.detectChanges();
    }, interval);
  }

  loadMapLocations() {
    const token = localStorage.getItem('token');
    const headers: { [key: string]: string } = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    this.http.get<any>(`${environment.apiUrl}/users/map/locations`, { headers })
      .subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            this.locations = response.data;
            this.initializeHomeMap();
          } else {
            this.initializeHomeMap();
          }
        },
        error: () => {
          this.initializeHomeMap();
        }
      });
  }

  initializeHomeMap() {
    const mapContainer = document.getElementById('homeMap');
    if (!mapContainer) return;

    if (this.homeMap) {
      this.homeMap.remove();
      this.mapMarkers = [];
    }

    this.homeMap = L.map(mapContainer).setView([-31.413865, -64.183882], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.homeMap);

    if (this.locations && this.locations.length > 0) {
      this.locations.forEach(location => {
        if (location.coordinates?.lat && location.coordinates?.lng) {
          const marker = L.circleMarker([location.coordinates.lat, location.coordinates.lng], {
            radius: 8,
            color: '#4ADE80',
            weight: 2,
            fillColor: '#22C55E',
            fillOpacity: 0.9
          }).addTo(this.homeMap!)
            .bindPopup(`
              <div style="text-align: center;">
                <img src="${location.avatar_url || '/assets/default-avatar.png'}" 
                     style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 8px;">
                <strong>${location.nombre}</strong><br>
                <span style="color: #22C55E;">${location.tipo}</span><br>
                <span style="font-size: 12px;">${location.ubicacion_texto || 'Ubicación no especificada'}</span>
              </div>
            `);
          this.mapMarkers.push(marker);
        }
      });
    } else {
      const exampleMarkers = [
        { lat: -31.413865, lng: -64.183882, name: 'Cooperativa Central', type: 'Cooperativa' },
        { lat: -31.45, lng: -64.2, name: 'Recicladora Norte', type: 'Recicladora' },
        { lat: -31.38, lng: -64.15, name: 'Emprendedores Verdes', type: 'Emprendedor' }
      ];

      exampleMarkers.forEach(marker => {
        L.circleMarker([marker.lat, marker.lng], {
          radius: 8,
          color: '#4ADE80',
          weight: 2,
          fillColor: '#22C55E',
          fillOpacity: 0.9
        }).addTo(this.homeMap!)
          .bindPopup(`<b>${marker.name}</b><br>${marker.type}<br>Miembro de RenovaRed`);
      });
    }

    setTimeout(() => this.homeMap?.invalidateSize(), 100);
  }

  scrollToNextSection(): void {
    const aboutSection = document.querySelector('.about-hero');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  goToMap(): void {
    this.router.navigate(['/maps']);
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