const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  if (process.env.REACT_APP_LOCAL_MAINNET !== 'true') return;
  // Development only: same-origin API access without changing production CORS.
  app.use('/mainnet-api', createProxyMiddleware({
    target: 'https://maestrobeatz.servegame.com',
    changeOrigin: true,
    secure: true,
    pathRewrite: { '^/mainnet-api': '' },
    onProxyReq(proxyReq) { proxyReq.removeHeader('origin'); },
  }));
};
