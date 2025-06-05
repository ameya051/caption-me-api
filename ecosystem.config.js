module.exports = {
  apps: [{
    name: 'caption-me-api',
    script: './dist/index.js', // or './src/index.js' if not using TypeScript build
    instances: 1, // Single instance for t2.micro (1 vCPU)
    exec_mode: 'fork', // Use fork mode instead of cluster for single instance
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    
    // Resource management for t2.micro (1GB RAM)
    max_memory_restart: '800M', // Restart if memory usage exceeds 800MB
    
    // Process management
    autorestart: true,
    watch: false, // Don't watch files in production
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
    
    // Additional options for stability
    node_args: '--max-old-space-size=768' // Limit Node.js heap to 768MB
  }]
}