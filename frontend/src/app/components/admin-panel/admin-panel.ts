/*import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-panel',
  imports: [],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
})
export class AdminPanel {

}*/
// admin-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { ChatAnalyticsService } from './../../services/analytics';
import { CommonModule,DecimalPipe } from '@angular/common';


@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="analytics-panel" *ngIf="showAnalytics">
      <h3>📊 Analytics del Chat</h3>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💬</div>
          <div class="stat-value">{{ analytics.totalMessages }}</div>
          <div class="stat-label">Total Mensajes</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-value">{{ analytics.avgResponseTime | number:'1.0-0' }}ms</div>
          <div class="stat-label">Tiempo Respuesta</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">{{ analytics.sessionDuration | number:'1.0-0' }}s</div>
          <div class="stat-label">Duración Sesión</div>
        </div>
      </div>
      
      <div class="topics-section">
        <h4>🔥 Tópicos más consultados</h4>
        <div class="topics-list">
          <div *ngFor="let topic of getTopTopics()" class="topic-item">
            <div class="topic-name">{{ topic.name }}</div>
            <div class="topic-bar">
              <div class="topic-fill" [style.width.%]="topic.percentage"></div>
            </div>
            <div class="topic-count">{{ topic.count }}</div>
          </div>
        </div>
      </div>
      
      <button class="export-btn" (click)="exportAnalytics()">
        📥 Exportar Analytics
      </button>
    </div>
  `,
  styles: [`
    .analytics-panel {
      background: #111827;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
      color: white;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    .stat-card {
      background: #0F172A;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #151C2C;
    }
    .stat-icon { font-size: 24px; margin-bottom: 8px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #22C55E; }
    .stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
    .topics-list { margin-top: 16px; }
    .topic-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .topic-name { width: 100px; font-size: 14px; color: #9CA3AF; }
    .topic-bar {
      flex: 1;
      height: 8px;
      background: #151C2C;
      border-radius: 4px;
      overflow: hidden;
    }
    .topic-fill {
      height: 100%;
      background: #22C55E;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .topic-count { width: 40px; text-align: right; font-size: 12px; color: #22C55E; }
    .export-btn {
      width: 100%;
      margin-top: 20px;
      padding: 10px;
      background: #22C55E;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
  `]
})
export class AdminPanel implements OnInit {
  showAnalytics = false;
  analytics: any = { totalMessages: 0, avgResponseTime: 0, sessionDuration: 0, mostAskedTopics: {} };
  
  constructor(private analyticsService: ChatAnalyticsService) {}
  
  ngOnInit() {
    // Solo mostrar para admins (puedes agregar lógica de roles)
    this.showAnalytics = localStorage.getItem('user_role') === 'admin';
    this.analytics = this.analyticsService.getAnalytics();
  }
  
  getTopTopics() {
    const topics = Object.entries(this.analytics.mostAskedTopics);
    const total = topics.reduce((sum, [_, count]) => sum + (count as number), 0);
    return topics.map(([name, count]) => ({
      name,
      count: count as number,
      percentage: (count as number / total) * 100
    })).sort((a,b) => (b.count as number) - (a.count as number)).slice(0, 5);
  }
  
  exportAnalytics() {
    const dataStr = JSON.stringify(this.analytics, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-analytics-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
