import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('googleButtonContainer') googleButtonContainer?: ElementRef<HTMLDivElement>;

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  infoMessage = '';
  googleLoginEnabled = !!environment.googleClientId;

  credentials = {
    email: '',
    password: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/marketplace'], { replaceUrl: true });
      return;
    }

  }

  ngAfterViewInit(): void {
    if (this.googleLoginEnabled) {
      void this.initializeGoogleLogin();
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  showSocialMessage(provider: string) {
    this.infoMessage = `Login con ${provider} no disponible en esta demo`;
    setTimeout(() => this.infoMessage = '', 3000);
  }

  private async initializeGoogleLogin(): Promise<void> {
    try {
      await this.loadGoogleScript();
      this.renderGoogleButton();
    } catch {
      this.infoMessage = 'No se pudo inicializar Google Login';
      setTimeout(() => this.infoMessage = '', 3000);
    }
  }

  private loadGoogleScript(): Promise<void> {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-identity-script') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-identity-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  private renderGoogleButton(): void {
    if (!this.googleButtonContainer?.nativeElement || !window.google?.accounts?.id || !environment.googleClientId) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: ({ credential }) => {
        this.zone.run(() => this.loginWithGoogleCredential(credential));
      }
    });

    this.googleButtonContainer.nativeElement.innerHTML = '';
    window.google.accounts.id.renderButton(this.googleButtonContainer.nativeElement, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 280
    });
  }

  private loginWithGoogleCredential(credential?: string): void {
    if (!credential) {
      this.errorMessage = 'Google no devolvió un token válido';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<any>(`${environment.apiUrl}/auth/google`, { credential })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.completeLogin(response, '¡Login con Google exitoso! Redirigiendo...');
            return;
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Error login Google:', err);
          this.errorMessage = err.error?.message || 'Error al iniciar sesión con Google';
          setTimeout(() => this.errorMessage = '', 3000);
          this.loading = false;
        }
      });
  }

  showForgotPasswordMessage() {
    this.infoMessage = 'Funcionalidad de recuperación de contraseña no disponible en demo';
    setTimeout(() => this.infoMessage = '', 3000);
  }

  onSubmit() {
    // Validaciones básicas
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Por favor completá todos los campos';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    if (!this.isValidEmail(this.credentials.email)) {
      this.errorMessage = 'Email inválido';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>(`${environment.apiUrl}/auth/login`, this.credentials)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.completeLogin(response, '¡Login exitoso! Redirigiendo...');
            return;
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Error login:', err);
          this.errorMessage = err.error?.message || 'Error al iniciar sesión';
          setTimeout(() => this.errorMessage = '', 3000);
          this.loading = false;
        }
      });
  }

  private completeLogin(response: any, message: string): void {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    this.successMessage = message;
    this.loading = false;

    setTimeout(() => {
      this.router.navigate(['/marketplace'], { replaceUrl: true });
    }, 1500);
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
