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

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'materiales', component: MaterialsExploreComponent },
    { path: 'marketplace', component: MarketplaceComponent },
    { path: 'marketplace/mis-publicaciones', component: MyPublicationsComponent },
    { path: 'marketplace/publicar', component: PublicationFormComponent },
    { path: 'maps', component: MapsComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'profile/:id', component: ProfileComponent },
    { path: 'chat', component: ChatComponent },
    { path: 'chat/:id', component: ChatComponent },
];

