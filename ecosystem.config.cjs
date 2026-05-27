'use strict';

const path = require('path');

const homeDir = process.env.HOME || process.env.USERPROFILE || '';

module.exports = {
  apps: [
    {
      name: 'toitoi-api',
      cwd: __dirname,
      script: './apps/api/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_production: {
        NODE_ENV: 'production',
        TOITOI_STORAGE_DIR: path.join(homeDir, 'toitoi/storage'),
      },
    },
    {
      name: 'toitoi-worker',
      cwd: __dirname,
      script: './infra/transports/nostr/relay_ingest_worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_production: {
        NODE_ENV: 'production',
        RELAY_URL: 'wss://relay.toitoi.cultivationdata.net',
        RELAY_STORAGE_DIR: path.join(homeDir, 'toitoi/storage'),
      },
    },
  ],
};
