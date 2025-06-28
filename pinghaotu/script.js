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
            this.loadUserPreferences(); // 加载用户偏好设置
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

    // 缓存相关方法
    saveUserPreferences() {
        try {
            const preferences = {
                selectedTypes: this.getSelectedTypes(),
                pointCount: parseInt(document.getElementById('pointCount').value) || 30,
                regionPriority: document.getElementById('regionPriority').checked,
                advancedRegionSort: document.getElementById('advancedRegionSort').checked,
                xyMode: document.getElementById('xyMode').checked,
                douMMode: document.getElementById('douMMode').checked,
                timestamp: Date.now()
            };
            
            localStorage.setItem('pinghaotu_preferences', JSON.stringify(preferences));
            console.log('用户偏好已保存:', preferences);
        } catch (error) {
            console.warn('保存用户偏好失败:', error);
        }
    }

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('pinghaotu_preferences');
            if (!saved) {
                console.log('未找到保存的用户偏好');
                return;
            }

            const preferences = JSON.parse(saved);
            console.log('加载用户偏好:', preferences);

            // 检查保存时间，如果超过7天则不加载（避免过期数据）
            const daysPassed = (Date.now() - preferences.timestamp) / (1000 * 60 * 60 * 24);
            if (daysPassed > 7) {
                console.log('用户偏好已过期，清除缓存');
                localStorage.removeItem('pinghaotu_preferences');
                return;
            }

            // 恢复点位数量
            if (preferences.pointCount) {
                const pointCountInput = document.getElementById('pointCount');
                pointCountInput.value = preferences.pointCount;
            }

            // 恢复地区优先排序选项
            if (preferences.regionPriority !== undefined) {
                const regionPriorityCheckbox = document.getElementById('regionPriority');
                regionPriorityCheckbox.checked = preferences.regionPriority;
                this.toggleAdvancedRegionSort(preferences.regionPriority);
            }

            // 恢复高级地区排序选项
            if (preferences.advancedRegionSort !== undefined) {
                const advancedRegionSortCheckbox = document.getElementById('advancedRegionSort');
                advancedRegionSortCheckbox.checked = preferences.advancedRegionSort;
            }

            // 恢复XY模式选项
            if (preferences.xyMode !== undefined) {
                const xyModeCheckbox = document.getElementById('xyMode');
                xyModeCheckbox.checked = preferences.xyMode;
                this.toggleDouMMode(preferences.xyMode);
            }

            // 恢复抖M模式选项
            if (preferences.douMMode !== undefined) {
                const douMModeCheckbox = document.getElementById('douMMode');
                douMModeCheckbox.checked = preferences.douMMode;
            }

            // 恢复选中的类型（需要在类型复选框创建后执行）
            if (preferences.selectedTypes && preferences.selectedTypes.length > 0) {
                setTimeout(() => {
                    this.restoreSelectedTypes(preferences.selectedTypes);
                }, 100);
            }

        } catch (error) {
            console.warn('加载用户偏好失败:', error);
            localStorage.removeItem('pinghaotu_preferences');
        }
    }

    restoreSelectedTypes(selectedTypes) {
        // 先清除所有选中状态
        const checkboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        // 恢复保存的选中状态
        selectedTypes.forEach(type => {
            const checkbox = document.getElementById(`type-${type}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        // 更新输入框最大值
        this.updateInputMax();
        console.log(`已恢复 ${selectedTypes.length} 个类型的选中状态:`, selectedTypes);
    }

    // 清除用户偏好缓存
    clearUserPreferences() {
        try {
            localStorage.removeItem('pinghaotu_preferences');
            console.log('用户偏好缓存已清除');
            
            // 重置为默认状态
            const pointCountInput = document.getElementById('pointCount');
            pointCountInput.value = 30;
            
            const regionPriorityCheckbox = document.getElementById('regionPriority');
            regionPriorityCheckbox.checked = false;
            this.toggleAdvancedRegionSort(false);
            
            const advancedRegionSortCheckbox = document.getElementById('advancedRegionSort');
            advancedRegionSortCheckbox.checked = false;
            
            const xyModeCheckbox = document.getElementById('xyMode');
            xyModeCheckbox.checked = false;
            this.toggleDouMMode(false);
            
            const douMModeCheckbox = document.getElementById('douMMode');
            douMModeCheckbox.checked = false;
            
            // 重置所有类型为选中状态
            const checkboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
            this.updateInputMax();
            
            alert('缓存已清除，设置已重置为默认状态');
        } catch (error) {
            console.warn('清除用户偏好失败:', error);
        }
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
                // 延迟保存，避免频繁操作
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                this.saveTimeout = setTimeout(() => {
                    this.saveUserPreferences();
                }, 300);
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
                    // 延迟保存，避免频繁操作
                    if (this.saveTimeout) {
                        clearTimeout(this.saveTimeout);
                    }
                    this.saveTimeout = setTimeout(() => {
                        this.saveUserPreferences();
                    }, 300);
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
            // 延迟保存，确保DOM更新完成
            setTimeout(() => this.saveUserPreferences(), 100);
        });

        // 清空按钮
        document.getElementById('clearAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateInputMax(); // 只调用一次
            // 延迟保存，确保DOM更新完成
            setTimeout(() => this.saveUserPreferences(), 100);
        });

        // 数字输入框事件
        const numberInput = document.getElementById('pointCount');
        
        // 移除实时输入验证，允许用户自由输入
        // 只在失去焦点时验证
        numberInput.addEventListener('blur', (e) => {
            this.validateInput(e.target, true);
            // 保存用户偏好
            this.saveUserPreferences();
        });

        // 生成线路按钮
        document.getElementById('generateRoute').addEventListener('click', () => {
            this.generateRandomRoute();
        });

        // 保存图片按钮
        document.getElementById('saveImage').addEventListener('click', () => {
            this.saveResultsAsImage();
        });

        // 地区优先排序控制
        document.getElementById('regionPriority').addEventListener('change', (e) => {
            this.toggleAdvancedRegionSort(e.target.checked);
            // 如果启用地区优先，则禁用xy模式和抖M模式
            if (e.target.checked) {
                document.getElementById('xyMode').checked = false;
                this.toggleDouMMode(false);
            }
            this.saveUserPreferences();
        });

        // 更进一步的地区优先排序
        document.getElementById('advancedRegionSort').addEventListener('change', () => {
            // 保存用户偏好
            this.saveUserPreferences();
        });

        // XY模式控制
        document.getElementById('xyMode').addEventListener('change', (e) => {
            // 如果启用xy模式，则禁用地区优先排序
            if (e.target.checked) {
                const regionPriorityCheckbox = document.getElementById('regionPriority');
                regionPriorityCheckbox.checked = false;
                this.toggleAdvancedRegionSort(false);
            }
            // 控制抖M模式的显示
            this.toggleDouMMode(e.target.checked);
            this.saveUserPreferences();
        });

        // 抖M模式控制
        document.getElementById('douMMode').addEventListener('change', () => {
            this.saveUserPreferences();
        });
    }

    toggleAdvancedRegionSort(enabled) {
        const container = document.getElementById('advancedRegionSortContainer');
        const checkbox = document.getElementById('advancedRegionSort');
        
        if (enabled) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            checkbox.checked = false; // 清除子选项的选中状态
        }
    }

    toggleDouMMode(enabled) {
        const container = document.getElementById('douMContainer');
        const checkbox = document.getElementById('douMMode');
        
        if (enabled) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            checkbox.checked = false; // 清除子选项的选中状态
        }
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
            input.value = Math.min(30, maxPoints); // 默认30个点位，但不能超过最大值
        }
        
        // 如果输入框为空或无值，设置默认值
        if (!input.value || input.value === '' || isNaN(parseInt(input.value))) {
            input.value = Math.min(30, maxPoints); // 默认30个点位
        }
        
        // 如果没有选择任何类型，禁用输入框
        if (selectedTypes.length === 0) {
            input.disabled = true;
            input.value = 1;
            if (hintSpan) hintSpan.textContent = '0';
        } else {
            input.disabled = false;
        }
        
        // 移除自动验证，让用户可以自由输入
        // this.validateInput(input);
    }

    validateInput(input, showAlert = false) {
        const value = parseInt(input.value);
        const min = parseInt(input.min);
        const max = parseInt(input.max);
        
        // 如果输入为空，设置默认值30（但不能超过最大值）
        if (!input.value || input.value === '' || isNaN(value)) {
            input.value = Math.min(30, max);
            return true;
        }
        
        // 检查是否小于最小值
        if (value < min) {
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

    async generateRandomRoute() {
        const pointCount = parseInt(document.getElementById('pointCount').value);
        const selectedTypes = this.getSelectedTypes();
        const regionPriority = document.getElementById('regionPriority').checked;
        const advancedRegionSort = document.getElementById('advancedRegionSort').checked;
        const xyMode = document.getElementById('xyMode').checked;
        const douMMode = document.getElementById('douMMode').checked;

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

        // 根据是否启用抖M模式选择不同的图片选择策略
        let selectedImages;
        if (xyMode && douMMode) {
            // 抖M模式：特殊的图片选择逻辑
            selectedImages = this.selectImagesForDouMMode(availableImages, pointCount);
        } else if (xyMode) {
            // XY模式：智能选择不同地区的图片
            selectedImages = this.selectImagesForXYMode(availableImages, pointCount);
        } else {
            // 普通模式：随机选择指定数量的图片
            selectedImages = this.selectRandomImages(availableImages, pointCount);
        }

        // 根据排序选项进行排序
        let sortedImages;
        if (regionPriority) {
            sortedImages = await this.sortByRegion(selectedImages, advancedRegionSort);
        } else if (xyMode) {
            if (douMMode) {
                sortedImages = this.sortByDouMMode(selectedImages);
            } else {
                sortedImages = this.sortByXYMode(selectedImages);
            }
        } else {
            sortedImages = this.shuffleArray(selectedImages);
        }

        // 显示结果
        this.displayResults(sortedImages);
        
        // 生成对应的lua配置
        this.generateLuaConfig(sortedImages);

        // 保存用户偏好设置
        this.saveUserPreferences();
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

    sortByXYMode(images) {
        // XY模式：强制确保相邻的点位来自不同国家
        
        if (images.length <= 1) {
            return images;
        }
        
        // 先按地区分组
        const grouped = {};
        images.forEach(img => {
            if (!grouped[img.region]) {
                grouped[img.region] = [];
            }
            grouped[img.region].push(img);
        });
        
        const regions = Object.keys(grouped);
        console.log(`XY排序: 需要排序${images.length}个点位，来自${regions.length}个地区`);
        regions.forEach(region => {
            console.log(`  地区${region}: ${grouped[region].length}个点位`);
        });
        
        // 如果只有一个地区，直接返回随机排序
        if (regions.length === 1) {
            console.log('XY排序: 只有一个地区，返回随机排序');
            return this.shuffleArray(images);
        }
        
        // 初始化每个地区的队列并随机打乱
        const regionQueues = {};
        regions.forEach(region => {
            regionQueues[region] = this.shuffleArray([...grouped[region]]);
        });
        
        const result = [];
        
        // 先添加第一个点位（随机选择一个地区）
        const firstRegion = regions[Math.floor(Math.random() * regions.length)];
        result.push(regionQueues[firstRegion].shift());
        console.log(`XY排序: 第1个点位来自地区${firstRegion}`);
        
        // 逐个添加剩余点位，确保与前一个不同地区
        while (result.length < images.length) {
            const lastRegion = result[result.length - 1].region;
            let foundDifferent = false;
            
            // 优先尝试从不同地区中选择
            for (const region of regions) {
                if (region !== lastRegion && regionQueues[region].length > 0) {
                    result.push(regionQueues[region].shift());
                    console.log(`XY排序: 第${result.length}个点位来自地区${region} (与前一个${lastRegion}不同)`);
                    foundDifferent = true;
                    break;
                }
            }
            
            // 如果没找到不同地区的点位，说明只剩下相同地区的了
            if (!foundDifferent) {
                // 找到任何还有剩余点位的地区
                for (const region of regions) {
                    if (regionQueues[region].length > 0) {
                        result.push(regionQueues[region].shift());
                        console.log(`XY排序: 第${result.length}个点位来自地区${region} (被迫与前一个${lastRegion}相同)`);
                        break;
                    }
                }
            }
        }
        
        // 统计最终结果
        const finalStats = {};
        let consecutiveCount = 0;
        result.forEach((img, index) => {
            finalStats[img.region] = (finalStats[img.region] || 0) + 1;
            if (index > 0 && img.region === result[index - 1].region) {
                consecutiveCount++;
            }
        });
        
        console.log('XY排序完成统计:');
        Object.entries(finalStats).forEach(([region, count]) => {
            console.log(`  地区${region}: ${count}个点位`);
        });
        console.log(`  相邻重复地区次数: ${consecutiveCount}`);
        
        return result;
    }

    async sortByRegion(images, useAdvancedSort = false) {
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
        
        // 使用 for...of 循环来正确处理异步操作
        for (const region of shuffledRegions) {
            // 根据是否启用高级排序选择不同的排序方法
            const sortedRegionImages = useAdvancedSort 
                ? await this.sortByMonsterValues(grouped[region])
                : this.shuffleArray(grouped[region]);
            result.push(...sortedRegionImages);
        }

        return result;
    }

    // 新增方法：根据monster值对地区内图片进行排序
    async sortByMonsterValues(images) {
        // 为每个图片获取对应的monster值
        const imagesWithMonster = [];
        
        for (const img of images) {
            const monsterValue = await this.getMonsterValue(img);
            imagesWithMonster.push({
                ...img,
                monsterValue: monsterValue
            });
        }
        
        // 按monster值进行排序
        return imagesWithMonster.sort((a, b) => {
            const monsterA = a.monsterValue;
            const monsterB = b.monsterValue;
            
            // 如果任一monster值无效，将无效值排到后面
            if (!monsterA && !monsterB) return 0;
            if (!monsterA) return 1;
            if (!monsterB) return -1;
            
            const [firstA, secondA] = monsterA;
            const [firstB, secondB] = monsterB;
            
            // 1. 优先级1：monster值完全相同（保持原顺序）
            if (firstA === firstB && secondA === secondB) {
                return 0;
            }
            
            // 2. 优先级2：第一个数字相同，按第二个数字排序
            if (firstA === firstB) {
                return secondA - secondB;
            }
            
            // 3. 优先级3：第一个数字不同，按第一个数字的差值排序（差值越小越前）
            // 为了实现这个，我们需要计算每个数字与其他所有数字的平均距离
            return firstA - firstB;
        });
    }

    // 新增方法：从lua文件中获取指定图片的monster值
    async getMonsterValue(img) {
        try {
            const luaLines = await this.loadLuaContent(img.type);
            if (luaLines && luaLines[img.imageIndex]) {
                const luaLine = luaLines[img.imageIndex].trim();
                
                // 解析monster值，格式如: monster: [9, 1]
                const monsterMatch = luaLine.match(/monster:\s*\[(\d+),\s*(\d+)\]/);
                if (monsterMatch) {
                    return [parseInt(monsterMatch[1]), parseInt(monsterMatch[2])];
                }
            }
        } catch (error) {
            console.warn(`获取 ${img.fileName} 的monster值失败:`, error);
        }
        
        return null; // 如果无法获取monster值，返回null
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
        const maxLength = 60; // 设置对齐基准长度
        
        // 先收集所有注释信息，用于计算对齐
        const commentInfo = [];
        
        selectedImages.forEach((img, index) => {
            const regionName = this.getRegionDisplayName(img.region);
            
            // 生成带实际索引的类型文本（imageIndex是从0开始，所以+1）
            const typeTextWithIndex = `${img.type}[${img.imageIndex + 1}]`;
            
            commentInfo.push({
                pointText: `第${index + 1}点`,
                typeText: typeTextWithIndex,
                regionText: regionName
            });
        });
        
        // 计算各部分的最大长度用于对齐（考虑中文字符宽度）
        const getDisplayWidth = (text) => {
            let width = 0;
            for (let i = 0; i < text.length; i++) {
                // 中文字符计为2个宽度，英文字符计为1个宽度
                width += text.charCodeAt(i) > 127 ? 2 : 1;
            }
            return width;
        };
        
        const maxPointWidth = Math.max(...commentInfo.map(info => getDisplayWidth(info.pointText)));
        const maxTypeWidth = Math.max(...commentInfo.map(info => getDisplayWidth(info.typeText)));
        const maxRegionWidth = Math.max(...commentInfo.map(info => getDisplayWidth(info.regionText)));
        
        selectedImages.forEach((img, index) => {
            const luaLines = luaTypeMap.get(img.type);
            if (luaLines && luaLines[img.imageIndex]) {
                let luaLine = luaLines[img.imageIndex].trim();
                
                // 移除原有注释
                const commentIndex = luaLine.indexOf('--');
                if (commentIndex !== -1) {
                    luaLine = luaLine.substring(0, commentIndex).trim();
                }
                
                // 获取地区名称
                const regionName = this.getRegionDisplayName(img.region);
                
                // 计算需要的空格数量来对齐注释起始位置
                const currentLength = luaLine.length;
                const spacesNeeded = Math.max(1, maxLength - currentLength);
                const spaces = ' '.repeat(spacesNeeded);
                
                // 生成对齐的注释，考虑中文字符宽度
                const padToWidth = (text, targetWidth) => {
                    const currentWidth = getDisplayWidth(text);
                    const spacesNeeded = Math.max(0, targetWidth - currentWidth);
                    return text + ' '.repeat(spacesNeeded);
                };
                
                const pointText = padToWidth(commentInfo[index].pointText, maxPointWidth);
                const typeText = padToWidth(commentInfo[index].typeText, maxTypeWidth);
                const regionText = padToWidth(commentInfo[index].regionText, maxRegionWidth);
                
                const comment = `--${pointText}  ${typeText}  ${regionText}`;
                const lineWithComment = `${luaLine}${spaces}${comment}`;
                sortedLuaLines.push(lineWithComment);
            } else {
                console.warn(`找不到 ${img.type} 类型第 ${img.imageIndex + 1} 行的lua配置`);
                sortedLuaLines.push(`-- 配置缺失 -- 点位 ${index + 1}: ${img.fileName}`);
            }
        });
        
        // 显示lua配置
        this.displayLuaConfig(sortedLuaLines);
    }
    
    // 获取地区显示名称
    getRegionDisplayName(regionCode) {
        if (window.RouteConfig && window.RouteConfig.regionMapping) {
            return window.RouteConfig.regionMapping[regionCode] || regionCode;
        }
        return regionCode;
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
                    <p> select:多选时第几个(从下至上); try:重试(用于有地脉的点位); wait:(ms):等待时间(传送副本时等待延迟)</p>
                    <p> area:地区代码; areawait:等待（用于单独地图加载）; resnar:重置地图大小;</p>
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

    sortByDouMMode(images) {
        // 抖M模式：传入的images已经保证了抖M和非抖M点位的数量
        // 直接按照奇数位非抖M、偶数位抖M的顺序排列
        const douMRegions = ['yxg', 'cy', 'jr', 'ss'];
        
        // 分离抖M点位和非抖M点位
        const douMImages = images.filter(img => douMRegions.includes(img.region));
        const nonDouMImages = images.filter(img => !douMRegions.includes(img.region));
        
        console.log(`抖M排序: 抖M点位 ${douMImages.length} 个, 非抖M点位 ${nonDouMImages.length} 个`);
        
        // 随机打乱两组点位
        const shuffledDouM = this.shuffleArray([...douMImages]);
        const shuffledNonDouM = this.shuffleArray([...nonDouMImages]);
        
        const result = [];
        const totalPoints = images.length;
        
        // 计算偶数位置的数量（抖M点位的数量）
        const evenPositions = Math.floor(totalPoints / 2);
        
        // 按位置排列：奇数位放非抖M，偶数位放抖M
        let douMIndex = 0;
        let nonDouMIndex = 0;
        
        for (let position = 1; position <= totalPoints; position++) {
            if (position % 2 === 1) {
                // 奇数位置：非抖M点位
                if (nonDouMIndex < shuffledNonDouM.length) {
                    result.push(shuffledNonDouM[nonDouMIndex]);
                    nonDouMIndex++;
                } else {
                    // 非抖M点位用完了，用抖M点位填充
                    result.push(shuffledDouM[douMIndex]);
                    douMIndex++;
                }
            } else {
                // 偶数位置：抖M点位
                if (douMIndex < shuffledDouM.length) {
                    result.push(shuffledDouM[douMIndex]);
                    douMIndex++;
                } else {
                    // 抖M点位用完了，用非抖M点位填充
                    result.push(shuffledNonDouM[nonDouMIndex]);
                    nonDouMIndex++;
                }
            }
        }
        
        // // 验证结果
        // console.log('抖M模式最终结果:');
        // result.forEach((img, idx) => {
        //     const position = idx + 1;
        //     const isDouM = douMRegions.includes(img.region);
        //     const isEvenPosition = position % 2 === 0;
        //     const isCorrect = (isEvenPosition && isDouM) || (!isEvenPosition && !isDouM) || 
        //                      douMIndex >= shuffledDouM.length || nonDouMIndex >= shuffledNonDouM.length;
        //     console.log(`${position}: ${img.fileName}(${img.region}) - ${isDouM ? '抖M' : '非抖M'} ${isCorrect ? '✓' : '✗'}`);
        // });
        
        return result;
    }

    selectImagesForDouMMode(availableImages, pointCount) {
        // 抖M模式专用图片选择：确保有足够的抖M点位用于偶数位置
        const douMRegions = ['yxg', 'cy', 'jr', 'ss'];
        
        // 分离抖M点位和非抖M点位
        const douMImages = availableImages.filter(img => douMRegions.includes(img.region));
        const nonDouMImages = availableImages.filter(img => !douMRegions.includes(img.region));
        
        // 计算需要的抖M点位数量（偶数位置的数量）
        const neededDouMCount = Math.floor(pointCount / 2);
        // 计算需要的非抖M点位数量（奇数位置的数量 + 可能的剩余）
        const neededNonDouMCount = pointCount - neededDouMCount;
        
        // console.log(`抖M模式选择: 总需要${pointCount}个点位，其中抖M${neededDouMCount}个，非抖M${neededNonDouMCount}个`);
        console.log(`可用抖M点位${douMImages.length}个，可用非抖M点位${nonDouMImages.length}个`);
        
        // 检查是否有足够的抖M点位
        if (douMImages.length < neededDouMCount) {
            console.warn(`抖M点位不足！需要${neededDouMCount}个，只有${douMImages.length}个`);
            // 抖M点位不足时，降级为普通随机选择
            return this.selectRandomImages(availableImages, pointCount);
        }
        
        // 检查是否有足够的非抖M点位
        if (nonDouMImages.length < neededNonDouMCount) {
            console.warn(`非抖M点位不足！需要${neededNonDouMCount}个，只有${nonDouMImages.length}个`);
            // 非抖M点位不足时，降级为普通随机选择
            return this.selectRandomImages(availableImages, pointCount);
        }
        
        // 随机选择足够数量的两种点位
        const selectedDouM = this.selectRandomImages(douMImages, neededDouMCount);
        const selectedNonDouM = this.selectRandomImages(nonDouMImages, neededNonDouMCount);
        
        // console.log(`成功选择: 抖M${selectedDouM.length}个，非抖M${selectedNonDouM.length}个`);
        
        // 合并并返回
        return [...selectedDouM, ...selectedNonDouM];
    }

    selectImagesForXYMode(availableImages, pointCount) {
        // XY模式专用图片选择：确保有足够的不同地区点位以实现交替效果
        
        // 按地区分组
        const regionGroups = {};
        availableImages.forEach(img => {
            if (!regionGroups[img.region]) {
                regionGroups[img.region] = [];
            }
            regionGroups[img.region].push(img);
        });
        
        const regions = Object.keys(regionGroups);
        console.log(`XY模式选择: 找到${regions.length}个地区，需要${pointCount}个点位`);
        
        // 如果只有一个地区，XY模式无效，降级为普通随机选择
        if (regions.length <= 1) {
            console.warn('XY模式需要至少2个不同地区的点位，降级为普通随机选择');
            return this.selectRandomImages(availableImages, pointCount);
        }
        
        // 计算每个地区理想分配的点位数量
        const basePerRegion = Math.floor(pointCount / regions.length);
        const remainder = pointCount % regions.length;
        
        console.log(`XY模式分配: 每个地区基础${basePerRegion}个点位，${remainder}个地区额外分配1个`);
        
        const selectedImages = [];
        const shuffledRegions = this.shuffleArray([...regions]);
        
        // 为每个地区分配点位
        shuffledRegions.forEach((region, index) => {
            const regionImages = this.shuffleArray([...regionGroups[region]]);
            // 前remainder个地区多分配1个点位
            const allocatedCount = basePerRegion + (index < remainder ? 1 : 0);
            
            // 取该地区可用的点位数量和分配数量的最小值
            const actualCount = Math.min(allocatedCount, regionImages.length);
            selectedImages.push(...regionImages.slice(0, actualCount));
            
            console.log(`地区${region}: 分配${allocatedCount}个，实际选择${actualCount}个`);
        });
        
        // 如果因为某些地区点位不足导致总数不够，从有余量的地区补充
        if (selectedImages.length < pointCount) {
            const needed = pointCount - selectedImages.length;
            console.log(`还需要${needed}个点位，从有余量的地区补充`);
            
            // 找到还有余量的地区
            const regionUsage = {};
            selectedImages.forEach(img => {
                regionUsage[img.region] = (regionUsage[img.region] || 0) + 1;
            });
            
            const remainingImages = [];
            regions.forEach(region => {
                const used = regionUsage[region] || 0;
                const available = regionGroups[region].slice(used);
                remainingImages.push(...available);
            });
            
            // 随机选择需要的数量来补充
            const shuffledRemaining = this.shuffleArray(remainingImages);
            selectedImages.push(...shuffledRemaining.slice(0, needed));
        }
        
        // 如果选择的图片超过了需要的数量，随机删除多余的
        if (selectedImages.length > pointCount) {
            const shuffledSelected = this.shuffleArray([...selectedImages]);
            return shuffledSelected.slice(0, pointCount);
        }
        
        console.log(`XY模式最终选择: ${selectedImages.length}个点位，来自${new Set(selectedImages.map(img => img.region)).size}个地区`);
        return selectedImages;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.routeGenerator = new RouteGenerator();
});
