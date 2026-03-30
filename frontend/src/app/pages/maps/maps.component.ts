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
  email?: string;
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
  highlightedUserIds: string[] = [];
  closestPairGlobal: ClosestPair | null = null;
  loggedUserDistance: LoggedUserDistance | null = null;
  private loggedUserMatchKeys = new Set<string>();

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loggedUserMatchKeys = this.getLoggedUserMatchKeys();
  }

  ngAfterViewInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.map?.remove();
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

  get emptyUsersMessage(): string {
    if (this.allUsers.length === 0) {
      return 'No hay usuarios con coordenadas disponibles para mostrar en el mapa.';
    }

    return 'No hay usuarios visibles con los filtros seleccionados.';
  }

  get loggedUserWarningMessage(): string {
    if (this.loggedUserDistance) {
      return '';
    }

    if (!this.loggedUserMatchKeys.size) {
      return 'No se pudo identificar la sesión actual para calcular tu vecino más cercano.';
    }

    if (this.allUsers.length < 2) {
      return 'Se necesitan al menos dos usuarios con coordenadas para calcular proximidad.';
    }

    return 'Tu usuario logueado no aparece entre las ubicaciones disponibles del mapa.';
  }

  private getLoggedUserMatchKeys(): Set<string> {
    const keys = new Set<string>();

    try {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        this.addUserMatchKey(keys, user?.id);
        this.addUserMatchKey(keys, user?._id);
        this.addUserMatchKey(keys, user?.user_id);
        this.addUserMatchKey(keys, user?.userId);
        this.addUserMatchKey(keys, user?.sub);
        this.addUserMatchKey(keys, user?.email);
      }
    } catch {
      // ignore parse errors and fallback to token extraction
    }

    this.addUserMatchKey(keys, this.getLoggedUserIdFromToken());
    this.addUserMatchKey(keys, this.getLoggedUserEmailFromToken());
    return keys;
  }

  private getLoggedUserIdFromToken(): string {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return '';
      }

      const [, payload] = token.split('.');
      if (!payload) {
        return '';
      }

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const normalizedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decodedPayload = JSON.parse(atob(normalizedBase64));

      return this.normalizeUserId(decodedPayload?.id ?? decodedPayload?.sub);
    } catch {
      return '';
    }
  }

  private getLoggedUserEmailFromToken(): string {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return '';
      }

      const [, payload] = token.split('.');
      if (!payload) {
        return '';
      }

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const normalizedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decodedPayload = JSON.parse(atob(normalizedBase64));

      return this.normalizeUserId(decodedPayload?.email);
    } catch {
      return '';
    }
  }

  private toUserMatchKey(value: unknown): string {
    return this.normalizeUserId(value).trim().toLowerCase();
  }

  private addUserMatchKey(collection: Set<string>, value: unknown): void {
    const key = this.toUserMatchKey(value);
    if (key) {
      collection.add(key);
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
      id: this.normalizeUserId(user.id),
      coordinates: normalized
    };
  }

  private normalizeUserId(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
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
    if (!this.loggedUserMatchKeys.size) {
      return null;
    }

    const currentUser = sourceUsers.find((user) =>
      this.loggedUserMatchKeys.has(this.toUserMatchKey(user.id))
      || this.loggedUserMatchKeys.has(this.toUserMatchKey(user.email))
    );
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
    this.updateHighlightedUserIds();

    if (shouldRenderMap) {
      this.renderMap();
    }
  }

  private updateHighlightedUserIds(): void {
    const ids = new Set<string>();
    const globalPair = this.getGlobalPairForMap();
    const loggedPair = this.getLoggedPairForMap();

    if (globalPair) {
      ids.add(globalPair.first.id);
      ids.add(globalPair.second.id);
    }

    if (loggedPair) {
      ids.add(loggedPair.first.id);
      ids.add(loggedPair.second.id);
    }

    this.highlightedUserIds = Array.from(ids);
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

    this.renderHighlightedPairs();

    if (bounds.length === 1) {
      this.map.setView(bounds[0], 12);
    } else {
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private renderHighlightedPairs(): void {
    if (!this.markersLayer) {
      return;
    }

    const globalPair = this.getGlobalPairForMap();
    const loggedPair = this.getLoggedPairForMap();

    if (globalPair) {
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

    if (loggedPair) {
      const start: UserCoordinates = {
        lat: loggedPair.first.coordinates.lat,
        lng: loggedPair.first.coordinates.lng
      };
      const end: UserCoordinates = {
        lat: loggedPair.second.coordinates.lat,
        lng: loggedPair.second.coordinates.lng
      };

      L.polyline([
        [start.lat, start.lng],
        [end.lat, end.lng]
      ], {
        color: '#2563eb',
        weight: 5,
        opacity: 0.65
      }).addTo(this.markersLayer);

      const segmentDistanceKm = this.calculateDistanceKm(start, end);
      const pointsCount = Math.max(2, Math.min(24, Math.ceil(segmentDistanceKm / 5)));
      for (let index = 0; index <= pointsCount; index += 1) {
        const ratio = index / pointsCount;
        const lat = start.lat + (end.lat - start.lat) * ratio;
        const lng = start.lng + (end.lng - start.lng) * ratio;

        L.circleMarker([lat, lng], {
          radius: index === 0 || index === pointsCount ? 7 : 5,
          color: '#1d4ed8',
          fillColor: '#93c5fd',
          fillOpacity: 1,
          weight: 2
        }).addTo(this.markersLayer);
      }
    }
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
