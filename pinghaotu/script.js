class RouteGenerator {
    constructor() {
        this.routeTypes = [];
        this.allImages = [];
        this.init();
    }

    init() {
        this.loadRouteTypes();
        this.createTypeCheckboxes();
        this.bindEvents();
        // 确保DOM元素完全加载后再更新
        setTimeout(() => {
            this.updateInputMax(); // 初始化输入框最大值
        }, 0);
    }

    loadRouteTypes() {
        // 使用配置文件中的图片数据
        this.allImages = this.loadImagesFromConfig();
        
        // 从图片数据中提取所有类型
        this.routeTypes = [...new Set(this.allImages.map(img => img.type))].sort();
        
        console.log(`已加载 ${this.routeTypes.length} 个类型，共 ${this.allImages.length} 张图片`);
    }

    loadImagesFromConfig() {
        const images = [];
        
        // 检查配置文件是否存在
        if (!window.RouteConfig || !window.RouteConfig.imageData) {
            console.error('配置文件未找到或格式错误');
            this.showError('配置文件未找到或格式错误');
            return [];
        }
        
        const imageData = window.RouteConfig.imageData;
        console.log('配置文件加载成功，找到类型:', Object.keys(imageData));
        
        for (const [type, fileNames] of Object.entries(imageData)) {
            console.log(`类型 ${type}: ${fileNames.length} 张图片`);
            for (let i = 0; i < fileNames.length; i++) {
                const fileName = fileNames[i];
                const region = this.extractRegion(fileName);
                images.push({
                    type,
                    fileName,
                    region,
                    path: `路线/${type}/${fileName}`,
                    imageIndex: i, // 图片在该类型中的索引（从0开始）
                    // 可选：添加友好的显示名称
                    regionName: this.getRegionName(region),
                    typeDescription: this.getTypeDescription(type)
                });
            }
        }

        console.log(`总共加载了 ${images.length} 张图片`);
        return images;
    }

    getRegionName(regionCode) {
        if (window.RouteConfig && window.RouteConfig.regionNames) {
            return window.RouteConfig.regionNames[regionCode] || regionCode;
        }
        return regionCode;
    }

    getTypeDescription(type) {
        if (window.RouteConfig && window.RouteConfig.typeDescriptions) {
            return window.RouteConfig.typeDescriptions[type] || type;
        }
        return type;
    }

    async loadLuaContent(type) {
        try {
            const response = await fetch(`路线/${type}/${type}.lua`);
            if (response.ok) {
                const content = await response.text();
                return content.split('\n').filter(line => line.trim()); // 过滤空行
            } else {
                console.warn(`HTTP ${response.status}: 无法加载 ${type}.lua 文件`);
            }
        } catch (error) {
            console.warn(`网络错误: 无法加载 ${type}.lua 文件:`, error);
            // 如果是CORS错误，提供提示
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.info(`提示: 如需lua配置功能，请使用本地服务器运行 (双击"启动服务器.bat")`);
            }
        }
        return [];
    }

    extractRegion(fileName) {
        // 从文件名中提取地区代码
        const match = fileName.match(/\s([a-zA-Z]+)\.(jpg|jpeg|png|webp)$/i);
        return match ? match[1] : 'unknown';
    }

    createTypeCheckboxes() {
        const container = document.getElementById('typeCheckboxes');
        container.innerHTML = '';

        this.routeTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `type-${type}`;
            checkbox.value = type;
            checkbox.checked = true;

            // 为checkbox添加直接的change事件监听器
            checkbox.addEventListener('change', () => {
                this.updateInputMax();
            });

            const label = document.createElement('label');
            label.htmlFor = `type-${type}`;
            label.textContent = type;

            item.appendChild(checkbox);
            item.appendChild(label);
            container.appendChild(item);

            // 点击整个item都能切换checkbox
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    // 手动触发change事件，并确保事件冒泡
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent);
                    // 直接调用更新方法确保执行
                    this.updateInputMax();
                }
            });
        });
    }

    bindEvents() {
        // 全选按钮
        document.getElementById('selectAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
            this.updateInputMax(); // 只调用一次
        });

        // 清空按钮
        document.getElementById('clearAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateInputMax(); // 只调用一次
        });

        // 数字输入框事件
        const numberInput = document.getElementById('pointCount');
        
        // 输入验证
        numberInput.addEventListener('input', (e) => {
            this.validateInput(e.target);
        });

        // 失去焦点时验证
        numberInput.addEventListener('blur', (e) => {
            this.validateInput(e.target, true);
        });

        // 生成线路按钮
        document.getElementById('generateRoute').addEventListener('click', () => {
            this.generateRandomRoute();
        });

        // 保存图片按钮
        document.getElementById('saveImage').addEventListener('click', () => {
            this.saveResultsAsImage();
        });
    }

    getSelectedTypes() {
        const checkboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    updateInputMax() {
        const selectedTypes = this.getSelectedTypes();
        const availableImages = this.allImages.filter(img => 
            selectedTypes.includes(img.type)
        );
        
        const maxPoints = Math.max(1, availableImages.length);
        const input = document.getElementById('pointCount');
        const hintSpan = document.getElementById('maxPointsHint');
        
        // 更新输入框最大值和提示
        input.max = maxPoints;
        if (hintSpan) {
            hintSpan.textContent = maxPoints;
        } else {
            console.error('找不到 maxPointsHint 元素');
        }
        
        // 如果当前值超过最大值，调整当前值
        if (parseInt(input.value) > maxPoints) {
            input.value = maxPoints;
        }
        
        // 如果没有选择任何类型，禁用输入框
        if (selectedTypes.length === 0) {
            input.disabled = true;
            input.value = 1;
            if (hintSpan) hintSpan.textContent = '0';
        } else {
            input.disabled = false;
        }
        
        // 验证当前输入
        this.validateInput(input);
    }

    validateInput(input, showAlert = false) {
        const value = parseInt(input.value);
        const min = parseInt(input.min);
        const max = parseInt(input.max);
        
        // 检查是否为有效数字
        if (isNaN(value) || value < min) {
            input.value = min;
            if (showAlert) {
                alert(`点位数量不能少于 ${min}！`);
            }
            return false;
        }
        
        // 检查是否超过最大值
        if (value > max) {
            input.value = max;
            if (showAlert) {
                alert(`点位数量不能超过当前筛选状态下的最大值 ${max}！`);
            }
            return false;
        }
        
        return true;
    }

    generateRandomRoute() {
        const pointCount = parseInt(document.getElementById('pointCount').value);
        const selectedTypes = this.getSelectedTypes();
        const regionPriority = document.getElementById('regionPriority').checked;

        if (selectedTypes.length === 0) {
            alert('请至少选择一个类型！');
            return;
        }

        // 筛选符合条件的图片
        const availableImages = this.allImages.filter(img => 
            selectedTypes.includes(img.type)
        );

        if (availableImages.length === 0) {
            alert('没有找到符合条件的图片！');
            return;
        }

        // 随机选择指定数量的图片
        const selectedImages = this.selectRandomImages(availableImages, pointCount);

        // 根据地区优先选项进行排序
        const sortedImages = regionPriority 
            ? this.sortByRegion(selectedImages)
            : this.shuffleArray(selectedImages);

        // 昚示结果
        this.displayResults(sortedImages);
        
        // 生成对应的lua配置
        this.generateLuaConfig(sortedImages);
    }

    selectRandomImages(images, count) {
        const shuffled = this.shuffleArray([...images]);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    sortByRegion(images) {
        // 先随机排序，然后按地区分组
        const shuffled = this.shuffleArray(images);
        const grouped = {};
        
        // 按地区分组
        shuffled.forEach(img => {
            if (!grouped[img.region]) {
                grouped[img.region] = [];
            }
            grouped[img.region].push(img);
        });

        // 将分组后的图片重新组合，相同地区的放在一起
        const result = [];
        const regions = Object.keys(grouped);
        
        // 随机排序地区
        const shuffledRegions = this.shuffleArray(regions);
        
        shuffledRegions.forEach(region => {
            result.push(...grouped[region]);
        });

        return result;
    }

    async generateLuaConfig(selectedImages) {
        console.log('开始生成lua配置...');
        
        // 按类型分组收集所有需要的lua行
        const luaTypeMap = new Map();
        
        // 为每个选中的图片加载对应的lua行
        for (const img of selectedImages) {
            if (!luaTypeMap.has(img.type)) {
                const luaLines = await this.loadLuaContent(img.type);
                luaTypeMap.set(img.type, luaLines);
            }
        }
        
        // 生成排序后的lua配置
        const sortedLuaLines = [];
        selectedImages.forEach((img, index) => {
            const luaLines = luaTypeMap.get(img.type);
            if (luaLines && luaLines[img.imageIndex]) {
                let luaLine = luaLines[img.imageIndex].trim();
                
                // 检查是否包含 monster 配置
                if (luaLine.includes('monster:')) {
                    // 移除原有的注释（如果存在）
                    const commentIndex = luaLine.indexOf('--');
                    if (commentIndex !== -1) {
                        luaLine = luaLine.substring(0, commentIndex).trim();
                    }
                    // 将新注释添加到lua行的末尾
                    const lineWithComment = `${luaLine}-- 点位 ${index + 1}: ${img.fileName}`;
                    sortedLuaLines.push(lineWithComment);
                } else {
                    // 如果不包含monster配置，可能是纯注释行，跳过或生成默认配置
                    console.warn(`${img.type} 第 ${img.imageIndex + 1} 行不包含有效的monster配置: "${luaLine}"`);
                    sortedLuaLines.push(`-- monster: [0,0], pos: [0, 0] -- 配置格式异常 -- 点位 ${index + 1}: ${img.fileName}`);
                }
            } else {
                console.warn(`找不到 ${img.type} 类型第 ${img.imageIndex + 1} 行的lua配置`);
                sortedLuaLines.push(`-- monster: [0,0], pos: [0, 0] -- 配置缺失 -- 点位 ${index + 1}: ${img.fileName}`);
            }
        });
        
        // 显示lua配置
        this.displayLuaConfig(sortedLuaLines);
    }

    displayLuaConfig(luaLines) {
        // 创建或更新lua配置显示区域
        let luaContainer = document.getElementById('luaConfig');
        if (!luaContainer) {
            luaContainer = document.createElement('div');
            luaContainer.id = 'luaConfig';
            luaContainer.className = 'lua-config';
            
            const resultsContainer = document.getElementById('results');
            resultsContainer.appendChild(luaContainer);
        }
        
        const luaContent = luaLines.join('\n');
        
        luaContainer.innerHTML = `
            <div class="lua-header">
                <h3>🔧 [16:10]qzd lua</h3>
                <div class="lua-actions">
                    <button id="copyLua" class="copy-btn">复制配置</button>
                    <button id="downloadLua" class="download-btn">下载.lua文件</button>
                </div>
                <div style="width: 100%; text-align: center; color: #888; font-size: 0.9em; margin-top: 5px;">
                    <p>根据图片点位排序的全自动传送配置文件,适用于16:10屏幕。</p>
                    <p>monster:F1追踪的boss行列; pos:追踪后点击的位置; narrow:地图缩(+)放(-)次数;</p>
                    <p> select:多选时第几个(从下至上); try:重试(用于有地脉的点位); gb:true 追踪boss后关闭右侧菜单 ; wait:(ms):等待时间(传送副本时等待延迟)</p>
                </div>
            </div>
            <pre class="lua-content">${luaContent}</pre>
        `;
        
        // 绑定复制和下载事件
        document.getElementById('copyLua').addEventListener('click', () => {
            navigator.clipboard.writeText(luaContent).then(() => {
            }).catch(() => {
                // 备用复制方法
                const textArea = document.createElement('textarea');
                textArea.value = luaContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Lua配置已复制到剪贴板！');
            });
        });
        
        document.getElementById('downloadLua').addEventListener('click', () => {
            const blob = new Blob([luaContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `拼好图线路_${new Date().toISOString().split('T')[0]}.lua`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    displayResults(images) {
        const container = document.getElementById('routeGrid');
        container.innerHTML = '';

        if (images.length === 0) {
            container.innerHTML = '<div class="empty-results">没有生成任何线路点位</div>';
            return;
        }

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'route-item';

            const imgElement = document.createElement('img');
            imgElement.src = img.path;
            imgElement.alt = img.fileName;
            
            // 当图片加载完成时检查尺寸并应用样式
            imgElement.onload = () => {
                // 检查是否是小分辨率图片 (388x270 或类似尺寸)
                if (imgElement.naturalWidth <= 400 && imgElement.naturalHeight <= 300) {
                    // 小图片需要放大
                    imgElement.style.imageRendering = 'pixelated'; // 保持像素清晰
                }
            };
            
            imgElement.onerror = () => {
                // 如果图片加载失败，显示占位符
                imgElement.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
                    width: 640px; 
                    height: 420px; 
                    background: rgba(255,255,255,0.1); 
                    border-radius: 10px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: #888;
                    font-size: 1.2em;
                    position: relative;
                `;
                placeholder.textContent = '图片未找到';
                item.insertBefore(placeholder, item.firstChild);
            };

            // 添加点数标识
            const indexLabel = document.createElement('div');
            indexLabel.className = 'point-index';
            indexLabel.textContent = index + 1;

            item.appendChild(imgElement);
            item.appendChild(indexLabel);
            container.appendChild(item);
        });
    }

    showError(message) {
        const container = document.getElementById('routeGrid');
        container.innerHTML = `
            <div class="error-message">
                <h3>⚠️ 错误</h3>
                <p>${message}</p>
                <p>请检查配置文件或联系开发者。</p>
            </div>
        `;
    }

    async saveResultsAsImage() {
        const saveBtn = document.getElementById('saveImage');
        const resultsContainer = document.getElementById('results');
        
        // 显示提示信息
        const confirmMessage = '图片体积较大，压缩算法配置中，建议使用浏览器截图。\n\n是否继续保存？';
        if (!confirm(confirmMessage)) {
            return; // 用户选择取消
        }
        
        // 禁用按钮并显示加载状态
        saveBtn.disabled = true;
        saveBtn.textContent = '正在生成图片...';
        
        try {
            // 等待所有图片加载完成
            await this.waitForImages();
            
            // 临时隐藏lua配置区域
            const luaConfig = document.getElementById('luaConfig');
            const originalDisplay = luaConfig ? luaConfig.style.display : null;
            if (luaConfig) {
                luaConfig.style.display = 'none';
            }
            
            // 使用html2canvas生成图片
            const canvas = await html2canvas(resultsContainer, {
                backgroundColor: '#1e1e1e', // 设置背景色
                scale: 2, // 提高图片质量
                useCORS: false, // 禁用CORS以避免本地文件问题
                allowTaint: true, // 允许污染的画布
                foreignObjectRendering: false, // 禁用外部对象渲染
                scrollX: 0,
                scrollY: 0,
                width: resultsContainer.scrollWidth,
                height: resultsContainer.scrollHeight,
                logging: false, // 关闭日志以减少错误
                onclone: (clonedDoc) => {
                    // 确保克隆的文档中的样式正确应用
                    const clonedResults = clonedDoc.getElementById('results');
                    if (clonedResults) {
                        clonedResults.style.background = 'rgba(255, 255, 255, 0.08)';
                        clonedResults.style.backdropFilter = 'blur(20px)';
                    }
                }
            });
            
            // 尝试生成图片数据URL
            let dataURL;
            try {
                dataURL = canvas.toDataURL('image/png');
            } catch (securityError) {
                console.warn('Canvas被污染，尝试使用备用方法:', securityError);
                // 备用方法：使用toBlob
                return new Promise((resolve) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.download = `拼好图线路_${new Date().toISOString().split('T')[0]}.png`;
                            link.href = url;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            
                            // 恢复lua配置区域的显示
                            if (luaConfig) {
                                luaConfig.style.display = originalDisplay || '';
                            }
                            
                            resolve();
                        } else {
                            throw new Error('生成Blob失败');
                        }
                    }, 'image/png');
                });
            }
            
            // 创建下载链接
            const link = document.createElement('a');
            link.download = `拼好图线路_${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataURL;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 恢复lua配置区域的显示
            if (luaConfig) {
                luaConfig.style.display = originalDisplay || '';
            }
            
        } catch (error) {
            console.error('保存图片失败:', error);
            
            // 恢复lua配置区域的显示（即使出错也要恢复）
            const luaConfig = document.getElementById('luaConfig');
            if (luaConfig) {
                luaConfig.style.display = '';
            }
            
            // 根据错误类型提供不同的提示
            let errorMessage = '保存图片失败，请重试';
            if (error.name === 'SecurityError' || error.message.includes('Tainted')) {
                errorMessage = '由于浏览器安全限制，无法直接保存图片。建议：\n1. 使用浏览器的截图功能\n2. 或者通过本地服务器运行此页面';
            } else if (error.message.includes('生成Blob失败')) {
                errorMessage = '图片生成失败，请确保所有图片都已加载完成';
            }
            
            alert(errorMessage);
        } finally {
            // 恢复按钮状态
            saveBtn.disabled = false;
            saveBtn.textContent = '保存为图片';
        }
    }

    async waitForImages() {
        const images = document.querySelectorAll('#routeGrid img');
        const promises = Array.from(images).map(img => {
            if (img.complete) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = resolve; // 即使图片加载失败也继续
                setTimeout(resolve, 3000); // 3秒超时
            });
        });
        
        await Promise.all(promises);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new RouteGenerator();
});
