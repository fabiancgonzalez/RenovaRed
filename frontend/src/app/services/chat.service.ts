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

export interface ExchangeQuote {
  material: string;
  inputMaterial: string;
  ks: number;
  precioUnitarioArs: number;
  precioTotalArs: number;
  moneda: string;
  qrPayload: string;
  qrImageUrl: string;
  qrTipo?: 'interoperable' | 'informativo' | 'mercadopago_dinamico';
  qrEsInteroperable?: boolean;
  qrMensaje?: string;
  mpPayment?: {
    provider: string;
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint?: string | null;
    externalReference?: string;
  };
  paymentIntent?: {
    amountArs: number;
    currency: string;
    description: string;
    receiver: {
      provider?: string;
      titular: string;
      alias: string;
      cvu?: string;
      cbu?: string;
    };
    wallets: Array<{
      id: string;
      name: string;
      webUrl: string;
    }>;
  };
  cotizacionFuente: string;
}

export interface MercadoPagoPaymentStatus {
  found: boolean;
  status: string;
  statusDetail: string;
  approved: boolean;
  paymentId?: string | number | null;
  amount?: number | null;
  currency?: string;
  dateApproved?: string | null;
  dateCreated?: string | null;
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

  getUserProfile(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/${userId}`, { headers });
  }

  getUserLocations(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/map/locations`, { headers });
  }

  getExchangeStatus(conversationId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/exchanges/conversation/${conversationId}/status`, { headers });
  }

  requestExchange(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/exchanges/request`, data, { headers });
  }

  getExchangeQuote(material: string, ks: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/exchanges/quote`, { material, ks }, { headers });
  }

  getMercadoPagoPaymentStatus(payload: { preferenceId?: string; externalReference?: string }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/exchanges/payment-status`, payload, { headers });
  }

  respondToExchange(exchangeId: string, action: 'aceptar' | 'rechazar'): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/exchanges/${exchangeId}/respond/${action}`, {}, { headers });
  }

  getMyExchanges(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/exchanges/me`, { headers });
  }

  getExchangeDetail(exchangeId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/exchanges/${exchangeId}`, { headers });
  }
}