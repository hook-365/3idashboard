const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const compression = require('compression')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Configure compression middleware
const compress = compression({
  level: 6, // Balanced compression level (1-9, 6 is default)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Skip compression if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false
    }
    // Use default filter function
    return compression.filter(req, res)
  }
})

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Apply compression middleware
      compress(req, res, async () => {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      })
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Graceful shutdown initiated...`)

    httpServer.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Start server with enhanced error handling
  httpServer
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please stop the existing server or use a different port.`)
        console.error('You can check running processes with: ps aux | grep node')
        console.error('To kill the existing server: pkill -f "node server.js"')
      } else {
        console.error('Server error:', err)
      }
      process.exit(1)
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Environment: ${dev ? 'development' : 'production'}`)
      console.log(`> Process ID: ${process.pid}`)
      console.log(`> Compression: enabled (gzip, level 6, threshold 1KB)`)
    })
})