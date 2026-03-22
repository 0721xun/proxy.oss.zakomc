// workers.js
// ZAKOXUN Cloudflare R2 OSS Proxy

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 favicon.ico 请求（直接返回空，避免404/400）
    if (path === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // 处理 background.jpg 请求（返回透明图片或直接忽略）
    if (path === '/background.jpg') {
      // 返回一个 1x1 的透明 GIF，避免报错
      const transparentPixel = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      return new Response(atob(transparentPixel), {
        status: 200,
        headers: { 'Content-Type': 'image/gif' }
      });
    }

    // 如果是根路径，显示可爱的提示页面
    if (path === '/' || path === '') {
      return new Response(getHomePage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 提取目标 URL（格式：/https://... 或 /http://...）
    const fullPath = url.pathname + url.search;
    let targetUrl = null;
    if (fullPath.startsWith('/https://')) {
      targetUrl = 'https://' + fullPath.slice(9);
    } else if (fullPath.startsWith('/http://')) {
      targetUrl = 'http://' + fullPath.slice(8);
    } else {
      return new Response(getErrorPage('呜呜呜～格式不对啦', '要在路径后面加上完整的下载链接哦～'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 解析目标网址
    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch (e) {
      return new Response(getErrorPage('链接坏掉了呢', '这个下载链接好像有问题～'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 白名单：只允许 oss.zakoxun.top
    const allowedDomains = ['oss.zakoxun.top'];
    if (!allowedDomains.includes(targetHost)) {
      return new Response(getErrorPage('不可以哦～', `${targetHost} 不在白名单里呢～`), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 代理下载
    return fetchWithRetry(targetUrl);
  }
};

function getHomePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZAKOXUN R2 OSS Proxy</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            min-height: 100vh;
            font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            transition: background 0.3s ease;
        }
        
        body.light {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        body.dark {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
        }
        
        .card {
            border-radius: 48px;
            padding: 40px 35px;
            max-width: 550px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 35px rgba(0,0,0,0.2);
            transition: background 0.3s ease;
        }
        
        body.light .card {
            background: rgba(255, 255, 255, 0.95);
        }
        
        body.dark .card {
            background: rgba(26, 32, 44, 0.95);
        }
        
        .logo { font-size: 64px; margin-bottom: 15px; }
        
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        body.light h1 {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
        }
        
        body.dark h1 {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
        }
        
        .subtitle { 
            margin-bottom: 30px; 
            font-size: 14px;
        }
        
        body.light .subtitle { color: #000000; }
        body.dark .subtitle { color: #ffffff; }
        
        .url-box {
            border-radius: 24px;
            padding: 18px;
            margin: 20px 0;
        }
        
        body.light .url-box {
            background: #fef5e6;
            border: 1px solid #f39c12;
        }
        
        body.dark .url-box {
            background: #1f2937;
            border: 1px solid #fbbf24;
        }
        
        .url-label { 
            font-size: 12px; 
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        body.light .url-label { color: #000000; }
        body.dark .url-label { color: #ffffff; }
        
        .url-example {
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            padding: 10px;
            border-radius: 16px;
        }
        
        body.light .url-example {
            background: #ffffff;
            color: #000000;
            border: 1px solid #f39c12;
        }
        
        body.dark .url-example {
            background: #111827;
            color: #ffffff;
            border: 1px solid #fbbf24;
        }
        
        input {
            width: 100%;
            padding: 14px 18px;
            font-size: 14px;
            border: 2px solid;
            border-radius: 40px;
            outline: none;
            font-family: monospace;
            margin: 15px 0 10px;
            transition: all 0.2s;
        }
        
        body.light input {
            background: #ffffff;
            border-color: #f39c12;
            color: #000000;
        }
        
        body.dark input {
            background: #1f2937;
            border-color: #fbbf24;
            color: #ffffff;
        }
        
        body.light input:focus {
            border-color: #e67e22;
            box-shadow: 0 0 0 2px rgba(243,156,18,0.2);
        }
        
        body.dark input:focus {
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(251,191,36,0.2);
        }
        
        input::placeholder {
            color: #9ca3af;
        }
        
        button {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 40px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.2s;
        }
        
        button:hover { opacity: 0.9; }
        
        .tips {
            margin-top: 20px;
            font-size: 11px;
            line-height: 1.6;
        }
        
        body.light .tips { color: #000000; }
        body.dark .tips { color: #ffffff; }
        
        .mode-buttons {
            margin-top: 20px;
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        
        .mode-btn {
            border: none;
            padding: 8px 20px;
            border-radius: 30px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        body.light .mode-btn {
            background: #e5e7eb;
            color: #000000;
        }
        
        body.dark .mode-btn {
            background: #374151;
            color: #ffffff;
        }
        
        .mode-btn:hover {
            transform: scale(1.02);
            opacity: 0.9;
        }
        
        footer {
            margin-top: 25px;
            font-size: 10px;
        }
        
        body.light footer { color: #6b7280; }
        body.dark footer { color: #9ca3af; }
    </style>
</head>
<body class="light">
    <div class="card">
        <div class="logo">☁️🐻‍❄️</div>
        <h1>ZAKOXUN Cloudflare R2 OSS Proxy</h1>
        <div class="subtitle">✨ 安全 & 快速的下载代理 ✨</div>
        
        <div class="url-box">
            <div class="url-label">📦 使用方法</div>
            <div class="url-example">
                https://proxy.zakoxun.top/https://oss.zakoxun.top/文件名
            </div>
        </div>
        
        <input type="text" id="fileInput" placeholder="输入文件名，比如：ZalithLauncher-1.4.1.2-arm64-v8a.apk" />
        <button id="downloadBtn">⬇️ 立即下载 ⬇️</button>
        
        <div class="tips">
            💡 只能代理 oss.zakoxun.top 的文件
        </div>
        
        <div class="mode-buttons">
            <button class="mode-btn" data-mode="light">☀️ 浅色模式</button>
            <button class="mode-btn" data-mode="dark">🌙 深色模式</button>
        </div>
        
        <footer>⚡ Powered by Cloudflare Workers</footer>
    </div>
    
    <script>
        function setTheme(theme) {
            document.body.className = theme;
            localStorage.setItem('theme', theme);
        }
        
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setTheme(btn.dataset.mode);
            });
        });
        
        document.getElementById('downloadBtn').addEventListener('click', () => {
            let filename = document.getElementById('fileInput').value.trim();
            if (!filename) {
                alert('请输入文件名呀～');
                return;
            }
            if (filename.startsWith('http')) {
                window.open(filename, '_blank');
            } else {
                window.open('https://proxy.zakoxun.top/https://oss.zakoxun.top/' + encodeURIComponent(filename), '_blank');
            }
        });
        
        document.getElementById('fileInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('downloadBtn').click();
        });
    </script>
</body>
</html>`;
}

function getErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZAKOXUN Proxy - 出错了</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            font-family: system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            transition: background 0.3s ease;
        }
        body.light {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        body.dark {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
        }
        .card {
            border-radius: 48px;
            padding: 40px 35px;
            max-width: 450px;
            text-align: center;
            box-shadow: 0 20px 35px rgba(0,0,0,0.2);
        }
        body.light .card {
            background: rgba(255, 255, 255, 0.95);
        }
        body.dark .card {
            background: rgba(26, 32, 44, 0.95);
        }
        .emoji { font-size: 64px; margin-bottom: 20px; }
        h2 { color: #e74c3c; margin-bottom: 15px; font-size: 24px; }
        p { margin-bottom: 25px; line-height: 1.6; }
        body.light p { color: #000000; }
        body.dark p { color: #ffffff; }
        a {
            display: inline-block;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            padding: 10px 28px;
            border-radius: 40px;
            text-decoration: none;
            font-weight: bold;
        }
        .mode-btn {
            margin-top: 20px;
            background: rgba(0,0,0,0.1);
            border: none;
            padding: 6px 14px;
            border-radius: 30px;
            cursor: pointer;
            font-size: 12px;
        }
        body.light .mode-btn {
            background: #e5e7eb;
            color: #000000;
        }
        body.dark .mode-btn {
            background: #374151;
            color: #ffffff;
        }
    </style>
</head>
<body class="light">
    <div class="card">
        <div class="emoji">😿💔</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <a href="/">🏠 返回首页</a>
        <div style="margin-top: 15px;">
            <button class="mode-btn" onclick="document.body.className = document.body.className === 'light' ? 'dark' : 'light'; localStorage.setItem('theme', document.body.className)">🌓 切换主题</button>
        </div>
    </div>
    <script>
        const saved = localStorage.getItem('theme') || 'light';
        document.body.className = saved;
    </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

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
        return new Response(getErrorPage('下载失败啦', '已经努力了 ' + retries + ' 次，还是不行呢～'), {
          status: 504,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }
  }
}