import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isAuthenticated = false;
  userName = '';

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.syncAuthState();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncAuthState());
  }

  private syncAuthState(): void {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    this.isAuthenticated = !!token;
    this.userName = '';

    if (!userRaw) return;

    try {
      const user = JSON.parse(userRaw);
      this.userName = user?.nombre || user?.name || user?.email || '';
    } catch {
      this.userName = '';
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated = false;
    this.userName = '';
    this.router.navigate(['/login'], { replaceUrl: true });
  }

}
