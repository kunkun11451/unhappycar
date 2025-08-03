// 深浅色主题切换功能
class ThemeToggle {
    constructor() {
        this.currentTheme = this.getSavedTheme() || 'light';
        this.init();
    }

    init() {
        // 应用保存的主题
        this.applyTheme(this.currentTheme);
        
        // 监听系统主题变化
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener(this.handleSystemThemeChange.bind(this));
        }
    }

    // 获取保存的主题设置
    getSavedTheme() {
        try {
            return localStorage.getItem('theme-preference');
        } catch (e) {
            console.warn('无法访问 localStorage，使用默认主题');
            return null;
        }
    }

    // 保存主题设置
    saveTheme(theme) {
        try {
            localStorage.setItem('theme-preference', theme);
        } catch (e) {
            console.warn('无法保存主题设置到 localStorage');
        }
    }

    // 应用主题
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.saveTheme(theme);
        
        // 更新切换器状态
        this.updateToggleState();
        
        // 触发主题变化事件
        this.dispatchThemeChangeEvent(theme);
    }

    // 切换主题
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // 添加切换动画
        this.addTransitionClass();
    }

    // 更新切换器状态
    updateToggleState() {
        const toggleInput = document.querySelector('.switch #input');
        const statusText = document.querySelector('.theme-status');
        
        if (toggleInput) {
            // dark模式时checkbox应该被选中
            toggleInput.checked = this.currentTheme === 'dark';
        }
        
        if (statusText) {
            statusText.textContent = this.currentTheme === 'dark' ? '深色模式' : '浅色模式';
        }
    }

    // 处理系统主题变化
    handleSystemThemeChange(e) {
        // 如果用户没有手动设置过主题，则跟随系统
        if (!this.getSavedTheme()) {
            const systemTheme = e.matches ? 'dark' : 'light';
            this.applyTheme(systemTheme);
        }
    }

    // 添加过渡动画类
    addTransitionClass() {
        document.documentElement.classList.add('theme-transition');
        
        // 动画结束后移除类
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 300);
    }

    // 触发主题变化事件
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: { theme }
        });
        document.dispatchEvent(event);
    }

    // 创建主题切换器UI
    createThemeToggleUI() {
        const section = document.createElement('div');
        section.className = 'theme-toggle-section';

        const title = document.createElement('div');
        title.className = 'theme-toggle-title';
        title.textContent = '主题设置';

        const container = document.createElement('div');
        container.className = 'theme-toggle-container';

        const info = document.createElement('div');
        info.className = 'theme-toggle-info';

        const label = document.createElement('div');
        label.className = 'theme-toggle-label';
        label.textContent = '深浅色模式';

        const description = document.createElement('div');
        description.className = 'theme-toggle-description';
        description.textContent = '切换界面的深色和浅色主题显示';

        info.appendChild(label);
        info.appendChild(description);

        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        `;

        // 创建新的日月切换器
        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        
        const switchInput = document.createElement('input');
        switchInput.id = 'input';
        switchInput.type = 'checkbox';
        switchInput.checked = this.currentTheme === 'dark';
        
        const slider = document.createElement('div');
        slider.className = 'slider round';
        
        // 创建sun-moon容器
        const sunMoon = document.createElement('div');
        sunMoon.className = 'sun-moon';
        
        // 添加月亮斑点
        sunMoon.innerHTML = `
            <svg id="moon-dot-1" class="moon-dot" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="moon-dot-2" class="moon-dot" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="moon-dot-3" class="moon-dot" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="light-ray-1" class="light-ray" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="light-ray-2" class="light-ray" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="light-ray-3" class="light-ray" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-1" class="cloud-dark" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-2" class="cloud-dark" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-3" class="cloud-dark" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-4" class="cloud-light" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-5" class="cloud-light" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-6" class="cloud-light" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50"></circle>
            </svg>
        `;
        
        // 创建星星容器
        const stars = document.createElement('div');
        stars.className = 'stars';
        stars.innerHTML = `
            <svg id="star-1" class="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg id="star-2" class="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg id="star-3" class="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg id="star-4" class="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
        `;
        
        slider.appendChild(sunMoon);
        slider.appendChild(stars);
        
        switchLabel.appendChild(switchInput);
        switchLabel.appendChild(slider);

        const status = document.createElement('div');
        status.className = 'theme-status';
        status.textContent = this.currentTheme === 'dark' ? '深色模式' : '浅色模式';

        toggleContainer.appendChild(switchLabel);
        toggleContainer.appendChild(status);

        container.appendChild(info);
        container.appendChild(toggleContainer);

        section.appendChild(title);
        section.appendChild(container);

        // 添加点击事件
        switchInput.addEventListener('change', () => {
            this.toggleTheme();
        });

        // 添加键盘支持
        switchLabel.setAttribute('tabindex', '0');
        switchLabel.setAttribute('role', 'switch');
        switchLabel.setAttribute('aria-checked', this.currentTheme === 'dark');
        
        switchLabel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchInput.checked = !switchInput.checked;
                this.toggleTheme();
            }
        });

        return section;
    }

    // 获取当前主题
    getCurrentTheme() {
        return this.currentTheme;
    }

    // 设置主题
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.applyTheme(theme);
        }
    }
}

// 添加过渡动画样式
const transitionStyle = document.createElement('style');
transitionStyle.textContent = `
    .theme-transition,
    .theme-transition *,
    .theme-transition *:before,
    .theme-transition *:after {
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        transition-delay: 0 !important;
    }
`;
document.head.appendChild(transitionStyle);

// 全局主题切换器实例
window.themeToggle = new ThemeToggle();

// 为了兼容性，也可以通过全局函数访问
window.toggleTheme = () => window.themeToggle.toggleTheme();
window.setTheme = (theme) => window.themeToggle.setTheme(theme);
window.getCurrentTheme = () => window.themeToggle.getCurrentTheme();
