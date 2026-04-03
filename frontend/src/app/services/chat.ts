
// chat-widget.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
    imageUrl?: string; // ✅ Propiedad opcional para imágenes
  isLoading?: boolean; // ✅ Para estados de carga
  error?: string; // ✅ Para manejo de errores
}

@Injectable({
  providedIn: 'root',
})
export class ChatWidgetService {

  private http = inject(HttpClient);
  private apiUrl = environment.chatApiUrl ?? `${environment.apiUrl}/chat`;
  private localFallbackApiUrl = 'http://localhost:3000/api/chat';
  // Historial de conversación
  private conversationHistory: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un asistente experto en economía circular y sustentabilidad para RenovaRed. 
                Ayudas a clientes con dudas sobre reciclaje, reutilización de materiales, 
                puntos de acopio, y productos ecológicos. Responde de manera amable y concisa.`,
      timestamp: new Date()
    }
  ];

  sendMessage(userMessage: string): Observable<string> {
    // Agregar mensaje del usuario al historial
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });



    return this.http.post<{ reply: string }>(this.apiUrl, {
      messages: this.conversationHistory,
      userMessage: userMessage
    }).pipe(
      catchError((error: any) => {
        const shouldFallback = this.apiUrl !== this.localFallbackApiUrl && error?.status === 404;
        if (!shouldFallback) {
          return throwError(() => error);
        }

        return this.http.post<{ reply: string }>(this.localFallbackApiUrl, {
          messages: this.conversationHistory,
          userMessage: userMessage
        });
      }),
      map(response => {
        // Agregar respuesta al historial
        this.conversationHistory.push({
          role: 'assistant',
          content: response.reply,
          timestamp: new Date()
        });
        return response.reply;
      })
    );
  }



  

  sendImage(imageUrl: string): Observable<string> {
    const prompt = `El usuario compartio una imagen con esta URL: ${imageUrl}. Brinda una respuesta breve y util relacionada con reciclaje y economia circular.`;
    return this.sendMessage(prompt);
  }

  clearHistory() {
    this.conversationHistory = this.conversationHistory.filter(m => m.role === 'system');
  }

  getHistory(): ChatMessage[] {
    return this.conversationHistory.filter(m => m.role !== 'system');
  }
}