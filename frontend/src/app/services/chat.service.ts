import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Message {
  id: string;
  content: string;
  created_at: string;
  esMio: boolean;
  remitente: string;
  remitenteId: string;
  avatar: string;
  read: boolean;
  attachments?: any[];
}

export interface Conversation {
  id: string;
  publication_id: string;
  otro_usuario: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    avatar: string | null;
    last_login?: string;
    tipo?: string;
    ubicacion_texto?: string;
  };
  ultimo_mensaje: string;
  ultimo_mensaje_at: string;
  estado: string;
  no_leidos: number;
}

export interface ConversationDetail {
  id: string;
  publication_id: string;
  publication?: {
    id: string;
    titulo: string;
    descripcion: string;
    imagenes?: string[];
    precio?: number;
    cantidad?: number;
    estado?: string;
    categoria?: {
      id: string;
      nombre: string;
      color?: string;
    };
  };
  comprador: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    avatar: string | null;
    last_login?: string;
    tipo?: string;
    ubicacion_texto?: string;
  } | null;
  vendedor: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    avatar: string | null;
    last_login?: string;
    tipo?: string;
    ubicacion_texto?: string;
  } | null;
  estado: string;
  created_at: string;
  mensajes: Message[];
  deleted_by_other?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getMyConversations(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/conversations/mis-conversaciones`, { headers });
  }

  getConversation(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/conversations/${id}`, { headers });
  }

  getMessages(conversationId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/conversations/${conversationId}/messages`, { headers });
  }

  sendMessage(conversationId: string, content: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/conversations/${conversationId}/messages`, 
      { content }, { headers });
  }

  markAsRead(conversationId: string, messageId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/conversations/${conversationId}/messages/${messageId}/leer`, 
      {}, { headers });
  }

  deleteConversationForMe(conversationId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/conversations/${conversationId}/for-me`, { headers });
  }

  // Método para obtener perfil de usuario
  getUserProfile(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/${userId}`, { headers });
  }

  // Método para obtener todas las ubicaciones de usuarios para el mapa
  getUserLocations(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/map/locations`, { headers });
  }
}