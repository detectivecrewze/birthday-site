// Birthday Admin State Management Module
// Handles all data persistence and state operations

const state = {
    // Current wizard step index
    currentStep: 0,

    // The main configuration data - SINGLE SOURCE OF TRUTH
    configData: {
        theme: {
            ribbonColor: "#b33939",
            paperColor: "#fdfaf1",
            paperImage: "",
            cardboardColor: "#c2a382",
            textColor: "#2d2926"
        },
        pages: [],
        adminLang: 'en',
        metadata: {
            brandName: 'Birthday Admin',
            brandIcon: 'cake'
        }
    },

    // UI & Sync State
    syncTimer: null,
    statusTimer: null,

    // Initialize state
    init() {
        console.log('[State] Initializing...');
        this.loadFromStorage();

        // Ensure metadata structure exists
        if (!this.configData.metadata) this.configData.metadata = {};
        if (this.configData.metadata.customerName === undefined) this.configData.metadata.customerName = "";
        if (this.configData.metadata.senderName === undefined) this.configData.metadata.senderName = "";

        console.log('[State] Initialized with', this.configData.pages.length, 'pages');

        // Migration: Ensure Music Player is at index 1 by default (after Memory Box)
        this.runReorderMigration();
    },

    // One-time migration to fix page order for existing users
    runReorderMigration() {
        const pages = this.configData.pages;
        if (pages.length < 2) return;

        // Find music player index
        const musicIdx = pages.findIndex(p => p.type === 'music-player');

        // If it exists but is NOT at index 1, and index 0 is memory-box, move it
        if (musicIdx !== -1 && musicIdx !== 1 && pages[0].type === 'memory-box') {
            const hasMovedBefore = localStorage.getItem('migration_music_order_v1');
            if (!hasMovedBefore) {
                console.log('[State] Migration: Moving music-player to index 1');
                const [player] = pages.splice(musicIdx, 1);
                pages.splice(1, 0, player);
                this.save();
                localStorage.setItem('migration_music_order_v1', 'true');
            }
        }
    },

    // Load data from localStorage or existing CONFIG
    loadFromStorage() {
        // Priority 1: Check LocalStorage for recent work
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Handle different save formats (Valentine vs Birthday)
                const config = parsed.config || parsed;
                const pages = parsed.pages || config.pages || [];

                this.configData = { ...this.configData, ...config };
                this.configData.pages = pages;

                if (config.currentStep !== undefined) {
                    this.currentStep = config.currentStep;
                }

                console.log('[State] Loaded from localStorage');
                return true;
            } catch (e) {
                console.error('[State] Failed to parse localStorage:', e);
            }
        }

        // Priority 2: Use existing data.js CONFIG
        if (typeof CONFIG !== 'undefined') {
            this.configData = JSON.parse(JSON.stringify(CONFIG));
            this.save(); // Persist initial data to localStorage
            console.log('[State] Loaded from data.js');
            return true;
        }

        // Priority 3: Use defaults if everything else fails
        if (typeof DEFAULT_CONFIG !== 'undefined') {
            this.configData = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            console.log('[State] Using DEFAULT_CONFIG');
        }

        return false;
    },

    // Save to localStorage with status indicator
    save() {
        try {
            const dataToSave = {
                config: this.getConfig(),
                pages: this.configData.pages
            };
            localStorage.setItem(LS_KEY, JSON.stringify(dataToSave));

            // Show auto-save status
            const statusEl = document.getElementById('saveStatus');
            const statusText = document.getElementById('saveStatusText');
            if (statusEl && statusText) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                statusText.textContent = `${t('status_autosaved')} ${timeStr}`;
                statusEl.classList.remove('opacity-0');
                statusEl.classList.remove('opacity-50');

                if (this.statusTimer) clearTimeout(this.statusTimer);
                this.statusTimer = setTimeout(() => {
                    statusEl.classList.add('opacity-50');
                }, 3000);
            }

            this.syncToPreview();
            console.log('[State] Saved to localStorage');
            return true;
        } catch (e) {
            console.error('[State] Save failed:', e);
            return false;
        }
    },

    // Get clean config for preview/export
    getConfig() {
        return {
            ...this.configData,
            metadata: {
                ...this.configData.metadata,
                generatedAt: new Date().toISOString()
            }
        };
    },

    // Sync configuration to preview iframe
    syncToPreview(targetPageIndex = undefined) {
        if (this.syncTimer) clearTimeout(this.syncTimer);

        // If a specific page is requested, remember it for the next sync
        if (typeof targetPageIndex === 'number') {
            this.pendingTargetPageIndex = targetPageIndex;
        }

        this.syncTimer = setTimeout(() => {
            const config = this.getConfig();
            const message = {
                type: 'REINIT_CONFIG', // Birthday engine uses REINIT_CONFIG
                config: config
            };

            // Use pending page index if available, otherwise use the passed argument
            if (typeof this.pendingTargetPageIndex === 'number') {
                message.targetPageIndex = this.pendingTargetPageIndex;
                this.pendingTargetPageIndex = undefined; // Clear after use
            } else if (typeof targetPageIndex === 'number') {
                message.targetPageIndex = targetPageIndex;
            }

            console.log('[State] Syncing to preview...', message);

            const iframes = [
                document.getElementById('previewIframe'),
                document.getElementById('previewModalIframe')
            ];

            iframes.forEach(iframe => {
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(message, '*');
                }
            });
        }, 300);
    },

    // Alias for syncToPreview to handle older calls
    syncPreview(targetPageIndex = undefined) {
        this.syncToPreview(targetPageIndex);
    },

    // Update field in specific category
    updateField(category, field, value) {
        if (!this.configData[category]) this.configData[category] = {};
        this.configData[category][field] = value;
        this.save();
    },

    // Update page specifically (for dynamic lists)
    updatePageField(index, key, value) {
        if (this.configData.pages[index]) {
            this.configData.pages[index][key] = value;
            this.save();
        }
    },

    addPage(type) {
        if (!PAGE_TYPES[type]) return;
        const defaultFields = JSON.parse(JSON.stringify(DEFAULT_PAGE_FIELDS[type] || {}));
        const newPage = { type, hidden: false, ...defaultFields };
        this.configData.pages.push(newPage);
        this.save();
        return this.configData.pages.length - 1;
    },

    removePage(index) {
        if (confirm(t('confirm_remove_page'))) {
            this.configData.pages.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    },

    reorderPages(fromIndex, toIndex) {
        const pages = [...this.configData.pages];
        const [moved] = pages.splice(fromIndex, 1);
        pages.splice(toIndex, 0, moved);
        this.configData.pages = pages;
        this.save();
    },

    duplicatePage(index) {
        const copy = JSON.parse(JSON.stringify(this.configData.pages[index]));
        this.configData.pages.splice(index + 1, 0, copy);
        this.save();
    },

    togglePageVisibility(index) {
        if (this.configData.pages[index]) {
            this.configData.pages[index].hidden = !this.configData.pages[index].hidden;
            this.save();
        }
    },

    // List item helpers
    addListItem(pageIndex, fieldKey, itemType) {
        const page = this.configData.pages[pageIndex];
        if (!page) return;
        if (!page[fieldKey]) page[fieldKey] = [];

        const templates = {
            photo: { url: "", date: "", caption: "", backNote: "" },
            pin: { coords: [0, 0], label: "", photo: "", note: "", date: "" },
            article: { title: "", content: "", icon: "history" }
        };

        page[fieldKey].push(templates[itemType] || {});
        this.save();
    },

    updateListItem(pageIndex, fieldKey, itemIndex, key, value) {
        const page = this.configData.pages[pageIndex];
        if (page && page[fieldKey] && page[fieldKey][itemIndex]) {
            page[fieldKey][itemIndex][key] = value;
            this.save();
        }
    },

    removeListItem(pageIndex, fieldKey, itemIndex) {
        const page = this.configData.pages[pageIndex];
        if (page && page[fieldKey]) {
            page[fieldKey].splice(itemIndex, 1);
            this.save();
        }
    },

    setLanguage(lang) {
        this.configData.adminLang = lang;
        this.save();
        if (window.app) {
            app.renderCurrentStep();
            app.updateHeader();
        }
    },

    // Import from published website link
    async importFromLink(input) {
        if (!input) return;

        // Extract ID from URL if necessary
        let id = input;
        if (input.includes('?to=')) {
            id = input.split('?to=')[1].split('&')[0];
        } else if (input.includes('?id=')) {
            id = input.split('?id=')[1].split('&')[0];
        } else if (input.includes('/')) {
            const parts = input.split('/');
            id = parts[parts.length - 1] || parts[parts.length - 2];
        }

        if (!id) {
            utils.showNotification('Invalid link or ID', 'error');
            return;
        }

        utils.showNotification('Importing data...', 'info');

        try {
            const response = await fetch(`https://valentine-upload.aldoramadhan16.workers.dev/get-config?id=${encodeURIComponent(id)}&_t=${Date.now()}`);

            if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

            const data = await response.json();

            if (confirm('Importing will overwrite your current unsaved progress. Continue?')) {
                // Update configData
                this.configData = { ...this.configData, ...data };
                if (data.pages) this.configData.pages = data.pages;

                // Save and Reload UI
                this.save();
                if (window.app) {
                    app.init();
                    app.renderCurrentStep();
                }

                utils.showNotification('Imported successfully!', 'success');
            }
        } catch (e) {
            console.error('[State] Import failed:', e);
            utils.showNotification('Import failed. Check the ID.', 'error');
        }
    }
};

if (typeof window !== 'undefined') {
    window.state = state;
}
