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
     * Injects the upload modal's HTML structure into the document body.
     */
    function injectUploadModalHtml() {
        if (document.getElementById('sharedEventsUploadModal')) return;
        const modalHtml = `
            <div id="sharedEventsUploadModal" class="shared-events-upload-modal">
                <h3>分享你的事件库</h3>
                <p>首次分享请设置名字和识别码，后续更新或管理需使用相同信息。</p>
                <input type="text" id="uploaderNameInput" placeholder="显示的名字（必填）">
                <input type="text" id="uploaderPinInput" placeholder="识别码（必填,仅限字母和数字）" pattern="[a-zA-Z0-9]+">
                <div class="avatar-input-group">
                    <input type="text" id="uploaderAvatarInput" placeholder="显示的头像URL（可选）">
                    <button id="previewAvatarBtn" class="shared-card-btn detail-btn">预览</button>
                </div>
                <div id="avatarPreviewContainer" class="avatar-preview-container">
                    <img id="avatarPreviewImage" src="" alt="头像预览" style="display:none;">
                </div>
                <div>
                    <p>成功分享后刷新网页即可查看</p>
                    <p>主持游戏时请慎重刷新,会导致房间解散</p>
                    <p>如有与现有分享内容完全相同的事件</p>
                    <p>将只会在共享库中显示最先被分享的一个</p>
                </div>
                <div class="upload-modal-actions">
                    <button id="confirmUploadBtn" class="shared-card-btn approve-btn">确认并上传</button>
                    <button id="cancelUploadBtn" class="shared-card-btn reject-btn">取消</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Injects the management modal's HTML structure into the document body.
     */
    function injectManagementModalHtml() {
        if (document.getElementById('sharedEventsManagementModal')) return;
        const modalHtml = `
            <div id="sharedEventsManagementModal" class="shared-events-management-modal">
                <div id="managementAuthView">
                    <h3>管理我的分享</h3>
                    <p>请输入你的名字和识别码以继续。</p>
                    <input type="text" id="managementNameInput" placeholder="你的名字">
                    <input type="text" id="managementPinInput" placeholder="你的识别码">
                    <div class="management-modal-actions">
                        <button id="managementAuthBtn" class="shared-card-btn approve-btn">验证</button>
                        <button id="cancelManagementBtn" class="shared-card-btn reject-btn">取消</button>
                    </div>
                </div>
                <div id="managementEditView" style="display:none;">
                    <h3>编辑你的分享库</h3>
                    <div class="shared-events-tabs" id="managementTabs">
                        <button class="shared-events-tab-btn active" data-type="personal">个人事件</button>
                        <button class="shared-events-tab-btn" data-type="team">团队事件</button>
                    </div>
                    <div id="managementEventsGrid" class="management-events-grid shared-events-grid"></div>
                    <div>
                        <p>刷新网页后即可查看到分享库中的内容变动</p>
                        <p>主持游戏时请慎重刷新,会导致房间解散</p>
                    </div>
                    <div class="management-modal-actions">
                        <button id="closeManagementEditBtn" class="shared-card-btn reject-btn">关闭</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Injects the conflict modal's HTML structure into the document body.
     */
    function injectConflictModalHtml() {
        if (document.getElementById('sharedEventsConflictModal')) return;
        const modalHtml = `
            <div id="sharedEventsConflictModal" class="shared-events-conflict-modal">
                <h3 class="conflict-modal-title">事件内容冲突</h3>
                <p class="conflict-modal-subtitle">事件 "<span id="conflictEventTitle"></span>" 在您的本地库中已存在，但内容不同。</p>
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
                <div class="conflict-modal-actions">
                    <button id="overwriteEventBtn" class="shared-card-btn approve-btn">覆盖本地版本</button>
                    <button id="renameEventBtn" class="shared-card-btn detail-btn">重命名后添加</button>
                    <button id="cancelConflictBtn" class="shared-card-btn reject-btn">取消</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
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
                alert(data.message || '上传/更新成功！');
                requestSharedLibraries(); // Refresh the view
                break;
            case 'pin_mismatch':
                alert('识别码错误！请检查你的识别码，或者如果想创建新的分享，请使用一个全新的名字。');
                break;
            case 'authentication_success':
                showManagementEditView(data.library);
                break;
            case 'authentication_failure':
                alert('验证失败，请检查你的名字和识别码。');
                break;
            case 'event_deleted_success':
                alert('事件删除成功！');
                // Optionally refresh the management view
                break;
             case 'event_added_success':
                alert('事件添加成功！');
                // Optionally refresh the management view
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
            <div class="shared-events-tabs">
                <button class="shared-events-tab-btn active" data-type="personal">个人事件</button>
                <button class="shared-events-tab-btn" data-type="team">团队事件</button>
            </div>
            <div class="shared-events-grid-controls">
                <select id="uploaderFilter" class="shared-events-filter">${filterOptions}</select>
                <div id="statusFilterContainer" class="shared-events-status-filter">
                    <label><input type="checkbox" name="statusFilter" value="not-added" checked> 未添加</label>
                    <label><input type="checkbox" name="statusFilter" value="added" checked> 已添加</label>
                    <label><input type="checkbox" name="statusFilter" value="conflict" checked> 有冲突</label>
                </div>
                <button id="uploadLibraryBtn" class="shared-events-action-btn">分享我的事件库</button>
                <button id="manageLibraryBtn" class="shared-events-action-btn">管理我的分享</button>
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
        statusFilters.forEach(filter => filter.addEventListener('change', updateView));
        document.getElementById('uploadLibraryBtn').addEventListener('click', triggerUpload);
        document.getElementById('manageLibraryBtn').addEventListener('click', triggerManagement);

        updateView();
    }

    /**
     * Renders event cards into the grid.
     * @param {string} type - 'personal' or 'team'.
     * @param {string} uploaderFilter - The selected uploader name.
     * @param {string[]} statusFilters - Array of statuses to display.
     */
    function renderEventCards(type, uploaderFilter = 'all', statusFilters = ['not-added', 'added', 'conflict']) {
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
                    <button class="shared-card-btn add-btn">${status === 'conflict' ? '有冲突' : (status === 'added' ? '已添加' : '添加')}</button>
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

        document.getElementById('conflictEventTitle').textContent = originalTitle;
        document.getElementById('localEventDetails').innerHTML = formatEventDetailsForDisplay(localEvent);
        document.getElementById('sharedEventDetails').innerHTML = formatEventDetailsForDisplay(sharedEvent);

        conflictModal.classList.add('visible');
        if (settingsOverlay) {
            settingsOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            settingsOverlay.style.zIndex = 1001;
        }

        const overwriteBtn = document.getElementById('overwriteEventBtn');
        const renameBtn = document.getElementById('renameEventBtn');
        const cancelBtn = document.getElementById('cancelConflictBtn');

        const stopClickPropagation = (e) => e.stopPropagation();

        const closeModal = () => {
            conflictModal.classList.remove('visible');
            if (settingsOverlay) {
                settingsOverlay.style.backgroundColor = "";
                settingsOverlay.style.zIndex = "";
            }
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
        settingsOverlay.addEventListener('click', stopClickPropagation, true);
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
        const uploadModal = document.getElementById('sharedEventsUploadModal');
        const nameInput = document.getElementById('uploaderNameInput');
        const pinInput = document.getElementById('uploaderPinInput');
        const avatarInput = document.getElementById('uploaderAvatarInput');
        const confirmBtn = document.getElementById('confirmUploadBtn');
        const cancelBtn = document.getElementById('cancelUploadBtn');
        const previewBtn = document.getElementById('previewAvatarBtn');
        const previewImage = document.getElementById('avatarPreviewImage');

        nameInput.value = localStorage.getItem('uploaderName') || '';
        pinInput.value = localStorage.getItem('uploaderPin') || '';
        avatarInput.value = localStorage.getItem('uploaderAvatar') || '';
        previewImage.style.display = 'none';

        uploadModal.classList.add('visible');
        if (settingsOverlay) {
            settingsOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            settingsOverlay.style.zIndex = 1001;
        }

        const stopClickPropagation = (e) => e.stopPropagation();

        const closeModal = () => {
            uploadModal.classList.remove('visible');
            if (settingsOverlay) {
                settingsOverlay.style.backgroundColor = "";
                settingsOverlay.style.zIndex = "";
            }
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', closeModal);
            previewBtn.removeEventListener('click', handlePreview);
            settingsOverlay.removeEventListener('click', stopClickPropagation, true);
        };

        const handlePreview = () => {
            const url = avatarInput.value.trim();
            if (url) {
                previewImage.src = url;
                previewImage.style.display = 'block';
                previewImage.onerror = () => {
                    previewImage.style.display = 'none';
                    alert('图片URL无效或无法加载。');
                };
            }
        };

        const handleConfirm = () => {
            const uploaderName = nameInput.value.trim();
            const uploaderPin = pinInput.value.trim();

            if (!uploaderName || !uploaderPin) {
                alert('名字和识别码都是必填的。');
                return;
            }
            if (!/^[a-zA-Z0-9]+$/.test(uploaderPin)) {
                alert('识别码只能包含英文字母和数字。');
                return;
            }

            let uploaderAvatar = avatarInput.value.trim();
            const defaultAvatar = 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png';
            if (!uploaderAvatar) uploaderAvatar = defaultAvatar;

            localStorage.setItem('uploaderName', uploaderName);
            localStorage.setItem('uploaderPin', uploaderPin);
            localStorage.setItem('uploaderAvatar', uploaderAvatar);

            const library = {
                personalEvents: window.mission || {},
                teamEvents: window.hardmission || {},
                uploaderName: uploaderName,
                uploaderPin: uploaderPin,
                uploaderAvatar: uploaderAvatar
            };

            if (Object.keys(library.personalEvents).length === 0 && Object.keys(library.teamEvents).length === 0) {
                alert('您的本地事件库是空的，无法上传。');
                return;
            }

            ws.send(JSON.stringify({ type: 'upload_event_library', library: library }));
            closeModal();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', closeModal);
        previewBtn.addEventListener('click', handlePreview);
        settingsOverlay.addEventListener('click', stopClickPropagation, true);
    }

    function triggerManagement() {
        const authView = document.getElementById('managementAuthView');
        const editView = document.getElementById('managementEditView');
        const nameInput = document.getElementById('managementNameInput');
        const pinInput = document.getElementById('managementPinInput');
        const authBtn = document.getElementById('managementAuthBtn');
        const cancelBtn = document.getElementById('cancelManagementBtn');
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

        managementModal.classList.add('visible');
        if (settingsOverlay) {
            settingsOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            settingsOverlay.style.zIndex = 1001;
        }

        const stopClickPropagation = (e) => e.stopPropagation();

        const closeModal = () => {
            managementModal.classList.remove('visible');
            if (settingsOverlay) {
                settingsOverlay.style.backgroundColor = "";
                settingsOverlay.style.zIndex = "";
            }
            authBtn.removeEventListener('click', handleAuth);
            cancelBtn.removeEventListener('click', closeModal);
            closeEditBtn.removeEventListener('click', closeModal);
            settingsOverlay.removeEventListener('click', stopClickPropagation, true);
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
        closeEditBtn.addEventListener('click', closeModal);
        settingsOverlay.addEventListener('click', stopClickPropagation, true);
    }

    function showManagementEditView(library) {
        const authView = document.getElementById('managementAuthView');
        const editView = document.getElementById('managementEditView');
        const grid = document.getElementById('managementEventsGrid');
        const tabs = document.querySelectorAll('#managementTabs .shared-events-tab-btn');
        
        authView.style.display = 'none';
        editView.style.display = 'block';

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
    }

    window.sharedEvents = {
        init,
        handleMessage,
        renderUserView
    };
})();
