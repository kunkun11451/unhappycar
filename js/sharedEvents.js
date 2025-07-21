// js/sharedEvents.js

// IIFE to encapsulate the module
(() => {
    // WebSocket instance from app.js
    let ws;

    // State management
    let isAdmin = false;
    let sharedPersonalEvents = {};
    let sharedTeamEvents = {};
    let pendingLibraries = [];

    // --- DOM Elements ---
    let detailModal, settingsOverlay, conflictModal, managementModal;

    /**
     * Initializes the shared events module.
     * This function should be called from app.js after WebSocket is connected.
     * @param {WebSocket} websocketInstance - The active WebSocket connection.
     */
    function init(websocketInstance) {
        ws = websocketInstance;
        
        // Inject HTML for modals
        injectDetailModalHtml();
        injectUploadModalHtml();
        injectConflictModalHtml();
        injectManagementModalHtml(); // Inject the management modal
        injectErrorModalHtml();
        injectHelpModalHtml();
        
        // Assign DOM elements
        detailModal = document.getElementById('sharedEventsDetailModal');
        managementModal = document.getElementById('sharedEventsManagementModal');
        conflictModal = document.getElementById('sharedEventsConflictModal');
        settingsOverlay = document.getElementById('settingsOverlay'); // Use the main settings overlay

        // Request shared libraries from server on connect
        requestSharedLibraries();
    }

    /**
     * Injects the detail modal's HTML structure into the document body.
     */
    function injectDetailModalHtml() {
        if (document.getElementById('sharedEventsDetailModal')) return;
        const modalHtml = `<div id="sharedEventsDetailModal" class="shared-events-detail-modal"></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Injects the error modal's HTML structure into the document body.
     */
    function injectErrorModalHtml() {
        if (document.getElementById('sharedEventsErrorOverlay')) return;
        const overlayHtml = `
            <div id="sharedEventsErrorOverlay" class="submission-overlay">
                <div id="sharedEventsErrorModal" class="submission-modal">
                    <button id="closeErrorModalBtn" class="submission-close-btn">✕</button>
                    <h2 id="errorModalTitle" class="submission-title">提示</h2>
                    <div id="errorModalMessage" class="error-modal-message"></div>
                    <div class="submission-button-container">
                        <button id="confirmErrorBtn" class="submission-btn submit">确认</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
    }

    /**
     * Injects the help modal's HTML structure into the document body.
     */
    function injectHelpModalHtml() {
        if (document.getElementById('sharedEventsHelpOverlay')) return;
        const overlayHtml = `
            <div id="sharedEventsHelpOverlay" class="submission-overlay">
                <div id="sharedEventsHelpModal" class="submission-modal">
                    <button id="closeHelpModalBtn" class="submission-close-btn">✕</button>
                    <h2 class="submission-title">使用教程</h2>
                    <div class="help-content">
                        <h4>这是什么功能?</h4>
                        <p>你可以在这里浏览他人分享的事件库，并将它们一键添加到你自己的本地事件库中。同时，你也可以将自己的事件库分享给他人。</p>
                        
                        <h4>首次分享事件库</h4>
                        <p>1. 点击“分享我的事件库”按钮。</p>
                        <p>2. 输入“显示的名字”和“识别码”(相当于账号密码,使用未被其他用户使用的"名字"将自动"注册")。</p>
                        <p>3. 点击“确认并上传”即可完成分享。</p>

                        <h4>更新已分享的事件库</h4>
                        <p>1. 在“事件管理”中编辑你的事件库。</p>
                        <p>2. 点击“分享我的事件库”，使用与之前完全相同的“显示的名字”和“识别码”。</p>
                        <p>3. 选择你想要分享或更新的事件，点击“确认并上传”。系统会根据你的选择更新你的分享库。</p>

                        <h4>管理我的分享</h4>
                        <p>1. 点击“管理我的分享库”按钮。</p>
                        <p>2. 输入你的“显示的名字”和“识别码”进行验证。</p>
                        <p>3. 验证成功后，你可以看到你所有已分享的事件，并可以单独删除它们。</p>

                        <h4>注意事项</h4>
                        <p>1. 每个用户自己的分享库中，内容完全相同的事件只会保留一个。</p>
                        <p>2. 共享的事件库将对所有人可见，请确保其中不包含敏感及不文明信息。</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
    }

    /**
     * Injects the upload modal's HTML structure into the document body.
     */
    function injectUploadModalHtml() {
        if (document.getElementById('sharedEventsUploadOverlay')) return;
        const overlayHtml = `
            <div id="sharedEventsUploadOverlay" class="submission-overlay">
                <div id="sharedEventsUploadModal" class="submission-modal wide">
                    <button id="closeUploadModalBtn" class="submission-close-btn">✕</button>
                    <h2 class="submission-title">🗃️ 分享你的事件库</h2>
                    <p style="color: white; text-align: center;">
                        在"事件管理"中编辑事件,在下面选择要分享的事件，并填写用户信息。
                    </p>
                    <div class="upload-main-container">
                        <div class="upload-search-container">
                            <input type="text" id="uploadSearchInput" class="submission-input" placeholder="🔍 搜索事件标题...">
                        </div>
                        <div class="upload-list-wrapper">
                            <div class="upload-list-container" id="personal-events-container">
                                <h3 class="upload-list-title">👤 个人事件</h3>
                                <div class="upload-list-controls">
                                    <button class="submission-btn small" data-action="select-all" data-target="personal">✅全选</button>
                                    <button class="submission-btn small" data-action="deselect-all" data-target="personal">❌全不选</button>
                                    <button class="submission-btn small" data-action="invert-selection" data-target="personal">🔄反选</button>
                                </div>
                                <div id="uploadPersonalEventsGrid" class="upload-events-grid"></div>
                            </div>
                            <div class="upload-list-container" id="team-events-container">
                                <h3 class="upload-list-title">👥 团队事件</h3>
                                <div class="upload-list-controls">
                                    <button class="submission-btn small" data-action="select-all" data-target="team">✅全选</button>
                                    <button class="submission-btn small" data-action="deselect-all" data-target="team">❌全不选</button>
                                    <button class="submission-btn small" data-action="invert-selection" data-target="team">🔄反选</button>
                                </div>
                                <div id="uploadTeamEventsGrid" class="upload-events-grid"></div>
                            </div>
                        </div>
                    </div>

                    <div class="upload-user-info">
                        <h3 class="upload-list-title">ℹ️用户信息</h3>
                        <input type="text" id="uploaderNameInput" class="submission-input" placeholder="显示的名字（必填）">
                        <input type="text" id="uploaderPinInput" class="submission-input" placeholder="识别码（必填,用于后续更新和管理）" pattern="[a-zA-Z0-9]+">
                        <div class="avatar-input-group">
                            <input type="text" id="uploaderAvatarInput" class="submission-input" placeholder="显示的头像（可选,URL）">
                            <button id="previewAvatarBtn" class="submission-btn">预览</button>
                        </div>
                    <p style="color: white; text-align: center;">
                        首次分享可填写任意名字和识别码,后续如要更新/管理需填写相同信息。
                    </p>

                        <div id="avatarPreviewContainer" class="avatar-preview-container">
                            <img id="avatarPreviewImage" src="" alt="头像预览" style="display:none;">
                        </div>
                    </div>

                    <div class="submission-button-container">
                        <button id="confirmUploadBtn" class="submission-btn submit">确认并上传</button>
                        <button id="cancelUploadBtn" class="submission-btn cancel">取消</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
    }

    /**
     * Displays a temporary toast notification.
     * @param {string} message - The message to display.
     */
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    /**
     * Displays a modal with an error message.
     * @param {string} message - The HTML message to display.
     */
    function showErrorModal(message) {
        const overlay = document.getElementById('sharedEventsErrorOverlay');
        const modal = document.getElementById('sharedEventsErrorModal');
        const messageDiv = document.getElementById('errorModalMessage');
        const confirmBtn = document.getElementById('confirmErrorBtn');
        const closeBtn = document.getElementById('closeErrorModalBtn');

        messageDiv.innerHTML = message;

        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);

        const closeModal = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.8)';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        };

        confirmBtn.onclick = closeModal;
        closeBtn.onclick = closeModal;
    }

    /**
     * Injects the management modal's HTML structure into the document body.
     */
    function injectManagementModalHtml() {
        if (document.getElementById('sharedEventsManagementOverlay')) return;
        const overlayHtml = `
            <div id="sharedEventsManagementOverlay" class="submission-overlay">
                <div id="sharedEventsManagementModal" class="submission-modal">
                    <button id="closeManagementModalBtn" class="submission-close-btn">✕</button>
                    <div id="managementAuthView">
                        <h2 class="submission-title">管理我的分享库</h2>
                        <p class="submission-description">创建的分享库可以在此管理。</p>
                        <p class="submission-description">请输入你的名字和识别码以继续。</p>
                        <input type="text" id="managementNameInput" class="submission-input" placeholder="你的名字">
                        <input type="text" id="managementPinInput" class="submission-input" placeholder="你的识别码">
                        <div class="submission-button-container">
                            <button id="managementAuthBtn" class="submission-btn submit">验证</button>
                            <button id="cancelManagementBtn" class="submission-btn cancel">取消</button>
                        </div>
                    </div>
                    <div id="managementEditView" style="display:none;">
                        <h2 class="submission-title">编辑你的分享库</h2>
                        <div class="shared-events-tabs" id="managementTabs">
                            <button class="shared-events-tab-btn active" data-type="personal">个人事件</button>
                            <button class="shared-events-tab-btn" data-type="team">团队事件</button>
                        </div>
                        <div class="upload-search-container">
                             <input type="text" id="managementSearchInput" class="submission-input" placeholder="搜索事件标题...">
                        </div>
                        <div id="managementEventsGrid" class="management-events-grid shared-events-grid"></div>
                        <div>
                            <p class="submission-description">刷新网页后即可查看到分享库中的内容变动</p>
                            <p class="submission-description">主持游戏时请慎重刷新,会导致房间解散</p>
                        </div>
                        <div class="submission-button-container">
                            <button id="closeManagementEditBtn" class="submission-btn cancel">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
    }

    /**
     * Injects the conflict modal's HTML structure into the document body.
     */
    function injectConflictModalHtml() {
        if (document.getElementById('sharedEventsConflictOverlay')) return;
        const overlayHtml = `
            <div id="sharedEventsConflictOverlay" class="submission-overlay">
                <div id="sharedEventsConflictModal" class="submission-modal">
                    <button id="closeConflictModalBtn" class="submission-close-btn">✕</button>
                    <h2 class="submission-title">事件内容冲突</h2>
                    <p class="submission-description">事件 "<span id="conflictEventTitle"></span>" 在您的本地库中已存在，但内容不同。</p>
                    <div class="conflict-modal-comparison">
                        <div class="conflict-event-version">
                            <h4>本地版本</h4>
                            <div id="localEventDetails"></div>
                        </div>
                        <div class="conflict-event-version">
                            <h4>共享版本</h4>
                            <div id="sharedEventDetails"></div>
                        </div>
                    </div>
                    <div class="submission-button-container">
                        <button id="overwriteEventBtn" class="submission-btn submit">覆盖本地版本</button>
                        <button id="renameEventBtn" class="submission-btn">重命名后添加</button>
                        <button id="cancelConflictBtn" class="submission-btn cancel">取消</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
    }

    /**
     * Requests all approved shared libraries from the server.
     */
    function requestSharedLibraries() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'get_shared_libraries' }));
        }
    }

    /**
     * Handles incoming WebSocket messages relevant to this module.
     * @param {object} data - The parsed message data from the server.
     */
    function handleMessage(data) {
        switch (data.type) {
            case 'shared_libraries_data':
                sharedPersonalEvents = data.libraries.personalEvents || {};
                sharedTeamEvents = data.libraries.teamEvents || {};
                // If the view is active, refresh it
                const container = document.getElementById('sharedEventsContainer');
                if (container) {
                    renderUserView(container);
                }
                break;
            case 'upload_success':
                showToast(data.message || '上传/更新成功！');
                requestSharedLibraries(); // Refresh the view
                break;
            case 'pin_mismatch':
                showErrorModal('对于<strong>想创建新分享的用户</strong>: 此名字已有人使用,请使用一个全新的名字。<br><br>对于<strong>使用此名字分享过的用户</strong>: 识别码错误,请检查识别码。');
                break;
            case 'authentication_success':
                showManagementEditView(data.library);
                break;
            case 'authentication_failure':
                showErrorModal('验证失败，请检查你的名字和识别码。');
                break;
            case 'event_deleted_success':
                showToast('事件删除成功！');
                break;
             case 'event_added_success':
                showToast('事件添加成功！');
                break;
        }
    }

    /**
     * Renders the main view for regular users into a given container.
     * @param {HTMLElement} container - The element to render the content into.
     */
    function renderUserView(container) {
        const allEvents = {...sharedPersonalEvents, ...sharedTeamEvents};
        const uploaderNames = [...new Set(Object.values(allEvents).map(event => event.uploaderName).filter(Boolean))];

        let filterOptions = '<option value="all">所有分享者</option>';
        uploaderNames.forEach(name => {
            filterOptions += `<option value="${name}">${name}</option>`;
        });

        container.innerHTML = `
            <div class="shared-events-header">
                <button id="helpBtn" class="help-btn">?</button>
            </div>
            <div class="shared-events-tabs">
                <button class="shared-events-tab-btn active" data-type="personal">个人事件</button>
                <button class="shared-events-tab-btn" data-type="team">团队事件</button>
            </div>
            <div class="shared-events-grid-controls">
                <div class="submission-button-container">
                    <button id="uploadLibraryBtn" class="submission-btn">🗃️ 分享我的事件库</button>
                    <button id="manageLibraryBtn" class="submission-btn">⚙️ 管理我的分享库</button>
                </div>
                <div class="filters-container">
                    <div id="statusFilterContainer" class="shared-events-radio-inputs">
                    <label>
                        <input class="radio-input" type="checkbox" name="statusFilter" value="not-added" checked>
                        <span class="radio-tile">
                            <span class="radio-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </span>
                            <span class="radio-label">未添加</span>
                        </span>
                    </label>
                    <label>
                        <input class="radio-input" type="checkbox" name="statusFilter" value="added">
                        <span class="radio-tile">
                            <span class="radio-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </span>
                            <span class="radio-label">已添加</span>
                        </span>
                    </label>
                    <label>
                        <input class="radio-input" type="checkbox" name="statusFilter" value="conflict">
                        <span class="radio-tile">
                            <span class="radio-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </span>
                            <span class="radio-label">内容冲突</span>
                        </span>
                    </label>
                    </div>
                    <select id="uploaderFilter" class="shared-events-filter">${filterOptions}</select>
                </div>
            </div>
            <div id="sharedEventsGrid" class="shared-events-grid"></div>
        `;
        
        const tabs = container.querySelectorAll('.shared-events-tab-btn');
        const uploaderFilter = document.getElementById('uploaderFilter');
        const statusFilters = container.querySelectorAll('input[name="statusFilter"]');

        const updateView = () => {
            const activeTab = container.querySelector('.shared-events-tab-btn.active').dataset.type;
            const selectedUploader = uploaderFilter.value;
            const selectedStatuses = [...statusFilters].filter(cb => cb.checked).map(cb => cb.value);
            renderEventCards(activeTab, selectedUploader, selectedStatuses);
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                updateView();
            });
        });

        uploaderFilter.addEventListener('change', updateView);

        statusFilters.forEach(filter => {
            filter.addEventListener('change', (e) => {
                const checkedCount = [...statusFilters].filter(f => f.checked).length;
                if (checkedCount === 0) {
                    // Prevent unchecking the last box
                    e.target.checked = true;
                    return; // Don't update view if no change happened
                }
                updateView();
            });
        });

        document.getElementById('uploadLibraryBtn').addEventListener('click', triggerUpload);
        document.getElementById('manageLibraryBtn').addEventListener('click', triggerManagement);
        document.getElementById('helpBtn').addEventListener('click', triggerHelp);

        updateView();
    }

    /**
     * Renders event cards into the grid.
     * @param {string} type - 'personal' or 'team'.
     * @param {string} uploaderFilter - The selected uploader name.
     * @param {string[]} statusFilters - Array of statuses to display.
     */
    function renderEventCards(type, uploaderFilter = 'all', statusFilters = ['not-added', 'added', 'conflict']) {
        // Ensure latest events are loaded from storage for accurate status comparison
        if (window.eventManagement && typeof window.eventManagement.loadEventsFromStorage === 'function') {
            window.eventManagement.loadEventsFromStorage();
        }

        const grid = document.getElementById('sharedEventsGrid');
        grid.innerHTML = '';
        let events = (type === 'personal') ? sharedPersonalEvents : sharedTeamEvents;
        const localEvents = (type === 'personal') ? window.mission : window.hardmission;

        if (uploaderFilter !== 'all') {
            events = Object.entries(events)
                .filter(([_, event]) => event.uploaderName === uploaderFilter)
                .reduce((obj, [key, val]) => {
                    obj[key] = val;
                    return obj;
                }, {});
        }

        if (Object.keys(events).length === 0) {
            grid.innerHTML = `<p class="shared-events-empty">该分类下暂无共享事件。</p>`;
            return;
        }

        for (const title in events) {
            const event = events[title];
            const card = document.createElement('div');
            card.className = 'shared-event-card';
            card.dataset.type = type;
            card.dataset.title = title;

            const originalTitle = event.originalTitle || title;
            const localEvent = localEvents[originalTitle];
            const isAdded = !!localEvent;
            let status = 'not-added';

            if (isAdded) {
                if (JSON.stringify(localEvent.内容) !== JSON.stringify(event.内容) || 
                    JSON.stringify(localEvent.placeholders || {}) !== JSON.stringify(event.placeholders || {})) {
                    status = 'conflict';
                    card.classList.add('conflict');
                } else {
                    status = 'added';
                    card.classList.add('added');
                }
            }

            if (!statusFilters.includes(status)) {
                continue; // Skip rendering if status is not in the selected filters
            }

            const defaultAvatar = 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png';
            const uploaderInfo = event.uploaderName ? `
                <div class="shared-card-uploader">
                    <img src="${event.uploaderAvatar || defaultAvatar}" alt="${event.uploaderName}" class="uploader-avatar" onerror="this.src='${defaultAvatar}'">
                    <span class="uploader-name">${event.uploaderName}</span>
                </div>
            ` : '';

            let placeholdersHtml = '';
            if (event.placeholders && Object.keys(event.placeholders).length > 0) {
                placeholdersHtml += '<ul class="shared-card-placeholders">';
                for (const placeholder in event.placeholders) {
                    placeholdersHtml += `<li><strong>[${placeholder}]</strong>: ${event.placeholders[placeholder].join(', ')}</li>`;
                }
                placeholdersHtml += '</ul>';
            }

            card.innerHTML = `
                <div class="shared-card-header">
                    ${uploaderInfo}
                    <h4 class="shared-card-title">${title}</h4>
                </div>
                <p class="shared-card-content">${event.内容}</p>
                ${placeholdersHtml}
                <div class="shared-card-footer">
                    <button class="shared-card-btn add-btn">${status === 'conflict' ? '内容冲突' : (status === 'added' ? '已添加' : '添加')}</button>
                </div>
            `;
            grid.appendChild(card);
        }

        grid.querySelectorAll('.add-btn').forEach(btn => btn.addEventListener('click', addSingleEvent));
    }

    function addSingleEvent(e) {
        const card = e.target.closest('.shared-event-card');
        const type = card.dataset.type;
        const title = card.dataset.title;
        
        if (card.classList.contains('conflict')) {
            showConflictModal(type, title);
        } else if (!card.classList.contains('added')) {
            const success = addEventToLocal(type, title);
            if (success) {
                card.classList.remove('conflict');
                card.classList.add('added');
                card.querySelector('.add-btn').textContent = '已添加';
            }
        }
    }

    function addEventToLocal(type, title, newTitle = null) {
        const localEvents = (type === 'personal') ? window.mission : window.hardmission;
        const sharedEvents = (type === 'personal') ? sharedPersonalEvents : sharedTeamEvents;
        const sharedEvent = { ...sharedEvents[title] };

        const finalTitle = newTitle || sharedEvent.originalTitle || title;

        if (newTitle) {
            sharedEvent.originalTitle = title; 
        }

        localEvents[finalTitle] = sharedEvent;

        window.eventManagement.saveEventsToStorage();
        
        if (window.eventManagement && typeof window.eventManagement.refreshEventManagement === 'function') {
            window.eventManagement.refreshEventManagement();
        }
        
        document.querySelector('.shared-events-tab-btn.active').dispatchEvent(new Event('click'));
        return true;
    }

    function showConflictModal(type, title) {
        const sharedEvents = (type === 'personal') ? sharedPersonalEvents : sharedTeamEvents;
        const sharedEvent = sharedEvents[title];
        const originalTitle = sharedEvent.originalTitle || title;
        const localEvents = (type === 'personal') ? window.mission : window.hardmission;
        const localEvent = localEvents[originalTitle];

        const conflictOverlay = document.getElementById('sharedEventsConflictOverlay');
        const conflictModal = document.getElementById('sharedEventsConflictModal');

        document.getElementById('conflictEventTitle').textContent = originalTitle;
        document.getElementById('localEventDetails').innerHTML = formatEventDetailsForDisplay(localEvent);
        document.getElementById('sharedEventDetails').innerHTML = formatEventDetailsForDisplay(sharedEvent);

        conflictOverlay.style.display = 'flex';
        setTimeout(() => {
            conflictOverlay.style.opacity = '1';
            conflictModal.style.transform = 'scale(1)';
        }, 10);

        const overwriteBtn = document.getElementById('overwriteEventBtn');
        const renameBtn = document.getElementById('renameEventBtn');
        const cancelBtn = document.getElementById('cancelConflictBtn');
        const closeBtn = document.getElementById('closeConflictModalBtn');

        const closeModal = () => {
            conflictOverlay.style.opacity = '0';
            conflictModal.style.transform = 'scale(0.8)';
            setTimeout(() => {
                conflictOverlay.style.display = 'none';
            }, 300);
            overwriteBtn.removeEventListener('click', handleOverwrite);
            renameBtn.removeEventListener('click', handleRename);
            cancelBtn.removeEventListener('click', closeModal);
            settingsOverlay.removeEventListener('click', stopClickPropagation, true);
        };

        const handleOverwrite = () => {
            addEventToLocal(type, title);
            closeModal();
        };

        const handleRename = () => {
            const newTitle = prompt(`为共享事件 "${originalTitle}" 输入一个新的标题:`, `${originalTitle} (共享版)`);
            if (newTitle && !localEvents[newTitle]) {
                addEventToLocal(type, title, newTitle);
                closeModal();
            } else if (newTitle) {
                alert('新标题无效或已存在。');
            }
        };

        overwriteBtn.addEventListener('click', handleOverwrite);
        renameBtn.addEventListener('click', handleRename);
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
    }

    function formatEventDetailsForDisplay(event) {
        if (!event) return '<p>N/A</p>';
        let html = `<p class="conflict-detail-content"><strong>内容:</strong> ${event.内容}</p>`;
        if (event.placeholders && Object.keys(event.placeholders).length > 0) {
            html += '<strong>占位符:</strong><ul class="conflict-detail-placeholders">';
            for (const key in event.placeholders) {
                html += `<li><strong>[${key}]</strong>: ${event.placeholders[key].join(', ')}</li>`;
            }
            html += '</ul>';
        }
        return html;
    }

    function triggerUpload() {
        if (window.eventManagement && typeof window.eventManagement.loadEventsFromStorage === 'function') {
            window.eventManagement.loadEventsFromStorage();
        }

        const uploadOverlay = document.getElementById('sharedEventsUploadOverlay');
        const uploadModal = document.getElementById('sharedEventsUploadModal');
        const nameInput = document.getElementById('uploaderNameInput');
        const pinInput = document.getElementById('uploaderPinInput');
        const avatarInput = document.getElementById('uploaderAvatarInput');
        const confirmBtn = document.getElementById('confirmUploadBtn');
        const cancelBtn = document.getElementById('cancelUploadBtn');
        const closeBtn = document.getElementById('closeUploadModalBtn');
        const previewBtn = document.getElementById('previewAvatarBtn');
        const previewImage = document.getElementById('avatarPreviewImage');
        const personalGrid = document.getElementById('uploadPersonalEventsGrid');
        const teamGrid = document.getElementById('uploadTeamEventsGrid');
        const searchInput = document.getElementById('uploadSearchInput');

        const renderSelectionGrid = (grid, events) => {
            grid.innerHTML = '';
            if (Object.keys(events).length === 0) {
                grid.innerHTML = '<p class="shared-events-empty">该分类下没有事件。</p>';
                return;
            }
            for (const title in events) {
                const event = events[title];
                let placeholdersHtml = '';
                if (event.placeholders && Object.keys(event.placeholders).length > 0) {
                    placeholdersHtml += '<ul class="shared-card-placeholders">';
                    for (const placeholder in event.placeholders) {
                        placeholdersHtml += `<li><strong>[${placeholder}]</strong>: ${event.placeholders[placeholder].join(', ')}</li>`;
                    }
                    placeholdersHtml += '</ul>';
                }

                const cardHtml = `
                    <div class="shared-event-card upload-card">
                        <input type="checkbox" class="upload-card-checkbox" data-title="${title}">
                        <div class="shared-card-header">
                            <h4 class="shared-card-title">${title}</h4>
                        </div>
                        <p class="shared-card-content">${event.内容}</p>
                        ${placeholdersHtml}
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', cardHtml);
            }
             // Add click listener to the card itself to toggle the checkbox
            grid.querySelectorAll('.upload-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        const checkbox = card.querySelector('.upload-card-checkbox');
                        checkbox.checked = !checkbox.checked;
                    }
                });
            });
        };

        renderSelectionGrid(personalGrid, window.mission || {});
        renderSelectionGrid(teamGrid, window.hardmission || {});

        nameInput.value = localStorage.getItem('uploaderName') || '';
        pinInput.value = localStorage.getItem('uploaderPin') || '';
        avatarInput.value = localStorage.getItem('uploaderAvatar') || '';
        previewImage.style.display = 'none';
        searchInput.value = '';

        uploadOverlay.style.display = 'flex';
        setTimeout(() => {
            uploadOverlay.style.opacity = '1';
            uploadModal.style.transform = 'scale(1)';
        }, 10);

        const controlButtons = uploadModal.querySelectorAll('.upload-list-controls button');

        const handleControlClick = (e) => {
            const action = e.target.dataset.action;
            const target = e.target.dataset.target;
            const grid = (target === 'personal') ? personalGrid : teamGrid;
            const checkboxes = grid.querySelectorAll('.upload-card-checkbox');

            switch (action) {
                case 'select-all':
                    checkboxes.forEach(cb => cb.checked = true);
                    break;
                case 'deselect-all':
                    checkboxes.forEach(cb => cb.checked = false);
                    break;
                case 'invert-selection':
                    checkboxes.forEach(cb => cb.checked = !cb.checked);
                    break;
            }
        };

        const handleSearch = () => {
            const query = searchInput.value.toLowerCase();
            const filterGrid = (grid) => {
                grid.querySelectorAll('.upload-card').forEach(card => {
                    const title = card.querySelector('.shared-card-title').textContent.toLowerCase();
                    card.style.display = title.includes(query) ? '' : 'none';
                });
            };
            filterGrid(personalGrid);
            filterGrid(teamGrid);
        };

        const closeModal = () => {
            uploadOverlay.style.opacity = '0';
            uploadModal.style.transform = 'scale(0.8)';
            setTimeout(() => {
                uploadOverlay.style.display = 'none';
            }, 300);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', closeModal);
            closeBtn.removeEventListener('click', closeModal);
            previewBtn.removeEventListener('click', handlePreview);
            searchInput.removeEventListener('input', handleSearch);
            controlButtons.forEach(btn => btn.removeEventListener('click', handleControlClick));
        };

        const handlePreview = () => {
            const url = avatarInput.value.trim();
            if (url) {
                previewImage.src = url;
                previewImage.style.display = 'block';
                previewImage.onerror = () => {
                    previewImage.style.display = 'none';
                    showErrorModal('图片URL无效或无法加载。');
                };
            }
        };

        const handleConfirm = () => {
            const uploaderName = nameInput.value.trim();
            const uploaderPin = pinInput.value.trim();

            if (!uploaderName || !uploaderPin) {
                showErrorModal('名字和识别码都是必填的。');
                return;
            }
            if (!/^[a-zA-Z0-9]+$/.test(uploaderPin)) {
                showErrorModal('识别码只能包含英文字母和数字。');
                return;
            }

            let uploaderAvatar = avatarInput.value.trim();
            const defaultAvatar = 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png';
            if (!uploaderAvatar) uploaderAvatar = defaultAvatar;

            localStorage.setItem('uploaderName', uploaderName);
            localStorage.setItem('uploaderPin', uploaderPin);
            localStorage.setItem('uploaderAvatar', uploaderAvatar);

            const selectedPersonalEvents = {};
            personalGrid.querySelectorAll('.upload-card-checkbox:checked').forEach(cb => {
                const title = cb.dataset.title;
                selectedPersonalEvents[title] = window.mission[title];
            });

            const selectedTeamEvents = {};
            teamGrid.querySelectorAll('.upload-card-checkbox:checked').forEach(cb => {
                const title = cb.dataset.title;
                selectedTeamEvents[title] = window.hardmission[title];
            });

            if (Object.keys(selectedPersonalEvents).length === 0 && Object.keys(selectedTeamEvents).length === 0) {
                showErrorModal('你没有选择任何事件进行上传。');
                return;
            }

            const library = {
                personalEvents: selectedPersonalEvents,
                teamEvents: selectedTeamEvents,
                uploaderName: uploaderName,
                uploaderPin: uploaderPin,
                uploaderAvatar: uploaderAvatar
            };

            ws.send(JSON.stringify({ type: 'upload_event_library', library: library }));
            closeModal();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        previewBtn.addEventListener('click', handlePreview);
        searchInput.addEventListener('input', handleSearch);
        controlButtons.forEach(btn => btn.addEventListener('click', handleControlClick));
    }

    function triggerManagement() {
        const managementOverlay = document.getElementById('sharedEventsManagementOverlay');
        const managementModal = document.getElementById('sharedEventsManagementModal');
        const authView = document.getElementById('managementAuthView');
        const editView = document.getElementById('managementEditView');
        const nameInput = document.getElementById('managementNameInput');
        const pinInput = document.getElementById('managementPinInput');
        const authBtn = document.getElementById('managementAuthBtn');
        const cancelBtn = document.getElementById('cancelManagementBtn');
        const closeBtn = document.getElementById('closeManagementModalBtn');
        const closeEditBtn = document.getElementById('closeManagementEditBtn');

        // Reset view
        authView.style.display = 'block';
        editView.style.display = 'none';
        
        // Auto-fill name and PIN from localStorage
        const cachedName = localStorage.getItem('uploaderName') || '';
        nameInput.value = cachedName;
        if (cachedName) {
            pinInput.value = localStorage.getItem('uploaderPin') || '';
        } else {
            pinInput.value = '';
        }

        managementOverlay.style.display = 'flex';
        setTimeout(() => {
            managementOverlay.style.opacity = '1';
            managementModal.style.transform = 'scale(1)';
        }, 10);

        const closeModal = () => {
            managementOverlay.style.opacity = '0';
            managementModal.style.transform = 'scale(0.8)';
            setTimeout(() => {
                managementOverlay.style.display = 'none';
            }, 300);
        };

        const handleAuth = () => {
            const uploaderName = nameInput.value.trim();
            const uploaderPin = pinInput.value.trim();
            if (!uploaderName || !uploaderPin) {
                alert('请输入名字和识别码。');
                return;
            }
            // Send authentication request to server
            ws.send(JSON.stringify({
                type: 'authenticate_sharer',
                uploaderName,
                uploaderPin
            }));
        };

        authBtn.addEventListener('click', handleAuth);
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        closeEditBtn.addEventListener('click', closeModal);
    }

    function triggerHelp() {
        const helpOverlay = document.getElementById('sharedEventsHelpOverlay');
        const helpModal = document.getElementById('sharedEventsHelpModal');
        const closeBtn = document.getElementById('closeHelpModalBtn');

        helpOverlay.style.display = 'flex';
        setTimeout(() => {
            helpOverlay.style.opacity = '1';
            helpModal.style.transform = 'scale(1)';
        }, 10);

        const closeModal = () => {
            helpOverlay.style.opacity = '0';
            helpModal.style.transform = 'scale(0.8)';
            setTimeout(() => {
                helpOverlay.style.display = 'none';
            }, 300);
        };

        closeBtn.onclick = closeModal;
    }

    function showManagementEditView(library) {
        const authView = document.getElementById('managementAuthView');
        const editView = document.getElementById('managementEditView');
        const grid = document.getElementById('managementEventsGrid');
        const tabs = document.querySelectorAll('#managementTabs .shared-events-tab-btn');
        const searchInput = document.getElementById('managementSearchInput');
        
        authView.style.display = 'none';
        editView.style.display = 'block';
        searchInput.value = '';

        const uploaderName = document.getElementById('managementNameInput').value.trim();
        const uploaderPin = document.getElementById('managementPinInput').value.trim();

        const renderGrid = (type) => {
            grid.innerHTML = '';
            const eventsToRender = (type === 'personal') ? library.personalEvents : library.teamEvents;

            if (!eventsToRender || Object.keys(eventsToRender).length === 0) {
                grid.innerHTML = `<p class="shared-events-empty">该分类下你还没有分享任何事件。</p>`;
                return;
            }

            for (const title in eventsToRender) {
                const event = eventsToRender[title];
                const card = document.createElement('div');
                card.className = 'shared-event-card';

                const defaultAvatar = 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png';
                const uploaderInfo = `
                    <div class="shared-card-uploader">
                        <img src="${library.uploaderAvatar || defaultAvatar}" alt="${library.uploaderName}" class="uploader-avatar" onerror="this.src='${defaultAvatar}'">
                        <span class="uploader-name">${library.uploaderName}</span>
                    </div>
                `;

                let placeholdersHtml = '';
                if (event.placeholders && Object.keys(event.placeholders).length > 0) {
                    placeholdersHtml += '<ul class="shared-card-placeholders">';
                    for (const placeholder in event.placeholders) {
                        placeholdersHtml += `<li><strong>[${placeholder}]</strong>: ${event.placeholders[placeholder].join(', ')}</li>`;
                    }
                    placeholdersHtml += '</ul>';
                }

                card.innerHTML = `
                    <div class="shared-card-header">
                        ${uploaderInfo}
                        <h4 class="shared-card-title">${title}</h4>
                    </div>
                    <p class="shared-card-content">${event.内容}</p>
                    ${placeholdersHtml}
                    <div class="shared-card-footer">
                        <button class="shared-card-btn reject-btn delete-event-btn" data-title="${title}" data-type="${type}">删除</button>
                    </div>
                `;
                grid.appendChild(card);
            }

            grid.querySelectorAll('.delete-event-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click event from firing
                    const cardElement = e.target.closest('.shared-event-card');
                    const titleToDelete = e.target.dataset.title;
                    const typeToDelete = e.target.dataset.type;
                    if (confirm(`确定要删除事件 "${titleToDelete}" 吗？`)) {
                        ws.send(JSON.stringify({
                            type: 'delete_shared_event',
                            uploaderName,
                            uploaderPin,
                            eventTitle: titleToDelete,
                            eventType: typeToDelete
                        }));
                        // Optimistically remove from UI
                        cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
                        cardElement.style.opacity = '0';
                        cardElement.style.transform = 'scale(0.95)';
                        setTimeout(() => cardElement.remove(), 300);
                    }
                });
            });
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderGrid(tab.dataset.type);
            });
        });

        // Initial render
        renderGrid('personal');

        const handleSearch = () => {
            const query = searchInput.value.toLowerCase();
            grid.querySelectorAll('.shared-event-card').forEach(card => {
                const title = card.querySelector('.shared-card-title').textContent.toLowerCase();
                card.style.display = title.includes(query) ? '' : 'none';
            });
        };

        searchInput.addEventListener('input', handleSearch);
    }

    window.sharedEvents = {
        init,
        handleMessage,
        renderUserView
    };
})();
