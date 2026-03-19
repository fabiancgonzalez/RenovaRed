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
  private messagesReadSubject = new Subject<{ conversationId: string; messageIds: string[] }>();
  private typingSubject = new Subject<any>();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    const socketUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {});

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error);
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

    this.socket.on('user-typing', (data) => {
      this.typingSubject.next(data);
    });

    this.socket.on('disconnect', () => {});
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversations(conversationIds: string[]): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-conversations', conversationIds);
    }
  }

  sendMessage(conversationId: string, content: string, attachments: any[] = []): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send-message', { conversationId, content, attachments });
    }
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark-read', { conversationId, messageIds });
    }
  }

  requestOnlineUsers(): void {
    if (this.socket?.connected) {
      this.socket.emit('get-online-users');
    }
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
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

  onMessagesRead(): Observable<{ conversationId: string; messageIds: string[] }> {
    return this.messagesReadSubject.asObservable();
  }

  onUserTyping(): Observable<any> {
    return this.typingSubject.asObservable();
  }
}