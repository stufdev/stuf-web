import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const buildIdPath = resolve(cwd, '.next', 'BUILD_ID');
const nextBinPath = resolve(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
const port = Number(process.env.PORT ?? 3210);
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;

const ROUTES = [
  {
    path: '/comparison',
    snippets: ['Comparison', 'Choose fixture', 'Analysis scope'],
  },
  {
    path: '/fixtures',
    snippets: ['Upcoming fixtures', 'Market', 'Group by'],
  },
  {
    path: '/streaks',
    snippets: ['Streaks', 'Minimum match streak', 'Reset Search/Filter'],
  },
];

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Server is not ready yet.
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchHtml(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'follow' });
  const html = await response.text();
  return { response, html };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmoke() {
  assert(existsSync(buildIdPath), 'Missing .next/BUILD_ID. Run `npm run build` before `npm run smoke:v1`.');
  assert(existsSync(nextBinPath), 'Missing local Next.js binary. Run `npm install` first.');

  const child = spawn(process.execPath, [nextBinPath, 'start', '-p', String(port), '-H', host], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
    },
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const stopServer = () => {
    if (!child.killed) {
      child.kill();
    }
  };

  process.on('exit', stopServer);
  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stopServer();
    process.exit(143);
  });

  try {
    await waitForServer(`${baseUrl}/comparison`);

    const results = [];

    for (const route of ROUTES) {
      const { response, html } = await fetchHtml(route.path);
      assert(response.ok, `Route ${route.path} returned ${response.status}.`);

      for (const snippet of route.snippets) {
        assert(html.includes(snippet), `Route ${route.path} is missing snippet: ${snippet}`);
      }

      assert(html.includes('Comparison'), `Route ${route.path} is missing shell nav label: Comparison`);
      assert(html.includes('Fixtures'), `Route ${route.path} is missing shell nav label: Fixtures`);
      assert(html.includes('Streaks'), `Route ${route.path} is missing shell nav label: Streaks`);

      results.push({
        path: route.path,
        status: response.status,
        snippets: route.snippets.length,
      });
    }

    console.log('Frontend smoke passed.');
    for (const result of results) {
      console.log(`${result.path} -> ${result.status} (${result.snippets} checks)`);
    }
  } finally {
    stopServer();
    await sleep(500);
    process.removeListener('exit', stopServer);
  }

  if (stderr.trim()) {
    console.log('\n[next stderr]');
    console.log(stderr.trim());
  }

  if (stdout.trim()) {
    console.log('\n[next stdout]');
    console.log(stdout.trim());
  }
}

runSmoke().catch((error) => {
  console.error(`Frontend smoke failed: ${error.message}`);
  process.exit(1);
});
