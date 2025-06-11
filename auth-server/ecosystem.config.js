module.exports = {
  apps: [{
    name: 'caption-me-auth',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Resource management
    max_memory_restart: '500M',
    
    // Process management
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Process behavior
    kill_timeout: 5000,
    listen_timeout: 3000,
    wait_ready: true,
    
    // Health monitoring
    health_check_grace_period: 3000,
  }]
}
