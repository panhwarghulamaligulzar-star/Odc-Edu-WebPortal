module.exports = {
  apps: [
    {
      name: "ODC_ALI",

      cwd: "/www/wwwroot/Odc-Edu-WebPortal/backend",

      script: "npm",
      args: "run start",
      interpreter: "none",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,

      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,

      max_memory_restart: "750M",

      kill_timeout: 10000,
      listen_timeout: 10000,

      time: true,

      output:
        "/www/wwwroot/Odc-Edu-WebPortal/logs/app-out.log",

      error:
        "/www/wwwroot/Odc-Edu-WebPortal/logs/app-error.log",

      merge_logs: true,

      env: {
        NODE_ENV: "development",
        PORT: "5028"
      },

      env_production: {
        NODE_ENV: "production",
        PORT: "5028"
      }
    }
  ]
};