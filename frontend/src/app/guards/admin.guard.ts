import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }
    
    try {
      const user = JSON.parse(userRaw || '{}');
      const isAdmin = user?.tipo === 'Admin';
      
      if (isAdmin) {
        return true;
      }
      
      this.router.navigate(['/inicio']);
      return false;
    } catch {
      this.router.navigate(['/login']);
      return false;
    }
  }
}