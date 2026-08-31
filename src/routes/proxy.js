const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');

const router = express.Router();

// Validar URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Proxy principal
router.use('/', (req, res, next) => {
  const targetUrl = req.query.url || req.body.url;

  if (!targetUrl) {
    return res.status(400).json({
      error: 'URL requerida',
      usage: 'GET /proxy?url=https://example.com'
    });
  }

  if (!isValidUrl(targetUrl)) {
    return res.status(400).json({
      error: 'URL inválida. Debe ser http:// o https://'
    });
  }

  const urlObj = new URL(targetUrl);

  logger.info(`Proxy request: ${req.method} ${urlObj.hostname}`);

  const proxy = createProxyMiddleware({
    target: urlObj.origin,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return urlObj.pathname + urlObj.search;
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(502).json({ error: 'Error al conectar con el servidor destino' });
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('User-Agent', 'Proxy-Service/1.0');
    }
  });

  return proxy(req, res, next);
});

module.exports = router;
