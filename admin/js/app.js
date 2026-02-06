// Birthday Admin Wizard - Main Application
// Premium UX Engine ported from Valentine Admin

const app = {
    currentStep: 0,
    wizardSteps: [],

    // Initialize application
    init() {
        console.log('[App] Initializing premium wizard...');

        // Initialize state
        state.init();

        // Calculate wizard steps
        this.recalcWizardSteps();

        // Translate the static UI
        this.translateUI();

        // Restore last step if available
        if (state.currentStep !== undefined) {
            this.currentStep = state.currentStep;
            if (this.currentStep >= this.wizardSteps.length) {
                this.currentStep = 0;
            }
        }

        // Render current step
        this.renderCurrentStep();

        // Listen for preview messages
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'PREVIEW_READY') {
                console.log('[App] Preview ready, syncing...');
                state.syncToPreview();
            }
        });

        console.log('[App] Wizard initialized with', this.wizardSteps.length, 'steps');
    },

    // Calculate wizard steps based on dynamic page list
    recalcWizardSteps() {
        this.wizardSteps = [];

        // 1. Setup (Theme & Core)
        this.wizardSteps.push({
            id: 'setup',
            name: 'Setup',
            title: t('welcome_step1_title'),
            icon: 'palette',
            previewPageIndex: 0
        });

        // 2. Page Manager
        this.wizardSteps.push({
            id: 'pages',
            name: t('welcome_step2_title'),
            title: t('pageman_title'),
            icon: 'view_carousel',
            previewPageIndex: 0
        });

        // 3. Dynamic Pages
        state.configData.pages.forEach((page, idx) => {
            if (page.hidden) return;
            const typeInfo = PAGE_TYPES[page.type] || { icon: 'help', name: 'Unknown' };
            this.wizardSteps.push({
                id: `page-${idx}`,
                name: typeInfo.name,
                title: `Edit ${typeInfo.name}`,
                icon: typeInfo.icon,
                pageIndex: idx,
                previewPageIndex: idx
            });
        });

        // 4. Finish
        this.wizardSteps.push({
            id: 'finish',
            name: 'Finish',
            title: 'Export & Share',
            icon: 'check_circle',
            previewPageIndex: state.configData.pages.length - 1
        });
    },

    // Render current step
    renderCurrentStep() {
        const step = this.wizardSteps[this.currentStep];
        if (!step) return;

        console.log('[App] Rendering step:', step.id);

        const contentDiv = document.getElementById('stepContent');
        if (!contentDiv) return;

        // Render step content based on step ID
        if (step.id === 'setup') {
            contentDiv.innerHTML = renderers.renderSetupStep();
        } else if (step.id === 'pages') {
            contentDiv.innerHTML = renderers.renderPagesManagerStep();
        } else if (step.id === 'finish') {
            contentDiv.innerHTML = renderers.renderFinishStep();
        } else {
            // Render dynamic page editor
            if (step.pageIndex !== undefined) {
                contentDiv.innerHTML = renderers.renderPageEditor(step.pageIndex);
            }
        }

        // Update UI components
        this.updateHeader();
        this.updateProgress();
        this.updateSidebar();
        this.updateNavigation();
        this.scrollPreviewToCurrentPage();

        // Sync state current step
        state.currentStep = this.currentStep;
    },

    // Update Header Components
    updateHeader() {
        const step = this.wizardSteps[this.currentStep];
        if (!step) return;

        this.translateUI();

        const stepTitle = document.getElementById('stepTitle');
        if (stepTitle) {
            stepTitle.textContent = step.title || step.name;
        }
    },

    // Translate static UI elements
    translateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = t(key);
        });
    },

    // Update progress bar
    updateProgress() {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        const percent = ((this.currentStep + 1) / this.wizardSteps.length) * 100;
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) {
            progressText.textContent = t('step_progress', { current: this.currentStep + 1, total: this.wizardSteps.length });
        }
    },

    // Update Sidebar Navigation
    updateSidebar() {
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;

        nav.innerHTML = this.wizardSteps.map((step, idx) => {
            const isActive = idx === this.currentStep;
            return `
                <div class="nav-item ${isActive ? 'active' : ''}" onclick="app.goToStep(${idx})">
                    <div class="nav-item-icon">
                        <span class="material-symbols-outlined">${step.icon}</span>
                    </div>
                    <span class="nav-item-text">${step.name}</span>
                </div>
            `;
        }).join('');
    },

    // Update navigation buttons
    updateNavigation() {
        const btnBack = document.getElementById('btnBack');
        const btnNext = document.getElementById('btnNext');
        const btnFinish = document.getElementById('btnFinish');

        if (btnBack) btnBack.disabled = this.currentStep === 0;

        const isLastStep = this.currentStep === this.wizardSteps.length - 1;

        if (btnNext) {
            if (isLastStep) {
                btnNext.classList.add('hidden');
            } else {
                btnNext.classList.remove('hidden');
                // Ensure correct onclick
                btnNext.onclick = () => this.nextStep();
            }
        }

        if (btnFinish) {
            if (isLastStep) {
                btnFinish.classList.remove('hidden');
            } else {
                btnFinish.classList.add('hidden');
            }
        }
    },

    // Navigation
    goToStep(idx) {
        if (idx < 0 || idx >= this.wizardSteps.length) return;
        this.currentStep = idx;
        this.renderCurrentStep();
        state.save();
        this.closeSidebarMobile();
    },

    nextStep() {
        if (this.currentStep < this.wizardSteps.length - 1) {
            this.goToStep(this.currentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.goToStep(this.currentStep - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    // Field Management
    updateFieldValue(pageIndex, key, value, sync = true) {
        state.updatePageField(pageIndex, key, value);
        if (sync) state.syncToPreview();
    },

    addListItem(pageIndex, listKey, itemType) {
        const defaults = DEFAULT_PAGE_FIELDS[state.configData.pages[pageIndex].type] || {};
        const emptyItem = (defaults[listKey] && defaults[listKey].length > 0)
            ? JSON.parse(JSON.stringify(defaults[listKey][0])) // Clone first item from defaults
            : (itemType === 'photo' ? { url: '', caption: '', date: '' } : {});

        // Reset values for new item
        Object.keys(emptyItem).forEach(k => {
            if (typeof emptyItem[k] === 'string') emptyItem[k] = '';
        });

        if (!state.configData.pages[pageIndex][listKey]) {
            state.configData.pages[pageIndex][listKey] = [];
        }

        state.configData.pages[pageIndex][listKey].push(emptyItem);
        this.renderCurrentStep();
        state.save();
        state.syncToPreview();
    },

    removeListItem(pageIndex, listKey, itemIndex) {
        state.configData.pages[pageIndex][listKey].splice(itemIndex, 1);
        this.renderCurrentStep();
        state.save();
        state.syncToPreview();
    },

    updateListItem(pageIndex, listKey, itemIndex, fieldKey, value, sync = true) {
        if (!state.configData.pages[pageIndex][listKey][itemIndex]) return;
        state.configData.pages[pageIndex][listKey][itemIndex][fieldKey] = value;
        if (sync) state.syncToPreview();
        state.save();
    },

    async handleBulkUpload(input, pageIndex, listKey) {
        const files = Array.from(input.files);
        if (files.length === 0) return;

        utils.showNotification(`Uploading ${files.length} photos...`);

        for (const file of files) {
            try {
                const url = await utils.handleFileUpload(file);
                if (url) {
                    if (!state.configData.pages[pageIndex][listKey]) {
                        state.configData.pages[pageIndex][listKey] = [];
                    }
                    state.configData.pages[pageIndex][listKey].push({
                        url: url,
                        caption: '',
                        date: ''
                    });
                }
            } catch (e) {
                console.error('Bulk upload error:', e);
            }
        }

        this.renderCurrentStep();
        state.save();
        state.syncToPreview();
        utils.showNotification('Upload complete!', 'success');
    },

    async handleSmartPhotoUpload(input, pageIndex, listKey, itemIdx) {
        const file = input.files[0];
        if (!file) return;

        utils.showNotification('Uploading & Analyzing...', 'info');

        try {
            // 1. Extract EXIF data (Date)
            const exif = await utils.extractExifData(file);

            // 2. Upload the file
            const url = await utils.handleFileUpload(file);
            if (!url) throw new Error('Upload failed');

            // 3. Update the photo URL
            this.updateListItem(pageIndex, listKey, itemIdx, 'url', url, false);

            // 4. If EXIF date found, update the date field
            if (exif && exif.date) {
                const dateParts = exif.date.split('-');
                let formattedDate = exif.date;
                if (dateParts.length === 3) {
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    formattedDate = `${parseInt(dateParts[2])} ${months[parseInt(dateParts[1]) - 1]} ${dateParts[0]}`;
                }
                this.updateListItem(pageIndex, listKey, itemIdx, 'date', formattedDate, false);
                utils.showNotification('✨ Date captured from photo!', 'success');
            } else {
                utils.showNotification('✅ Photo uploaded.', 'success');
            }

            // 5. Finalize
            this.renderCurrentStep();
            state.save();
            state.syncToPreview();

        } catch (error) {
            console.error('Smart photo upload failed:', error);
            utils.showNotification('Upload failed.', 'error');
        }
    },

    async handleMapPhotoUpload(input, pageIndex, itemIdx) {
        const file = input.files[0];
        if (!file) return;

        utils.showNotification('Uploading & Analyzing...', 'info');

        try {
            // 1. Extract EXIF data first (GPS & Date)
            const exif = await utils.extractExifData(file);

            // 2. Upload the file
            const url = await utils.handleFileUpload(file);
            if (!url) throw new Error('Upload failed');

            // 3. Update the photo URL
            this.updateListItem(pageIndex, 'pins', itemIdx, 'photo', url, false);

            let detected = false;

            // 4. If EXIF found, update date and coordinates
            if (exif) {
                if (exif.date) {
                    const dateParts = exif.date.split('-');
                    let formattedDate = exif.date;
                    if (dateParts.length === 3) {
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        formattedDate = `${parseInt(dateParts[2])} ${months[parseInt(dateParts[1]) - 1]} ${dateParts[0]}`;
                    }
                    this.updateListItem(pageIndex, 'pins', itemIdx, 'date', formattedDate, false);
                }

                if (exif.lat && exif.lng) {
                    this.updateListItem(pageIndex, 'pins', itemIdx, 'coords', [exif.lat, exif.lng], false);
                    detected = true;
                }
            }

            // 5. Finalize
            this.renderCurrentStep();
            state.save();
            state.syncToPreview();

            if (detected) {
                utils.showNotification('📍 Crystal Clear! Location accurately detected from photo.', 'success');
            } else {
                utils.showNotification('📷 Photo uploaded, but no GPS data found. You can set the pin manually!', 'error');
            }

        } catch (error) {
            console.error('Map photo upload failed:', error);
            utils.showNotification('Upload failed. Please check your connection.', 'error');
        }
    },

    // Preview Control
    scrollPreviewToCurrentPage() {
        const step = this.wizardSteps[this.currentStep];
        if (!step) return;

        const targetIdx = step.previewPageIndex !== undefined ? step.previewPageIndex : step.pageIndex;
        if (targetIdx !== undefined) {
            this.sendMessageToPreview({
                type: 'NAVIGATE_TO_PAGE',
                pageIndex: targetIdx
            });
        }
    },

    sendMessageToPreview(message) {
        const iframes = [
            document.getElementById('previewIframe'),
            document.getElementById('previewModalIframe')
        ];

        iframes.forEach(iframe => {
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(message, '*');
            }
        });
    },

    togglePreview() {
        document.getElementById('wizardMain').classList.toggle('preview-hidden');
        state.syncToPreview();
    },

    showPreview() {
        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('previewModalIframe');
        if (modal && iframe) {
            // Always reload to ensure fresh state and trigger init
            iframe.src = "../index.html?preview=modal&t=" + Date.now();

            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    openFullPreview() {
        state.save();
        window.open("../index.html?preview=full", "_blank");
    },

    scrollPreviewToCurrentPage() {
        const step = this.wizardSteps[this.currentStep];
        if (step && typeof step.previewPageIndex === 'number') {
            const idx = step.previewPageIndex >= 0 ? step.previewPageIndex : 0;
            state.syncToPreview(idx);
        } else {
            state.syncToPreview(0);
        }
    },

    closePreview() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    // Sidebar & Mobile Nav handlers
    toggleSidebar() {
        document.getElementById('wizardSidebar').classList.toggle('is-minimized');
    },

    openSidebarMobile() {
        const sidebar = document.getElementById('wizardSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.add('is-open');
        if (overlay) overlay.classList.remove('hidden');
    },

    closeSidebarMobile() {
        const sidebar = document.getElementById('wizardSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('is-open');
        if (overlay) overlay.classList.add('hidden');
    },

    // Theme Actions
    applyPreset(ribbon, paper, cardboard, text) {
        state.updateField('theme', 'ribbonColor', ribbon);
        state.updateField('theme', 'paperColor', paper);
        state.updateField('theme', 'cardboardColor', cardboard);
        state.updateField('theme', 'textColor', text);
        this.renderCurrentStep();
        utils.showNotification('Theme applied!');
    },

    // Page Management Actions
    openPagePicker() {
        const modal = document.getElementById('pagePickerModal');
        if (modal) {
            renderers.renderPageTypePicker();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    closePagePicker() {
        const modal = document.getElementById('pagePickerModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    addPage(type) {
        const idx = state.addPage(type);
        this.recalcWizardSteps();
        this.closePagePicker();
        // Go to the newly added page editor
        // recalcWizardSteps adds 2 static steps at start (Setup, Pages)
        this.goToStep(state.configData.pages.length + 1);
        utils.showNotification('Page added!');
    },

    removePage(index) {
        if (state.removePage(index)) {
            this.recalcWizardSteps();
            this.renderCurrentStep();
            utils.showNotification('Page removed');
        }
    },

    togglePageVisibility(index) {
        state.togglePageVisibility(index);
        this.recalcWizardSteps();
        this.renderCurrentStep();
    },

    duplicatePage(index) {
        state.duplicatePage(index);
        this.recalcWizardSteps();
        this.renderCurrentStep();
        utils.showNotification('Page duplicated');
    },

    // Drag and Drop reordering
    handleDragStart(e, index) {
        e.dataTransfer.setData('text/plain', index);
        e.target.classList.add('dragging');
    },

    handleDragOver(e) {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;

        const list = document.getElementById('pageList');
        const afterElement = this.getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
            list.appendChild(dragging);
        } else {
            list.insertBefore(dragging, afterElement);
        }
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.page-manager-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        // Save new order to state
        const items = [...document.querySelectorAll('.page-manager-item')];
        const newPages = items.map(item => {
            const oldIdx = parseInt(item.getAttribute('onclick').match(/\d+/)[0]) - 2;
            return state.configData.pages[oldIdx];
        });
        state.configData.pages = newPages;
        state.save();
        state.syncToPreview();
        this.recalcWizardSteps();
    },

    // Icon Picker
    iconPickerTarget: null,

    openIconPicker(pageIndex, listKey, itemIndex, fieldKey) {
        this.iconPickerTarget = { pageIndex, listKey, itemIndex, fieldKey };
        const modal = document.getElementById('iconPickerModal');
        if (modal) {
            renderers.renderIconPicker();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    closeIconPicker() {
        const modal = document.getElementById('iconPickerModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    filterIcons(query) {
        renderers.renderIconPicker(query);
    },

    selectIcon(icon) {
        if (this.iconPickerTarget) {
            const { pageIndex, listKey, itemIndex, fieldKey } = this.iconPickerTarget;
            this.updateListItem(pageIndex, listKey, itemIndex, fieldKey, icon, true);
            this.renderCurrentStep();
        }
        this.closeIconPicker();
    },

    // Welcome Modal
    closeWelcome() {
        document.getElementById('welcomeModal').classList.add('hidden');
        localStorage.setItem('welcome_guided', 'true');
    },

    // Finish Actions
    async finishWizard() {
        state.save();
        this.publishOnline();
    },

    async publishOnline() {
        const btn = document.querySelector('button[onclick="app.finishWizard()"]');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Syncing...';

        try {
            const config = state.getConfig();
            // Use recipient name for URL if available, otherwise generate unique ID
            const recipientName = (config.metadata?.customerName || '').trim();
            let id;
            if (recipientName) {
                // Convert name to URL-friendly format (lowercase, replace spaces with hyphens)
                id = recipientName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            } else {
                // Generate a unique ID based on timestamp + random string
                const timestamp = Date.now().toString(36);
                const randomStr = Math.random().toString(36).substring(2, 8);
                id = `${timestamp}-${randomStr}`;
            }
            const siteUrl = `https://birthday-site-wine-sigma.vercel.app/?to=${encodeURIComponent(id)}`;

            const response = await fetch('https://valentine-upload.aldoramadhan16.workers.dev/save-config?id=' + encodeURIComponent(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                utils.showNotification('✨ Site is now live!', 'success');

                // Show Result UI
                const resultDiv = document.getElementById('publishResult');
                const shareInput = document.getElementById('shareableLink');
                const viewBtn = document.getElementById('viewLiveBtn');
                const qrContainer = document.getElementById('qrcode');

                if (resultDiv) resultDiv.classList.remove('hidden');
                if (shareInput) shareInput.value = siteUrl;
                if (viewBtn) viewBtn.href = siteUrl;

                // Generate QR
                if (qrContainer && typeof QRCode !== 'undefined') {
                    qrContainer.innerHTML = '';
                    new QRCode(qrContainer, {
                        text: siteUrl,
                        width: 120,
                        height: 120,
                        colorDark: "#059669", // Emerald 600
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }

                btn.innerHTML = '<span class="material-symbols-outlined">verified</span> Ready to Share';
                btn.classList.add('!bg-emerald-100', '!text-emerald-700', 'border-emerald-200');
            } else {
                throw new Error('Upload failed');
            }
        } catch (e) {
            console.error(e);
            utils.showNotification('Failed to publish. Check your connection.', 'error');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    },

    copyLink() {
        const input = document.getElementById('shareableLink');
        if (input) {
            input.select();
            input.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(input.value);
            utils.showNotification('Link copied to clipboard!', 'success');
        }
    },

    downloadQR() {
        const qrContainer = document.getElementById('qrcode');
        if (!qrContainer) return;
        const img = qrContainer.querySelector('img');
        if (img) {
            const a = document.createElement('a');
            a.href = img.src;
            a.download = 'birthday-surprise-qr.png';
            a.click();
        }
    },

    saveProgress() {
        state.save();
        utils.showNotification('Progress saved!', 'success');
    },

    downloadDataJS() {
        try {
            const config = state.getConfig();
            const fileContent = `const CONFIG = ${JSON.stringify(config, null, 4)};`;
            const blob = new Blob([fileContent], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            utils.showNotification('data.js downloaded!', 'success');
        } catch (e) {
            console.error('Download failed:', e);
            utils.showNotification('Failed to download data.js', 'error');
        }
    }
};

if (typeof window !== 'undefined') {
    window.app = app;
}
