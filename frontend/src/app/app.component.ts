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

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.urlAfterRedirects;
    });
  }

  ngOnInit() {
  }

  isPublicPage(): boolean {
    return this.currentUrl === '/login' ||
           this.currentUrl === '/register';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
