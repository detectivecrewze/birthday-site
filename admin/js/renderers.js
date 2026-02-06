// Birthday Admin Wizard - Renderers Module
// Premium UI Engine ported from Valentine Admin

const renderers = {

    // Helper to get value from state
    getStateValue(category, field, defaultValue = '') {
        if (state.configData[category] && state.configData[category][field] !== undefined) {
            return state.configData[category][field];
        }
        return defaultValue;
    },

    // Helper to fix local asset paths for admin (since admin is in /admin/ folder)
    fixPath(url) {
        if (!url) return '';
        if (typeof url !== 'string' || url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
        if (url.startsWith('assets/')) {
            return '../' + url;
        }
        return url;
    },

    // Create preview button for mobile
    createPreviewButton(pageIndex = null) {
        const action = pageIndex !== null
            ? `app.showPreview(); app.sendMessageToPreview({type: 'NAVIGATE_TO_PAGE', pageIndex: ${pageIndex}});`
            : `app.showPreview();`;

        return `
            <button type="button" 
                    onclick="${action}"
                    class="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm transition-all shadow-sm border border-emerald-200"
                    title="Preview">
                <span class="material-symbols-outlined text-lg">visibility</span>
                <span class="hidden sm:inline">Preview</span>
            </button>
        `;
    },

    // UI Component: Collapsible Item
    renderCollapsible(idx, title, desc, bodyHtml, onRemove) {
        return `
            <div class="dynamic-item group animate-in" data-index="${idx}">
                <div class="item-header flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors" 
                     onclick="this.closest('.dynamic-item').classList.toggle('is-collapsed')">
                    <div class="item-drag-handle text-gray-300 group-hover:text-indigo-400 transition-colors">
                        <span class="material-symbols-outlined text-xl">drag_indicator</span>
                    </div>
                    <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                        ${idx + 1}
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">${title || 'New Item'}</div>
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">${desc || 'Click to edit details'}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" class="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                            onclick="event.stopPropagation(); if(confirm(t('confirm_delete'))) { ${onRemove} }">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                        <div class="p-2 text-gray-300">
                             <span class="material-symbols-outlined expand-icon transition-transform duration-300">expand_more</span>
                        </div>
                    </div>
                </div>
                <div class="item-body p-6 border-t border-gray-100 bg-white/30 backdrop-blur-sm">
                    ${bodyHtml}
                </div>
            </div>
        `;
    },

    // ========================================
    // STEP 1: SETUP
    // ========================================
    // ========================================
    // STEP 1: SETUP
    // ========================================
    renderSetupStep() {
        const theme = state.configData.theme;

        return `
            <div class="section-header animate-in">
                <div class="section-icon">
                    <span class="material-symbols-outlined">palette</span>
                </div>
                <div class="flex-1">
                    <h2 class="text-3xl font-bold text-gray-900 tracking-tight">${t('welcome_step1_title')}</h2>
                    <p class="text-sm text-gray-400 mt-1 font-medium">${t('welcome_step1_desc')}</p>
                </div>
                ${this.createPreviewButton(0)}
            </div>

            <div class="space-y-8 animate-in" style="animation-delay: 0.1s">
                <!-- Import Data -->
                <div class="field-group-card bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100/50">
                    <div class="field-group-title !text-indigo-600">
                        <span class="material-symbols-outlined text-sm">cloud_sync</span>
                        Quick Import
                    </div>
                    <div class="flex flex-col md:flex-row gap-5 items-center">
                        <div class="flex-1 w-full">
                            <label class="premium-label !text-indigo-400">Import from Live Link</label>
                            <div class="flex gap-3">
                                <input type="text" id="importUrlInput" class="premium-input-field flex-1 !bg-white/80" 
                                    placeholder="Enter Site ID or Link (e.g. aldoramadhan)">
                                <button onclick="state.importFromLink(document.getElementById('importUrlInput').value)" 
                                    class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-indigo-200 active:scale-95">
                                    Pull Config
                                </button>
                            </div>
                        </div>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-3 italic flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[12px]">info</span>
                        Enter your published ID to resume or edit an existing configuration.
                    </p>
                </div>

                <!-- Identity Section -->
                <div class="field-group-card !bg-white">
                    <div class="field-group-title">
                        <span class="material-symbols-outlined text-sm">badge</span>
                        Identity & Personalization
                    </div>
                    <div>
                        <label class="premium-label">Recipient Name (Customer)</label>
                        <input type="text" class="premium-input-field" 
                            placeholder="e.g. Sarah Miller" 
                            value="${state.configData.metadata?.customerName || ''}"
                            oninput="state.updateField('metadata', 'customerName', this.value)">
                        <p class="text-[10px] text-gray-400 mt-2 italic">This will be used for your unique shareable link.</p>
                    </div>
                </div>

                <!-- Theme Colors -->
                <div class="field-group-card !bg-white">
                    <div class="field-group-title">
                        <span class="material-symbols-outlined text-sm">color_lens</span>
                        Brand Esthetics
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        ${THEME_FIELDS.filter(f => f.type === 'color').map(field => `
                            <div>
                                <label class="premium-label">${field.label}</label>
                                <div class="flex gap-3">
                                    <div class="relative group">
                                        <input type="color" class="w-14 h-12 rounded-2xl border-2 border-gray-100 p-1.5 cursor-pointer bg-white transition-all group-hover:border-emerald-200" 
                                            value="${theme[field.key]}" 
                                            oninput="state.updateField('theme', '${field.key}', this.value); this.nextElementSibling.value = this.value">
                                    </div>
                                    <input type="text" class="premium-input flex-1 !font-mono text-sm" value="${theme[field.key]}"
                                        oninput="state.updateField('theme', '${field.key}', this.value); this.previousElementSibling.firstElementChild.value = this.value">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>


                <!-- Presets -->
                <div class="field-group-card bg-gray-50/50">
                    <div class="field-group-title">
                        <span class="material-symbols-outlined text-sm">auto_awesome</span>
                        Artistic Presets
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                        ${THEME_PRESETS.map(preset => `
                            <button onclick="app.applyPreset('${preset.colors[0]}', '${preset.colors[1]}', '${preset.colors[2]}', '${preset.colors[3]}')" 
                                class="group flex flex-col items-center gap-3 p-3 rounded-2xl hover:bg-white transition-all hover:shadow-xl active:scale-95">
                                <div class="w-full aspect-square rounded-2xl shadow-sm border-4 border-white overflow-hidden ring-1 ring-black/5" 
                                    style="background: linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[2]} 100%)">
                                </div>
                                <span class="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">${preset.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================
    // STEP 2: PAGES MANAGER
    // ========================================
    renderPagesManagerStep() {
        const pages = state.configData.pages;

        return `
            <div class="animate-in">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div class="section-icon bg-indigo-50 text-indigo-600">
                            <span class="material-symbols-outlined">auto_stories</span>
                        </div>
                        <h1 class="section-title">Story Builder</h1>
                        <p class="text-sm text-gray-400 mt-2">Design the sequence of your birthday experience.</p>
                    </div>
                    <button onclick="app.openPagePicker()" class="nav-btn nav-btn-primary !rounded-2xl shadow-xl hover:shadow-emerald-200 transition-all">
                        <span class="material-symbols-outlined">add_circle</span>
                        <span>Add New Page</span>
                    </button>
                </div>

                <div class="space-y-4" id="pageList" ondragover="app.handleDragOver(event)" ondragend="app.handleDragEnd(event)">
                    ${pages.length === 0 ? `
                        <div class="p-16 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 mb-8 animate-in">
                            <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <span class="material-symbols-outlined text-gray-200 font-light text-4xl">edit_square</span>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-2">Blank Canvas</h3>
                            <p class="text-sm text-gray-400 max-w-xs mx-auto mb-8">Click the button above to start adding chapters to this celebration.</p>
                        </div>
                    ` : pages.map((page, idx) => {
            const typeInfo = PAGE_TYPES[page.type] || { icon: 'help', name: 'Unknown' };
            return `
                        <div class="page-manager-item group hover:border-indigo-200 transition-all ${page.hidden ? 'opacity-40 grayscale blur-[1px]' : ''}" 
                             draggable="true" 
                             ondragstart="app.handleDragStart(event, ${idx})"
                             onclick="app.goToStep(${idx + 2})">
                            <div class="flex items-center gap-5 w-full">
                                <div class="page-drag-handle text-gray-200 group-hover:text-indigo-400 transition-colors shrink-0">
                                    <span class="material-symbols-outlined text-2xl">drag_indicator</span>
                                </div>
                                <div class="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shrink-0">
                                    <span class="material-symbols-outlined">${typeInfo.icon}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">${typeInfo.name}</div>
                                    <div class="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mt-0.5">Chapter ${idx + 1}</div>
                                </div>
                                <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                                    <button class="p-2.5 hover:bg-gray-100 rounded-xl text-gray-300 hover:text-indigo-600 transition-colors" 
                                        onclick="app.togglePageVisibility(${idx})" title="Toggle Visibility">
                                        <span class="material-symbols-outlined text-xl">${page.hidden ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                    <button class="p-2.5 hover:bg-gray-100 rounded-xl text-gray-300 hover:text-rose-500 transition-colors"
                                        onclick="app.removePage(${idx})" title="Delete Page">
                                        <span class="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
                </div>
                
                ${pages.length > 0 ? `
                    <div class="mt-8 p-4 bg-gray-50 rounded-2xl flex items-center justify-center gap-3">
                        <span class="material-symbols-outlined text-gray-300 text-sm">info</span>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tip: Drag and drop items to reorder the story</p>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ========================================
    // PAGE EDITOR DISPATCHER
    // ========================================
    renderPageEditor(pageIndex) {
        const page = state.configData.pages[pageIndex];
        if (!page) return '<p>Page not found</p>';

        // Dispatch to specialized renderers for a WOW experience
        switch (page.type) {
            case 'memory-box': return this.renderMemoryBoxEditor(page, pageIndex);
            case 'inside-box': return this.renderInsideBoxEditor(page, pageIndex);
            case 'lifetime-receipt': return this.renderReceiptEditor(page, pageIndex);
            case 'birthday-newspaper': return this.renderNewspaperEditor(page, pageIndex);
            case 'polaroid-stack': return this.renderPolaroidEditor(page, pageIndex);
            case 'traveler-map': return this.renderMapEditor(page, pageIndex);
            case 'scratch-card': return this.renderScratchEditor(page, pageIndex);
            case 'analog-voice-note': return this.renderVoiceEditor(page, pageIndex);
            case 'time-capsule-stitch': return this.renderCapsuleEditor(page, pageIndex);
            case 'message': return this.renderMessageEditor(page, pageIndex);
            default:
                const typeInfo = PAGE_TYPES[page.type] || { icon: 'help', name: 'Unknown' };
                return `
                    <div class="section-header animate-in">
                        <div class="section-icon"><span class="material-symbols-outlined">${typeInfo.icon}</span></div>
                        <div class="flex-1">
                            <h2 class="section-title">${typeInfo.name}</h2>
                            <p class="text-sm text-gray-400 mt-1">${typeInfo.description || 'Customize your page'}</p>
                        </div>
                        ${this.createPreviewButton(pageIndex)}
                    </div>
                    <div class="space-y-6 animate-in">
                        ${typeInfo.fields.map(field => this.renderField(field, page, pageIndex)).join('')}
                    </div>
                `;
        }
    },

    // 1. Inside Box (Letter)
    renderInsideBoxEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('drafts', 'Inside the Box', 'The heartfelt letter waiting inside the gift.', pageIndex)}
                <div class="space-y-6">
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">edit_note</span> Content</div>
                        <div class="grid gap-6">
                            ${this.renderField({ key: 'greeting', label: 'Greeting Header', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'letterTitle', label: 'Big Heading (use <span> for accent)', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'letterBody', label: 'Main Letter Body', type: 'textarea' }, page, pageIndex)}
                            ${this.renderField({ key: 'letterSign', label: 'Signature', type: 'text' }, page, pageIndex)}
                        </div>
                    </div>
                    <div class="field-group-card bg-indigo-50/5 border-indigo-100">
                        <div class="field-group-title text-indigo-600"><span class="material-symbols-outlined text-xs">music_note</span> Atmosphere</div>
                        ${this.renderField({ key: 'musicTrack', label: 'Background Music', type: 'file' }, page, pageIndex)}
                    </div>
                </div>
            </div>
        `;
    },

    // 2. Receipt Editor
    renderReceiptEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('receipt_long', 'Lifetime Receipt', 'A creative summary of time spent together.', pageIndex)}
                <div class="space-y-6">
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">calendar_today</span> Core Info</div>
                        <div class="grid md:grid-cols-2 gap-6">
                            ${this.renderField({ key: 'birthDate', label: 'Their Birth Date', type: 'date' }, page, pageIndex)}
                            ${this.renderField({ key: 'title', label: 'Receipt Header', type: 'text' }, page, pageIndex)}
                        </div>
                    </div>
                    <div class="field-group-card bg-indigo-50/5 border-indigo-100">
                        <div class="field-group-title text-indigo-600"><span class="material-symbols-outlined text-xs">edit</span> Custom Labels</div>
                        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${this.renderField({ key: 'labelYears', label: 'Years Label', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'labelMonths', label: 'Months Label', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'labelDays', label: 'Days Label', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'labelHours', label: 'Hours Label', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'labelMinutes', label: 'Minutes Label', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'labelSeconds', label: 'Seconds Label', type: 'text' }, page, pageIndex)}
                        </div>
                    </div>
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">branding_watermark</span> Footer & Transitions</div>
                        <div class="grid md:grid-cols-2 gap-6">
                            ${this.renderField({ key: 'footerText', label: 'Small footer message', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'buttonText', label: 'Continue Button', type: 'text' }, page, pageIndex)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // 3. Newspaper Editor
    renderNewspaperEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('newspaper', 'Birthday Newspaper', 'A vintage layout for big news!', pageIndex)}
                <div class="space-y-6">
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">newspaper</span> Header Details</div>
                        <div class="grid md:grid-cols-2 gap-6">
                            ${this.renderField({ key: 'title', label: 'Paper Name', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'date', label: 'Issue Date', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'edition', label: 'Edition Label', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'price', label: 'Price Tag', type: 'text' }, page, pageIndex)}
                        </div>
                    </div>
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">article</span> Lead Story</div>
                        ${this.renderField({ key: 'mainHeadline', label: 'Main Headline', type: 'text' }, page, pageIndex)}
                        <div class="mt-6">${this.renderField({ key: 'mainPhoto', label: 'Front Page Image', type: 'file' }, page, pageIndex)}</div>
                    </div>
                    <div class="field-group-card bg-emerald-50/5">
                         <div class="field-group-title"><span class="material-symbols-outlined text-xs">list</span> Side Articles</div>
                         ${this.renderField({ key: 'articles', label: 'Manage Stories', type: 'list', itemType: 'article' }, page, pageIndex)}
                    </div>
                </div>
            </div>
        `;
    },

    // 4. Polaroid Editor
    renderPolaroidEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('photo_library', 'Polaroid Collection', 'A scrolling stack of your favorite memories.', pageIndex)}
                <div class="field-group-card">
                    <div class="field-group-title"><span class="material-symbols-outlined text-xs">collections</span> Memory Gallery</div>
                    ${this.renderField({ key: 'photos', label: 'Manage Photos', type: 'list', itemType: 'photo' }, page, pageIndex)}
                </div>
            </div>
        `;
    },

    // 5. Map Editor
    renderMapEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('map', 'Traveler Map', 'Pin your important locations on a global map.', pageIndex)}
                <div class="field-group-card">
                    <div class="field-group-title"><span class="material-symbols-outlined text-xs">pin_drop</span> Memory Pins</div>
                    ${this.renderField({ key: 'pins', label: 'Manage Locations', type: 'list', itemType: 'pin' }, page, pageIndex)}
                </div>

                <div class="field-group-card">
                    <div class="field-group-title"><span class="material-symbols-outlined text-xs">settings</span> Controls</div>
                    ${this.renderField({ key: 'buttonText', label: 'Continue Button Text', type: 'text' }, page, pageIndex)}
                </div>
            </div>
        `;
    },

    // 6. Scratch Card
    renderScratchEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('auto_fix_high', 'Scratch & Reveal', 'A fun game to reveal a hidden photo.', pageIndex)}
                <div class="space-y-6">
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">celebration</span> The Surprise</div>
                        <div class="grid md:grid-cols-2 gap-6 mb-6">
                            ${this.renderField({ key: 'title', label: 'Headline', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'subtitle', label: 'Instruction Subtitle', type: 'text' }, page, pageIndex)}
                        </div>
                        ${this.renderField({ key: 'mainPhoto', label: 'Hidden Photo', type: 'file' }, page, pageIndex)}
                    </div>
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">settings</span> Mechanics</div>
                        <div class="grid md:grid-cols-2 gap-6">
                            ${this.renderField({ key: 'overlayColor', label: 'Coating Color', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'brushSize', label: 'Scratch Thickness', type: 'number' }, page, pageIndex)}
                        </div>
                        <div class="mt-6">
                            ${this.renderField({ key: 'finishMessage', label: 'Reveal Message', type: 'text' }, page, pageIndex)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // 7. Voice Note
    renderVoiceEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('settings_voice', 'Voice Cassette', 'An analog player for your voice recordings.', pageIndex)}
                <div class="field-group-card">
                    <div class="field-group-title"><span class="material-symbols-outlined text-xs">mic</span> Audio Source</div>
                    ${this.renderField({ key: 'audioUrl', label: 'Voice Recording File', type: 'file' }, page, pageIndex)}
                    <div class="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                        <span class="material-symbols-outlined text-indigo-400">info</span>
                        <p class="text-xs text-indigo-900/60 leading-relaxed">Recorded audio will play as if it's from a vintage cassette tape player.</p>
                    </div>
                </div>
            </div>
        `;
    },

    // 8. Capsule Editor
    renderCapsuleEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('inventory_2', 'Time Capsule', 'A wax-sealed message for the future.', pageIndex)}
                <div class="field-group-card">
                    <div class="field-group-title"><span class="material-symbols-outlined text-xs">history_edu</span> Wax Seal</div>
                    ${this.renderField({ key: 'inisial', label: 'Inisial Stamp (1 Letter)', type: 'text' }, page, pageIndex)}
                </div>
            </div>
        `;
    },

    // 9. Simple Message
    renderMessageEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('chat_bubble', 'Simple Message', 'A clean page for a quick note.', pageIndex)}
                <div class="field-group-card">
                    ${this.renderField({ key: 'title', label: 'Message Heading', type: 'text' }, page, pageIndex)}
                    ${this.renderField({ key: 'content', label: 'Body Text', type: 'textarea' }, page, pageIndex)}
                </div>
            </div>
        `;
    },

    // Helper: Shared Page Header
    renderPageHeader(icon, title, desc, pageIndex) {
        return `
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <div class="section-icon">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <h1 class="section-title">${title}</h1>
                    <p class="text-sm text-gray-400 mt-2">${desc}</p>
                </div>
                <div class="flex gap-2">
                    ${this.createPreviewButton(pageIndex)}
                </div>
            </div>
        `;
    },

    // Premium Specialized Editor for Memory Box
    renderMemoryBoxEditor(page, pageIndex) {
        return `
            <div class="animate-in">
                ${this.renderPageHeader('package_2', 'Memory Box', 'The starting point of the journey. A locked gift waiting for the right answer.', pageIndex)}
                <div class="space-y-6">
                    <div class="field-group-card">
                        <div class="field-group-title"><span class="material-symbols-outlined text-xs">face</span> Identity & Vibe</div>
                        <div class="grid md:grid-cols-2 gap-6">
                            ${this.renderField({ key: 'boxTarget', label: "Who is the recipient?", type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'birthdayDate', label: 'Big Event Date', type: 'datetime' }, page, pageIndex)}
                        </div>
                        <div class="mt-4">${this.renderField({ key: 'countdownEnabled', label: 'Enable Countdown?', type: 'boolean' }, page, pageIndex)}</div>
                    </div>
                    <div class="field-group-card border-amber-100 bg-amber-50/5">
                        <div class="field-group-title text-amber-600"><span class="material-symbols-outlined text-xs">encrypted</span> Security Lockdown</div>
                        <div class="space-y-6">
                            ${this.renderField({ key: 'question', label: 'The Secret Question', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'correctAnswer', label: 'Correct Answer (Strict Lowercase)', type: 'text' }, page, pageIndex)}
                            ${this.renderField({ key: 'placeholder', label: 'Box Input Hint', type: 'text' }, page, pageIndex)}
                        </div>
                        <div class="mt-6 p-4 bg-amber-100/50 rounded-2xl border border-amber-200 flex gap-4 items-start">
                             <span class="material-symbols-outlined text-amber-600">lightbulb</span>
                             <div class="text-[11px] text-amber-900/60 leading-relaxed">
                                <strong class="text-amber-700 block mb-0.5">Efficiency Tip:</strong>
                                Use a question that only they know. The answer must be entered exactly as defined.
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderField(field, data, pageIndex) {
        const value = data[field.key];
        const uniqueId = `p${pageIndex}_${field.key}`;

        let inputHtml = '';

        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" class="premium-input-field" value="${utils.escapeHtml(value || '')}" 
                                placeholder="${field.label}..." oninput="app.updateFieldValue(${pageIndex}, '${field.key}', this.value, true)">`;
                break;
            case 'textarea':
                inputHtml = `<textarea class="premium-input-field min-h-[100px]" placeholder="${field.label}..." 
                                oninput="app.updateFieldValue(${pageIndex}, '${field.key}', this.value, true)">${value || ''}</textarea>`;
                break;
            case 'number':
                inputHtml = `<input type="number" class="premium-input-field" value="${value || 0}" 
                                oninput="app.updateFieldValue(${pageIndex}, '${field.key}', parseFloat(this.value), true)">`;
                break;
            case 'boolean':
                inputHtml = `
                    <label class="toggle-switch-premium">
                        <input type="checkbox" class="hidden" ${value ? 'checked' : ''} onchange="app.updateFieldValue(${pageIndex}, '${field.key}', this.checked, false)">
                        <div class="toggle-slider-track">
                            <div class="toggle-slider-thumb"></div>
                        </div>
                        <span class="text-xs font-bold text-slate-700 uppercase tracking-wide px-1">${field.label}</span>
                    </label>
                `;
                break;
            case 'datetime':
                const dtValue = value ? value.split('.')[0] : '';
                inputHtml = `<input type="datetime-local" class="premium-input-field" value="${dtValue}" 
                                oninput="app.updateFieldValue(${pageIndex}, '${field.key}', new Date(this.value).toISOString(), false)">`;
                break;
            case 'date':
                const dValue = value ? value.substring(0, 10) : '';
                inputHtml = `<input type="date" class="premium-input-field" value="${dValue}" 
                                oninput="app.updateFieldValue(${pageIndex}, '${field.key}', this.value, false)">`;
                break;
            case 'file':
                const isAudio = field.key.toLowerCase().includes('audio') || field.key.toLowerCase().includes('track') || field.key.toLowerCase().includes('sound');
                inputHtml = `
                    <div class="flex flex-col md:flex-row gap-4 items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                        <div class="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 group hover:border-indigo-300 transition-all">
                            ${value ? (isAudio ? `<span class="material-symbols-outlined text-indigo-500">audiotrack</span>` : `<img src="${this.fixPath(value)}" class="w-full h-full object-cover">`) : `<span class="material-symbols-outlined text-slate-200 text-3xl">${isAudio ? 'music_note' : 'add_photo_alternate'}</span>`}
                        </div>
                        <div class="flex-1 w-full space-y-2">
                            <input type="text" id="${uniqueId}_url" class="premium-input-field !py-2 text-[10px] font-mono bg-slate-50/50" value="${value || ''}" 
                                placeholder="Paste URL..." oninput="app.updateFieldValue(${pageIndex}, '${field.key}', this.value, true)">
                            <label class="w-full cursor-pointer bg-slate-800 text-white rounded-lg px-4 py-2 flex items-center justify-center hover:bg-slate-900 transition-all shadow-md active:scale-95">
                                <span class="material-symbols-outlined text-sm mr-2">cloud_upload</span>
                                <span class="text-[10px] font-black uppercase tracking-wider">Select File</span>
                                <input type="file" class="hidden" accept="${isAudio ? 'audio/*' : 'image/*'}" onchange="utils.handleMediaUpload(this, '${uniqueId}_url', ${pageIndex}, '${field.key}')">
                            </label>
                        </div>
                    </div>
                `;
                break;
            case 'list':
                inputHtml = this.renderListField(field, value || [], pageIndex);
                break;
        }

        if (field.type === 'boolean') {
            return `<div class="mb-4">${inputHtml}</div>`;
        }

        return `
            <div class="premium-field-container">
                <label class="premium-field-label">${field.label}</label>
                ${inputHtml}
            </div>
        `;
    },

    renderListField(field, items, pageIndex) {
        return `
            <div id="list_${pageIndex}_${field.key}" class="space-y-3">
                ${items.map((item, idx) => {
            const title = this.getListItemTitle(field.itemType, item, idx);
            const desc = this.getListItemDesc(field.itemType, item);
            const body = `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            ${this.renderListItemFields(field.itemType, item, pageIndex, field.key, idx)}
                        </div>
                    `;
            return this.renderCollapsible(idx, title, desc, body, `app.removeListItem(${pageIndex}, '${field.key}', ${idx})`);
        }).join('')}
                
                <div class="flex gap-2">
                    <button type="button" class="flex-1 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        onclick="app.addListItem(${pageIndex}, '${field.key}', '${field.itemType}')">
                        <span class="material-symbols-outlined">add_circle</span>
                        Add ${field.itemType.charAt(0).toUpperCase() + field.itemType.slice(1)}
                    </button>
                    ${field.itemType === 'photo' ? `
                        <label class="px-6 py-3 bg-emerald-50 border-2 border-dashed border-emerald-100 rounded-2xl text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer">
                            <span class="material-symbols-outlined">photo_library</span>
                            Bulk Upload
                            <input type="file" class="hidden" multiple accept="image/*" onchange="app.handleBulkUpload(this, ${pageIndex}, '${field.key}')">
                        </label>
                    ` : ''}
                </div>
            </div>
        `;
    },

    getListItemTitle(type, item, idx) {
        if (type === 'photo') return item.caption || `Photo ${idx + 1}`;
        if (type === 'pin') return item.label || `Location ${idx + 1}`;
        if (type === 'article') return item.title || `Article ${idx + 1}`;
        return `Item ${idx + 1}`;
    },

    getListItemDesc(type, item) {
        if (type === 'photo') return item.date || 'No date set';
        if (type === 'pin') return item.date || 'No date set';
        return 'Click to edit details';
    },

    renderListItemFields(type, item, pageIndex, listKey, itemIdx) {
        const idPrefix = `${pageIndex}_${listKey}_${itemIdx}`;

        if (type === 'photo') {
            return `
                <div class="col-span-full bg-slate-50/50 rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
                    <div class="flex flex-col md:flex-row gap-5 items-center">
                        <div class="w-24 h-24 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-md shrink-0 group hover:border-indigo-300 transition-all">
                            ${item.url ? `<img src="${this.fixPath(item.url)}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-200 text-4xl">add_photo_alternate</span>`}
                        </div>
                        <div class="flex-1 w-full space-y-3">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Image Source</label>
                                <input type="text" id="li_${idPrefix}_url" class="premium-input-field !py-2 text-[10px] font-mono bg-white/80" value="${item.url || ''}" 
                                    placeholder="Photo URL..." oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'url', this.value, true)">
                            </div>
                            <label class="w-full inline-flex cursor-pointer bg-slate-800 text-white rounded-xl px-4 py-2.5 flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-all shadow-lg">
                                <span class="material-symbols-outlined text-sm mr-2">upload</span>
                                <span class="text-xs font-black uppercase tracking-wider">Select Smart Photo</span>
                                <input type="file" class="hidden" accept="image/*" onchange="app.handleSmartPhotoUpload(this, ${pageIndex}, '${listKey}', ${itemIdx})">
                            </label>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Caption</label>
                            <input type="text" class="premium-input-field text-sm bg-white/80" value="${item.caption || ''}" placeholder="A short memory..."
                                oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'caption', this.value, true)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date (Optional)</label>
                            <input type="text" class="premium-input-field text-sm bg-white/80" value="${item.date || ''}" placeholder="e.g. Summer 2023"
                                oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'date', this.value, true)">
                        </div>
                    </div>
                    
                    <div class="pt-2 border-t border-slate-100">
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Back Note (Memory Secret)</label>
                        <textarea class="premium-input-field text-sm bg-white/80 min-h-[80px]" placeholder="Write a secret message or longer memory for the back of the photo..."
                            oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'backNote', this.value, true)">${item.backNote || ''}</textarea>
                    </div>
                </div>
            `;
        }

        if (type === 'pin') {
            return `
                <div class="col-span-full bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="premium-field-group mb-0">
                            <label class="premium-field-label">Place Name</label>
                            <input type="text" class="premium-input-field" value="${item.label || ''}" placeholder="e.g. Our first date"
                                oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'label', this.value, true)">
                        </div>
                        <div class="premium-field-group mb-0">
                            <label class="premium-field-label">Date</label>
                            <input type="text" class="premium-input-field" value="${item.date || ''}" placeholder="e.g. 15 Jan 2024"
                                oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'date', this.value, true)">
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="premium-field-label">Memory Photo</label>
                        <div class="flex flex-col md:flex-row gap-5 items-center bg-white p-4 rounded-xl border border-slate-200 group hover:border-indigo-300 transition-colors shadow-sm">
                            <div class="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-md shrink-0 group-hover:scale-105 transition-transform">
                                ${item.photo ? `<img src="${this.fixPath(item.photo)}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-200 text-4xl">add_location_alt</span>`}
                            </div>
                            <div class="flex-1 w-full space-y-3">
                                <input type="text" id="li_${idPrefix}_photo" class="premium-input-field !py-2 text-[10px] font-mono bg-slate-50/80" value="${item.photo || ''}" 
                                    placeholder="Photo URL (auto-filled on upload)..." oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'photo', this.value, true)">
                                <label class="w-full inline-flex cursor-pointer bg-slate-800 text-white rounded-xl px-4 py-3 flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-all shadow-lg">
                                    <span class="material-symbols-outlined text-sm mr-2">upload</span>
                                    <span class="text-xs font-black uppercase tracking-wider">Upload Smart Memory</span>
                                    <input type="file" class="hidden" accept="image/*" onchange="app.handleMapPhotoUpload(this, ${pageIndex}, ${itemIdx})">
                                </label>
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-400 italic flex items-center gap-1.5 px-1">
                            <span class="material-symbols-outlined text-[12px]">info</span>
                            Uploading a smartphone photo automatically detects location & date.
                        </p>
                    </div>

                    <div class="premium-field-group mb-0">
                        <label class="premium-field-label">Story / Note</label>
                        <textarea class="premium-input-field min-h-[80px] bg-white" placeholder="What happened here?"
                            oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'note', this.value, true)">${item.note || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100 items-end">
                        <div>
                            <label class="premium-field-label">Coordinates</label>
                            <div class="flex gap-2">
                                <div class="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-500 overflow-hidden shadow-inner">
                                     <span class="material-symbols-outlined text-[14px] mr-2 text-emerald-500">my_location</span>
                                     <span class="truncate" id="map-coords-${pageIndex}-pins-${itemIdx}">
                                        ${item.coords && item.coords.length === 2 ? item.coords[0].toFixed(6) + ', ' + item.coords[1].toFixed(6) : 'Not detected yet'}
                                     </span>
                                </div>
                                <button onclick="mapPicker.open(${pageIndex}, 'pins', ${itemIdx}, 'coords')" class="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl hover:bg-black transition-all shadow-md active:scale-95">
                                     <span class="material-symbols-outlined text-sm">map</span>
                                     <span class="text-[10px] font-bold uppercase">Picker</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (type === 'article') {
            return `
                <div class="col-span-full space-y-4">
                    <div class="premium-field-group mb-0">
                        <label class="premium-field-label">Article Title</label>
                        <input type="text" class="premium-input-field" value="${item.title || ''}" placeholder="Main headline..."
                            oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'title', this.value, true)">
                    </div>
                    <div class="premium-field-group mb-0">
                        <label class="premium-field-label">Content</label>
                        <textarea class="premium-input-field min-h-[100px]" placeholder="Article content..."
                            oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, 'content', this.value, true)">${item.content || ''}</textarea>
                    </div>
                    <div>
                        <label class="premium-field-label">Decorative Icon</label>
                        <div class="flex items-center gap-3">
                             <div class="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                <span class="material-symbols-outlined text-2xl">${item.icon || 'history'}</span>
                             </div>
                             <button onclick="app.openIconPicker(${pageIndex}, '${listKey}', ${itemIdx}, 'icon')" class="text-xs font-black uppercase text-indigo-600 h-12 px-5 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors">
                                Pick Icon...
                             </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Generic fallback for other list items
        return Object.keys(item).map(key => `
            <div class="premium-field-group mb-0">
                <label class="premium-field-label">${key}</label>
                <input type="text" class="premium-input-field" value="${item[key]}" 
                    oninput="app.updateListItem(${pageIndex}, '${listKey}', ${itemIdx}, '${key}', this.value, true)">
            </div>
        `).join('');
    },

    renderFinishStep() {
        return `
            <div class="section-header mb-8">
                <div class="section-icon bg-green-100 text-green-600">
                    <span class="material-symbols-outlined">verified</span>
                </div>
                <div class="flex-1">
                    <h2 class="text-2xl font-bold text-gray-900">Finish & Share</h2>
                    <p class="text-sm text-gray-500 mt-1">Review your work and export the final configuration</p>
                </div>
            </div>

            <div class="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div class="relative z-10 text-center">
                    <div class="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span class="material-symbols-outlined text-4xl">celebration</span>
                    </div>
                    <h3 class="text-2xl font-bold mb-2">You're All Set!</h3>
                    <p class="text-emerald-100 mb-8 max-w-sm mx-auto">Your personalized birthday experience is ready. Preview your creation below before publishing.</p>
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <button onclick="app.showPreview()" class="w-full sm:w-auto bg-emerald-800/30 backdrop-blur-md text-white border border-white/20 px-6 py-4 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                            <span class="material-symbols-outlined">smartphone</span>
                            Mobile Preview
                        </button>
                        <button onclick="app.openFullPreview()" class="w-full sm:w-auto bg-emerald-800/30 backdrop-blur-md text-white border border-white/20 px-6 py-4 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                            <span class="material-symbols-outlined">open_in_new</span>
                            Full Desktop Preview
                        </button>
                    </div>
                    <button onclick="app.finishWizard()" class="w-full sm:w-auto bg-white text-emerald-700 px-12 py-5 rounded-2xl font-black text-xl hover:bg-emerald-50 transition-all shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-3 mx-auto">
                        <span class="material-symbols-outlined text-2xl">rocket_launch</span>
                        Generate & Publish
                    </button>
                </div>
                <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                <div class="absolute -top-12 -left-12 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
            </div>

            <!-- Publish Result (Hidden by default) -->
            <div id="publishResult" class="hidden animate-fade-in-up">
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <span class="material-symbols-outlined">link</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900">Your Site is Live!</h4>
                            <p class="text-sm text-gray-500">Copy the link below or scan the QR code to share.</p>
                        </div>
                    </div>

                    <div class="flex flex-col md:flex-row gap-8 items-start">
                        <!-- Link & Actions -->
                        <div class="flex-1 w-full space-y-4">
                            <div class="relative">
                                <input type="text" id="shareableLink" readonly 
                                    class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono text-emerald-700 pr-32 focus:outline-none"
                                    value="Generating link...">
                                <button onclick="app.copyLink()" class="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2">
                                    <span class="material-symbols-outlined text-sm">content_copy</span>
                                    Copy
                                </button>
                            </div>
                            <div class="flex gap-3">
                                <a id="viewLiveBtn" href="#" target="_blank" class="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-center text-sm font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm">open_in_new</span>
                                    Visit Site
                                </a>
                                <button onclick="app.downloadQR()" class="flex-1 border-2 border-slate-100 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm">download</span>
                                    Save QR
                                </button>
                                <button onclick="app.downloadDataJS()" class="flex-1 border-2 border-slate-100 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm">javascript</span>
                                    Download data.js
                                </button>
                            </div>
                        </div>

                        <!-- QR Code -->
                        <div class="w-full md:w-32 flex flex-col items-center gap-2">
                            <div id="qrcode" class="p-2 bg-white border-2 border-slate-100 rounded-2xl shadow-sm overflow-hidden shrink-0"></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan Me</span>
                        </div>
                    </div>

                    <div class="mt-8 p-4 bg-amber-50 rounded-2xl flex gap-3 border border-amber-100">
                        <span class="material-symbols-outlined text-amber-500">info</span>
                        <p class="text-xs text-amber-800 leading-relaxed">
                            <strong>Note:</strong> It may take up to 30 seconds for your site to fully activate across all servers. If you see a "Not Found" error, just wait a few moments and refresh.
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    renderPageTypePicker() {
        const modal = document.getElementById('pagePickerModal');
        // Find the existing grid container in the modal
        const list = modal.querySelector('.page-picker-grid');

        if (list) {
            // Populate the grid with page types
            list.innerHTML = Object.keys(PAGE_TYPES).map(type => {
                const info = PAGE_TYPES[type];
                return `
                    <button onclick="app.addPage('${type}')" class="group p-6 text-left border-2 border-gray-100 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                        <div class="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-all mb-4">
                            <span class="material-symbols-outlined text-2xl">${info.icon}</span>
                        </div>
                        <div class="font-bold text-gray-900 mb-1">${info.name}</div>
                        <div class="text-xs text-gray-500 leading-relaxed">${info.description}</div>
                    </button>
                `;
            }).join('');
        }
    },

    renderIconPicker(query = '') {
        const modal = document.getElementById('iconPickerModal');
        const container = modal.querySelector('.grid') || modal.querySelector('.icon-grid');

        const filtered = query ? ICON_LIST.filter(icon => icon.includes(query.toLowerCase())) : ICON_LIST;

        const content = filtered.map(icon => `
            <button onclick="app.selectIcon('${icon}')" class="p-3 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all aspect-square flex items-center justify-center">
                <span class="material-symbols-outlined">${icon}</span>
            </button>
        `).join('');

        const modalBox = modal.querySelector('.bg-white');
        if (modalBox) {
            modalBox.innerHTML = `
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-900">Pick an Icon</h3>
                    <button onclick="app.closeIconPicker()" class="text-gray-400 hover:text-gray-900">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-4 bg-gray-50 border-b border-gray-100">
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input type="text" class="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" 
                            placeholder="Filter icons..." oninput="app.filterIcons(this.value)" value="${query}">
                    </div>
                </div>
                <div class="p-6 grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-[60vh] overflow-y-auto">
                    ${content}
                </div>
            `;
        }
    }
};

window.renderers = renderers;
