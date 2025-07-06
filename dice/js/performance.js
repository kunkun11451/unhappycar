// 性能监控工具
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.element = null;
        this.enabled = false;
        
        this.createUI();
    }

    createUI() {
        // 创建性能显示元素
        this.element = document.createElement('div');
        this.element.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            min-width: 120px;
        `;
        document.body.appendChild(this.element);
    }

    toggle() {
        this.enabled = !this.enabled;
        this.element.style.display = this.enabled ? 'block' : 'none';
        
        if (this.enabled) {
            this.lastTime = performance.now();
            this.frameCount = 0;
        }
    }

    update() {
        if (!this.enabled) return;

        this.frameCount++;
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        if (deltaTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            this.updateDisplay();
        }
    }

    updateDisplay() {
        if (!this.element) return;

        const memInfo = performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        } : null;

        let html = `FPS: ${this.fps}`;
        
        if (memInfo) {
            html += `<br>Memory: ${memInfo.used}MB / ${memInfo.total}MB`;
        }

        // 添加颜色指示器
        const fpsColor = this.fps >= 55 ? '#00ff00' : 
                        this.fps >= 30 ? '#ffff00' : '#ff0000';
        
        this.element.innerHTML = `
            <div style="color: ${fpsColor}">FPS: ${this.fps}</div>
            ${memInfo ? `<div>Memory: ${memInfo.used}MB</div>` : ''}
        `;
    }
}

// 创建全局性能监控器实例
const perfMonitor = new PerformanceMonitor();

// 添加键盘快捷键切换性能监控
document.addEventListener('keydown', (event) => {
    if (event.key === 'F3') {
        event.preventDefault();
        perfMonitor.toggle();
    }
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
