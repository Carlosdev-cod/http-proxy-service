# HTTP Proxy Service

Proxy HTTP simple y seguro, desplegable en Render.

## Características

- Proxy HTTP/HTTPS
- Rate limiting integrado
- Health check endpoint
- Seguridad con Helmet
- CORS habilitado
- Logging con Winston
- Despliegue en Render con Docker

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Información del servicio |
| GET | `/health` | Health check |
| GET | `/proxy?url=URL` | Proxear una URL |

## Uso

### Request básico

```bash
curl "https://tu-dominio.com/proxy?url=https://httpbin.org/get"
```

### Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `RATE_LIMIT_WINDOW_MS` | Ventana de rate limit (ms) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests por ventana | `100` |
| `DEBUG` | Modo debug | `false` |

## Despliegue en Render

1. Sube el código a tu repositorio
2. Conecta el repo en Render
3. Render detecta el `render.yaml` automáticamente
4. Agrega tu dominio personalizado en Settings

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

## Licencia

MIT
