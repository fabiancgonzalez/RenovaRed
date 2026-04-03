/*import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Analytics {
  
}*/
// analytics.service.ts
import { Injectable } from '@angular/core';

export interface ChatAnalytics {
  totalMessages: number;
  userQuestions: string[];
  avgResponseTime: number;
  mostAskedTopics: Map<string, number>;
  userSatisfaction: number;
  sessionDuration: number;
}

@Injectable({ providedIn: 'root' })
export class ChatAnalyticsService {
  private analytics: ChatAnalytics = {
    totalMessages: 0,
    userQuestions: [],
    avgResponseTime: 0,
    mostAskedTopics: new Map(),
    userSatisfaction: 0,
    sessionDuration: 0
  };
  
  private sessionStartTime: Date = new Date();
  private responseTimes: number[] = [];

  trackMessageSent(message: string) {
    this.analytics.totalMessages++;
    this.analytics.userQuestions.push(message);
    
    // Detectar tópicos por palabras clave
    const topics = this.extractTopics(message);
    topics.forEach(topic => {
      const count = this.analytics.mostAskedTopics.get(topic) || 0;
      this.analytics.mostAskedTopics.set(topic, count + 1);
    });
    
    this.saveToLocalStorage();
  }

  trackResponseTime(startTime: Date) {
    const responseTime = new Date().getTime() - startTime.getTime();
    this.responseTimes.push(responseTime);
    this.analytics.avgResponseTime = this.responseTimes.reduce((a,b) => a+b, 0) / this.responseTimes.length;
    this.saveToLocalStorage();
  }

  trackSessionEnd() {
    const duration = (new Date().getTime() - this.sessionStartTime.getTime()) / 1000;
    this.analytics.sessionDuration = duration;
    this.sendToBackend();
  }

  private extractTopics(message: string): string[] {
    const topics = [];
    const keywords = {
      'reciclaje': ['reciclar', 'reciclaje', 'desechos', 'residuos'],
      'electrónicos': ['electrónico', 'computadora', 'celular', 'tablet'],
      'puntos_acopio': ['acopio', 'donde', 'ubicación', 'cerca'],
      'productos': ['producto', 'comprar', 'eco-friendly', 'sustentable'],
      'beneficios': ['beneficio', 'ventaja', 'ahorro', 'economía']
    };
    
    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some(word => message.toLowerCase().includes(word))) {
        topics.push(topic);
      }
    }
    return topics;
  }

  private saveToLocalStorage() {
    localStorage.setItem('chat_analytics', JSON.stringify({
      totalMessages: this.analytics.totalMessages,
      avgResponseTime: this.analytics.avgResponseTime,
      sessionDuration: this.analytics.sessionDuration,
      mostAskedTopics: Object.fromEntries(this.analytics.mostAskedTopics)
    }));
  }

  private sendToBackend() {
    // Enviar analytics a tu backend
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionDuration: this.analytics.sessionDuration,
        totalMessages: this.analytics.totalMessages,
        avgResponseTime: this.analytics.avgResponseTime,
        topics: Object.fromEntries(this.analytics.mostAskedTopics)
      })
    }).catch(console.error);
  }

  getAnalytics() {
    return this.analytics;
  }
}
