# RenovaRed - Documentación del BACKEND

## Tecnologías
- Node.js v22.17.1
- Express 5+
- CORS habilitado
- Sequelize 6+ (ORM)
- PostgreSQL (Supabase)
- Swagger (documentación)

## Instalación
```bash
# Clonar repo
git clone https://github.com/fabiancgonzalez/RenovaRed.git
cd RenovaRed/backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev
```
## Estado actual (Marzo 2026)
**Estructura base** - Express + Sequelize  
**Base de datos** - Conectada a Supabase (PostgreSQL)  
**Modelos** - Creados: Users, Categories, Publications, Conversations, Exchanges, Messages, Favorites, DailyStats  
**Endpoints operativos**:
   - `GET /` → Redirige a `/api/home`
   - `GET /api/home` - Página principal con datos reales + fallback a mock
   - `GET /api/health` - Health check del servidor

**Documentación** - Swagger UI en `/api-docs`