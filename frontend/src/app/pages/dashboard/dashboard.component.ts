import { Component, AfterViewInit, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DashboardData {
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
  activity: {
    tipo: string;
    texto: string;
    fecha: string;
  }[];
  lastUpdated: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  data: DashboardData | null = null;
  view: string = 'dashboard';
  searchTerm: string = '';
  users: any[] = [];
  filteredUsers: any[] = [];

  conversations: any[] = [];
  conversationsLoading = false;
  conversationsPagination = {
    total: 0,
    page: 1,
    limit: 6,
    pages: 0
  };
  conversationsFilter = 'all';
  conversationsSearch = '';
  conversationsStats = {
    totalMessages: 0,
    totalConversations: 0,
    activeConversations: 0,
    noResponseConversations: 0
  };

  private usersChart: Chart | null = null;
  private materialsChart: Chart | null = null;
  
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: any;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.loadStatsCharts();
      this.loadCategoriesChart();
    }, 100);
    
    this.initResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.usersChart) {
      this.usersChart.destroy();
      this.usersChart = null;
    }
    if (this.materialsChart) {
      this.materialsChart.destroy();
      this.materialsChart = null;
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      this.updateChartsSize();
    }, 250);
  }

  private initResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      this.updateChartsSize();
    });

    const containers = [
      document.querySelector('.chart-card:first-child .chart-container'),
      document.querySelector('.chart-card:last-child .chart-container')
    ];

    containers.forEach(container => {
      if (container) {
        this.resizeObserver?.observe(container);
      }
    });
  }

  private updateChartsSize(): void {
    if (this.usersChart) {
      setTimeout(() => {
        this.usersChart?.resize();
        this.usersChart?.update('none');
      }, 100);
    }
    
    if (this.materialsChart) {
      setTimeout(() => {
        this.materialsChart?.resize();
        this.materialsChart?.update('none');
      }, 100);
    }
  }

  setView(v: string) {
    this.view = v;
    if (v === 'users') {
      this.loadUsers();
    } else if (v === 'dashboard') {
      setTimeout(() => {
        this.loadStatsCharts();
        this.loadCategoriesChart();
      }, 100);
    } else if (v === 'messages') {
      this.loadConversationsForAdmin();
    }
  }

  loadDashboardData() {
    this.http.get<any>(`${environment.apiUrl}/home`)
    .subscribe({
      next: (response) => {
        if (response.success) {
          this.data = response.data;
      }
    }, error: (err) => {
      console.error(err);
    }
  });
}

  loadUsers() {
    const token = localStorage.getItem('token');
    
    this.http.get<any>(`${environment.apiUrl}/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.users = res.data || [];
        this.filteredUsers = [...this.users];
        this.updatePagination();
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  changeRole(userId: number, newRole: string) {
    this.http.patch(`${environment.apiUrl}/users/${userId}/role`, {
      tipo: newRole
    }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error(err)
    });
  }

  deleteUser(userId: number) {
    if (!confirm('¿Eliminar usuario definitivamente?')) return;
    this.http.delete(`${environment.apiUrl}/users/${userId}/hard`).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error(err)
    });
  }

  filterUsers() {
    const term = this.searchTerm.toLowerCase();

    this.filteredUsers = this.users.filter(u => 
      u.nombre.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
    this.currentPage = 1;
    this.updatePagination();
  }

  currentPage: number = 1;
  itemsPerPage: number = 5;
  paginatedUsers: any[] = [];
  totalPages: number = 0;

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  loadCategoriesChart() {
    this.http.get<any>(`${environment.apiUrl}/categories/stats`).subscribe({
      next: (res) => {
        const labels = res.data.map((c: any) => c.nombre);
        const values = res.data.map((c: any) => c.total);
        this.createMaterialChart(labels, values);
      },
      error: (err) => { 
        console.error('Error cargando categorías', err); 
      }
    });
  }

  loadStatsCharts() {    
    this.http.get<any>(`${environment.apiUrl}/users/stats`)
      .subscribe(res => {
        const stats = res.data;
        const labels = stats.map((s: any) => s.fecha);
        const users = stats.map((s: any) => Number(s.total));
        this.createUsersChart(labels, users);
      });
  }

  createUsersChart(labels: any[], data: any[]) {
    const canvas = document.getElementById('usersChart') as HTMLCanvasElement;

    if (!canvas) {
      console.error('Canvas userChart no encontrado');
      return;
    }
    
    if (this.usersChart) {
      this.usersChart.destroy();
      this.usersChart = null;
    }
    
    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || 400;
    
    const fontSize = containerWidth < 500 ? 10 : (containerWidth < 700 ? 11 : 12);
    const pointRadius = containerWidth < 500 ? 3 : (containerWidth < 700 ? 4 : 5);
    const aspectRatio = containerWidth < 500 ? 1.2 : (containerWidth < 700 ? 1.4 : 1.8);
    const showTitle = containerWidth > 600;
    const titleFontSize = containerWidth < 500 ? 10 : 11;
    
    this.usersChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Nuevos usuarios',
            data: data,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#22C55E',
            pointBorderColor: '#0B1120',
            pointBorderWidth: 2,
            pointRadius: pointRadius,
            pointHoverRadius: pointRadius + 2,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: aspectRatio,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#9CA3AF',
              font: {
                size: fontSize,
                weight: 500
              },
              usePointStyle: true,
              boxWidth: fontSize,
            }
          },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#FFFFFF',
            bodyColor: '#9CA3AF',
            borderColor: '#22C55E',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `📈 ${context.raw} usuarios`;
              }
            }
          }
        },
        scales: { 
          x: {
            ticks: { 
              color: '#9CA3AF',
              maxRotation: containerWidth < 500 ? 90 : 45,
              minRotation: containerWidth < 500 ? 90 : 45,
              font: { size: fontSize - 1 }
            },
            grid: {
              color: 'rgba(255,255,255,0.05)',
              drawOnChartArea: true
            },
            title: {
              display: showTitle,
              text: 'Fecha',
              color: '#6B7280',
              font: { size: titleFontSize }
            }
          },
          y: {
            ticks: { 
              color: '#9CA3AF',
              stepSize: 1,
              font: { size: fontSize - 1 }
            },
            grid: {
              color: 'rgba(255,255,255,0.05)',
              drawOnChartArea: true
            },
            title: {
              display: showTitle,
              text: 'Usuarios',
              color: '#6B7280',
              font: { size: titleFontSize }
            },
            beginAtZero: true
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        elements: {
          point: {
            hoverBackgroundColor: '#22C55E',
            hoverBorderColor: '#FFFFFF'
          }
        },
        animation: {
          duration: 0
        }
      }
    });
  }

  createMaterialChart(labels: any[], data: any[]) {
    const canvas = document.getElementById('materialsChart') as HTMLCanvasElement;

    if (!canvas) {
      console.error('Canvas materialsChart no encontrado');
      return;
    }
    
    if (this.materialsChart) {
      this.materialsChart.destroy();
      this.materialsChart = null;
    }
    
    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || 400;
    
    const combined = labels.map((label, index) => ({
      label: label,
      value: data[index]
    })).sort((a, b) => b.value - a.value);
    
    let maxCategories = 6;
    if (containerWidth < 480) maxCategories = 4;
    else if (containerWidth < 768) maxCategories = 5;
    
    const topCategories = combined.slice(0, maxCategories);
    
    let finalLabels: string[] = [];
    let finalData: number[] = [];
    
    if (combined.length > maxCategories) {
      const othersSum = combined.slice(maxCategories).reduce((sum, item) => sum + item.value, 0);
      finalLabels = [...topCategories.map(item => item.label), 'Otros'];
      finalData = [...topCategories.map(item => item.value), othersSum];
    } else {
      finalLabels = topCategories.map(item => item.label);
      finalData = topCategories.map(item => item.value);
    }
    
    const colors = [
      '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC489A', '#6B7280'
    ];
    
    let legendPosition: 'right' | 'bottom' = containerWidth < 768 ? 'bottom' : 'right';
    let fontSize = containerWidth < 480 ? 10 : (containerWidth < 768 ? 11 : 12);
    let cutout = containerWidth < 480 ? 50 : (containerWidth < 768 ? 52 : 55);
    let boxWidth = containerWidth < 480 ? 8 : (containerWidth < 768 ? 10 : 12);
    let padding = containerWidth < 480 ? 6 : (containerWidth < 768 ? 8 : 12);
    let aspectRatio = containerWidth < 480 ? 1.1 : (containerWidth < 768 ? 1.2 : 1.4);
    
    this.materialsChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: finalLabels,
        datasets: [
          {
            data: finalData,
            backgroundColor: colors.slice(0, finalLabels.length),
            borderColor: '#111827',
            borderWidth: 2,
            hoverOffset: 15,
            spacing: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: aspectRatio,
        cutout: cutout,
        plugins: {
          legend: {
            position: legendPosition,
            align: 'center',
            labels: {
              color: '#9CA3AF',
              font: {
                size: fontSize,
                weight: 500
              },
              usePointStyle: true,
              boxWidth: boxWidth,
              padding: padding,
            }
          },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#FFFFFF',
            bodyColor: '#9CA3AF',
            borderColor: '#22C55E',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context: any) {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const value = context.raw;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          duration: 0
        },
        layout: {
          padding: {
            top: padding,
            bottom: padding,
            left: padding,
            right: padding
          }
        }
      }
    });
  }

  loadConversationsForAdmin() {
    this.conversationsLoading = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    const params: any = {
      page: this.conversationsPagination.page,
      limit: this.conversationsPagination.limit,
      filter: this.conversationsFilter
    };
    
    if (this.conversationsSearch) {
      params.search = this.conversationsSearch;
    }
    
    this.http.get(`${environment.apiUrl}/conversations/admin/all`, { headers, params }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.conversations = res.data.conversations;
          this.conversationsPagination = res.data.pagination;
          this.conversationsStats = res.data.stats;
        }
        this.conversationsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.conversationsLoading = false;
      }
    });
  }

  filterConversations(filter: string) {
    this.conversationsFilter = filter;
    this.conversationsPagination.page = 1;
    this.loadConversationsForAdmin();
  }

  searchConversations() {
    this.conversationsPagination.page = 1;
    this.loadConversationsForAdmin();
  }

  goToConversationsPage(page: number) {
    if (page < 1 || page > this.conversationsPagination.pages) return;
    this.conversationsPagination.page = page;
    this.loadConversationsForAdmin();
  }

  deleteConversation(conversationId: string) {
    if (!confirm('¿Estás seguro de eliminar esta conversación? Se eliminarán todos los mensajes y no se podrá recuperar.')) return;
    
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    this.http.delete(`${environment.apiUrl}/conversations/admin/${conversationId}`, { headers }).subscribe({
      next: (res: any) => {
        if (res.success) {
          alert('Conversación eliminada correctamente');
          this.loadConversationsForAdmin();
        }
      },
      error: (err) => {
        console.error('Error deleting conversation:', err);
        alert('Error al eliminar la conversación');
      }
    });
  }

  getAvatarSrc(avatarUrl: string | null | undefined): string {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl;
    }
    return '/assets/default-avatar.png';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
    return date.toLocaleDateString('es-AR');
  }
}