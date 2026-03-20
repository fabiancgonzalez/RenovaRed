import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isAuthenticated = false;
  userName = '';
  dropdownOpen = false;
  mobileMenuOpen = false;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.syncAuthState();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncAuthState();
        this.dropdownOpen = false;
        this.mobileMenuOpen = false;
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.hamburger')) {
      this.dropdownOpen = false;
      this.mobileMenuOpen = false;
    }
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

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  toggleMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMenu(): void {
    this.mobileMenuOpen = false;
    this.dropdownOpen = false;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated = false;
    this.userName = '';
    this.dropdownOpen = false;
    this.mobileMenuOpen = false;
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}