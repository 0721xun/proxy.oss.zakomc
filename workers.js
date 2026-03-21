// workers.js 或 src/index.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowedDomains = ['oss.download.zakomc.top'];
    const targetHost = url.hostname;

    // 白名单检查：只允许 oss.download.zakomc.top
    if (!allowedDomains.includes(targetHost)) {
      return new Response('Forbidden: Only oss.download.zakomc.top is allowed', {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // 代理请求，带重试和超时
    return fetchWithRetry(request);
  }
};

async function fetchWithRetry(request, retries = 3, timeout = 5000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok || i === retries - 1) return response;
      console.warn(`Retry ${i + 1} for ${request.url}`);
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === retries - 1) {
        return new Response('Download failed after retries', { status: 504 });
      }
      console.warn(`Retry due to error: ${err.message}`);
    }
  }
}