// workers.js
// ZAKOXUN - 简洁代理服务
// 白名单：仅允许 oss.zakoxun.top

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // 根路径提示
    if (path === '/' || path === '') {
      return new Response(
        '请在 / 后输入链接',
        {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    // 提取目标 URL
    let targetUrl = null;
    if (path.startsWith('/https://')) {
      targetUrl = 'https://' + path.slice(9);
    } else if (path.startsWith('/http://')) {
      targetUrl = 'http://' + path.slice(8);
    } else {
      return new Response(
        '请在 / 后输入链接',
        {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    // 解析目标域名
    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch (e) {
      return new Response(
        '请在 / 后输入链接',
        {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    // 白名单检查
    const allowedDomains = ['oss.zakoxun.top'];
    if (!allowedDomains.includes(targetHost)) {
      return new Response(
        `禁止下载：域名 ${targetHost} 不在白名单中\n` +
        `允许的域名：${allowedDomains.join(', ')}`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    // 代理下载（带重试）
    return fetchWithRetry(targetUrl);
  }
};

// 带重试的下载函数
async function fetchWithRetry(targetUrl, retries = 3, timeout = 5000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok || i === retries - 1) return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === retries - 1) {
        return new Response(
          `下载失败：已重试 ${retries} 次\n` +
          `错误信息：${err.message}`,
          {
            status: 504,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }
        );
      }
    }
  }
}