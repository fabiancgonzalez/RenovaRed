import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService, Conversation, ConversationDetail, ExchangeQuote, MercadoPagoPaymentStatus, Message } from '../../services/chat.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

const EMOJIS = [
  '😀', '😂', '😍', '😊', '😢', '😡', '😮', '🤔', '🥰', '😎', '🥳', '😭', '😅', '🙂', '😉', '😘',
  '👍', '👎', '👌', '✌️', '🤝', '👏', '🙌', '💪', '✋', '👋', '🤞', '👊',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '💕',
  '♻️', '🌍', '🌱', '🌿', '🍃', '🌲', '🌳', '🌸', '🌻', '🌺', '🍂', '🍁',
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
  searchTerm = '';
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

  showEmojiPicker = false;
  emojis = EMOJIS;

  conversationDeletedByOther = false;

  showHeaderDropdown = false;
  
  showProfileModal = false;
  selectedUserProfile: any = null;
  isLoadingProfile = false;
  private miniMap: L.Map | null = null;
  private miniMapInitialized = false;

  showExchangeModal = false;
  exchangeStatus: any = null;
  lastCompletedExchange: any = null;
  exchangeData = {
    kg: 0,
    price: 0,
    notes: ''
  };
  exchangeQuote: ExchangeQuote | null = null;
  calculatingQuote = false;
  paymentStatusLabel = '';
  paymentStatusState: 'pending' | 'approved' | 'error' | '' = '';
  currentStock = 0;
  isBuyer = false;
  isSeller = false;

  private subscriptions: Subscription[] = [];
  private readTimeout: any = null;
  private paymentStatusInterval: any = null;
  private paymentApprovedNotified = false;

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

    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  ngOnDestroy(): void {
    if (this.readTimeout) {
      clearTimeout(this.readTimeout);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
    
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    
    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }

    this.stopPaymentStatusPolling();
  }

  get filteredConversations(): Conversation[] {
    const normalizedSearch = this.normalizeSearchValue(this.searchTerm);

    if (!normalizedSearch) {
      return this.conversations;
    }

    return this.conversations.filter((conversation) => {
      const valuesToMatch = [
        conversation.otro_usuario?.nombre,
        conversation.otro_usuario?.email,
        conversation.otro_usuario?.tipo,
        conversation.otro_usuario?.ubicacion_texto,
        conversation.ultimo_mensaje,
        conversation.estado
      ];

      return valuesToMatch.some((value) => this.normalizeSearchValue(value).includes(normalizedSearch));
    });
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
        let exists = false;
        if (this.currentConversation && this.currentConversation.mensajes) {
          exists = this.currentConversation.mensajes.some(m => m.id === data.message.id);
        }

        if (!exists && data.conversationId === this.selectedConversationId && this.currentConversation) {
          this.currentConversation.mensajes.push(data.message);
          
          if (data.message.remitenteId !== this.currentUserId) {
            this.markMessagesAsRead(data.conversationId);
          }
          
          setTimeout(() => this.scrollToBottom(), 100);
        }

        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            const isMyMessage = data.message.remitenteId === this.currentUserId;
            
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

        const conversationExists = this.conversations.some(conv => conv.id === data.conversationId);
        if (!conversationExists) {
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

    this.subscriptions.push(
      this.webSocketService.onMessagesRead().subscribe(data => {
        if (data.conversationId === this.selectedConversationId && this.currentConversation) {
          this.currentConversation.mensajes = this.currentConversation.mensajes.map(msg => {
            if (data.messageIds?.includes(msg.id)) {
              return { ...msg, read: true };
            }
            return msg;
          });
          this.cdr.detectChanges();
        }
        
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            const currentUnread = conv.no_leidos || 0;
            const newlyRead = data.messageIds?.length || 0;
            const newUnread = Math.max(0, currentUnread - newlyRead);
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

    this.subscriptions.push(
      this.webSocketService.onConversationDeleted().subscribe(data => {
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            return { ...conv, estado: 'eliminada_por_otro' };
          }
          return conv;
        });
        
        if (data.conversationId === this.selectedConversationId) {
          this.conversationDeletedByOther = true;
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.webSocketService.onConversationReactivated().subscribe(data => {
        this.conversations = this.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            return { ...conv, estado: 'activa', no_leidos: 0 };
          }
          return conv;
        });
        
        if (data.conversationId === this.selectedConversationId) {
          this.conversationDeletedByOther = false;
          this.loadConversation(data.conversationId);
          this.successMessage = '✓ El otro usuario ha reactivado la conversación. Ya puedes enviar mensajes.';
          setTimeout(() => this.successMessage = '', 5000);
          this.cdr.detectChanges();
        }
      })
    );
    
    this.subscriptions.push(
      this.webSocketService.onExchangeRequest().subscribe(data => {
        if (data.conversationId === this.selectedConversationId) {
          this.checkExchangeStatus();
          this.loadConversation(this.selectedConversationId!);
          this.successMessage = '¡Nueva solicitud de intercambio! Revisa la tarjeta arriba.';
          setTimeout(() => this.successMessage = '', 5000);
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.webSocketService.onExchangeAccepted().subscribe(data => {
        if (data.conversationId === this.selectedConversationId) {
          this.checkExchangeStatus();
          this.loadConversation(this.selectedConversationId!);
          this.successMessage = `¡Intercambio aceptado! Se intercambiaron ${data.kg} kg. 🌱`;
          setTimeout(() => this.successMessage = '', 5000);
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.webSocketService.onExchangeRejected().subscribe(data => {
        if (data.conversationId === this.selectedConversationId) {
          this.exchangeStatus = null;
          this.cdr.detectChanges();
          this.error = 'El vendedor rechazó la solicitud de intercambio. Puedes enviar una nueva.';
          setTimeout(() => this.error = '', 5000);
        }
      })
    );

    this.subscriptions.push(
      this.webSocketService.onExchangeStatusUpdate().subscribe(data => {
        if (data.conversationId === this.selectedConversationId) {
          if (data.hasRequest) {
            this.exchangeStatus = data.exchange;
          } else {
            this.exchangeStatus = null;
          }
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.webSocketService.onError().subscribe(error => {
        console.error('Error del WebSocket:', error);
        
        if (error.type === 'CONVERSATION_DELETED_BY_OTHER') {
          this.conversationDeletedByOther = true;
          this.cdr.detectChanges();
        } else {
          this.error = error.message || 'Error en la conexión';
          setTimeout(() => this.error = '', 5000);
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

  private normalizeSearchValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  selectConversation(conversationId: string): void {
    if (this.selectedConversationId === conversationId) return;

    this.conversationDeletedByOther = false;
    this.error = '';
    this.exchangeStatus = null;
    this.lastCompletedExchange = null;
    this.isBuyer = false;
    this.isSeller = false;

    this.conversations = this.conversations.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, no_leidos: 0 };
      }
      return conv;
    });

    this.selectedConversationId = conversationId;
    this.loadConversation(conversationId);
  }

  private resetSelectedConversation(): void {
    this.selectedConversationId = null;
    this.currentConversation = null;
    this.conversationDeletedByOther = false;
    this.exchangeStatus = null;
    this.lastCompletedExchange = null;
    this.isBuyer = false;
    this.isSeller = false;
  }

  private handleConversationNotFound(conversationId: string): void {
    this.conversations = this.conversations.filter(conv => conv.id !== conversationId);

    if (this.selectedConversationId === conversationId) {
      this.resetSelectedConversation();
    }

    this.error = 'La conversación ya no está disponible';
    this.router.navigate(['/chat'], { replaceUrl: true });
    this.cdr.detectChanges();
  }

  loadConversation(conversationId: string): void {
    this.chatService.getConversation(conversationId).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.currentConversation = response.data;
          this.conversationDeletedByOther = response.data.deleted_by_other || false;
          
          this.checkUserRole();
          this.checkExchangeStatus();
          
          this.markMessagesAsRead(conversationId);
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: (err) => {
        console.error('Error cargando conversación:', err);

        if (err?.status === 404) {
          this.handleConversationNotFound(conversationId);
          return;
        }

        this.error = err?.error?.message || 'No se pudo cargar la conversación';
      }
    });
  }

  checkUserRole(): void {
    if (!this.currentConversation) return;
    this.isBuyer = this.currentConversation.comprador?.id === this.currentUserId;
    this.isSeller = this.currentConversation.vendedor?.id === this.currentUserId;
    
    if (this.currentConversation?.publication?.cantidad) {
      const cantidadValor = this.currentConversation.publication.cantidad;
      const cantidadStr = typeof cantidadValor === 'string' ? cantidadValor : String(cantidadValor);
      this.currentStock = parseFloat(cantidadStr) || 0;
    } else {
      this.currentStock = 0;
    }
  }

  checkExchangeStatus(): void {
    if (!this.selectedConversationId) return;
    
    this.chatService.getExchangeStatus(this.selectedConversationId).subscribe({
      next: (res) => {
        if (res.success) {
          this.exchangeStatus = res.hasRequest ? res.exchange : null;
          this.lastCompletedExchange = res.lastCompleted || null;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error checking exchange status:', err)
    });
  }

  openExchangeModal(): void {
    if (!this.isBuyer) {
      this.error = 'Solo el comprador puede iniciar una solicitud de intercambio';
      setTimeout(() => this.error = '', 3000);
      return;
    }
    
    if (this.exchangeStatus) {
      this.error = 'Ya hay una solicitud de intercambio en curso';
      setTimeout(() => this.error = '', 3000);
      return;
    }
    
    this.exchangeQuote = null;
    this.showExchangeModal = true;
  }

  closeExchangeModal(): void {
    this.showExchangeModal = false;
    this.exchangeData = { kg: 0, price: 0, notes: '' };
    this.exchangeQuote = null;
    this.calculatingQuote = false;
    this.paymentStatusLabel = '';
    this.paymentStatusState = '';
    this.paymentApprovedNotified = false;
    this.stopPaymentStatusPolling();
  }

  calculateImpact(): number {
    const kg = this.exchangeData.kg || 0;
    return kg * 2.5;
  }

  requestExchange(): void {
    if (!this.selectedConversationId || !this.currentConversation) return;
    
    if (this.exchangeData.kg <= 0) {
      this.error = 'Por favor, ingresá la cantidad en kg';
      setTimeout(() => this.error = '', 3000);
      return;
    }
    
    if (this.exchangeData.kg > this.currentStock) {
      this.error = `Stock insuficiente. Solo hay ${this.currentStock}kg disponibles`;
      setTimeout(() => this.error = '', 3000);
      return;
    }
    
    const data = {
      conversationId: this.selectedConversationId,
      publicationId: this.currentConversation.publication_id,
      sellerId: this.currentConversation.vendedor?.id,
      kg: this.exchangeData.kg,
      price: this.exchangeData.price,
      materialName: this.currentConversation.publication?.titulo,
      notes: this.exchangeData.notes
    };
    
    this.chatService.requestExchange(data).subscribe({
      next: (res) => {
        if (res.success) {
          this.closeExchangeModal();
          this.successMessage = res.message;
          setTimeout(() => this.successMessage = '', 5000);
          this.checkExchangeStatus();
          this.loadConversation(this.selectedConversationId!);
        }
      },
      error: (err) => {
        console.error('Error requesting exchange:', err);
        this.error = err.error?.message || 'Error al enviar la solicitud';
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  calculateQuoteFromMaterial(): void {
    if (!this.currentConversation?.publication?.titulo) {
      this.error = 'No se pudo identificar el material de la publicación';
      setTimeout(() => this.error = '', 3000);
      return;
    }

    if (this.exchangeData.kg <= 0) {
      this.error = 'Ingresá una cantidad en kg para calcular la cotización';
      setTimeout(() => this.error = '', 3000);
      return;
    }

    if (this.exchangeData.kg > this.currentStock) {
      this.error = `Stock insuficiente. Solo hay ${this.currentStock}kg disponibles`;
      setTimeout(() => this.error = '', 3000);
      return;
    }

    this.calculatingQuote = true;

    this.chatService.getExchangeQuote(
      this.currentConversation.publication.titulo,
      this.exchangeData.kg,
      this.selectedConversationId || undefined,
      this.currentConversation?.vendedor?.id || undefined
    ).subscribe({
      next: (res) => {
        this.calculatingQuote = false;
        if (res?.success && res.data) {
          this.exchangeQuote = res.data as ExchangeQuote;
          this.exchangeData.price = Number(this.exchangeQuote.precioTotalArs) || 0;
          this.paymentApprovedNotified = false;
          this.startPaymentStatusPolling();
          this.cdr.detectChanges();
          return;
        }

        this.error = 'No se pudo calcular la cotización';
        setTimeout(() => this.error = '', 3000);
      },
      error: (err) => {
        this.calculatingQuote = false;
        this.exchangeQuote = null;
        this.stopPaymentStatusPolling();
        this.paymentStatusLabel = '';
        this.paymentStatusState = '';
        this.error = err.error?.message || 'No se encontró cotización para este material';
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  private startPaymentStatusPolling(): void {
    this.stopPaymentStatusPolling();

    if (!this.exchangeQuote?.mpPayment?.preferenceId && !this.exchangeQuote?.mpPayment?.externalReference) {
      return;
    }

    this.paymentStatusLabel = 'Verificando estado de pago...';
    this.paymentStatusState = 'pending';

    this.checkMercadoPagoPaymentStatus();

    this.paymentStatusInterval = setInterval(() => {
      this.checkMercadoPagoPaymentStatus();
    }, 6000);
  }

  private stopPaymentStatusPolling(): void {
    if (this.paymentStatusInterval) {
      clearInterval(this.paymentStatusInterval);
      this.paymentStatusInterval = null;
    }
  }

  private checkMercadoPagoPaymentStatus(): void {
    const preferenceId = this.exchangeQuote?.mpPayment?.preferenceId;
    const externalReference = this.exchangeQuote?.mpPayment?.externalReference;

    if (!preferenceId && !externalReference) {
      return;
    }

    this.chatService.getMercadoPagoPaymentStatus({
      preferenceId,
      externalReference,
      sellerId: this.exchangeQuote?.mpPayment?.sellerId || this.currentConversation?.vendedor?.id || null
    }).subscribe({
      next: (res) => {
        const payment = res?.data as MercadoPagoPaymentStatus | undefined;
        if (!res?.success || !payment) {
          this.paymentStatusLabel = 'No se pudo consultar el estado del pago';
          this.paymentStatusState = 'error';
          return;
        }

        if (payment.approved) {
          this.paymentStatusLabel = '✅ Pago confirmado por Mercado Pago';
          this.paymentStatusState = 'approved';

          if (!this.paymentApprovedNotified) {
            this.paymentApprovedNotified = true;
            this.successMessage = '✅ Pago confirmado. Ya podés continuar con el intercambio.';
            setTimeout(() => this.successMessage = '', 6000);
          }

          this.stopPaymentStatusPolling();
          this.cdr.detectChanges();
          return;
        }

        const normalizedStatus = (payment.status || 'pending').toLowerCase();
        const statusMap: Record<string, string> = {
          pending: 'Pendiente de pago',
          in_process: 'Pago en proceso',
          rejected: 'Pago rechazado',
          cancelled: 'Pago cancelado',
          refunded: 'Pago reembolsado',
          charged_back: 'Pago desconocido',
          authorized: 'Pago autorizado'
        };

        this.paymentStatusLabel = `Estado: ${statusMap[normalizedStatus] || normalizedStatus}`;
        this.paymentStatusState = normalizedStatus === 'rejected' || normalizedStatus === 'cancelled' ? 'error' : 'pending';
        this.cdr.detectChanges();
      },
      error: () => {
        this.paymentStatusLabel = 'No se pudo actualizar el estado del pago';
        this.paymentStatusState = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  openWalletPayment(walletId: string): void {
    if (!this.exchangeQuote?.paymentIntent) {
      this.error = 'Primero calculá la cotización para generar datos de pago';
      setTimeout(() => this.error = '', 3000);
      return;
    }

    const amount = this.exchangeQuote.paymentIntent.amountArs;
    const description = this.exchangeQuote.paymentIntent.description;
    const receiver = this.exchangeQuote.paymentIntent.receiver;

    const deepLinks: Record<string, string> = {
      uala: 'uala://',
      naranjax: 'naranjax://',
      mercadopago: 'mercadopago://',
      modo: 'modo://'
    };

    const wallet = this.exchangeQuote.paymentIntent.wallets.find((item) => item.id === walletId);
    const deepLink = deepLinks[walletId];
    const fallbackUrl = wallet?.webUrl || '';

    const paymentText = [
      `Monto ARS: ${amount}`,
      `Concepto: ${description}`,
      `Titular: ${receiver.titular}`,
      `Alias: ${receiver.alias}`,
      receiver.cvu ? `CVU: ${receiver.cvu}` : '',
      receiver.cbu ? `CBU: ${receiver.cbu}` : ''
    ].filter(Boolean).join('\n');

    this.copyToClipboard(paymentText, false);

    if (deepLink) {
      window.location.href = deepLink;
    }

    if (fallbackUrl) {
      setTimeout(() => {
        window.open(fallbackUrl, '_blank', 'noopener');
      }, 600);
    }
  }

  copyTransferData(): void {
    if (!this.exchangeQuote?.paymentIntent) {
      this.error = 'No hay datos de pago para copiar';
      setTimeout(() => this.error = '', 3000);
      return;
    }

    const payment = this.exchangeQuote.paymentIntent;
    const text = [
      `Pago RenovaRed`,
      `Monto: $${payment.amountArs} ${payment.currency}`,
      `Concepto: ${payment.description}`,
      `Titular: ${payment.receiver.titular}`,
      `Alias: ${payment.receiver.alias}`,
      payment.receiver.cvu ? `CVU: ${payment.receiver.cvu}` : '',
      payment.receiver.cbu ? `CBU: ${payment.receiver.cbu}` : ''
    ].filter(Boolean).join('\n');

    this.copyToClipboard(text, true);
  }

  copyMercadoPagoLink(): void {
    const url = this.exchangeQuote?.mpPayment?.initPoint;
    if (!url) {
      this.error = 'No hay link de Mercado Pago disponible';
      setTimeout(() => this.error = '', 3000);
      return;
    }

    this.copyToClipboard(url, true);
  }

  private copyToClipboard(text: string, showSuccess: boolean): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      if (showSuccess) {
        this.successMessage = 'Datos de pago copiados';
        setTimeout(() => this.successMessage = '', 2500);
      }
    }).catch(() => {
      this.error = 'No se pudo copiar al portapapeles';
      setTimeout(() => this.error = '', 3000);
    });
  }

  respondToExchange(exchangeId: string, action: 'aceptar' | 'rechazar'): void {
    this.chatService.respondToExchange(exchangeId, action).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = res.message;
          setTimeout(() => this.successMessage = '', 5000);
          this.checkExchangeStatus();
          this.loadConversation(this.selectedConversationId!);
          
          this.chatService.getConversation(this.selectedConversationId!).subscribe({
            next: (convRes) => {
              if (convRes.success && convRes.data) {
                this.currentConversation = convRes.data;
                if (this.currentConversation?.publication?.cantidad) {
                  const cantidadValor = this.currentConversation.publication.cantidad;
                  const cantidadStr = typeof cantidadValor === 'string' ? cantidadValor : String(cantidadValor);
                  this.currentStock = parseFloat(cantidadStr) || 0;
                } else {
                  this.currentStock = 0;
                }
                this.cdr.detectChanges();
              }
            }
          });
        }
      },
      error: (err) => {
        console.error('Error responding to exchange:', err);
        this.error = err.error?.message || 'Error al procesar la solicitud';
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  markMessagesAsRead(conversationId: string): void {
    if (!this.currentConversation || !this.currentConversation.mensajes) {
      return;
    }
    
    const unreadMessages = this.currentConversation.mensajes
      .filter(m => !m.read && m.remitenteId !== this.currentUserId)
      .map(m => m.id);
    
    if (unreadMessages.length > 0) {
      this.webSocketService.markAsRead(conversationId, unreadMessages);
      
      this.currentConversation.mensajes = this.currentConversation.mensajes.map(msg => {
        if (unreadMessages.includes(msg.id)) {
          return { ...msg, read: true };
        }
        return msg;
      });
      
      this.conversations = this.conversations.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, no_leidos: 0 };
        }
        return conv;
      });
      
      this.cdr.detectChanges();
    }
  }

  sendMessage(): void {
    if (this.conversationDeletedByOther) {
      return;
    }
    
    if (!this.newMessage.trim() || !this.selectedConversationId) return;

    const content = this.newMessage;
    this.newMessage = '';

    this.webSocketService.sendMessage(this.selectedConversationId, content);
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }

  goBack(): void {
    this.resetSelectedConversation();
    this.error = '';
    this.router.navigate(['/chat'], { replaceUrl: true });
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
        this.resetSelectedConversation();
      }

      this.cancelDelete();
      this.cdr.detectChanges();
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.conversationToDelete = null;
  }

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

  getContactMessage(): string {
    if (!this.currentConversation) return '';
    
    if (this.currentConversation.comprador?.id === this.currentUserId) {
      return 'Te estás contactando por:';
    } else {
      return 'Se están contactando contigo por:';
    }
  }

  getWarningMessage(): { title: string; message: string; suggestion: string } {
    if (!this.currentConversation) {
      return {
        title: 'Conversación cerrada',
        message: 'No puedes enviar más mensajes.',
        suggestion: 'Para volver a contactar, visita la publicación y haz clic en "Contactar usuario".'
      };
    }

    const soyComprador = this.currentConversation.comprador?.id === this.currentUserId;
    const soyVendedor = this.currentConversation.vendedor?.id === this.currentUserId;
    
    if (soyComprador) {
      return {
        title: 'El vendedor cerró la conversación',
        message: 'El vendedor eliminó esta conversación de su lista. No puedes enviar más mensajes.',
        suggestion: 'Si aún estás interesado, puedes volver a contactarlo desde su publicación.'
      };
    } else if (soyVendedor) {
      return {
        title: 'El comprador cerró la conversación',
        message: 'El comprador eliminó esta conversación de su lista. No puedes enviar más mensajes.',
        suggestion: 'Puedes esperar a que el comprador te contacte nuevamente desde tu publicación.'
      };
    }
    
    return {
      title: 'Conversación cerrada',
      message: 'El otro usuario eliminó esta conversación. No puedes enviar más mensajes.',
      suggestion: 'Para volver a contactar, visita la publicación y haz clic en "Contactar usuario".'
    };
  }

  toggleHeaderDropdown(event: Event): void {
    event.stopPropagation();
    this.showHeaderDropdown = !this.showHeaderDropdown;
    this.cdr.detectChanges();
  }

  closeHeaderDropdown(): void {
    this.showHeaderDropdown = false;
  }

  viewProfile(): void {
    const otherUser = this.getOtherUser();
    if (!otherUser.id) return;
    
    this.isLoadingProfile = true;
    this.showHeaderDropdown = false;
    this.miniMapInitialized = false;
    
    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }
    
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
    
    this.chatService.getUserLocations().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const userLocation = response.data.find((u: any) => u.id === otherUser.id);
          
          if (userLocation && userLocation.coordinates) {
            this.selectedUserProfile = {
              ...this.selectedUserProfile,
              coordinates: userLocation.coordinates,
              ubicacion_texto: userLocation.ubicacion_texto || this.selectedUserProfile.ubicacion_texto
            };
            setTimeout(() => this.initializeMiniMap(), 200);
          }
        }
        
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
      },
      error: () => {
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
      return;
    }
    
    if (this.miniMapInitialized) return;
    
    setTimeout(() => {
      const mapContainer = document.getElementById('profileMiniMap');
      if (mapContainer && !this.miniMapInitialized) {
        const { lat, lng } = this.selectedUserProfile.coordinates;
        
        this.miniMap = L.map(mapContainer).setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.miniMap);
        L.marker([lat, lng]).addTo(this.miniMap);
        
        this.miniMapInitialized = true;
        setTimeout(() => this.miniMap?.invalidateSize(), 100);
      }
    }, 200);
  }

  deleteConversationFromHeader(): void {
    this.showHeaderDropdown = false;
    if (this.selectedConversationId) {
      const conversation = this.conversations.find(c => c.id === this.selectedConversationId);
      if (conversation) {
        this.confirmDeleteConversation(conversation, new Event('click'));
      }
    }
  }

  goToFullProfile(): void {
    const userId = this.selectedUserProfile?.id;

    if (userId) {
      this.closeProfileModal();
      setTimeout(() => {
        this.router.navigate(['/profile', userId]);
      }, 100);
    } else {
      console.error('Probando: No hay ID de usuario para redirigir');
    }
  }

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
