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
  isAdmin = false;
  userName = '';
  userAvatar: string | null = '';
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

    if (!userRaw) {
      this.isAdmin = false;
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      this.userName = user?.nombre || user?.name || user?.email || '';
      this.userAvatar = user?.avatar_url || null;
      this.isAdmin = user?.tipo === 'Admin';
    } catch {
      this.userName = '';
      this.userAvatar = null;
      this.isAdmin = false;
    }
  }

  getAvatarSrc(avatarUrl: string | null): string {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl;
    }
    return '/assets/default-avatar.png';
  }

  handleAvatarError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/assets/default-avatar.png';
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

  onNavLinkClick(): void {
    this.closeMenu();
    this.closeDropdown();
  }

  goHome(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/inicio']);
    } else {
      this.router.navigate(['/']);
    }
    this.closeMenu();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.userName = '';
    this.userAvatar = null;
    this.dropdownOpen = false;
    this.mobileMenuOpen = false;
    this.router.navigate(['/'], { replaceUrl: true });
  }
}