require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./utils/logger');
const healthCheck = require('./routes/health');
const proxyHandler = require('./routes/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Demasiadas peticiones, intenta más tarde.' }
});
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/health', healthCheck);
app.use('/proxy', proxyHandler);

// Ruta raíz - información del servicio
app.get('/', (req, res) => {
  res.json({
    service: 'HTTP Proxy Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      proxy: '/proxy?url=https://example.com'
    }
  });
});

// Middleware de errores
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`Servidor proxy corriendo en puerto ${PORT}`);
});

module.exports = app;
