// workers.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // 提取目标 URL：假设路径以 /https:// 或 /http:// 开头
    let targetUrl = null;
    if (path.startsWith('/https://')) {
      targetUrl = 'https://' + path.slice(9);
    } else if (path.startsWith('/http://')) {
      targetUrl = 'http://' + path.slice(8);
    } else {
      // 如果不是代理格式，返回 400
      return new Response('Invalid proxy path. Use /https://<target-url>', { status: 400 });
    }

    // 解析目标 URL 的 hostname
    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch (e) {
      return new Response('Invalid target URL', { status: 400 });
    }

    // 白名单：只允许 oss.download.zakomc.top
    const allowedDomains = ['oss.download.zakomc.top'];
    if (!allowedDomains.includes(targetHost)) {
      return new Response(`Forbidden: ${targetHost} is not allowed`, {
        status: 403,
        statusText: 'Forbidden'
      });
    }

    // 创建新的请求对象，指向目标 URL
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    // 代理请求，带重试和超时
    return fetchWithRetry(proxyRequest);
  }
};

async function fetchWithRetry(request, retries = 3, timeout = 5000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      // 如果响应成功，直接返回；如果失败且未达重试上限，继续重试
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