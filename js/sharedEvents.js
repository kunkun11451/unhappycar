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
    let detailModal, settingsOverlay;

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
        
        // Assign DOM elements
        detailModal = document.getElementById('sharedEventsDetailModal');
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
                <p>输入你的名字和头像URL</p>
                <input type="text" id="uploaderNameInput" placeholder="你的名字（必填）">
                <div class="avatar-input-group">
                    <input type="text" id="uploaderAvatarInput" placeholder="你的头像URL（可选）">
                    <button id="previewAvatarBtn" class="shared-card-btn detail-btn">预览</button>
                </div>
                <div id="avatarPreviewContainer" class="avatar-preview-container">
                    <img id="avatarPreviewImage" src="" alt="头像预览" style="display:none;">
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
                alert(data.message || '上传成功，等待审核！');
                break;
        }
    }

    /**
     * Renders the main view for regular users into a given container.
     * @param {HTMLElement} container - The element to render the content into.
     */
    function renderUserView(container) {
        // First, get all unique uploader names
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
                <button id="uploadLibraryBtn" class="shared-events-action-btn">分享我的事件库</button>
            </div>
            <div id="sharedEventsGrid" class="shared-events-grid"></div>
        `;
        
        const tabs = container.querySelectorAll('.shared-events-tab-btn');
        const filter = document.getElementById('uploaderFilter');

        const updateView = () => {
            const activeTab = container.querySelector('.shared-events-tab-btn.active').dataset.type;
            const selectedUploader = filter.value;
            renderEventCards(activeTab, selectedUploader);
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                updateView();
            });
        });

        filter.addEventListener('change', updateView);
        document.getElementById('uploadLibraryBtn').addEventListener('click', triggerUpload);

        // Render initial cards
        renderEventCards('personal', 'all');
    }

    /**
     * Renders event cards into the grid.
     * @param {string} type - 'personal' or 'team'.
     */
    function renderEventCards(type, uploaderFilter = 'all') {
        const grid = document.getElementById('sharedEventsGrid');
        grid.innerHTML = '';
        let events = (type === 'personal') ? sharedPersonalEvents : sharedTeamEvents;
        const localEvents = (type === 'personal') ? window.mission : window.hardmission;

        // Apply the uploader filter
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

            const isAdded = !!localEvents[title];
            if (isAdded) {
                card.classList.add('added');
            }

            const uploaderInfo = event.uploaderName ? `
                <div class="shared-card-uploader">
                    <img src="${event.uploaderAvatar || 'SVG/default-avatar.svg'}" alt="${event.uploaderName}" class="uploader-avatar">
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
                    <h4 class="shared-card-title">${title}</h4>
                </div>
                ${uploaderInfo}
                <p class="shared-card-content">${event.内容}</p>
                ${placeholdersHtml}
                <div class="shared-card-footer">
                    <button class="shared-card-btn add-btn">${isAdded ? '已添加' : '添加'}</button>
                </div>
            `;
            grid.appendChild(card);
        }

        // Attach listeners to new cards
        grid.querySelectorAll('.add-btn').forEach(btn => btn.addEventListener('click', addSingleEvent));
    }

    /**
     * Adds a single event to the user's local storage.
     * @param {Event} e - The click event.
     */
    function addSingleEvent(e) {
        const card = e.target.closest('.shared-event-card');
        const success = addEventToLocal(card.dataset.type, card.dataset.title);
        if (success) {
            // Visually update the card immediately
            card.classList.add('added');
            card.querySelector('.add-btn').textContent = '已添加';
            const checkbox = card.querySelector('.shared-card-checkbox');
            if (checkbox) {
                checkbox.checked = false; // Uncheck if it was checked
                checkbox.disabled = true;
            }
        }
    }

    /**
     * Helper function to add an event to the local library.
     * @param {string} type - 'personal' or 'team'.
     * @param {string} title - The title of the event.
     * @param {boolean} silent - If true, suppresses the success alert.
     */
    function addEventToLocal(type, title, silent = false) {
        const localEvents = (type === 'personal') ? window.mission : window.hardmission;
        const sharedEvents = (type === 'personal') ? sharedPersonalEvents : sharedTeamEvents;

        if (localEvents[title]) {
            // Silently fail if the event already exists
            return false; // Indicate failure
        }

        localEvents[title] = sharedEvents[title];
        window.eventManagement.saveEventsToStorage();
        
        // Refresh the main app's event list if it's visible
        if (window.eventManagement && typeof window.eventManagement.refreshEventManagement === 'function') {
            window.eventManagement.refreshEventManagement();
        }
        
        return true; // Indicate success
    }

    /**
     * Triggers the file input for uploading an event library.
     */
    function triggerUpload() {
        const uploadModal = document.getElementById('sharedEventsUploadModal');
        const nameInput = document.getElementById('uploaderNameInput');
        const avatarInput = document.getElementById('uploaderAvatarInput');
        const confirmBtn = document.getElementById('confirmUploadBtn');
        const cancelBtn = document.getElementById('cancelUploadBtn');
        const previewBtn = document.getElementById('previewAvatarBtn');
        const previewImage = document.getElementById('avatarPreviewImage');

        // Pre-fill inputs from localStorage
        nameInput.value = localStorage.getItem('uploaderName') || '';
        avatarInput.value = localStorage.getItem('uploaderAvatar') || '';
        previewImage.style.display = 'none'; // Hide preview initially

        // Show the modal and overlay
        uploadModal.classList.add('visible');
        if (settingsOverlay) {
            settingsOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            settingsOverlay.style.zIndex = 1001;
        }

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
            if (!uploaderName) {
                alert('名字是必填的。');
                return;
            }
            const uploaderAvatar = avatarInput.value.trim();

            localStorage.setItem('uploaderName', uploaderName);
            if (uploaderAvatar) {
                localStorage.setItem('uploaderAvatar', uploaderAvatar);
            }

            const library = {
                personalEvents: window.mission || {},
                teamEvents: window.hardmission || {},
                uploaderName: uploaderName,
                uploaderAvatar: uploaderAvatar
            };

            if (Object.keys(library.personalEvents).length === 0 && Object.keys(library.teamEvents).length === 0) {
                alert('您的本地事件库是空的，无法上传。');
                return;
            }

            ws.send(JSON.stringify({ type: 'upload_event_library', library: library }));
            closeModal();
        };

        const closeModal = () => {
            uploadModal.classList.remove('visible');
            if (settingsOverlay) {
                settingsOverlay.style.backgroundColor = "";
                settingsOverlay.style.zIndex = "";
            }
            // Clean up listeners
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', closeModal);
            previewBtn.removeEventListener('click', handlePreview);
            settingsOverlay.removeEventListener('click', closeModal);
        };

        // Attach listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', closeModal);
        previewBtn.addEventListener('click', handlePreview);
        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) {
                closeModal();
            }
        });
    }

    /**
     * Shows the modal.
     */
    // Expose public functions to the global window object
    window.sharedEvents = {
        init,
        handleMessage,
        renderUserView // Expose this to be called by settings.js
    };
})();
