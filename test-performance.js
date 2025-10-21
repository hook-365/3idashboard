#!/usr/bin/env node

/**
 * Performance Testing Script for 3I/ATLAS Dashboard
 * Tests all implemented performance optimizations
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const IS_HTTPS = BASE_URL.startsWith('https');
const httpModule = IS_HTTPS ? https : http;

const TESTS = {
  // Cache Tests
  cacheTests: [
    {
      name: 'Redis Cache Hit',
      endpoint: '/api/comet-data',
      method: 'GET',
      headers: {},
      expectedHeaders: ['x-cache'],
      repeat: 2, // First miss, second hit
    },
    {
      name: 'Cache Statistics',
      endpoint: '/api/cache-stats',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      name: 'Health Check',
      endpoint: '/api/health',
      method: 'GET',
      expectedStatus: [200, 206], // Healthy or degraded
    },
  ],

  // Performance Tests
  performanceTests: [
    {
      name: 'API Response Time - Comet Data',
      endpoint: '/api/comet-data',
      maxTime: 500, // 500ms max
    },
    {
      name: 'API Response Time - Observations',
      endpoint: '/api/observations',
      maxTime: 300,
    },
    {
      name: 'API Response Time - Cached Request',
      endpoint: '/api/comet-data',
      maxTime: 50, // Should be fast from cache
      warmup: true, // Make request first to warm cache
    },
  ],

  // Fallback Tests
  fallbackTests: [
    {
      name: 'SQLite Fallback',
      endpoint: '/api/comet-data?refresh=true',
      // This would need the external APIs to be down to test properly
      skip: true,
    },
  ],

  // Bundle Size Tests (requires build analysis)
  bundleTests: [
    {
      name: 'Check if service worker exists',
      endpoint: '/sw.js',
      expectedStatus: 200,
      expectedContentType: 'application/javascript',
    },
    {
      name: 'Check PWA manifest',
      endpoint: '/manifest.json',
      expectedStatus: 200,
      expectedContentType: 'application/json',
    },
  ],
};

// Utility function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const startTime = performance.now();

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (IS_HTTPS ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000,
    };

    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: endTime - startTime,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run cache tests
async function runCacheTests() {
  console.log('\n🔧 Running Cache Tests...\n');

  for (const test of TESTS.cacheTests) {
    try {
      console.log(`Testing: ${test.name}`);

      if (test.repeat) {
        // Make multiple requests to test caching
        for (let i = 0; i < test.repeat; i++) {
          const response = await makeRequest(test.endpoint, {
            method: test.method,
            headers: test.headers,
          });

          if (i === test.repeat - 1) {
            // Check last request for cache hit
            const cacheHeader = response.headers['x-cache'];
            if (cacheHeader && cacheHeader.includes('HIT')) {
              console.log(`  ✅ Cache working: ${cacheHeader}`);
            } else {
              console.log(`  ⚠️  No cache hit detected`);
            }
          }

          // Wait between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        const response = await makeRequest(test.endpoint, {
          method: test.method,
        });

        const expectedStatuses = Array.isArray(test.expectedStatus)
          ? test.expectedStatus
          : [test.expectedStatus || 200];

        if (expectedStatuses.includes(response.statusCode)) {
          console.log(`  ✅ Status: ${response.statusCode}`);
        } else {
          console.log(`  ❌ Unexpected status: ${response.statusCode}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
    }
  }
}

// Run performance tests
async function runPerformanceTests() {
  console.log('\n⚡ Running Performance Tests...\n');

  for (const test of TESTS.performanceTests) {
    try {
      console.log(`Testing: ${test.name}`);

      if (test.warmup) {
        // Warm up the cache
        await makeRequest(test.endpoint);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const response = await makeRequest(test.endpoint);

      if (response.responseTime <= test.maxTime) {
        console.log(`  ✅ Response time: ${response.responseTime.toFixed(2)}ms (max: ${test.maxTime}ms)`);
      } else {
        console.log(`  ⚠️  Slow response: ${response.responseTime.toFixed(2)}ms (max: ${test.maxTime}ms)`);
      }
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
    }
  }
}

// Run bundle tests
async function runBundleTests() {
  console.log('\n📦 Running Bundle/PWA Tests...\n');

  for (const test of TESTS.bundleTests) {
    try {
      console.log(`Testing: ${test.name}`);

      const response = await makeRequest(test.endpoint);

      if (response.statusCode === test.expectedStatus) {
        console.log(`  ✅ Resource found: ${test.endpoint}`);

        if (test.expectedContentType) {
          const contentType = response.headers['content-type'];
          if (contentType && contentType.includes(test.expectedContentType)) {
            console.log(`  ✅ Correct content type: ${contentType}`);
          } else {
            console.log(`  ⚠️  Unexpected content type: ${contentType}`);
          }
        }
      } else {
        console.log(`  ❌ Resource not found: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
    }
  }
}

// Check if Redis is running
async function checkRedis() {
  console.log('\n🔴 Checking Redis Status...\n');

  try {
    const response = await makeRequest('/api/cache-stats');
    const data = JSON.parse(response.data);

    if (data.redis && data.redis.connected) {
      console.log(`  ✅ Redis is connected`);
      console.log(`  📊 Keys in cache: ${data.redis.keys || 0}`);
      console.log(`  💾 Memory usage: ${(data.redis.memoryUsage / 1024 / 1024).toFixed(2) || 0} MB`);
    } else {
      console.log(`  ⚠️  Redis is not connected`);
    }

    if (data.sqlite) {
      console.log(`  ✅ SQLite is available`);
      Object.entries(data.sqlite).forEach(([table, info]) => {
        if (info.count !== undefined) {
          console.log(`    - ${table}: ${info.count} records`);
        }
      });
    }
  } catch (error) {
    console.log(`  ❌ Could not check cache status: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  console.log('=====================================');
  console.log('3I/ATLAS Dashboard Performance Tests');
  console.log('=====================================');
  console.log(`Testing: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    // Check if server is running
    console.log('\n🌐 Checking server status...');
    const response = await makeRequest('/api/health');
    console.log(`  ✅ Server is running (status: ${response.statusCode})`);

    // Run all test suites
    await checkRedis();
    await runCacheTests();
    await runPerformanceTests();
    await runBundleTests();

    // Summary
    console.log('\n=====================================');
    console.log('✨ Performance tests completed!');
    console.log('=====================================\n');

    // Performance recommendations
    console.log('📋 Recommendations:');
    console.log('  1. Ensure Redis is running for optimal caching');
    console.log('  2. Monitor response times during peak usage');
    console.log('  3. Review slow API endpoints identified above');
    console.log('  4. Check bundle size with: ANALYZE=true npm run build');
    console.log('  5. Test PWA installation on mobile devices\n');

  } catch (error) {
    console.error('\n❌ Server is not responding. Please start the server first.');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);