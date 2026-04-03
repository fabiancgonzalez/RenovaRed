
// chat-widget.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatWidgetService, ChatMessage } from '../../services/chat';
import { ImageUpload } from '../../services/image-upload';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ChatWidgetService],
  templateUrl: './chat-widget.html',
  styleUrls: ['./chat-widget.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms', style({ opacity: 1 }))
      ])
    ])
  ]

})

export class ChatWidget implements OnInit, OnDestroy {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  private chatService = inject(ChatWidgetService);
  private imageUpload = inject(ImageUpload);
  
  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  unreadCount = 0;
  private autoScroll = true;

  ngOnInit() {
    // Cargar historial previo si existe
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      this.messages = JSON.parse(saved);
    }
  }

  ngOnDestroy() {
    // Guardar historial
    localStorage.setItem('chat_history', JSON.stringify(this.messages));
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.newMessage,
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);
    const messageToSend = this.newMessage;
    this.newMessage = '';
    this.isLoading = true;
    
    this.scrollToBottom();

    this.chatService.sendMessage(messageToSend).subscribe({
      next: (response) => {
        const botMessage: ChatMessage = {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };
        this.messages.push(botMessage);
        this.isLoading = false;
        this.scrollToBottom();
        
        if (!this.isOpen) {
          this.unreadCount++;
        }
      },
      error: (error) => {
        console.error('Error:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  clearChat() {
    this.chatService.clearHistory();
    this.messages = [];
    this.newMessage = '';
    this.unreadCount = 0;
  }

  private scrollToBottom() {
    if (this.autoScroll && this.messageContainer) {
      setTimeout(() => {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }, 50);
    }
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

// Agregar en chat-widget.component.ts
async onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    this.isLoading = true;
    const imageUrl = await this.imageUpload.uploadImage(file);
    
    // Agregar mensaje con imagen
    this.messages.push({
      role: 'user',
      content: '📷 Imagen compartida',
      imageUrl: imageUrl,
      timestamp: new Date()
    });
    
    // Enviar a IA para análisis de imagen
    this.chatService.sendImage(imageUrl).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: 'No pude procesar la imagen en este momento. Intenta nuevamente.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }
}
}