import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { MarketplaceComponent } from './pages/marketplace/marketplace.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ChatComponent } from './pages/chat/chat.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MapsComponent } from './pages/maps/maps.component';
import { PublicationFormComponent } from './pages/publication-form/publication-form.component';
import { MaterialsExploreComponent } from './pages/materials-explore/materials-explore.component';
import { MyPublicationsComponent } from './pages/my-publications/my-publications.component';
import { HomeLoggedComponent } from './pages/home-logged/home-logged.component';
import { AuthGuard } from './guards/auth.guard';
import { PublicGuard } from './guards/public.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
    // Rutas públicas
    { path: '', component: HomeComponent, canActivate: [PublicGuard] },
    { path: 'login', component: LoginComponent, canActivate: [PublicGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [PublicGuard] },
    
    // Rutas protegidas
    { path: 'inicio', component: HomeLoggedComponent, canActivate: [AuthGuard] },
    { path: 'materiales', component: MaterialsExploreComponent, canActivate: [AuthGuard] },
    { path: 'marketplace', component: MarketplaceComponent, canActivate: [AuthGuard] },
    { path: 'marketplace/mis-publicaciones', component: MyPublicationsComponent, canActivate: [AuthGuard] },
    { path: 'marketplace/publicar', component: PublicationFormComponent, canActivate: [AuthGuard] },
    { path: 'maps', component: MapsComponent, canActivate: [AuthGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
    { path: 'profile/:id', component: ProfileComponent, canActivate: [AuthGuard] },
    { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
    { path: 'chat/:id', component: ChatComponent, canActivate: [AuthGuard] },
    
    // Dashboard - solo administradores
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard, AdminGuard] },
];

