// workers.js
// ZAKOXUN Cloudflare R2 OSS Proxy

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    if (path === '/' || path === '') {
      return new Response(getHomePage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    let targetUrl = null;
    if (path.startsWith('/https://')) {
      targetUrl = 'https://' + path.slice(9);
    } else if (path.startsWith('/http://')) {
      targetUrl = 'http://' + path.slice(8);
    } else {
      return new Response(getErrorPage('呜呜呜～格式不对啦', '要在路径后面加上完整的下载链接哦～'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch (e) {
      return new Response(getErrorPage('链接坏掉了呢', '这个下载链接好像有问题～'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const allowedDomains = ['oss.zakoxun.top'];
    if (!allowedDomains.includes(targetHost)) {
      return new Response(getErrorPage('不可以哦～', `${targetHost} 不在白名单里呢～`), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

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
            background: url('background.jpg') center/cover fixed;
            font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card {
            background: rgba(255,255,255,0.92);
            border-radius: 48px;
            padding: 40px 35px;
            max-width: 550px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 35px rgba(0,0,0,0.1);
        }
        .logo { font-size: 64px; margin-bottom: 15px; }
        h1 {
            font-size: 24px;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            margin-bottom: 10px;
        }
        .subtitle { color: #a0aec0; margin-bottom: 30px; font-size: 14px; }
        .url-box {
            background: #fffaf0;
            border-radius: 24px;
            padding: 18px;
            margin: 20px 0;
            border: 1px solid #ffe0b5;
        }
        .url-label { font-size: 12px; color: #f39c12; margin-bottom: 8px; }
        .url-example {
            font-family: monospace;
            font-size: 12px;
            color: #2d3748;
            word-break: break-all;
            background: white;
            padding: 10px;
            border-radius: 16px;
        }
        input {
            width: 100%;
            padding: 14px 18px;
            font-size: 14px;
            border: 2px solid #ffe0b5;
            border-radius: 40px;
            outline: none;
            font-family: monospace;
            background: #fffaf0;
            margin: 15px 0 10px;
        }
        input:focus { border-color: #f39c12; background: white; }
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
            color: #bdc3c7;
            line-height: 1.6;
        }
        .bg-buttons {
            margin-top: 15px;
            display: flex;
            gap: 8px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .bg-btn {
            background: rgba(255,255,255,0.8);
            border: 1px solid #e2e8f0;
            padding: 5px 12px;
            border-radius: 30px;
            font-size: 11px;
            cursor: pointer;
        }
        footer {
            margin-top: 20px;
            font-size: 10px;
            color: #cbd5e0;
        }
    </style>
</head>
<body>
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
            💡 只能代理 oss.zakoxun.top 的文件<br>
            🎨 点击下面按钮可以换背景颜色
        </div>
        
        <div class="bg-buttons">
            <button class="bg-btn" data-bg="default">🌈 默认</button>
            <button class="bg-btn" data-bg="purple">💜 紫色</button>
            <button class="bg-btn" data-bg="ocean">🌊 蓝色</button>
            <button class="bg-btn" data-bg="sunset">🌅 橙色</button>
            <button class="bg-btn" data-bg="forest">🌲 绿色</button>
        </div>
        <footer>⚡ Powered by Cloudflare Workers</footer>
    </div>
    
    <script>
        const bgMap = {
            default: "url('background.jpg') center/cover fixed",
            purple: "linear-gradient(135deg, #9b59b6, #8e44ad)",
            ocean: "linear-gradient(135deg, #3498db, #2980b9)",
            sunset: "linear-gradient(135deg, #e67e22, #d35400)",
            forest: "linear-gradient(135deg, #2ecc71, #27ae60)"
        };
        
        function setBackground(bgKey) {
            document.body.style.background = bgMap[bgKey];
        }
        
        document.querySelectorAll('.bg-btn').forEach(btn => {
            btn.addEventListener('click', () => setBackground(btn.dataset.bg));
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
            background: url('background.jpg') center/cover fixed;
            font-family: system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card {
            background: rgba(255,255,255,0.95);
            border-radius: 48px;
            padding: 40px 35px;
            max-width: 450px;
            text-align: center;
            box-shadow: 0 20px 35px rgba(0,0,0,0.1);
        }
        .emoji { font-size: 64px; margin-bottom: 20px; }
        h2 { color: #e74c3c; margin-bottom: 15px; font-size: 24px; }
        p { color: #4a5568; margin-bottom: 25px; line-height: 1.6; }
        a {
            display: inline-block;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            padding: 10px 28px;
            border-radius: 40px;
            text-decoration: none;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="emoji">😿💔</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <a href="/">🏠 返回首页</a>
    </div>
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