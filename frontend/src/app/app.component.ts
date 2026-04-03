import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './pages/header/header.component';
import { ChatWidget } from './components/chat-widget/chat-widget';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    ChatWidget
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  currentUrl: string = '';
  showHeader: boolean = false;
  private readonly authApiStorageKey = 'auth_api_base';

  constructor(public router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.url;
      this.updateHeaderVisibility();
    });
  }

  ngOnInit() {
    this.ensureSessionMatchesApi();
    this.updateHeaderVisibility();
  }

  private ensureSessionMatchesApi(): void {
    const previousApi = localStorage.getItem(this.authApiStorageKey);
    const currentApi = environment.apiUrl;

    if (previousApi && previousApi !== currentApi) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/login']);
    }

    localStorage.setItem(this.authApiStorageKey, currentApi);
  }

  updateHeaderVisibility(): void {
    const noHeaderRoutes = ['/', '/login', '/register'];
    this.showHeader = !noHeaderRoutes.includes(this.currentUrl);
  }
}
