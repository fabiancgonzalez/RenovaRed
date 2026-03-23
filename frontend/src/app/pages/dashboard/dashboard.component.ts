import { Component, AfterViewInit, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

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
export class DashboardComponent implements OnInit, AfterViewInit {
  data: DashboardData | null = null;
  view: string = 'dashboard';
  searchTerm: string = '';
  users: any[] = [];
  filteredUsers: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadStatsCharts();
    this.loadCategoriesChart();
  }

  ngAfterViewInit(): void {}

  // CAMBIO DE VISTA
  setView(v: string) {
    this.view = v;
    if (v === 'users'){
      this.loadUsers();
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
        this.users = res.data;
        this.filteredUsers = [...this.users];
        this.updatePagination();
      },
      error: (err) => console.error("ERROR USERS", err)
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
        console.log("CATEGORIES STATS", res);

        const labels = res.data.map((c: any) => c.nombre);
        const values = res.data.map((c: any) => c.total);

        this.createMaterialChart(labels, values);
    },error: (err) => { console.error('Error cargando categorías', err); 
    }
    });
}
  loadStatsCharts() {    
  this.http.get<any>(`${environment.apiUrl}/users/stats`)
    .subscribe(res => {

      console.log("USER STATS:", res);

      const stats = res.data;

      const labels = stats.map((s: any) => s.fecha);
      const users = stats.map((s: any) => Number(s.total));

      setTimeout(() => {
        this.createUsersChart(labels, users);
      }, 100);
    });
}

  createUsersChart(labels: any[], data: any[]) {
  const canvas = document.getElementById('usersChart') as HTMLCanvasElement;

  if (!canvas) {
    console.error('Canvas userChart no encontrado');
    return;
  }
  Chart.getChart(canvas)?.destroy();
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Nuevos usuarios',
          data: data,
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22C55E',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'white',
            font: {
              size: 13
            }
          }
        },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#fff',
          bodyColor: '#d1d5db',
          borderColor: '#22C55E',
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: { x: {
          ticks: { color: 'white' },
          grid: {
            color: 'rgba(255,255,255,0.05)'
          }
        },
        y: {
          ticks: { color: 'white' },
          grid: {
            color: 'rgba(255,255,255,0.05)'
          }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      }
    }
  });
}
  createMaterialChart(labels: any[], data: any[]) {
    const canvas: any = document.getElementById('materialsChart') as HTMLCanvasElement;

    if (!canvas) {
      console.error('Canvas materialsChart no encontrado');
      return;
    }
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              '#38BDF8', // Celeste
              '#22C55E', // Verde
              '#F59E0B', // Amarillo
              '#A78BFA', // Violeta
              '#F472B6', // Rosa
              '#F43F5E', // Rojo
              '#d37b34', // Naranja
              '#4625ff', // Azul
            ],
            borderColor: 'rgba(255,255,255,0.15',
            borderWidth: 2,
            hoverOffset: 12,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'white',
              padding: 15,
              boxWidth:12,
              font:{size: 12}
            }
        },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#fff',
          bodyColor: '#d1d5db',
          borderColor: '#22C55E',
          borderWidth: 1,
          padding: 10,
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
        animateRotate: true,
        duration: 1200
      }
    }
  });
  }
}