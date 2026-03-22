import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;

  private messageSubject = new Subject<any>();
  private onlineStatusSubject = new Subject<{ userId: string; online: boolean }>();
  private onlineUsersSubject = new Subject<{ userIds: string[] }>();
  private messagesReadSubject = new Subject<any>();
  private conversationDeletedSubject = new Subject<any>();
  private conversationReactivatedSubject = new Subject<any>();
  private errorSubject = new Subject<any>();

  private joinedConversations: string[] = [];

  connect(token: string): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    const socketUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      // rejoin automático
      if (this.joinedConversations.length > 0) {
        this.joinConversations(this.joinedConversations);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WS error:', error);
    });

    this.socket.on('error', (error) => {
      this.errorSubject.next(error);
    });

    this.socket.on('user-online', (data) => {
      this.onlineStatusSubject.next({ userId: data.userId, online: true });
    });

    this.socket.on('user-offline', (data) => {
      this.onlineStatusSubject.next({ userId: data.userId, online: false });
    });

    this.socket.on('online-users', (data) => {
      this.onlineUsersSubject.next({ userIds: data.userIds });
    });

    this.socket.on('new-message', (data) => {
      this.messageSubject.next(data);
    });

    this.socket.on('messages-read', (data) => {
      console.log('📥 messages-read recibido en service:', data);
      this.messagesReadSubject.next(data);
    });

    // Escuchar cuando el otro usuario elimina la conversación
    this.socket.on('conversation-deleted', (data) => {
      console.log('🗑️ conversation-deleted recibido en service:', data);
      this.conversationDeletedSubject.next(data);
    });

    // 🔥 NUEVO: Escuchar cuando el otro usuario reactiva la conversación
    this.socket.on('conversation-reactivated', (data) => {
      console.log('🔄 conversation-reactivated recibido en service:', data);
      this.conversationReactivatedSubject.next(data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversations(conversationIds: string[]): void {
    if (!this.socket?.connected) {
      // Guardar para cuando se conecte
      this.joinedConversations = [...new Set([...this.joinedConversations, ...conversationIds])];
      return;
    }

    // Filtrar nuevas conversaciones para no unirse dos veces
    const newIds = conversationIds.filter(id => !this.joinedConversations.includes(id));
    if (newIds.length === 0) return;

    this.joinedConversations = [...this.joinedConversations, ...newIds];
    this.socket.emit('join-conversations', newIds);
  }

  sendMessage(conversationId: string, content: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket no conectado');
      return;
    }

    this.socket.emit('send-message', { conversationId, content });
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    if (!this.socket?.connected) return;

    console.log('👁️ Enviando mark-as-read:', { conversationId, messageIds });
    this.socket.emit('mark-read', { conversationId, messageIds });
  }

  // ================= OBSERVABLES =================
  onNewMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  onUserOnline(): Observable<{ userId: string; online: boolean }> {
    return this.onlineStatusSubject.asObservable();
  }

  onOnlineUsers(): Observable<{ userIds: string[] }> {
    return this.onlineUsersSubject.asObservable();
  }

  onMessagesRead(): Observable<any> {
    return this.messagesReadSubject.asObservable();
  }

  onConversationDeleted(): Observable<any> {
    return this.conversationDeletedSubject.asObservable();
  }

  onConversationReactivated(): Observable<any> {
    return this.conversationReactivatedSubject.asObservable();
  }

  onError(): Observable<any> {
    return this.errorSubject.asObservable();
  }

  // ================= UTILS =================
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}