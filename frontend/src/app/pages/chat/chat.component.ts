import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService, Conversation, ConversationDetail, Message } from '../../services/chat.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  conversations: Conversation[] = [];
  currentConversation: ConversationDetail | null = null;
  newMessage = '';
  loading = false;
  error = '';
  successMessage = '';
  selectedConversationId: string | null = null;
  currentUserId: string = '';
  onlineUsers: Set<string> = new Set();
  
  showDeleteModal = false;
  conversationToDelete: Conversation | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private webSocketService: WebSocketService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        this.currentUserId = user.id || '';
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }

  ngOnInit(): void {
    this.loadConversations();
    this.setupWebSocket();

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        setTimeout(() => {
          this.selectConversation(id);
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  setupWebSocket(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.webSocketService.connect(token);

    this.subscriptions.push(
      this.webSocketService.onNewMessage().subscribe(data => {
        if (data.conversationId === this.selectedConversationId) {
          if (this.currentConversation) {
            this.currentConversation.mensajes.push(data.message);
            setTimeout(() => this.scrollToBottom(), 100);
          }
        }
        this.loadConversations();
      })
    );

    this.subscriptions.push(
      this.webSocketService.onUserOnline().subscribe(({ userId, online }) => {
        if (online) {
          this.onlineUsers.add(userId);
        } else {
          this.onlineUsers.delete(userId);
        }
        this.onlineUsers = new Set(this.onlineUsers);
      })
    );

    this.subscriptions.push(
      this.webSocketService.onOnlineUsers().subscribe(({ userIds }) => {
        this.onlineUsers = new Set(userIds);
      })
    );

    this.subscriptions.push(
      this.webSocketService.onMessagesRead().subscribe(data => {
        if (data.conversationId === this.selectedConversationId && this.currentConversation) {
          this.currentConversation.mensajes = this.currentConversation.mensajes.map(msg => {
            if (data.messageIds.includes(msg.id)) {
              return { ...msg, read: true };
            }
            return msg;
          });
        }
        this.loadConversations();
      })
    );
  }

  getAvatarSrc(avatarUrl: string | null | undefined): string {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl;
    }
    return '/assets/default-avatar.png';
  }

  isUserOnline(userId: string | undefined): boolean {
    if (!userId) return false;
    return this.onlineUsers.has(userId);
  }

  getUserStatus(userId: string | undefined, lastLogin: string | null | undefined): string {
    if (this.isUserOnline(userId)) {
      return 'En línea';
    }
    return this.getLastSeen(lastLogin);
  }

  getLastSeen(lastLogin: string | null | undefined): string {
    if (!lastLogin) return 'Desconectado';
    
    const last = new Date(lastLogin).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - last) / 60000);
    
    if (diffMins < 1) return 'Desconectado recientemente';
    if (diffMins < 60) return `Últ. vez hace ${diffMins} min`;
    if (diffMins < 1440) return `Últ. vez hace ${Math.floor(diffMins / 60)} h`;
    
    const days = Math.floor(diffMins / 1440);
    return `Últ. vez hace ${days} día${days > 1 ? 's' : ''}`;
  }

  handleConversationImageError(event: Event, conversation: Conversation): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/assets/default-avatar.png';
    if (conversation?.otro_usuario) {
      conversation.otro_usuario.avatar = '/assets/default-avatar.png';
    }
  }

  handleMessageImageError(event: Event, message: Message): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/assets/default-avatar.png';
    if (message) {
      message.avatar = '/assets/default-avatar.png';
    }
  }

  handleHeaderImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/assets/default-avatar.png';
  }

  loadConversations(): void {
    this.loading = true;
    
    this.chatService.getMyConversations().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.conversations = response.data.sort((a: Conversation, b: Conversation) => 
            new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime()
          );
          
          const conversationIds = this.conversations.map(c => c.id);
          if (conversationIds.length > 0) {
            this.webSocketService.joinConversations(conversationIds);
          }

          setTimeout(() => {
            this.webSocketService.requestOnlineUsers();
          }, 1000);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando conversaciones:', err);
        this.error = 'No se pudieron cargar las conversaciones';
        this.loading = false;
      }
    });
  }

  selectConversation(conversationId: string): void {
    if (this.selectedConversationId === conversationId) return;
    
    this.selectedConversationId = conversationId;
    this.loadConversation(conversationId);
  }

  loadConversation(conversationId: string): void {
    this.chatService.getConversation(conversationId).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.currentConversation = response.data;
          this.markMessagesAsRead(conversationId);
          setTimeout(() => this.scrollToBottom(), 200);
        } else {
          this.error = 'Esta conversación ya no está disponible';
          setTimeout(() => {
            this.selectedConversationId = null;
            this.currentConversation = null;
            this.loadConversations();
          }, 2000);
        }
      },
      error: (err) => {
        console.error('Error cargando conversación:', err);
        this.error = 'No se pudo cargar la conversación';
        setTimeout(() => {
          this.selectedConversationId = null;
          this.currentConversation = null;
          this.loadConversations();
        }, 2000);
      }
    });
  }

  markMessagesAsRead(conversationId: string): void {
    if (!this.currentConversation?.mensajes) return;
    
    const unreadMessages = this.currentConversation.mensajes
      .filter(msg => !msg.read && msg.remitenteId !== this.currentUserId)
      .map(msg => msg.id);
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(messageId => {
        this.chatService.markAsRead(conversationId, messageId).subscribe({
          next: () => {
            if (this.currentConversation) {
              const msg = this.currentConversation.mensajes.find(m => m.id === messageId);
              if (msg) msg.read = true;
            }
          },
          error: (err) => console.error('Error marcando mensaje como leído:', err)
        });
      });
      
      this.webSocketService.markAsRead(conversationId, unreadMessages);
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversationId) return;

    const messageContent = this.newMessage;
    this.newMessage = '';

    this.webSocketService.sendMessage(this.selectedConversationId, messageContent);
  }

  getOtherUser(): { nombre: string; avatar: string | null; id: string; last_login: string | null } {
    if (!this.currentConversation) {
      return { nombre: '', avatar: null, id: '', last_login: null };
    }
    
    if (this.currentConversation.comprador?.id === this.currentUserId) {
      return {
        nombre: this.currentConversation.vendedor?.nombre || 'Usuario',
        avatar: this.currentConversation.vendedor?.avatar || null,
        id: this.currentConversation.vendedor?.id || '',
        last_login: this.currentConversation.vendedor?.last_login || null
      };
    } else {
      return {
        nombre: this.currentConversation.comprador?.nombre || 'Usuario',
        avatar: this.currentConversation.comprador?.avatar || null,
        id: this.currentConversation.comprador?.id || '',
        last_login: this.currentConversation.comprador?.last_login || null
      };
    }
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setHours(date.getHours() - 3);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const argentinaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (argentinaDate.toDateString() === today.toDateString()) return 'Hoy';
    if (argentinaDate.toDateString() === yesterday.toDateString()) return 'Ayer';
    return argentinaDate.toLocaleDateString('es-AR');
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  goBack(): void {
    this.selectedConversationId = null;
    this.currentConversation = null;
  }

  confirmDeleteConversation(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    this.conversationToDelete = conversation;
    this.showDeleteModal = true;
  }

  deleteConversationForMe(): void {
    if (!this.conversationToDelete) return;
    
    const conversationId = this.conversationToDelete.id;
    const wasSelected = this.selectedConversationId === conversationId;
    const userName = this.conversationToDelete.otro_usuario.nombre;
    
    this.chatService.deleteConversationForMe(conversationId).subscribe({
      next: (response) => {
        if (response.permanentlyDeleted) {
          this.successMessage = `Conversación con ${userName} eliminada permanentemente`;
        } else {
          this.successMessage = `Conversación con ${userName} eliminada de tu lista`;
        }
        
        this.loadConversations();
        
        if (wasSelected) {
          this.selectedConversationId = null;
          this.currentConversation = null;
        }
        
        setTimeout(() => this.successMessage = '', 3000);
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Error eliminando conversación:', err);
        this.error = 'No se pudo eliminar la conversación';
        setTimeout(() => this.error = '', 3000);
        this.cancelDelete();
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.conversationToDelete = null;
  }
}