// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    const fileListContainer = document.getElementById('fileList');
    const searchInput = document.getElementById('searchInput');
    const noResultDiv = document.getElementById('noResult');

    let allFiles = [];           // 存储原始文件数据
    let filteredFiles = [];      // 存储过滤后的文件

    // 代理域名（用于包装下载链接）
    const PROXY_DOMAIN = 'https://proxy.zakomc.top/';

    // 下载计数存储（使用 localStorage 简单记录每个文件的下载次数）
    function getDownloadCount(fileId) {
        const counts = JSON.parse(localStorage.getItem('download_counts') || '{}');
        return counts[fileId] || 0;
    }

    function incrementDownloadCount(fileId) {
        const counts = JSON.parse(localStorage.getItem('download_counts') || '{}');
        counts[fileId] = (counts[fileId] || 0) + 1;
        localStorage.setItem('download_counts', JSON.stringify(counts));
        return counts[fileId];
    }

    // 格式化文件大小 (bytes -> KB/MB)
    function formatFileSize(bytes) {
        if (!bytes && bytes !== 0) return '未知';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // 根据扩展名返回简单图标 (emoji)
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
            'pdf': '📄', 'doc': '📝', 'docx': '📝',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp4': '🎬', 'mov': '🎬', 'avi': '🎬',
            'mp3': '🎵', 'wav': '🎵',
            'exe': '⚙️', 'dmg': '💿', 'apk': '📱',
            'txt': '📃', 'md': '📃',
            'json': '🔧', 'xml': '🔧',
        };
        return iconMap[ext] || '📎';
    }

    // 包装下载链接：通过代理域名
    function wrapDownloadUrl(originalUrl) {
        if (!originalUrl) return '';
        // 如果已经是代理链接，直接返回
        if (originalUrl.startsWith(PROXY_DOMAIN)) return originalUrl;
        // 否则拼接代理域名 + 原链接（需确保原链接以 http:// 或 https:// 开头）
        return PROXY_DOMAIN + originalUrl;
    }

    // 渲染文件列表
    function renderFileList(files) {
        if (!files || files.length === 0) {
            fileListContainer.innerHTML = '';
            noResultDiv.classList.remove('hidden');
            return;
        }
        noResultDiv.classList.add('hidden');

        // 生成卡片 HTML
        const cardsHtml = files.map(file => {
            const fileId = encodeURIComponent(file.id || file.name);
            // 原始 URL（来自 JSON）
            const originalUrl = file.url || `./files/${encodeURIComponent(file.name)}`;
            // 包装后的代理下载链接
            const downloadUrl = wrapDownloadUrl(originalUrl);
            const sizeFormatted = formatFileSize(file.size);
            const icon = getFileIcon(file.name);
            const downloadCount = getDownloadCount(fileId);

            return `
                <div class="file-card" data-id="${fileId}">
                    <div class="file-icon">${icon}</div>
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-desc">${escapeHtml(file.description || '暂无描述')}</div>
                    <div class="file-meta">
                        <span class="file-size">📦 ${sizeFormatted}</span>
                        <span class="download-count">⬇️ ${downloadCount}</span>
                    </div>
                    <button class="download-btn" data-url="${downloadUrl}" data-id="${fileId}" data-name="${escapeHtml(file.name)}">
                        ⬇️ 立即下载
                    </button>
                </div>
            `;
        }).join('');

        fileListContainer.innerHTML = cardsHtml;

        // 绑定下载按钮事件
        fileListContainer.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = btn.getAttribute('data-url');
                const fileId = btn.getAttribute('data-id');
                const fileName = btn.getAttribute('data-name');

                if (!url) {
                    console.warn('下载链接无效');
                    return;
                }

                // 增加下载计数并更新UI
                const newCount = incrementDownloadCount(fileId);
                const countSpan = btn.closest('.file-card')?.querySelector('.download-count');
                if (countSpan) countSpan.textContent = `⬇️ ${newCount}`;

                // 触发下载（创建隐藏a标签）
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;  // 建议属性，但跨域或同源策略可能不生效，但至少跳转
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
    }

    // 简单的防 XSS 工具
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
            return c;
        });
    }

    // 根据搜索词过滤
    function filterFilesBySearch(searchTerm) {
        if (!searchTerm.trim()) {
            filteredFiles = [...allFiles];
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            filteredFiles = allFiles.filter(file => 
                file.name.toLowerCase().includes(lowerTerm) ||
                (file.description && file.description.toLowerCase().includes(lowerTerm))
            );
        }
        renderFileList(filteredFiles);
    }

    // 加载 files.json
    async function loadFileList() {
        try {
            fileListContainer.innerHTML = '<div class="loading-state">⏳ 正在加载文件列表，请稍候...</div>';
            const response = await fetch('./files.json?t=' + Date.now()); // 避免缓存
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            
            // 处理两种常见格式：{ files: [...] } 或直接数组 [...]
            let loadedFiles = [];
            if (data.files && Array.isArray(data.files)) {
                loadedFiles = data.files;
            } else if (Array.isArray(data)) {
                loadedFiles = data;
            } else {
                throw new Error('files.json 格式错误：应为对象包含 files 数组，或直接数组');
            }

            // 为每个文件补充默认字段（若缺失）
            allFiles = loadedFiles.map((file, idx) => ({
                id: file.id || `file_${idx}`,
                name: file.name || '未命名文件',
                size: file.size || 0,
                description: file.description || '',
                url: file.url || `./files/${encodeURIComponent(file.name)}`,
                ...file
            }));

            filteredFiles = [...allFiles];
            renderFileList(filteredFiles);
        } catch (error) {
            console.error('加载文件列表失败:', error);
            // 如果 fetch 失败，尝试使用内嵌数据
            if (window.__EMBEDDED_FILES__) {
                const embedded = window.__EMBEDDED_FILES__;
                let loadedFiles = [];
                if (embedded.files && Array.isArray(embedded.files)) {
                    loadedFiles = embedded.files;
                } else if (Array.isArray(embedded)) {
                    loadedFiles = embedded;
                }
                if (loadedFiles.length > 0) {
                    allFiles = loadedFiles.map((file, idx) => ({
                        id: file.id || `file_${idx}`,
                        name: file.name || '未命名文件',
                        size: file.size || 0,
                        description: file.description || '',
                        url: file.url || `./files/${encodeURIComponent(file.name)}`,
                        ...file
                    }));
                    filteredFiles = [...allFiles];
                    renderFileList(filteredFiles);
                    return;
                }
            }
            fileListContainer.innerHTML = `
                <div class="loading-state" style="color:#c2410c;">
                    ❌ 加载失败: ${error.message}<br>
                    请确保 files.json 文件存在且格式正确。
                </div>
            `;
            noResultDiv.classList.add('hidden');
        }
    }

    // 搜索监听
    searchInput.addEventListener('input', (e) => {
        filterFilesBySearch(e.target.value);
    });

    // 启动加载
    loadFileList();
});