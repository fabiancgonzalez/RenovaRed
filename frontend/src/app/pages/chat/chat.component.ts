import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface ConvUser {
  id: string;
  nombre: string;
  avatar_url?: string;
}

interface ConvMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  remitente?: ConvUser;
}

interface Conversation {
  id: string;
  estado?: string;
  updated_at: string;
  Publication?: { id: string; titulo: string; imagenes?: string[] };
  Messages?: ConvMessage[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd?: ElementRef;

  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;

  loadingConversations = false;
  loadingMessages = false;
  sendingMessage = false;
  messageText = '';
  errorMessage = '';
  currentUserId = '';

  private shouldScroll = false;

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.currentUserId = JSON.parse(userRaw).id;
    } catch { /* ignore */ }

    this.loadConversations(() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam) {
        this.openConversation(idParam);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.messagesEnd?.nativeElement?.scrollIntoView({ block: 'end' });
      this.shouldScroll = false;
    }
  }

  loadConversations(callback?: () => void): void {
    this.loadingConversations = true;
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${environment.apiUrl}/conversations`, { headers }).subscribe({
      next: (response) => {
        this.conversations = response?.data ?? [];
        this.loadingConversations = false;
        if (callback) callback();
      },
      error: () => {
        this.loadingConversations = false;
        if (callback) callback();
      }
    });
  }

  openConversation(id: string): void {
    this.errorMessage = '';
    this.loadingMessages = true;
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${environment.apiUrl}/conversations/${id}`, { headers }).subscribe({
      next: (response) => {
        this.activeConversation = response?.data ?? null;
        this.loadingMessages = false;
        this.shouldScroll = true;
        this.router.navigate(['/chat', id], { replaceUrl: true });
      },
      error: (err) => {
        this.loadingMessages = false;
        this.errorMessage = err?.error?.message || 'No se pudo abrir la conversación';
      }
    });
  }

  sendMessage(): void {
    const content = this.messageText.trim();
    if (!content || !this.activeConversation || this.sendingMessage) return;

    const headers = this.getAuthHeaders();
    this.sendingMessage = true;

    this.http.post<any>(
      `${environment.apiUrl}/conversations/${this.activeConversation.id}/messages`,
      { content },
      { headers }
    ).subscribe({
      next: (response) => {
        if (!this.activeConversation!.Messages) {
          this.activeConversation!.Messages = [];
        }
        this.activeConversation!.Messages.push({
          ...response.data,
          sender_id: this.currentUserId,
          remitente: { id: this.currentUserId, nombre: 'Tú' }
        });
        this.messageText = '';
        this.sendingMessage = false;
        this.shouldScroll = true;
      },
      error: (err) => {
        this.sendingMessage = false;
        this.errorMessage = err?.error?.message || 'No se pudo enviar el mensaje';
      }
    });
  }

  conversationLabel(conv: Conversation): string {
    return conv.Publication?.titulo ?? `Conversación #${conv.id}`;
  }

  get activeTitle(): string {
    if (!this.activeConversation) return '';
    return this.activeConversation.Publication?.titulo ?? `Conversación #${this.activeConversation.id}`;
  }

  isOwn(msg: ConvMessage): boolean {
    return msg.sender_id === this.currentUserId || msg.remitente?.id === this.currentUserId;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
