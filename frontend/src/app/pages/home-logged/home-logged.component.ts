import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ChatService } from '../../services/chat.service';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate, keyframes } from '@angular/animations';

interface Activity {
  id: string;
  type: 'publication' | 'exchange' | 'message' | 'view' | 'new_user';
  title: string;
  description: string;
  user?: {
    id: string;
    nombre: string;
    tipo: string;
    avatar?: string;
  };
  publication?: {
    id: string;
    titulo: string;
  };
  timestamp: string;
  icon: string;
  color: string;
  link?: string;
  linkText?: string;
  isNew?: boolean;
}

interface UserStats {
  publications: number;
  messagesUnread: number;
  exchangesCompleted: number;
  materialsRecycled: number;
  co2Saved: number;
  responseRate: number;
}

interface NewsItem {
  title: string;
  description: string;
  image: string;
  category: string;
  date: string;
  link: string;
}

interface GuideStep {
  title: string;
  description: string;
  icon: string;
  color: string;
  link: string;
  linkText: string;
}

const TIPS = [
  { text: '🌳 Reciclar 1 tonelada de papel salva 17 árboles y ahorra 26,500 litros de agua.', source: 'Greenpeace' },
  { text: '🔋 Una lata de aluminio reciclada ahorra suficiente energía para mantener un televisor encendido durante 3 horas.', source: 'Ecoembes' },
  { text: '♻️ El plástico tarda hasta 500 años en degradarse. ¡Reciclar es la solución!', source: 'Greenpeace' },
  { text: '🥤 Reciclar vidrio ahorra un 30% de energía comparado con producirlo desde cero.', source: 'ANFEVI' },
  { text: '📦 Por cada 1000 kg de cartón reciclado, se salvan 7 árboles.', source: 'Córdoba Cuidar' },
  { text: '🍂 El compostaje de residuos orgánicos reduce las emisiones de metano en vertederos.', source: 'Ministerio Ambiente' },
  { text: '💧 Una botella de plástico reciclada puede convertirse en una nueva botella en solo 30 días.', source: 'Gobierno Argentina' },
  { text: '📱 Reciclar electrónicos evita la contaminación por metales pesados en suelos y aguas.', source: 'ONU Medio Ambiente' }
];

@Component({
  selector: 'app-home-logged',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-logged.component.html',
  styleUrls: ['./home-logged.component.css'],
  animations: [
    trigger('tipAnimation', [
      transition(':increment', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':decrement', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('pulseIcon', [
      transition('* => *', [
        animate('300ms ease-in-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.2)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ])
  ]
})
export class HomeLoggedComponent implements OnInit, OnDestroy {
  userName: string = '';
  userAvatar: string | null = null;
  userEmail: string = '';
  userTipo: string = '';
  
  activities: Activity[] = [];
  globalActivity: any[] = [];
  userStats: UserStats = {
    publications: 0,
    messagesUnread: 0,
    exchangesCompleted: 0,
    materialsRecycled: 0,
    co2Saved: 0,
    responseRate: 0
  };
  
  isLoading = true;
  isLoadingGlobalActivity = true;
  showGuide = false;
  private subscriptions: Subscription[] = [];
  private tipInterval: any;
  private pulseTimeout: any;
  
  currentTipIndex = 0;
  currentTip = TIPS[0];
  tipPulse = false;
  
  goalPulse = false;

  heroStats = [
    {
      label: 'Impacto total',
      value: '0 kg',
      icon: 'fa-leaf',
      color: '#22C55E',
      trend: 0
    },
    {
      label: 'CO₂ ahorrado',
      value: '0 kg',
      icon: 'fa-cloud',
      color: '#3B82F6',
      trend: 0
    },
    {
      label: 'Intercambios',
      value: '0',
      icon: 'fa-handshake',
      color: '#8B5CF6',
      trend: 0
    }
  ];

  personalStats = [
    {
      icon: 'fa-cube',
      label: 'Publicaciones',
      value: 0,
      color: '#22C55E',
      progress: 0
    },
    {
      icon: 'fa-message',
      label: 'Mensajes sin leer',
      value: 0,
      color: '#3B82F6'
    },
    {
      icon: 'fa-handshake',
      label: 'Intercambios',
      value: 0,
      color: '#8B5CF6',
      progress: 0
    },
    {
      icon: 'fa-chart-line',
      label: 'Tasa de respuesta',
      value: '0%',
      color: '#F59E0B',
      progress: 0
    }
  ];

  environmentalNews: NewsItem[] = [
    {
      title: 'Europa aprueba nueva ley de economía circular',
      description: 'La UE establece objetivos vinculantes para reducir residuos y aumentar el reciclaje para 2030.',
      image: 'https://www.unidiversidad.com.ar/cache/cubo-de-basura-1-118842917s_1000_1100.jpg',
      category: 'Política',
      date: '15 Mar 2026',
      link: 'https://www.europarl.europa.eu/'
    },
    {
      title: 'Argentina: nuevo programa de reciclaje inclusivo',
      description: 'El gobierno lanza incentivos para cooperativas de recicladores y empresas comprometidas.',
      image: 'https://www.residuosprofesional.com/wp-content/uploads/2017/01/planta-ba.jpg',
      category: 'Nacional',
      date: '12 Mar 2026',
      link: 'https://www.argentina.gob.ar/'
    },
    {
      title: 'Innovación: plástico reciclado para construcción',
      description: 'Startup argentina desarrolla ladrillos ecológicos a partir de residuos plásticos.',
      image: 'https://resizer.iproimg.com/unsafe/768x/filters:format(webp):quality(75):max_bytes(102400)/https://assets.iproup.com/assets/jpg/2024/10/40655.jpg',
      category: 'Innovación',
      date: '10 Mar 2026',
      link: 'https://www.infobae.com/'
    },
    {
      title: 'Chile lidera reciclaje de electrónicos en Latinoamérica',
      description: 'El país supera las 50 mil toneladas de residuos electrónicos reciclados.',
      image: 'https://popeye.cl/wp-content/uploads/2019/04/reciclaje_electronico.jpg',
      category: 'Regional',
      date: '8 Mar 2026',
      link: 'https://www.chile.gob.cl/'
    }
  ];

  guideSteps: GuideStep[] = [
    {
      title: 'Publicá tus materiales',
      description: 'Compartí lo que tenés para reciclar o lo que necesitás. Subí fotos, precios y cantidades.',
      icon: 'fa-cloud-upload-alt',
      color: '#22C55E',
      link: '/marketplace',
      linkText: 'Publicar material'
    },
    {
      title: 'Explorá el mapa',
      description: 'Descubrí otros actores cerca de tu ubicación. Conectá con cooperativas, recicladoras y emprendedores.',
      icon: 'fa-map-location-dot',
      color: '#3B82F6',
      link: '/maps',
      linkText: 'Ver mapa'
    },
    {
      title: 'Contactá y negociá',
      description: 'Iniciá conversaciones, acordá precios, coordiná la logística y concretá intercambios.',
      icon: 'fa-message',
      color: '#8B5CF6',
      link: '/chat',
      linkText: 'Ir a mensajes'
    },
    {
      title: 'Completá intercambios',
      description: 'Concretá tus operaciones y sumá puntos. Cada intercambio cuenta para el planeta.',
      icon: 'fa-handshake',
      color: '#F59E0B',
      link: '/marketplace',
      linkText: 'Ver intercambios'
    }
  ];

  goalProgress = 0;
  goalCurrent = 0;
  goalTarget = 100;

  tipsList = TIPS;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadUserStats();
    this.loadRecentActivity();
    this.loadGlobalActivity();
    this.checkIfNewUser();
    this.startTipRotation();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
    }
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }
  }

  startTipRotation(): void {
    this.tipInterval = setInterval(() => {
      this.nextTip();
    }, 8000);
  }

  nextTip(): void {
    this.currentTipIndex = (this.currentTipIndex + 1) % this.tipsList.length;
    this.currentTip = this.tipsList[this.currentTipIndex];
    this.triggerPulse();
    this.cdr.detectChanges();
  }

  prevTip(): void {
    this.currentTipIndex = (this.currentTipIndex - 1 + this.tipsList.length) % this.tipsList.length;
    this.currentTip = this.tipsList[this.currentTipIndex];
    this.triggerPulse();
    this.cdr.detectChanges();
  }

  goToTip(index: number): void {
    if (index === this.currentTipIndex) return;
    this.currentTipIndex = index;
    this.currentTip = this.tipsList[this.currentTipIndex];
    this.triggerPulse();
    this.cdr.detectChanges();
  }

  triggerPulse(): void {
    this.tipPulse = true;
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }
    this.pulseTimeout = setTimeout(() => {
      this.tipPulse = false;
      this.cdr.detectChanges();
    }, 300);
  }

  triggerGoalPulse(): void {
    this.goalPulse = true;
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }
    this.pulseTimeout = setTimeout(() => {
      this.goalPulse = false;
      this.cdr.detectChanges();
    }, 300);
  }

  checkIfNewUser(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const createdAt = user.created_at;
    if (createdAt) {
      const daysSinceRegister = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
      this.showGuide = daysSinceRegister < 7;
    }
  }

  loadUserData(): void {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        this.userName = user.nombre || user.name || user.email?.split('@')[0] || 'Usuario';
        this.userEmail = user.email || '';
        this.userTipo = user.tipo || '';
        this.userAvatar = user.avatar_url || null;
      } catch (error) {
        console.error('Error parsing user:', error);
        this.userName = 'Usuario';
      }
    }
  }

  loadUserStats(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    this.http.get(`${environment.apiUrl}/users/me/stats`, { headers }).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.userStats = {
            publications: res.data.publications || 0,
            messagesUnread: res.data.messagesUnread || 0,
            exchangesCompleted: res.data.exchangesCompleted || 0,
            materialsRecycled: res.data.materialsRecycled || 0,
            co2Saved: res.data.co2Saved || 0,
            responseRate: res.data.responseRate || 0
          };
          this.updateUIWithStats();
        } else {
          this.loadMockStats();
        }
      },
      error: (err) => {
        console.error('Error cargando estadísticas:', err);
        this.loadMockStats();
      }
    });

    this.loadUnreadMessages();
  }

  loadUnreadMessages(): void {
    this.chatService.getMyConversations().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const unreadCount = res.data.reduce((sum: number, conv: any) => sum + (conv.no_leidos || 0), 0);
          this.userStats.messagesUnread = unreadCount;
          this.personalStats[1].value = unreadCount;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando conversaciones:', err)
    });
  }

  updateUIWithStats(): void {
    this.heroStats[0].value = `${this.userStats.materialsRecycled} kg`;
    this.heroStats[1].value = `${this.userStats.co2Saved} kg`;
    this.heroStats[2].value = `${this.userStats.exchangesCompleted}`;
    
    this.personalStats[0].value = this.userStats.publications;
    this.personalStats[1].value = this.userStats.messagesUnread;
    this.personalStats[2].value = this.userStats.exchangesCompleted;
    this.personalStats[3].value = `${this.userStats.responseRate}%`;
    this.personalStats[3].progress = this.userStats.responseRate;
    
    const oldProgress = this.goalProgress;
    this.goalCurrent = this.userStats.materialsRecycled;
    this.goalProgress = Math.min(100, (this.goalCurrent / this.goalTarget) * 100);
    
    if (oldProgress !== this.goalProgress) {
      this.triggerGoalPulse();
    }
    
    this.cdr.detectChanges();
  }

  loadMockStats(): void {
    this.userStats = {
      publications: 3,
      messagesUnread: 0,
      exchangesCompleted: 3,
      materialsRecycled: 15,
      co2Saved: 38,
      responseRate: 33
    };
    this.updateUIWithStats();
  }

  loadGlobalActivity(): void {
    this.isLoadingGlobalActivity = true;
    
    this.http.get<any>(`${environment.apiUrl}/home`).subscribe({
      next: (response) => {
        if (response.success && response.data?.activity) {
          this.globalActivity = response.data.activity;
        } else {
          this.globalActivity = [];
        }
        this.isLoadingGlobalActivity = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando actividad global:', err);
        this.isLoadingGlobalActivity = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadRecentActivity(): void {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    this.http.get(`${environment.apiUrl}/users/me/activity`, { headers }).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.length > 0) {
          this.activities = res.data.map((act: any) => ({
            ...act,
            icon: this.getActivityIcon(act.type),
            color: this.getActivityColor(act.type),
            link: this.getActivityLink(act),
            linkText: this.getActivityLinkText(act.type),
            isNew: this.isNewActivity(act.timestamp)
          }));
        } else {
          this.activities = [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando actividad:', err);
        this.activities = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      'publication': 'fa-newspaper',
      'exchange': 'fa-handshake',
      'message': 'fa-message',
      'view': 'fa-eye',
      'new_user': 'fa-user-plus'
    };
    return icons[type] || 'fa-circle-info';
  }

  getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      'publication': '#22C55E',
      'exchange': '#8B5CF6',
      'message': '#3B82F6',
      'view': '#F59E0B',
      'new_user': '#EC489A'
    };
    return colors[type] || '#9CA3AF';
  }

  getActivityLink(activity: any): string {
    switch (activity.type) {
      case 'publication':
        return `/marketplace/${activity.publication?.id}`;
      case 'message':
        return '/chat';
      case 'exchange':
        return '/chat';
      case 'view':
        return `/marketplace/${activity.publication?.id}`;
      default:
        return '/marketplace';
    }
  }

  getActivityLinkText(type: string): string {
    const texts: Record<string, string> = {
      'publication': 'Ver publicación',
      'exchange': 'Ver detalles',
      'message': 'Responder',
      'view': 'Ver estadísticas',
      'new_user': 'Ver perfil'
    };
    return texts[type] || 'Ver más';
  }

  isNewActivity(timestamp: string): boolean {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  }

  getAvatarSrc(avatarUrl: string | null | undefined): string {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl;
    }
    return '/assets/default-avatar.png';
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
    
    return date.toLocaleDateString('es-AR');
  }

  dismissGuide(): void {
    this.showGuide = false;
  }

  getGlobalActivityIcon(type: string): string {
    return type === 'usuario' ? 'fa-user' : 'fa-newspaper';
  }

  getGlobalActivityClass(type: string): string {
    return type === 'usuario' ? 'usuario' : 'publicacion';
  }
}