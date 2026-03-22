// workers.js
// ZAKOXUN Cloudflare R2 OSS Proxy
// 可爱的提示页面 + 安全代理

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // 如果是根路径，显示可爱的提示页面
    if (path === '/' || path === '') {
      return new Response(getHomePage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 提取目标 URL（格式：/https://... 或 /http://...）
    let targetUrl = null;
    if (path.startsWith('/https://')) {
      targetUrl = 'https://' + path.slice(9);
    } else if (path.startsWith('/http://')) {
      targetUrl = 'http://' + path.slice(8);
    } else {
      return new Response(getErrorPage('呜呜呜～格式不对啦', '要在路径后面加上完整的下载链接哦～<br>就像这样：/https://oss.zakoxun.top/文件名'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 解析目标网址
    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch (e) {
      return new Response(getErrorPage('链接坏掉了呢', '这个下载链接好像有问题，要不要检查一下再试试？'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 白名单：只允许 oss.zakoxun.top
    const allowedDomains = ['oss.zakoxun.top'];
    if (!allowedDomains.includes(targetHost)) {
      return new Response(getErrorPage('不可以哦～', `${targetHost} 不在小窝的白名单里呢～<br>只有 ${allowedDomains.join(', ')} 才可以访问哟`), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 代理下载
    return fetchWithRetry(targetUrl);
  }
};

// 可爱的首页
function getHomePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZAKOXUN Cloudflare R2 OSS Proxy</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="27" viewBox="0 0 24 27"><polygon points="2,2 22,13 12,16 2,25" fill="%23ff69b4" stroke="%23fff" stroke-width="1.5"/><circle cx="12" cy="13" r="3" fill="%23fff"/></svg>') 12 5, auto;
        }
        /* 可自定义背景层 */
        .bg-custom {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }
        /* 默认背景装饰 */
        .bg-default {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .bg-default span {
            position: absolute;
            width: 200px;
            height: 200px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            animation: float 20s infinite;
        }
        .bg-default span:nth-child(1) { top: -50px; left: -50px; width: 300px; height: 300px; }
        .bg-default span:nth-child(2) { bottom: -80px; right: -80px; width: 400px; height: 400px; animation-delay: -5s; }
        .bg-default span:nth-child(3) { top: 30%; left: 80%; width: 150px; height: 150px; animation-delay: -10s; }
        .bg-default span:nth-child(4) { bottom: 20%; left: 10%; width: 250px; height: 250px; animation-delay: -15s; }
        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(10deg); }
        }
        .card {
            position: relative;
            z-index: 1;
            background: rgba(255,255,255,0.95);
            border-radius: 60px;
            padding: 50px 40px;
            max-width: 620px;
            margin: 20px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            backdrop-filter: blur(10px);
            text-align: center;
            animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            border: 2px solid rgba(255,255,255,0.3);
        }
        @keyframes bounceIn {
            0% { opacity: 0; transform: scale(0.8) translateY(-50px); }
            60% { opacity: 1; transform: scale(1.05) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .logo {
            font-size: 80px;
            margin-bottom: 15px;
            animation: wiggle 1s ease-in-out infinite;
            animation-iteration-count: 2;
            display: inline-block;
        }
        @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(10deg); }
            75% { transform: rotate(-10deg); }
        }
        h1 {
            font-size: 28px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            margin-bottom: 12px;
            font-weight: bold;
        }
        .subtitle {
            color: #a0aec0;
            margin-bottom: 30px;
            font-size: 15px;
            letter-spacing: 1px;
        }
        .url-box {
            background: linear-gradient(135deg, #fef9e6 0%, #fff5e6 100%);
            border-radius: 30px;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid #ffe0b5;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .url-label {
            font-size: 13px;
            color: #f39c12;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .url-example {
            font-family: monospace;
            font-size: 13px;
            color: #2d3748;
            word-break: break-all;
            background: white;
            padding: 12px;
            border-radius: 20px;
            border: 1px solid #ffe0b5;
        }
        .input-group {
            margin: 25px 0;
        }
        input {
            width: 100%;
            padding: 14px 20px;
            font-size: 14px;
            border: 2px solid #ffe0b5;
            border-radius: 50px;
            outline: none;
            transition: all 0.3s;
            font-family: monospace;
            background: #fffaf0;
        }
        input:focus {
            border-color: #f39c12;
            box-shadow: 0 0 0 4px rgba(243,156,18,0.2);
            background: white;
        }
        button {
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
            color: white;
            border: none;
            padding: 14px 40px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
            box-shadow: 0 4px 15px rgba(243,156,18,0.3);
        }
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(243,156,18,0.4);
        }
        button:active {
            transform: translateY(1px);
        }
        .tips {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px dashed #ffe0b5;
            font-size: 12px;
            color: #bdc3c7;
        }
        .tips span {
            display: inline-block;
            margin: 0 5px;
        }
        .bg-control {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .bg-btn {
            background: #f7f9fc;
            border: 1px solid #e2e8f0;
            padding: 6px 14px;
            border-radius: 30px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            color: #4a5568;
        }
        .bg-btn:hover {
            background: #edf2f7;
            transform: scale(1.05);
        }
        footer {
            margin-top: 20px;
            font-size: 11px;
            color: #cbd5e0;
        }
        .cute-text {
            font-size: 12px;
            color: #f39c12;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div id="bgCustom" class="bg-custom"></div>
    <div class="bg-default">
        <span></span><span></span><span></span><span></span>
    </div>
    <div class="card">
        <div class="logo">☁️🐻‍❄️✨</div>
        <h1>ZAKOXUN Cloudflare R2 OSS Proxy</h1>
        <div class="subtitle">✨ 安全&快速的下载代理 ✨</div>
        
        <div class="url-box">
            <div class="url-label">📦 酱～要这样用哦</div>
            <div class="url-example">
                https://proxy.zakoxun.top/https://oss.zakoxun.top/你的文件
            </div>
        </div>
        
        <div class="input-group">
            <input type="text" id="fileInput" placeholder="输入文件名，比如：ZalithLauncher-1.4.1.2-arm64-v8a.apk" />
            <button id="downloadBtn">⬇️ 戳我下载 ⬇️</button>
        </div>
        
        <div class="tips">
            💡 小贴士：只能代理 oss.zakoxun.top 的文件哟～<br>
            🎨 点击下面按钮可以换漂亮的背景颜色
        </div>
        
        <div class="bg-control">
            <button class="bg-btn" data-bg="gradient">🌈 彩虹糖</button>
            <button class="bg-btn" data-bg="purple">💜 薰衣草</button>
            <button class="bg-btn" data-bg="ocean">🌊 海洋泡泡</button>
            <button class="bg-btn" data-bg="sunset">🌅 橘子汽水</button>
            <button class="bg-btn" data-bg="forest">🌲 森林小径</button>
            <button class="bg-btn" data-bg="strawberry">🍓 草莓奶昔</button>
        </div>
        <div class="cute-text">🐾 只允许 oss.zakoxun.top 的小可爱们访问～</div>
        <footer>⚡ Powered by Cloudflare Workers | 安全又快速 ⚡</footer>
    </div>
    
    <script>
        const bgMap = {
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            purple: 'linear-gradient(135deg, #b8c6ff 0%, #a1b9ff 100%)',
            ocean: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
            sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            forest: 'linear-gradient(135deg, #a8e6cf 0%, #d4e6b3 100%)',
            strawberry: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)'
        };
        
        function setBackground(bgKey) {
            if (bgKey === 'gradient') {
                document.body.style.background = '';
                document.body.style.backgroundColor = '';
                document.body.style.backgroundImage = '';
                const bgDefault = document.querySelector('.bg-default');
                if (bgDefault) bgDefault.style.display = '';
            } else {
                const bgDefault = document.querySelector('.bg-default');
                if (bgDefault) bgDefault.style.display = 'none';
                document.body.style.background = bgMap[bgKey];
                document.body.style.backgroundSize = 'cover';
            }
        }
        
        document.querySelectorAll('.bg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setBackground(btn.dataset.bg);
            });
        });
        
        document.getElementById('downloadBtn').addEventListener('click', () => {
            let filename = document.getElementById('fileInput').value.trim();
            if (!filename) {
                alert('咦？文件名不能空空的呀～( ´▽｀)');
                return;
            }
            if (filename.startsWith('http')) {
                window.open(filename, '_blank');
            } else {
                const fullUrl = 'https://proxy.zakoxun.top/https://oss.zakoxun.top/' + encodeURIComponent(filename);
                window.open(fullUrl, '_blank');
            }
        });
        
        // 回车键触发下载
        document.getElementById('fileInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('downloadBtn').click();
            }
        });
    </script>
</body>
</html>`;
}

// 可爱的错误页面
function getErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZAKOXUN Proxy - 呜～出错了</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            font-family: system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .card {
            background: rgba(255,255,255,0.96);
            border-radius: 60px;
            padding: 50px 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 25px 45px -12px rgba(0,0,0,0.2);
            margin: 20px;
            animation: shake 0.5s ease;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
        }
        .emoji { font-size: 80px; margin-bottom: 20px; animation: bounce 1s infinite; display: inline-block; }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        h2 { color: #e74c3c; margin-bottom: 16px; font-size: 28px; }
        p { color: #4a5568; margin-bottom: 28px; line-height: 1.8; font-size: 16px; }
        a {
            display: inline-block;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            padding: 12px 32px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            transition: transform 0.2s;
        }
        a:hover {
            transform: scale(1.05);
        }
        .cute {
            margin-top: 20px;
            font-size: 12px;
            color: #f39c12;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="emoji">😿💔</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${message}</p>
        <a href="/">🏠 回家看看 🏠</a>
        <div class="cute">🐾 不要难过，再试一次吧～</div>
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
        return new Response(getErrorPage('下载失败啦', '已经努力了 ' + retries + ' 次，还是不行呢～<br>可能是文件藏起来了吧 (｡•́︿•̀｡)'), {
          status: 504,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }
  }
}