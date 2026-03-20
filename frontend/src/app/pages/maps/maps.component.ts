import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';





interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface UserCoordinates {
  lat: number;
  lng: number;
}

interface MapUser {
  id: string;
  nombre: string;
  tipo: string;
  avatar_url?: string;
  ubicacion_texto?: string;
  coordinates: UserCoordinates;
}

interface UserDistanceSummary {
  user: MapUser;
  nearestUser?: MapUser;
  distanceKm?: number;
}

interface LoggedUserDistance {
  currentUser: MapUser;
  nearestUser: MapUser;
  distanceKm: number;
}

interface ClosestPair {
  first: MapUser;
  second: MapUser;
  distanceKm: number;
}

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './maps.component.html',
  styleUrls: ['./maps.component.css']
})
export class MapsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private readonly argentinaCenter: UserCoordinates = { lat: -34.6037, lng: -58.3816 };

  loading = true;
  errorMessage = '';
  allUsers: MapUser[] = [];
  users: MapUser[] = [];
  userTypes: string[] = [];
  selectedTypes: Record<string, boolean> = {};
  userDistances: UserDistanceSummary[] = [];
  closestPairGlobal: ClosestPair | null = null;
  loggedUserDistance: LoggedUserDistance | null = null;
  private loggedUserId = '';

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loggedUserId = this.getLoggedUserId();
  }

  ngAfterViewInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  get highlightedUserIds(): string[] {
    const ids = new Set<string>();

    const globalPair = this.getGlobalPairForMap();
    const loggedPair = this.getLoggedPairForMap();

    // Si ambos pares son el mismo, dibujar una sola línea combinada
    if (this.isSamePair(globalPair, loggedPair) && globalPair && this.markersLayer) {
      L.polyline([
        [globalPair.first.coordinates.lat, globalPair.first.coordinates.lng],
        [globalPair.second.coordinates.lat, globalPair.second.coordinates.lng]
      ], {
        color: '#a855f7',
        weight: 4,
        dashArray: '4 8',
        opacity: 0.95
      }).addTo(this.markersLayer);
    } else {
      // Par global (más cercano entre todos)
      if (globalPair && this.markersLayer) {
        L.polyline([
          [globalPair.first.coordinates.lat, globalPair.first.coordinates.lng],
          [globalPair.second.coordinates.lat, globalPair.second.coordinates.lng]
        ], {
          color: '#f97316',
          weight: 3,
          dashArray: '2 10',
          opacity: 0.95
        }).addTo(this.markersLayer);
      }

      // Par del usuario logueado
      if (loggedPair && this.markersLayer) {
        L.polyline([
          [loggedPair.first.coordinates.lat, loggedPair.first.coordinates.lng],
          [loggedPair.second.coordinates.lat, loggedPair.second.coordinates.lng]
        ], {
          color: '#2563eb',
          weight: 4,
          opacity: 0.95
        }).addTo(this.markersLayer);
      }
    }

    if (globalPair) {
      ids.add(globalPair.first.id);
      ids.add(globalPair.second.id);
    }

    if (loggedPair) {
      ids.add(loggedPair.first.id);
      ids.add(loggedPair.second.id);
    }

    return Array.from(ids);
  }

  private getGlobalPairForMap(): ClosestPair | null {
    if (!this.closestPairGlobal) {
      return null;
    }

    const visible = new Set(this.users.map((user) => user.id));
    if (!visible.has(this.closestPairGlobal.first.id) || !visible.has(this.closestPairGlobal.second.id)) {
      return null;
    }

    return this.closestPairGlobal;
  }

  private getLoggedPairForMap(): ClosestPair | null {
    if (!this.loggedUserDistance) {
      return null;
    }

    const pair: ClosestPair = {
      first: this.loggedUserDistance.currentUser,
      second: this.loggedUserDistance.nearestUser,
      distanceKm: this.loggedUserDistance.distanceKm
    };

    const visible = new Set(this.users.map((user) => user.id));
    if (!visible.has(pair.first.id) || !visible.has(pair.second.id)) {
      return null;
    }

    return pair;
  }

  private isSamePair(first: ClosestPair | null, second: ClosestPair | null): boolean {
    if (!first || !second) {
      return false;
    }

    return (
      (first.first.id === second.first.id && first.second.id === second.second.id) ||
      (first.first.id === second.second.id && first.second.id === second.first.id)
    );
  }

  get centeredUserCount(): number {
    return this.users.length;
  }

  private getLoggedUserId(): string {
    try {
      const userRaw = localStorage.getItem('user');
      if (!userRaw) {
        return '';
      }

      const user = JSON.parse(userRaw);
      return user?.id || '';
    } catch {
      return '';
    }
  }

  private loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<ApiResponse<MapUser[]>>(`${environment.apiUrl}/users/map/locations`).subscribe({
      next: (response) => {
        this.allUsers = (response.data || [])
          .map((user) => this.normalizeUserCoordinates(user))
          .filter((user): user is MapUser => !!user);

        this.userTypes = Array.from(new Set(this.allUsers.map((user) => user.tipo))).sort((left, right) => left.localeCompare(right));
        this.selectedTypes = this.userTypes.reduce((acc, type) => ({ ...acc, [type]: true }), {} as Record<string, boolean>);
        this.closestPairGlobal = this.calculateClosestPair(this.allUsers);
        this.loggedUserDistance = this.calculateLoggedUserDistance(this.allUsers);
        this.applyFilters(false);
        this.loading = false;
        this.cdr.detectChanges();
        this.renderMap();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las ubicaciones de usuarios';
      }
    });
  }

  private normalizeUserCoordinates(user: MapUser): MapUser | null {
    const normalized = this.normalizeCoordinates(user.coordinates);
    if (!normalized) {
      return null;
    }

    return {
      ...user,
      coordinates: normalized
    };
  }

  private normalizeCoordinates(coordinates?: UserCoordinates): UserCoordinates | null {
    if (!coordinates) {
      return null;
    }

    const rawLat = this.toCoordinateNumber((coordinates as any).lat ?? (coordinates as any).latitude);
    const rawLng = this.toCoordinateNumber(
      (coordinates as any).lng
      ?? (coordinates as any).lon
      ?? (coordinates as any).long
      ?? (coordinates as any).longitude
    );

    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
      return null;
    }

    // Se prueban combinaciones:
    // - original
    // - invertido (lat/lng swap)
    // - correcciones de signo en lat/lng
    const basePairs: UserCoordinates[] = [
      { lat: rawLat, lng: rawLng },
      { lat: rawLng, lng: rawLat }
    ];

    const candidates: UserCoordinates[] = [];

    for (const pair of basePairs) {
      for (const latSign of [1, -1]) {
        for (const lngSign of [1, -1]) {
          const candidate = {
            lat: pair.lat * latSign,
            lng: pair.lng * lngSign
          };

          if (Math.abs(candidate.lat) <= 90 && Math.abs(candidate.lng) <= 180) {
            candidates.push(candidate);
          }
        }
      }
    }

    if (!candidates.length) {
      return null;
    }

    // Elegir la coordenada más razonable para el dominio (Argentina)
    return candidates.reduce((best, current) => {
      const bestDistance = this.calculateDistanceKm(best, this.argentinaCenter);
      const currentDistance = this.calculateDistanceKm(current, this.argentinaCenter);

      // Preferencia suave por caja geográfica argentina
      const bestInAr = best.lat <= -20 && best.lat >= -55 && best.lng <= -53 && best.lng >= -75;
      const currentInAr = current.lat <= -20 && current.lat >= -55 && current.lng <= -53 && current.lng >= -75;

      const bestScore = bestDistance + (bestInAr ? 0 : 1500);
      const currentScore = currentDistance + (currentInAr ? 0 : 1500);

      return currentScore < bestScore ? current : best;
    });
  }

  private toCoordinateNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // soporta coma decimal: "-31,416"
      const normalized = value.trim().replace(',', '.');
      return Number(normalized);
    }

    return Number.NaN;
  }

  private isValidCoordinates(coordinates?: UserCoordinates): coordinates is UserCoordinates {
    if (!coordinates) {
      return false;
    }

    return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng);
  }

  private calculateDistances(): void {
    if (this.users.length < 2) {
      this.userDistances = this.users.map((user) => ({ user }));
      return;
    }

    this.userDistances = this.users
      .map((user) => {
        let nearestUser: MapUser | undefined;
        let shortestDistance = Number.POSITIVE_INFINITY;

        for (const candidate of this.users) {
          if (candidate.id === user.id) {
            continue;
          }

          const distanceKm = this.calculateDistanceKm(user.coordinates, candidate.coordinates);

          if (distanceKm < shortestDistance) {
            shortestDistance = distanceKm;
            nearestUser = candidate;
          }

        }

        return {
          user,
          nearestUser,
          distanceKm: Number.isFinite(shortestDistance) ? shortestDistance : undefined
        };
      })
      .sort((left, right) => {
        const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
        const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      });
  }

  private calculateClosestPair(sourceUsers: MapUser[]): ClosestPair | null {
    if (sourceUsers.length < 2) {
      return null;
    }

    let closestPair: ClosestPair | null = null;

    for (let index = 0; index < sourceUsers.length; index += 1) {
      const firstUser = sourceUsers[index];
      for (let candidateIndex = index + 1; candidateIndex < sourceUsers.length; candidateIndex += 1) {
        const secondUser = sourceUsers[candidateIndex];
        const distanceKm = this.calculateDistanceKm(firstUser.coordinates, secondUser.coordinates);

        if (!closestPair || distanceKm < closestPair.distanceKm) {
          closestPair = { first: firstUser, second: secondUser, distanceKm };
        }
      }
    }

    return closestPair;
  }

  private calculateLoggedUserDistance(sourceUsers: MapUser[]): LoggedUserDistance | null {
    if (!this.loggedUserId) {
      return null;
    }

    const currentUser = sourceUsers.find((user) => user.id === this.loggedUserId);
    if (!currentUser) {
      return null;
    }

    let nearestUser: MapUser | undefined;
    let shortestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of sourceUsers) {
      if (candidate.id === currentUser.id) {
        continue;
      }

      const distanceKm = this.calculateDistanceKm(currentUser.coordinates, candidate.coordinates);
      if (distanceKm < shortestDistance) {
        shortestDistance = distanceKm;
        nearestUser = candidate;
      }
    }

    if (!nearestUser || !Number.isFinite(shortestDistance)) {
      return null;
    }

    return {
      currentUser,
      nearestUser,
      distanceKm: shortestDistance
    };
  }

  applyFilters(shouldRenderMap = true): void {
    const activeTypes = new Set(
      Object.entries(this.selectedTypes)
        .filter(([, selected]) => selected)
        .map(([type]) => type)
    );

    this.users = this.allUsers.filter((user) => activeTypes.has(user.tipo));
    this.calculateDistances();

    if (shouldRenderMap) {
      this.renderMap();
    }
  }

  toggleType(type: string): void {
    this.selectedTypes[type] = !this.selectedTypes[type];
    this.applyFilters();
  }

  activateAllTypes(): void {
    this.userTypes.forEach((type) => {
      this.selectedTypes[type] = true;
    });
    this.applyFilters();
  }

  private calculateDistanceKm(first: UserCoordinates, second: UserCoordinates): number {
    const earthRadiusKm = 6371;
    const deltaLat = this.toRadians(second.lat - first.lat);
    const deltaLng = this.toRadians(second.lng - first.lng);
    const firstLat = this.toRadians(first.lat);
    const secondLat = this.toRadians(second.lat);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
      + Math.cos(firstLat) * Math.cos(secondLat)
      * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * angularDistance;
  }

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }

  private ensureMap(): void {
    if (this.map || !this.mapContainer) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  private renderMap(): void {
    this.ensureMap();

    if (!this.map || !this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();

    if (!this.users.length) {
      this.map.setView([-34.6037, -58.3816], 4);
      return;
    }

    const bounds: L.LatLngTuple[] = [];
    const highlightedIds = new Set(this.highlightedUserIds);

    for (const user of this.users) {
      const position: L.LatLngTuple = [user.coordinates.lat, user.coordinates.lng];
      const highlighted = highlightedIds.has(user.id);

      const marker = L.circleMarker(position, {
        radius: highlighted ? 10 : 7,
        color: highlighted ? '#ef4444' : '#0f766e',
        weight: highlighted ? 4 : 2,
        fillColor: highlighted ? '#f59e0b' : '#34d399',
        fillOpacity: 0.9
      });

      marker.bindPopup(this.buildPopup(user, highlighted));
      marker.addTo(this.markersLayer);
      bounds.push(position);
    }

    const pair = this.getGlobalPairForMap();
    if (pair
      && this.users.some((user) => user.id === pair.first.id)
      && this.users.some((user) => user.id === pair.second.id)) {
      L.polyline([
        [pair.first.coordinates.lat, pair.first.coordinates.lng],
        [pair.second.coordinates.lat, pair.second.coordinates.lng]
      ], {
        color: '#f97316',
        weight: 3,
        dashArray: '2 10', // línea punteada
        opacity: 0.95
      }).addTo(this.markersLayer);
    }

    if (bounds.length === 1) {
      this.map.setView(bounds[0], 12);
    } else {
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private buildPopup(user: MapUser, highlighted: boolean): string {
    const title = this.escapeHtml(user.nombre);
    const location = this.escapeHtml(user.ubicacion_texto || 'Ubicación sin detalle');
    const type = this.escapeHtml(user.tipo);
    const badge = highlighted ? '<span class="popup-badge">Pareja más cercana</span>' : '';

    return `
      <div class="popup-card">
        <strong>${title}</strong>
        <div>${type}</div>
        <div>${location}</div>
        ${badge}
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  formatDistance(distanceKm?: number): string {
    if (distanceKm === undefined) {
      return 'Sin referencia';
    }

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }

    const decimals = distanceKm < 10 ? 2 : 1;
    return `${distanceKm.toFixed(decimals)} km`;
  }

}
