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
      if (user.tipo === 'Admin') {
        return true;
      }
    } catch (e) {
      console.error('Error parsing user:', e);
    }
    
    this.router.navigate(['/inicio']);
    return false;
  }
}