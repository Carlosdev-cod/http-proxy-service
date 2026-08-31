# HTTP Proxy Service

Proxy HTTP/HTTPS con soporte CONNECT, desplegable en Railway.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?template=https://github.com/Carlosdev-cod/http-proxy-service)

## Características

- Proxy HTTP/HTTPS completo
- CONNECT method (túnel HTTPS)
- Health check endpoint
- Despliegue en Railway

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Información del servicio |
| GET | `/health` | Health check |

## Uso

### HTTP Proxy

```bash
curl -x https://tu-app.up.railway.app http://httpbin.org/get
```

### HTTPS (CONNECT)

```bash
curl -x https://tu-app.up.railway.app https://httpbin.org/get
```

## Despliegue en Railway

1. Toca el botón de arriba
2. Railway despliega automáticamente
3. Obtuene tu URL: `https://tu-app.up.railway.app`
4. Configura tu app con ese host y puerto 443

## Desarrollo local

```bash
npm install
node src/server.js
```

## Licencia

MIT
