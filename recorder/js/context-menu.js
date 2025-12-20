// Context Menu - 右键菜单功能
(function () {
    let contextMenu = null;
    let isAnimationEnabled = true;
    let currentTheme = 'dark';

    // 初始化
    function init() {
        createContextMenu();
        attachContextMenuListeners();

        // 监听设置变化
        const animToggle = document.getElementById('animToggle');
        const themeToggle = document.getElementById('themeToggle');

        if (animToggle) {
            isAnimationEnabled = animToggle.checked;
            animToggle.addEventListener('change', (e) => {
                isAnimationEnabled = e.target.checked;
                updateContextMenu();
            });
        }

        if (themeToggle) {
            currentTheme = themeToggle.checked ? 'light' : 'dark';
            themeToggle.addEventListener('change', (e) => {
                currentTheme = e.target.checked ? 'light' : 'dark';
            });
        }
    }

    // 创建右键菜单 DOM
    function createContextMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item host-only" data-action="undo">
                <span class="label">撤销</span>
            </div>
            
            <div class="context-menu-item" data-action="history">
                <span class="label">查看历史</span>
            </div>
            
            <div class="context-menu-separator"></div>
            
            <div class="context-menu-item" data-action="toggleAnimation">
                <div class="check-indicator">
                    <svg viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span class="label">启用抽取动画</span>
            </div>
            
            <div class="context-menu-item" data-action="toggleTheme">
                <div class="check-indicator">
                    <svg viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span class="label">浅色外观</span>
            </div>
            
            <div class="context-menu-separator host-only"></div>
            
            <div class="context-menu-item danger host-only" data-action="reset">
                <span class="label">重置记录</span>
            </div>
        `;

        document.body.appendChild(menu);
        contextMenu = menu;

        // 添加菜单项点击事件
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', handleMenuItemClick);
        });

        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });

        // 更新初始状态
        updateContextMenu();
    }

    // 附加右键菜单监听
    function attachContextMenuListeners() {
        // 在整个页面上监听右键点击
        document.addEventListener('contextmenu', (e) => {
            // 排除输入框等元素
            if (e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable) {
                return;
            }

            e.preventDefault();
            showContextMenu(e.pageX, e.pageY);
        });

        // 按 ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideContextMenu();
            }
        });
    }

    // 显示菜单
    function showContextMenu(x, y) {
        if (!contextMenu) return;

        // 更新菜单状态
        updateContextMenu();

        // 定位菜单
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;

        // 检查是否超出视口
        requestAnimationFrame(() => {
            const rect = contextMenu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.right > viewportWidth) {
                contextMenu.style.left = `${x - rect.width}px`;
            }
            if (rect.bottom > viewportHeight) {
                contextMenu.style.top = `${y - rect.height}px`;
            }

            // 显示菜单
            contextMenu.classList.add('active');
        });
    }

    // 隐藏菜单
    function hideContextMenu() {
        if (contextMenu) {
            contextMenu.classList.remove('active');
        }
    }

    // 更新菜单状态
    function updateContextMenu() {
        if (!contextMenu) return;

        // 更新动画开关状态
        const animItem = contextMenu.querySelector('[data-action="toggleAnimation"]');
        const animIndicator = animItem?.querySelector('.check-indicator');
        if (animIndicator) {
            if (isAnimationEnabled) {
                animIndicator.classList.add('active');
            } else {
                animIndicator.classList.remove('active');
            }
        }

        // 更新主题开关状态
        const themeItem = contextMenu.querySelector('[data-action="toggleTheme"]');
        const themeIndicator = themeItem?.querySelector('.check-indicator');
        if (themeIndicator) {
            if (currentTheme === 'light') {
                themeIndicator.classList.add('active');
            } else {
                themeIndicator.classList.remove('active');
            }
        }

        // 检查是否可以撤销
        const undoBtn = contextMenu.querySelector('[data-action="undo"]');
        if (undoBtn) {
            // 检查历史记录是否为空
            const hasHistory = window.history && window.history.length > 0;
            if (!hasHistory) {
                undoBtn.classList.add('disabled');
            } else {
                undoBtn.classList.remove('disabled');
            }
        }
    }

    // 处理菜单项点击
    function handleMenuItemClick(e) {
        const item = e.currentTarget;
        const action = item.getAttribute('data-action');

        // 如果是禁用状态，不执行
        if (item.classList.contains('disabled')) {
            return;
        }

        // 隐藏菜单
        hideContextMenu();

        // 执行对应的操作
        switch (action) {
            case 'undo':
                // 调用撤销功能
                const modalUndoBtn = document.getElementById('modalUndoBtn');
                if (modalUndoBtn) {
                    modalUndoBtn.click();
                }
                break;

            case 'history':
                // 打开历史记录
                const modalHistoryBtn = document.getElementById('modalHistoryBtn');
                if (modalHistoryBtn) {
                    modalHistoryBtn.click();
                }
                break;

            case 'toggleAnimation':
                // 切换动画
                const animToggle = document.getElementById('animToggle');
                if (animToggle) {
                    animToggle.checked = !animToggle.checked;
                    animToggle.dispatchEvent(new Event('change'));
                }
                break;

            case 'toggleTheme':
                // 切换主题
                const themeToggle = document.getElementById('themeToggle');
                if (themeToggle) {
                    themeToggle.checked = !themeToggle.checked;
                    themeToggle.dispatchEvent(new Event('change'));
                }
                break;

            case 'reset':
                // 重置记录
                const modalResetBtn = document.getElementById('modalResetBtn');
                if (modalResetBtn) {
                    modalResetBtn.click();
                }
                break;
        }
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出接口（供其他模块调用）
    window.__contextMenu = {
        show: showContextMenu,
        hide: hideContextMenu,
        update: updateContextMenu
    };
})();
