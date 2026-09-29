const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');
const { spawnSync } = require('node:child_process');
const { serverEnvironment } = require('./build-server.cjs');
const root = path.resolve(__dirname, '..');

function localEnvironment(parent = process.env) {
  const env = serverEnvironment(parent);
  // Prevent CRA's development dotenv pass from adding unreviewed client values.
  for (const file of ['.env.development', '.env.development.local']) {
    const name = path.join(root, file);
    if (fs.existsSync(name)) {
      for (const key of Object.keys(dotenv.parse(fs.readFileSync(name)))) {
        if (key.startsWith('REACT_APP_') && !(key in env)) env[key] = '';
      }
    }
  }
  Object.assign(env, {
    NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '3002', BROWSER: 'none',
    REACT_APP_LOCAL_MAINNET: 'true',
    REACT_APP_API_BASE_URL: '/mainnet-api',
    REACT_APP_BACKEND_API_BASE_URL: '/mainnet-api',
    REACT_APP_MARKET_API_BASE_URL: '/mainnet-api',
  });
  delete env.BUILD_PATH;
  return env;
}

if (require.main === module) {
  console.log('Local WAX Mainnet: http://localhost:3002/cleanupcentr/');
  console.log('Uses the live mainnet API. Wallet transactions use real assets.');
  const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/start')], {
    cwd: root, env: localEnvironment(), stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}
module.exports = { localEnvironment };
