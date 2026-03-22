// workers.js
// 安全代理：只允许代理 oss.zakoxun.top
// 使用方法：https://proxy.zakoxun.top/https://oss.zakoxun.top/文件路径

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // 提取目标 URL（格式：/https://... 或 /http://...）
    let targetUrl = null;
    if (path.startsWith('/https://')) {
      targetUrl = 'https://' + path.slice(9);
    } else if (path.startsWith('/http://')) {
      targetUrl = 'http://' + path.slice(8);
    } else {
      return new Response(
        '使用说明：请在路径后添加完整的下载链接\n' +
        '正确示例：\n' +
        'https://proxy.zakoxun.top/https://oss.zakoxun.top/文件名\n\n' +
        '当前路径：' + path,
        { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // 解析目标网址
    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch (e) {
      return new Response('无效的下载链接：' + targetUrl, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // 白名单：只允许 oss.zakoxun.top
    const allowedDomains = ['oss.zakoxun.top'];
    if (!allowedDomains.includes(targetHost)) {
      return new Response(
        '禁止下载：域名 ' + targetHost + ' 不在白名单中\n' +
        '允许的域名：' + allowedDomains.join(', '),
        { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // 代理下载，带重试和超时
    return fetchWithRetry(targetUrl);
  }
};

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
        return new Response('下载失败，已重试 ' + retries + ' 次：' + err.message, { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }
  }
}