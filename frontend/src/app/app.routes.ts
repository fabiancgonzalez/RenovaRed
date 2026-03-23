import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { HomeLoggedComponent } from './pages/home-logged/home-logged.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { MarketplaceComponent } from './pages/marketplace/marketplace.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ChatComponent } from './pages/chat/chat.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MapsComponent } from './pages/maps/maps.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';  

export const routes: Routes = [
    // Rutas públicas
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    
    // Home para logueados
    { path: 'inicio', component: HomeLoggedComponent, canActivate: [AuthGuard] },
    
    // Rutas protegidas
    { path: 'marketplace', component: MarketplaceComponent, canActivate: [AuthGuard] },
    { path: 'maps', component: MapsComponent, canActivate: [AuthGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
    { path: 'profile/:id', component: ProfileComponent },
    { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
    { path: 'chat/:id', component: ChatComponent, canActivate: [AuthGuard] },
    
    // DASHBOARD - SOLO ADMIN
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard, AdminGuard] },
];
