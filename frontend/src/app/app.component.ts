  import { Component, OnInit } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router, RouterModule, NavigationEnd } from '@angular/router';
  import { HeaderComponent } from './pages/header/header.component';
  import { filter } from 'rxjs/operators';

  @Component({
    selector: 'app-root',
    standalone: true,
    imports: [
      CommonModule,
      RouterModule,
      HeaderComponent
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
  })
  export class AppComponent implements OnInit {
    currentUrl: string = '';

  constructor(public router: Router) {
    this.currentUrl = this.router.url || '';

    // Escuchar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.urlAfterRedirects;
      this.checkAuthAndRedirect();
    });
  }

    ngOnInit() {
      this.checkAuthAndRedirect();
    }

    /**
     * Verifica si la página actual es pública (sin header)
     */
    isPublicPage(): boolean {
      return this.currentUrl === '/' || 
            this.currentUrl === '' || 
            this.currentUrl === '/login' || 
            this.currentUrl === '/register';
    }

  /**
   * Redirige automáticamente a marketplace si el usuario está logueado y entra al home
   */
  private checkAuthAndRedirect(): void {
    const isLoggedIn = !!localStorage.getItem('token');
    const isHome = this.currentUrl === '/' || this.currentUrl === '';
    
    if (isLoggedIn && isHome) {
      this.router.navigate(['/marketplace']);
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated(): boolean {
      return !!localStorage.getItem('token');
    }
  }