import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService, Conversation, ConversationDetail, Message } from '../../services/chat.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

// Lista de emojis
const EMOJIS = [
  // Caritas
  '😀', '😂', '😍', '😊', '😢', '😡', '😮', '🤔', '🥰', '😎', '🥳', '😭', '😅', '🙂', '😉', '😘',
  
  // Gestos y manos
  '👍', '👎', '👌', '✌️', '🤝', '👏', '🙌', '💪', '✋', '👋', '🤞', '👊',
  
  // Corazones
  '❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '💕',
  
  // Reciclaje y medio ambiente
  '♻️', '🌍', '🌱', '🌿', '🍃', '🌲', '🌳', '🌸', '🌻', '🌺', '🍂', '🍁',
  
  // Materiales reciclables
  '📦', '🗑️', '🥤', '🧴', '🧃', '🔋', '💡', '📰', '📄', '👕', '🥛', '🔩'
];

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
  activeDropdownId: string | null = null;

  // Emoji picker
  showEmojiPicker = false;
  emojis = EMOJIS;

  // Estado de conversación eliminada por otro usuario
  conversationDeletedByOther = false;

  // Dropdown del header
  showHeaderDropdown = false;
  
  // Modal de perfil
  showProfileModal = false;
  selectedUserProfile: any = null;
  isLoadingProfile = false;
  private miniMap: L.Map | null = null;
  private miniMapInitialized = false;

  private subscriptions: Subscription[] = [];
  private readTimeout: any = null;

  constructor(
    private chatService: ChatService,
    private webSocketService: WebSocketService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        this.currentUserId = user.id || '';
        console.log('✅ Usuario actual:', this.currentUserId);
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
        setTimeout(() => this.selectConversation(id), 300);
      }
    });

    // 🔥 Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  ngOnDestroy(): void {
    if (this.readTimeout) {
      clearTimeout(this.readTimeout);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
    
    // Limpiar event listener
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    
    // Limpiar mapa
    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }
  }

  handleDocumentClick(): void {
    if (this.showHeaderDropdown) {
      this.showHeaderDropdown = false;
      this.cdr.detectChanges();
    }
  }

  setupWebSocket(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.webSocketService.connect(token);

    this.subscriptions.push(
      this.webSocketService.onNewMessage().subscribe(data => {
        console.log('📨 Nuevo mensaje recibido:', data);
        
        // Verificar si el mensaje ya existe
        let exists = false;
        if (this.currentConversation && this.currentConversation.mensajes) {
          exists = this.currentConversation.mensajes.some(m => m.id === data.message.id);
        }

        if (!exists && data.conversationId === this.selectedConversationId && this.currentConversation) {
          this.currentConversation.mensajes.push(data.message);
          
          // 🔥 Si es el chat actual y el mensaje es de otro usuario, marcar como leído inmediatamente
          if (data.message.remitenteId !== this.currentUserId) {
            console.log('👁️ Nuevo mensaje de otro usuario en chat abierto, marcando como leído...');
            this.markMessagesAsRead(data.conversationId);
          }
          
          setTimeout(() => this.scrollToBottom(), 100);
        }

        // Actualizar sidebar
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            const isMyMessage = data.message.remitenteId === this.currentUserId;
            
            // Si es mi mensaje o el chat está abierto, resetear contador de no leídos
            if (isMyMessage || this.selectedConversationId === data.conversationId) {
              return {
                ...conv,
                ultimo_mensaje: data.message.content,
                ultimo_mensaje_at: data.message.created_at,
                no_leidos: 0
              };
            }
            
            const newUnread = (conv.no_leidos || 0) + 1;
            return {
              ...conv,
              ultimo_mensaje: data.message.content,
              ultimo_mensaje_at: data.message.created_at,
              no_leidos: newUnread
            };
          }
          return conv;
        });

        // Si la conversación no está en la lista, recargar todas
        const conversationExists = this.conversations.some(conv => conv.id === data.conversationId);
        if (!conversationExists) {
          console.log('🔄 Conversación nueva detectada, recargando lista...');
          this.loadConversations();
        }
        
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.webSocketService.onUserOnline().subscribe(({ userId, online }) => {
        if (online) this.onlineUsers.add(userId);
        else this.onlineUsers.delete(userId);
        this.onlineUsers = new Set(this.onlineUsers);
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.webSocketService.onOnlineUsers().subscribe(({ userIds }) => {
        this.onlineUsers = new Set(userIds);
        this.cdr.detectChanges();
      })
    );

    // 🔥 Escuchar mensajes leídos
    this.subscriptions.push(
      this.webSocketService.onMessagesRead().subscribe(data => {
        console.log('📥 Mensajes marcados como leídos recibido:', data);
        
        // Actualizar conversación actual
        if (data.conversationId === this.selectedConversationId && this.currentConversation) {
          this.currentConversation.mensajes = this.currentConversation.mensajes.map(msg => {
            if (data.messageIds?.includes(msg.id)) {
              console.log(`✅ Marcando mensaje ${msg.id} como leído (evento del otro usuario)`);
              return { ...msg, read: true };
            }
            return msg;
          });
          console.log('✅ Mensajes actualizados en conversación actual');
          this.cdr.detectChanges();
        }
        
        // Actualizar sidebar (quitar badge de no leídos)
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            const currentUnread = conv.no_leidos || 0;
            const newlyRead = data.messageIds?.length || 0;
            const newUnread = Math.max(0, currentUnread - newlyRead);
            console.log(`📊 Actualizando badge: de ${currentUnread} a ${newUnread}`);
            return {
              ...conv,
              no_leidos: newUnread
            };
          }
          return conv;
        });
        
        this.cdr.detectChanges();
      })
    );

    // 🔥 Escuchar cuando el otro usuario elimina la conversación
    this.subscriptions.push(
      this.webSocketService.onConversationDeleted().subscribe(data => {
        console.log('═══════════════════════════════════════════════');
        console.log('🗑️ [FRONTEND] EVENTO conversation-deleted RECIBIDO');
        console.log('📦 Datos:', data);
        console.log('🆔 Conversación ID:', data.conversationId);
        console.log('🆔 Conversación actual abierta (selectedConversationId):', this.selectedConversationId);
        console.log('🔒 Estado actual de conversationDeletedByOther:', this.conversationDeletedByOther);
        console.log('═══════════════════════════════════════════════');
        
        // Actualizar la conversación en la lista del sidebar
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            console.log('📝 Marcando como eliminada en sidebar');
            return {
              ...conv,
              estado: 'eliminada_por_otro'
            };
          }
          return conv;
        });
        
        // Si es la conversación que está abierta actualmente
        if (data.conversationId === this.selectedConversationId) {
          console.log('⚠️ La conversación ACTUAL fue eliminada por el otro usuario');
          this.conversationDeletedByOther = true;
          this.cdr.detectChanges();
          console.log('🔒 conversationDeletedByOther cambiado a:', this.conversationDeletedByOther);
        }
        
        console.log('═══════════════════════════════════════════════');
      })
    );

    // 🔥 Escuchar cuando el otro usuario reactiva la conversación
    this.subscriptions.push(
      this.webSocketService.onConversationReactivated().subscribe(data => {
        console.log('═══════════════════════════════════════════════');
        console.log('🔄 [FRONTEND] EVENTO conversation-reactivated RECIBIDO');
        console.log('📦 Datos completos:', data);
        console.log('🆔 Conversación ID del evento:', data.conversationId);
        console.log('🆔 Conversación actual abierta (selectedConversationId):', this.selectedConversationId);
        console.log('🔓 Estado actual de conversationDeletedByOther ANTES:', this.conversationDeletedByOther);
        console.log('═══════════════════════════════════════════════');
        
        // Actualizar la conversación en la lista del sidebar
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            console.log('📝 Actualizando conversación en sidebar:', conv.id);
            return {
              ...conv,
              estado: 'activa',
              no_leidos: 0
            };
          }
          return conv;
        });
        
        // 🔥 CRÍTICO: Verificar si es la conversación actualmente abierta
        const isCurrentConversation = data.conversationId === this.selectedConversationId;
        console.log('🎯 ¿Es la conversación actual?', isCurrentConversation);
        
        if (isCurrentConversation) {
          console.log('✅ ¡ES LA CONVERSACIÓN ACTUAL! Reactivando...');
          
          // CAMBIAR EL ESTADO DE BLOQUEO
          this.conversationDeletedByOther = false;
          console.log('🔓 conversationDeletedByOther cambiado a:', this.conversationDeletedByOther);
          
          // Recargar la conversación para asegurar datos frescos
          console.log('🔄 Recargando conversación para obtener datos actualizados...');
          this.loadConversation(data.conversationId);
          
          // Mostrar mensaje de éxito
          this.successMessage = '✓ El otro usuario ha reactivado la conversación. Ya puedes enviar mensajes.';
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
          console.log('✅ Reactivación completada');
        } else {
          console.log('ℹ️ No es la conversación actual, solo actualizando sidebar');
          this.successMessage = `La conversación ha sido reactivada.`;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
          this.cdr.detectChanges();
        }
        
        console.log('═══════════════════════════════════════════════');
      })
    );

    // 🔥 Manejar error de conversación eliminada al intentar enviar mensaje
    this.subscriptions.push(
      this.webSocketService.onError().subscribe(error => {
        console.error('Error del WebSocket:', error);
        
        if (error.type === 'CONVERSATION_DELETED_BY_OTHER') {
          this.conversationDeletedByOther = true;
          this.cdr.detectChanges();
        } else {
          this.error = error.message || 'Error en la conexión';
          setTimeout(() => {
            this.error = '';
          }, 5000);
        }
      })
    );
  }

  loadConversations(): void {
    this.loading = true;

    this.chatService.getMyConversations().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.conversations = response.data.sort((a: Conversation, b: Conversation) =>
            new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime()
          );

          const ids = this.conversations.map(c => c.id);
          if (ids.length > 0) {
            this.webSocketService.joinConversations(ids);
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar las conversaciones';
        this.loading = false;
      }
    });
  }

  selectConversation(conversationId: string): void {
    if (this.selectedConversationId === conversationId) return;

    // Resetear estado al cambiar de conversación
    this.conversationDeletedByOther = false;
    this.error = '';

    this.conversations = this.conversations.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, no_leidos: 0 };
      }
      return conv;
    });

    this.selectedConversationId = conversationId;
    this.loadConversation(conversationId);
  }

  loadConversation(conversationId: string): void {
    console.log('📩 Cargando conversación:', conversationId);
    
    this.chatService.getConversation(conversationId).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.currentConversation = response.data;
          
          // Verificar si el otro usuario eliminó esta conversación
          this.conversationDeletedByOther = response.data.deleted_by_other || false;
          
          if (this.currentConversation) {
            console.log('✅ Conversación cargada, mensajes:', this.currentConversation.mensajes?.length);
          }
          console.log('📊 deleted_by_other desde servidor:', this.conversationDeletedByOther);
          
          // Marcar como leídos INMEDIATAMENTE
          this.markMessagesAsRead(conversationId);
          
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: (err) => {
        console.error('Error cargando conversación:', err);
        this.error = 'No se pudo cargar la conversación';
      }
    });
  }

  markMessagesAsRead(conversationId: string): void {
    if (!this.currentConversation || !this.currentConversation.mensajes) {
      console.log('⚠️ No hay conversación o mensajes para marcar');
      return;
    }
    
    // Solo marcar mensajes que NO son míos y NO están leídos
    const unreadMessages = this.currentConversation.mensajes
      .filter(m => !m.read && m.remitenteId !== this.currentUserId)
      .map(m => m.id);
    
    console.log('📊 Mensajes sin leer encontrados:', unreadMessages);
    
    if (unreadMessages.length > 0) {
      console.log('👁️ Enviando markAsRead al servidor:', unreadMessages);
      
      // Enviar al servidor a través de WebSocket
      this.webSocketService.markAsRead(conversationId, unreadMessages);
      
      // Actualizar localmente inmediatamente para feedback visual
      this.currentConversation.mensajes = this.currentConversation.mensajes.map(msg => {
        if (unreadMessages.includes(msg.id)) {
          console.log(`✅ Marcando mensaje ${msg.id} como leído localmente`);
          return { ...msg, read: true };
        }
        return msg;
      });
      
      // Actualizar badge en el sidebar
      this.conversations = this.conversations.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, no_leidos: 0 };
        }
        return conv;
      });
      
      // Forzar detección de cambios para actualizar la UI
      this.cdr.detectChanges();
    } else {
      console.log('📊 No hay mensajes sin leer para marcar');
    }
  }

  sendMessage(): void {
    // Si la conversación fue eliminada por el otro, no enviar
    if (this.conversationDeletedByOther) {
      console.log('🚫 No se puede enviar: conversación eliminada por el otro usuario');
      return;
    }
    
    if (!this.newMessage.trim() || !this.selectedConversationId) return;

    const content = this.newMessage;
    this.newMessage = '';

    console.log('📤 Enviando mensaje:', content);
    this.webSocketService.sendMessage(this.selectedConversationId, content);
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }

  goBack(): void {
    this.selectedConversationId = null;
    this.currentConversation = null;
    this.conversationDeletedByOther = false;
    this.error = '';
  }

  toggleActionsDropdown(conversationId: string, event: Event): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === conversationId ? null : conversationId;
  }

  closeDropdown(): void {
    this.activeDropdownId = null;
  }

  confirmDeleteConversation(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    this.conversationToDelete = conversation;
    this.showDeleteModal = true;
    this.activeDropdownId = null;
  }

  deleteConversationForMe(): void {
    if (!this.conversationToDelete) return;

    const id = this.conversationToDelete.id;

    this.chatService.deleteConversationForMe(id).subscribe(() => {
      this.conversations = this.conversations.filter(c => c.id !== id);

      if (this.selectedConversationId === id) {
        this.selectedConversationId = null;
        this.currentConversation = null;
        this.conversationDeletedByOther = false;
      }

      this.cancelDelete();
      this.cdr.detectChanges();
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.conversationToDelete = null;
  }

  // ================= EMOJI PICKER =================
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  closeEmojiPicker(): void {
    this.showEmojiPicker = false;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
    setTimeout(() => {
      const input = document.querySelector('.message-input') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  // ================= HEADER CHAT META =================
  getUserType(): string {
    if (!this.currentConversation) return '';
    
    if (this.currentConversation.comprador?.id === this.currentUserId) {
      return this.currentConversation.vendedor?.tipo || '';
    } else {
      return this.currentConversation.comprador?.tipo || '';
    }
  }

  getUserLocationText(): string {
    if (!this.currentConversation) return '';
    
    if (this.currentConversation.comprador?.id === this.currentUserId) {
      return this.currentConversation.vendedor?.ubicacion_texto || '';
    } else {
      return this.currentConversation.comprador?.ubicacion_texto || '';
    }
  }

  // ================= PUBLICACIÓN =================
  getContactMessage(): string {
    if (!this.currentConversation) return '';
    
    if (this.currentConversation.comprador?.id === this.currentUserId) {
      return 'Te estás contactando por:';
    } else {
      return 'Se están contactando contigo por:';
    }
  }

  // ================= MENSAJES DE ADVERTENCIA =================
  getWarningMessage(): { title: string; message: string; suggestion: string } {
    if (!this.currentConversation) {
      return {
        title: 'Conversación cerrada',
        message: 'No puedes enviar más mensajes.',
        suggestion: 'Para volver a contactar, visita la publicación y haz clic en "Contactar usuario".'
      };
    }

    // Determinar quién es el usuario actual
    const soyComprador = this.currentConversation.comprador?.id === this.currentUserId;
    const soyVendedor = this.currentConversation.vendedor?.id === this.currentUserId;
    
    // Si el otro usuario eliminó (deleted_by_other = true)
    if (soyComprador) {
      // Soy comprador, entonces el que eliminó es el VENDEDOR
      return {
        title: 'El vendedor cerró la conversación',
        message: 'El vendedor eliminó esta conversación de su lista. No puedes enviar más mensajes.',
        suggestion: 'Si aún estás interesado, puedes volver a contactarlo desde su publicación.'
      };
    } else if (soyVendedor) {
      // Soy vendedor, entonces el que eliminó es el COMPRADOR
      return {
        title: 'El comprador cerró la conversación',
        message: 'El comprador eliminó esta conversación de su lista. No puedes enviar más mensajes.',
        suggestion: 'Puedes esperar a que el comprador te contacte nuevamente desde tu publicación.'
      };
    }
    
    // Mensaje por defecto (fallback)
    return {
      title: 'Conversación cerrada',
      message: 'El otro usuario eliminó esta conversación. No puedes enviar más mensajes.',
      suggestion: 'Para volver a contactar, visita la publicación y haz clic en "Contactar usuario".'
    };
  }

  // ================= DROPDOWN DEL HEADER =================
  toggleHeaderDropdown(event: Event): void {
    event.stopPropagation();
    this.showHeaderDropdown = !this.showHeaderDropdown;
    console.log('Dropdown toggled:', this.showHeaderDropdown);
    this.cdr.detectChanges();
  }

  closeHeaderDropdown(): void {
    this.showHeaderDropdown = false;
  }

  // ================= MODAL DE PERFIL =================
  viewProfile(): void {
    const otherUser = this.getOtherUser();
    if (!otherUser.id) return;
    
    this.isLoadingProfile = true;
    this.showHeaderDropdown = false;
    this.miniMapInitialized = false;
    
    // Limpiar mapa anterior si existe
    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }
    
    // Datos básicos mientras se cargan los completos
    this.selectedUserProfile = {
      id: otherUser.id,
      nombre: otherUser.nombre,
      email: (otherUser as any).email || 'Cargando...',
      telefono: (otherUser as any).telefono || 'Cargando...',
      tipo: this.getUserType() || 'Cargando...',
      avatar_url: otherUser.avatar,
      ubicacion_texto: this.getUserLocationText() || 'Cargando...',
      coordinates: null,
      is_active: true
    };
    
    this.showProfileModal = true;
    
    // Obtener ubicación del usuario desde /users/map/locations
    this.chatService.getUserLocations().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          // Buscar el usuario específico en la lista de ubicaciones
          const userLocation = response.data.find((u: any) => u.id === otherUser.id);
          
          if (userLocation && userLocation.coordinates) {
            console.log('📍 Coordenadas encontradas:', userLocation.coordinates);
            this.selectedUserProfile = {
              ...this.selectedUserProfile,
              coordinates: userLocation.coordinates,
              ubicacion_texto: userLocation.ubicacion_texto || this.selectedUserProfile.ubicacion_texto
            };
            
            // Inicializar el mapa
            setTimeout(() => this.initializeMiniMap(), 200);
          } else {
            console.log('⚠️ Usuario sin coordenadas');
          }
        }
        
        // Ahora obtener el resto de datos del perfil (email, teléfono, etc)
        this.chatService.getUserProfile(otherUser.id).subscribe({
          next: (profileResponse) => {
            if (profileResponse?.success && profileResponse.data) {
              const profile = profileResponse.data;
              this.selectedUserProfile = {
                ...this.selectedUserProfile,
                email: profile.email || 'No disponible',
                telefono: profile.telefono || 'No disponible',
                tipo: profile.tipo || this.selectedUserProfile.tipo,
                is_active: profile.is_active !== false
              };
            }
            this.isLoadingProfile = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error cargando perfil:', err);
            this.isLoadingProfile = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error cargando ubicación:', err);
        // Si falla la ubicación, igual intentamos obtener el perfil
        this.chatService.getUserProfile(otherUser.id).subscribe({
          next: (profileResponse) => {
            if (profileResponse?.success && profileResponse.data) {
              const profile = profileResponse.data;
              this.selectedUserProfile = {
                ...this.selectedUserProfile,
                email: profile.email || 'No disponible',
                telefono: profile.telefono || 'No disponible',
                tipo: profile.tipo || this.selectedUserProfile.tipo,
                is_active: profile.is_active !== false
              };
            }
            this.isLoadingProfile = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.isLoadingProfile = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.selectedUserProfile = null;
    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }
    this.miniMapInitialized = false;
  }

  initializeMiniMap(): void {
    if (!this.selectedUserProfile?.coordinates?.lat || !this.selectedUserProfile?.coordinates?.lng) {
      console.log('No hay coordenadas para mostrar el mapa');
      return;
    }
    
    if (this.miniMapInitialized) return;
    
    setTimeout(() => {
      const mapContainer = document.getElementById('profileMiniMap');
      if (mapContainer && !this.miniMapInitialized) {
        const { lat, lng } = this.selectedUserProfile.coordinates;
        console.log('Inicializando mapa en:', lat, lng);
        
        this.miniMap = L.map(mapContainer).setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.miniMap);
        
        // Agregar marcador
        L.marker([lat, lng]).addTo(this.miniMap);
        
        this.miniMapInitialized = true;
        
        // Forzar actualización del tamaño del mapa
        setTimeout(() => this.miniMap?.invalidateSize(), 100);
      }
    }, 200);
  }

  // ================= ELIMINAR DESDE HEADER =================
  deleteConversationFromHeader(): void {
    this.showHeaderDropdown = false;
    if (this.selectedConversationId) {
      const conversation = this.conversations.find(c => c.id === this.selectedConversationId);
      if (conversation) {
        this.confirmDeleteConversation(conversation, new Event('click'));
      }
    }
  }

  // ================= HELPERS =================

  getAvatarSrc(avatarUrl: string | null | undefined): string {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl;
    }
    return '/assets/default-avatar.png';
  }

  handleConversationImageError(event: Event, conversation: any): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';

    if (conversation?.otro_usuario) {
      conversation.otro_usuario.avatar = '/assets/default-avatar.png';
    }
  }

  handleMessageImageError(event: Event, message: any): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';

    if (message) {
      message.avatar = '/assets/default-avatar.png';
    }
  }

  handleHeaderImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';
  }

  isUserOnline(userId: string | undefined): boolean {
    if (!userId) return false;
    return this.onlineUsers.has(userId);
  }

  getOtherUser(): {
    nombre: string;
    email?: string;
    telefono?: string;
    avatar: string | null;
    id: string;
    last_login: string | null;
    tipo?: string;
    ubicacion_texto?: string;
  } {
    if (!this.currentConversation) {
      return { nombre: '', avatar: null, id: '', last_login: null };
    }

    if (this.currentConversation.comprador?.id === this.currentUserId) {
      return {
        nombre: this.currentConversation.vendedor?.nombre || 'Usuario',
        email: (this.currentConversation.vendedor as any)?.email,
        telefono: (this.currentConversation.vendedor as any)?.telefono,
        avatar: this.currentConversation.vendedor?.avatar || null,
        id: this.currentConversation.vendedor?.id || '',
        last_login: this.currentConversation.vendedor?.last_login || null,
        tipo: this.currentConversation.vendedor?.tipo,
        ubicacion_texto: this.currentConversation.vendedor?.ubicacion_texto
      };
    } else {
      return {
        nombre: this.currentConversation.comprador?.nombre || 'Usuario',
        email: (this.currentConversation.comprador as any)?.email,
        telefono: (this.currentConversation.comprador as any)?.telefono,
        avatar: this.currentConversation.comprador?.avatar || null,
        id: this.currentConversation.comprador?.id || '',
        last_login: this.currentConversation.comprador?.last_login || null,
        tipo: this.currentConversation.comprador?.tipo,
        ubicacion_texto: this.currentConversation.comprador?.ubicacion_texto
      };
    }
  }

  getUserStatus(userId: string | undefined, lastLogin: string | null | undefined): string {
    if (this.isUserOnline(userId)) return 'En línea';
    return this.getLastSeen(lastLogin);
  }

  getLastSeen(lastLogin: string | null | undefined): string {
    if (!lastLogin) return 'Desconectado';

    const last = new Date(lastLogin).getTime();
    const now = Date.now();
    const diff = Math.floor((now - last) / 60000);

    if (diff < 1) return 'Desconectado recientemente';
    if (diff < 60) return `Últ. vez hace ${diff} min`;
    if (diff < 1440) return `Últ. vez hace ${Math.floor(diff / 60)} h`;

    const days = Math.floor(diff / 1440);
    return `Últ. vez hace ${days} día${days > 1 ? 's' : ''}`;
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    date.setHours(date.getHours() - 3);

    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const argentinaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (argentinaDate.toDateString() === today.toDateString()) return 'Hoy';
    if (argentinaDate.toDateString() === yesterday.toDateString()) return 'Ayer';

    return argentinaDate.toLocaleDateString('es-AR');
  }

  formatProfileDate(dateValue?: string): string {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('es-AR');
  }
}