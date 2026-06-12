// 加载更新日志
        async function loadUpdateLog() {
            try {
                const response = await fetch('update.md');
                if (!response.ok) {
                    throw new Error('无法加载更新日志');
                }
                const markdownText = await response.text();
                const htmlContent = parseMarkdownToHTML(markdownText);
                document.getElementById('updateLogContent').innerHTML = htmlContent;
            } catch (error) {
                console.error('加载更新日志失败:', error);
                document.getElementById('updateLogContent').innerHTML = `
                    <p style="color: #ff6b6b;">更新日志加载失败，请稍后重试。</p>
                `;
            }
        }

        function parseMarkdownToHTML(markdown) {
            let html = markdown
                .replace(/```(\w+)?\s*\n([\s\S]*?)\n\s*```/g, function(match, lang, code) {
                    const language = lang || '';
                    const escapedCode = code
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                    // 使用Base64编码原始代码以避免HTML转义问题
                    const encodedCode = btoa(unescape(encodeURIComponent(code)));
                    return `<div class="code-block-wrapper">
                        <button class="code-copy-btn" data-code-base64="${encodedCode}" title="复制代码">复制代码📋</button>
                        <pre class="code-block"><code class="language-${language}">${escapedCode}</code></pre>
                    </div>`;
                })
                .replace(/^### (.*$)/gm, '<h4 class="update-subtitle">$1</h4>')
                .replace(/^## (.*$)/gm, '<h3 class="update-date">$1</h3>')
                .replace(/^# (.*$)/gm, '<h2 class="update-title">$1</h2>')
                .replace(/^- (.*$)/gm, '<li class="update-item">$1</li>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</div><div class="update-section">')
                .replace(/\n/g, '<br>');
            html = html.replace(/(<li class="update-item">.*?<\/li>)/gs, function(match) {
                return '<ul class="update-list">' + match + '</ul>';
            });
            html = '<div class="update-section">' + html + '</div>';
            html = html.replace(/<div class="update-section"><\/div>/g, '');
            html = html.replace(/<div class="update-section">(<h[1-6])/g, '$1');
            html = html.replace(/(<\/h[1-6]>)<\/div>/g, '$1');
            html = html.replace(/<div class="update-section">(<ul)/g, '$1');
            html = html.replace(/(<\/ul>)<\/div>/g, '$1');
            html = html.replace(/<div class="update-section">(<pre)/g, '$1');
            html = html.replace(/(<\/pre>)<\/div>/g, '$1');
            html = html.replace(/<div class="update-section">(<div class="code-block-wrapper">)/g, '$1');
            html = html.replace(/(<\/div>)<\/div>/g, '$1');
            return html;
        }

        document.addEventListener('DOMContentLoaded', function() {
            loadUpdateLog();
            
            // 更新日志关闭按钮功能
            const updateLogClose = document.getElementById('updateLogClose');
            const updateLog = document.getElementById('updateLog');
            
            if (updateLogClose && updateLog) {
                updateLogClose.addEventListener('click', function() {
                    updateLog.style.display = 'none';
                });
            }
            
            // 代码复制功能
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('code-copy-btn')) {
                    const button = e.target;
                    const encodedCode = button.getAttribute('data-code-base64');
                    
                    // 解码Base64获取原始代码
                    let code;
                    try {
                        code = decodeURIComponent(escape(atob(encodedCode)));
                    } catch (error) {
                        console.error('解码代码失败:', error);
                        return;
                    }
                    
                    // 复制到剪贴板
                    navigator.clipboard.writeText(code).then(() => {
                        // 显示复制成功状态
                        const originalText = button.textContent;
                        button.textContent = '✓';
                        button.classList.add('copied');
                        
                        // 2秒后恢复原状
                        setTimeout(() => {
                            button.textContent = originalText;
                            button.classList.remove('copied');
                        }, 2000);
                    }).catch(() => {
                        // 降级方案：使用传统方法
                        const textArea = document.createElement('textarea');
                        textArea.value = code;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        const originalText = button.textContent;
                        button.textContent = '✓';
                        button.classList.add('copied');
                        
                        setTimeout(() => {
                            button.textContent = originalText;
                            button.classList.remove('copied');
                        }, 2000);
                    });
                }
            });
            
            const currentHost = window.location.hostname;
            const newDomainTip = document.getElementById('newDomainTip');
            if (currentHost === 'unhappycar.netlify.app' || currentHost === 'www.unhappycar.netlify.app') {
                if (newDomainTip) {
                    newDomainTip.style.display = 'none';
                }
            }
        });
