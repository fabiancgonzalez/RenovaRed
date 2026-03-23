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
  
  private exchangeRequestSubject = new Subject<any>();
  private exchangeAcceptedSubject = new Subject<any>();
  private exchangeRejectedSubject = new Subject<any>();
  private exchangeStatusUpdateSubject = new Subject<any>();

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
      this.messagesReadSubject.next(data);
    });

    this.socket.on('conversation-deleted', (data) => {
      this.conversationDeletedSubject.next(data);
    });

    this.socket.on('conversation-reactivated', (data) => {
      this.conversationReactivatedSubject.next(data);
    });
    
    this.socket.on('exchange-request', (data) => {
      this.exchangeRequestSubject.next(data);
    });

    this.socket.on('exchange-accepted', (data) => {
      this.exchangeAcceptedSubject.next(data);
    });

    this.socket.on('exchange-rejected', (data) => {
      this.exchangeRejectedSubject.next(data);
    });

    this.socket.on('exchange-status-update', (data) => {
      this.exchangeStatusUpdateSubject.next(data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversations(conversationIds: string[]): void {
    if (!this.socket?.connected) {
      this.joinedConversations = [...new Set([...this.joinedConversations, ...conversationIds])];
      return;
    }

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

    this.socket.emit('mark-read', { conversationId, messageIds });
  }

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
  
  onExchangeRequest(): Observable<any> {
    return this.exchangeRequestSubject.asObservable();
  }

  onExchangeAccepted(): Observable<any> {
    return this.exchangeAcceptedSubject.asObservable();
  }

  onExchangeRejected(): Observable<any> {
    return this.exchangeRejectedSubject.asObservable();
  }

  onExchangeStatusUpdate(): Observable<any> {
    return this.exchangeStatusUpdateSubject.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}