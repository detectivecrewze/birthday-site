window.app = {
    currentPage: 0,
    timerInterval: null,
    isMuted: false,
    bgMusic: null,
    voiceNoteTrack: null,
    activeTypewriters: [],
    activeAnimations: [],
    activeIntervals: [],
    isTransitioning: false,
    transitionDuration: 300, // ms for page transitions (0.3s each phase = 0.6s total)

    init: function () {
        this.updatePreloader(30);

        const isPublishedSite = document.documentElement.getAttribute('data-published-site') === 'true';

        // If it's a published site, we MUST wait for window.CONFIG to be populated by the fetch in index.html
        if (isPublishedSite && !window.CONFIG) {
            console.log("[App] Published site detected, waiting for remote config...");
            setTimeout(() => this.init(), 100);
            return;
        }

        // Check for CONFIG from data.js or window.CONFIG from admin/remote fetch
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        console.log('[App] Initializing with config source:', isPublishedSite ? 'Remote Database' : (window.CONFIG ? 'window.CONFIG' : 'data.js'));

        if (!config || !config.pages) {
            console.log("📄 CONFIG not loaded yet, retrying init...");
            setTimeout(() => this.init(), 100);
            return;
        }
        // Ensure window.CONFIG is set
        window.CONFIG = config;

        // Find the first non-hidden page
        let firstPage = 0;
        while (firstPage < window.CONFIG.pages.length && window.CONFIG.pages[firstPage].hidden) {
            firstPage++;
        }
        this.currentPage = firstPage < window.CONFIG.pages.length ? firstPage : 0;

        this.applyTheme();
        this.updatePreloader(60);

        // Only create buttons if they don't exist
        if (!document.getElementById('nav-buttons-container')) {
            this.createNavigationButtons();
        }

        this.updatePreloader(90);
        this.renderPage();

        // Finalize and hide preloader
        setTimeout(() => {
            this.updatePreloader(100);
            this.hidePreloader();
        }, 800);
    },

    liveUpdate: function (newConfig) {
        console.log("🔄 App: Live Update Triggered");
        console.log("Current page:", this.currentPage);
        console.log("New config pages count:", newConfig.pages.length);

        // Show the actual data for the current page
        const currentPageData = newConfig.pages[this.currentPage];
        console.log("New page data:", JSON.stringify(currentPageData, null, 2));

        // Clear any pending animations
        this.clearAllTypewriters();
        this.clearAllAnimations();
        this.clearAllIntervals();

        // Hide preloader if still showing
        this.hidePreloader();

        // Update global CONFIG
        window.CONFIG = newConfig;

        // Log the current page data after update
        console.log("Updated page data:", window.CONFIG.pages[this.currentPage]);

        // Re-apply theme
        this.applyTheme();

        // Ensure nav buttons exist
        if (!document.getElementById('nav-buttons-container')) {
            this.createNavigationButtons();
        }

        // Re-render current page
        console.log("Re-rendering page...");
        this.renderPage();
        console.log("Render complete");
    },

    updatePreloader: function (percent) {
        const bar = document.getElementById('preloader-bar');
        if (bar) bar.style.width = percent + '%';
    },

    hidePreloader: function () {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            // Force hide immediately with no transition
            preloader.style.cssText = 'opacity: 0 !important; pointer-events: none !important; visibility: hidden !important;';
            // Also set display none after a short delay to remove from DOM flow
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 100);
        }
    },

    applyTheme: function () {
        const root = document.documentElement;
        if ((!window.CONFIG && typeof CONFIG === 'undefined') || !window.CONFIG?.theme) return;
        const theme = window.CONFIG.theme;

        // Apply colors from CONFIG to CSS Variables
        if (theme.ribbonColor) root.style.setProperty('--primary-accent', theme.ribbonColor);
        if (theme.paperColor) {
            root.style.setProperty('--paper-bg', theme.paperColor);
            document.body.style.backgroundColor = theme.paperColor;
        }
        if (theme.paperImage) {
            // Override EVERYTHING with the custom image
            root.style.setProperty('--paper-texture', `url('${theme.paperImage}')`);

            // Soft Override: If a custom image is set, we hide the default "pinstripe" and "grain"
            // by setting them to 'none' to avoid clashing overlays.
            root.style.setProperty('--tissue-texture', 'none');
            root.style.setProperty('--grain', 'none');

            document.body.style.backgroundImage = `url('${theme.paperImage}')`;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundRepeat = "no-repeat";
            document.body.style.backgroundAttachment = "fixed";
        }

        if (theme.cardboardColor) root.style.setProperty('--secondary-accent', theme.cardboardColor);
        if (theme.textColor) root.style.setProperty('--text-main', theme.textColor);

        // Update Preloader bg to match theme
        const preloader = document.getElementById('preloader');
        if (preloader && theme.paperColor) {
            preloader.style.backgroundColor = theme.paperColor;
        }
    },

    createNavigationButtons: function () {
        const navContainer = document.createElement('div');
        navContainer.id = 'nav-buttons-container';
        navContainer.className = 'fixed top-6 right-6 z-50 flex gap-3';

        // Music Toggle button
        const musicBtn = document.createElement('button');
        musicBtn.id = 'music-toggle-btn';
        musicBtn.className = 'nav-btn w-12 h-12 rounded-full bg-paper-bg/80 backdrop-blur-sm border border-vintage-ink/20 shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300';
        musicBtn.innerHTML = '<span class="material-symbols-outlined text-vintage-ink">volume_up</span>';
        musicBtn.onclick = () => this.toggleMusic();
        musicBtn.title = 'Mute/Unmute Music';

        // Screenshot button
        const screenshotBtn = document.createElement('button');
        screenshotBtn.className = 'nav-btn w-12 h-12 rounded-full bg-paper-bg/80 backdrop-blur-sm border border-vintage-ink/20 shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300';
        screenshotBtn.innerHTML = '<span class="material-symbols-outlined text-vintage-ink">photo_camera</span>';
        screenshotBtn.onclick = () => this.takeScreenshot();
        screenshotBtn.title = 'Take Screenshot';

        navContainer.appendChild(musicBtn);
        navContainer.appendChild(screenshotBtn);
        document.body.appendChild(navContainer);
    },

    prevPage: function () {
        if (this.currentPage > 0) {
            this.navigateWithTransition(this.currentPage - 1);
        }
    },

    nextPage: function () {
        if (this.currentPage < window.CONFIG.pages.length - 1) {
            this.navigateWithTransition(this.currentPage + 1);
        }
    },

    goToPage: function (index) {
        if (typeof index === 'number' && index >= 0 && index < window.CONFIG.pages.length) {
            // Skip transition if already on this page
            if (this.currentPage === index && !this.isTransitioning) {
                return;
            }

            // Prevent multiple transitions at once
            if (this.isTransitioning) {
                console.log('[App] Transition in progress, ignoring request');
                return;
            }

            this.navigateWithTransition(index);
        }
    },

    navigateWithTransition: function (targetIndex) {
        this.isTransitioning = true;
        const container = document.getElementById('page-content');

        // Play transition sound
        this.playSfx('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', 0.15);

        // Phase 1: Fade out current page with a dramatic effect
        if (container) {
            container.style.transition = `all ${this.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            container.style.opacity = '0';
            container.style.transform = 'scale(0.95) translateY(20px)';
            container.style.filter = 'blur(4px)';
        }

        // Phase 2: Wait for fade out + pause, then change page and fade in
        setTimeout(() => {
            this.currentPage = targetIndex;
            this.renderPage();

            // Scroll to top immediately
            window.scrollTo({ top: 0, behavior: 'instant' });

            // Prepare for fade in - start from hidden state
            if (container) {
                container.style.opacity = '0';
                container.style.transform = 'scale(1.05) translateY(-20px)';
                container.style.filter = 'blur(4px)';
            }

            // Phase 3: Fade in with dramatic effect (after 0.3s pause)
            setTimeout(() => {
                if (container) {
                    container.style.opacity = '1';
                    container.style.transform = 'scale(1) translateY(0)';
                    container.style.filter = 'blur(0px)';
                }

                // Clear transitioning flag after animation completes
                setTimeout(() => {
                    this.isTransitioning = false;
                    if (container) {
                        container.style.transition = '';
                        container.style.transform = '';
                        container.style.filter = '';
                    }
                }, this.transitionDuration);
            }, 300); // 0.3s pause between fade out and fade in
        }, this.transitionDuration);
    },

    takeScreenshot: function () {
        // Hide the navigation buttons before taking screenshot
        const navButtons = document.getElementById('nav-buttons-container');
        if (navButtons) navButtons.style.display = 'none';

        // Show loading indicator
        const screenshotBtn = document.querySelector('.nav-btn:nth-child(3)'); // Pointing to camera button
        const originalHTML = screenshotBtn ? screenshotBtn.innerHTML : '';
        if (screenshotBtn) {
            screenshotBtn.innerHTML = '<span class="material-symbols-outlined text-vintage-ink animate-spin" style="font-size: 20px;">refresh</span>';
        }

        // 1. Prepare for capture: Force stable state
        const originalOverflow = document.body.style.overflow;
        const originalHeight = document.body.style.height;

        // Scroll to top to ensure clean capture start
        window.scrollTo(0, 0);

        // Get actual content dimensions - carefully calculate to avoid mobile cropping
        const contentWidth = Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
            window.innerWidth
        );
        const contentHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            window.innerHeight
        );

        // Capture settings refined for mobile/PC universal rendering
        html2canvas(document.body, {
            backgroundColor: '#fdfaf1', // Force solid paper background
            scale: window.devicePixelRatio > 1 ? 2 : 3, // High quality scale
            scrollX: 0,
            scrollY: 0,
            width: contentWidth,
            height: contentHeight,
            windowWidth: contentWidth,
            windowHeight: contentHeight,
            imageTimeout: 15000,
            logging: true,
            allowTaint: false,
            proxy: null,
            useCORS: true,
            ignoreElements: (element) =>
                element.id === 'nav-buttons-container' ||
                element.tagName === 'BUTTON' ||
                element.classList.contains('tc-letter-popup') ||
                element.id === 'tc-letter-popup' ||
                element.classList.contains('cinematic-overlay'),
            onclone: (clonedDoc) => {
                const clonedBody = clonedDoc.body;

                // --- STABILIZE CLONE ---
                clonedBody.style.width = contentWidth + 'px';
                clonedBody.style.height = contentHeight + 'px';
                clonedBody.style.overflow = 'visible';
                clonedBody.style.opacity = '1';
                clonedBody.style.backgroundColor = '#fdfaf1';
                clonedBody.style.backgroundImage = 'url("assets/textures/natural-paper.png")'; // Force direct URL

                // Force specific background layer (dynamic-bg) to be absolute and full height
                const bgLayer = clonedDoc.getElementById('dynamic-bg');
                const originalBg = document.getElementById('dynamic-bg');

                if (bgLayer && originalBg) {
                    bgLayer.style.position = 'absolute';
                    bgLayer.style.inset = '0';
                    bgLayer.style.width = '100%';
                    bgLayer.style.height = '100%';
                    bgLayer.style.zIndex = '-1';
                    bgLayer.style.opacity = '1';
                    bgLayer.style.background = window.getComputedStyle(originalBg).background;
                }

                // --- MANUALLY FORCE TEXTURE INJECTION ---
                // html2canvas struggles with CSS variables and offsets. We force every element.
                clonedDoc.querySelectorAll('.tc-memory-box, .cardboard-box, .tc-box-flap').forEach(el => {
                    el.style.backgroundImage = 'url("assets/textures/cardboard-flat.png")';
                    el.style.backgroundColor = '#d4b483';
                    el.style.backgroundRepeat = 'repeat';
                });

                clonedDoc.querySelectorAll('.tc-envelope, .paper-note, .premium-letter').forEach(el => {
                    el.style.backgroundImage = 'url("assets/textures/natural-paper.png")';
                    el.style.backgroundColor = '#ffffff';
                    el.style.backgroundRepeat = 'repeat';
                });

                clonedDoc.querySelectorAll('.sticker-label').forEach(el => {
                    el.style.backgroundImage = 'linear-gradient(transparent 27px, rgba(173, 216, 230, 0.3) 28px), url("assets/textures/natural-paper.png")';
                });

                // Force font icons
                clonedDoc.querySelectorAll('.material-symbols-outlined').forEach(el => {
                    el.style.fontFamily = "'Material Symbols Outlined'";
                    el.style.opacity = '1';
                    el.style.visibility = 'visible';
                    el.style.display = 'inline-block';
                });

                // Flatten animations and force opacity
                clonedDoc.querySelectorAll('*').forEach(el => {
                    el.style.transition = 'none';
                    el.style.animation = 'none';

                    const isOverlay = el.classList.contains('tc-letter-popup') ||
                        el.classList.contains('cinematic-overlay') ||
                        el.id === 'tc-letter-popup';

                    if (window.getComputedStyle(el).opacity === '0' &&
                        !el.classList.contains('hidden') &&
                        !isOverlay) {
                        el.style.opacity = '1';
                    }
                });

                // Page 1: Ribbon and Box Fixes
                clonedDoc.querySelectorAll('.ribbon-texture').forEach(el => {
                    el.style.backgroundColor = '#b33939';
                    el.style.opacity = '1';
                    el.style.zIndex = '5';
                });

                clonedDoc.querySelectorAll('.paper-note').forEach(el => {
                    el.style.zIndex = '10'; // Note always on top
                    el.style.position = 'relative';
                });

                // Ensure typewriter text is visible even if mid-animation
                const typewriterTexts = clonedDoc.querySelectorAll('[id^="typewriter-"]');
                typewriterTexts.forEach(el => {
                    el.style.opacity = '1';
                    el.style.visibility = 'visible';
                });

                // Page 2: Inside Box / Letter
                const insideBoxBg = clonedDoc.querySelector('.inside-box-container');
                if (insideBoxBg) {
                    insideBoxBg.style.position = 'absolute';
                    insideBoxBg.style.top = '0';
                    insideBoxBg.style.left = '0';
                    insideBoxBg.style.width = contentWidth + 'px';
                    insideBoxBg.style.height = contentHeight + 'px';
                    insideBoxBg.style.opacity = '1';
                    insideBoxBg.style.zIndex = '0';

                    const silk = insideBoxBg.querySelector('.silk-tissue');
                    if (silk) {
                        silk.style.position = 'absolute';
                        silk.style.top = '-50px';
                        silk.style.left = '-50px';
                        silk.style.width = (contentWidth + 100) + 'px';
                        silk.style.height = (contentHeight + 100) + 'px';
                        silk.style.clipPath = 'none'; // Removing clip-path in capture ensures 0 gaps
                        silk.style.transform = 'none'; // Flatten to ensure it fills the space perfectly
                    }
                }

                const premiumLetter = clonedDoc.querySelector('.premium-letter');
                if (premiumLetter) {
                    premiumLetter.style.transform = 'none'; // removing 3D tilt for clarity
                    premiumLetter.style.opacity = '1';
                    premiumLetter.style.backgroundColor = '#fcfaf5';
                    premiumLetter.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
                    // Hide the decorative floating shadow div
                    const shadow = clonedDoc.querySelector('div[class*="bg-black/40 blur-3xl"]');
                    if (shadow) shadow.style.display = 'none';
                    // Hide confetti
                    const confetti = clonedDoc.getElementById('confetti-container');
                    if (confetti) confetti.style.display = 'none';
                }

                // Page 3: Lifetime Receipt / Printer
                const receiptWrapper = clonedDoc.getElementById('receipt-paper-wrapper');
                if (receiptWrapper) {
                    receiptWrapper.style.transform = 'none';
                    receiptWrapper.style.opacity = '1';
                    receiptWrapper.style.marginTop = '0';
                    receiptWrapper.style.boxShadow = 'none'; // Avoid layered double shadows
                }
                const printerBody = clonedDoc.getElementById('printer-body');
                if (printerBody) {
                    printerBody.style.opacity = '1';
                    printerBody.style.transform = 'none';
                    printerBody.style.background = 'linear-gradient(145deg, #e5e1d8, #d1ccc0)'; // Force metal/plastic feel
                    printerBody.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)'; // Robust shadow for 3D feel
                    printerBody.style.borderRadius = '24px 24px 8px 8px';
                }
                const printerSlot = clonedDoc.querySelector('.printer-slot-inner');
                if (printerSlot) {
                    printerSlot.style.background = '#1a1a1a'; // Deep slot feel
                    printerSlot.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.5)';
                }
                const receiptFooter = clonedDoc.getElementById('receipt-footer');
                const totalSection = clonedDoc.getElementById('total-section');
                const barcodeSection = clonedDoc.getElementById('barcode-section');
                if (receiptFooter) receiptFooter.style.opacity = '1';
                if (totalSection) totalSection.style.opacity = '1';
                if (barcodeSection) barcodeSection.style.opacity = '1';

                // Page 4: Newspaper (Note: Indexing might vary, usually Page 4-5)
                const newspaper = clonedDoc.querySelector('.newspaper-paper');
                if (newspaper) {
                    newspaper.style.opacity = '1';
                    newspaper.style.transform = 'none';
                    newspaper.style.height = 'auto';
                    newspaper.style.overflow = 'visible';
                    newspaper.style.boxShadow = '0 15px 35px rgba(0,0,0,0.15)';
                }
                clonedDoc.querySelectorAll('.rotate-1, .rotate-2, .rotate-3, .-rotate-1, .-rotate-2').forEach(el => {
                    el.style.transform = 'none';
                    el.style.margin = '10px auto';
                });

                // Page 5: Polaroids
                clonedDoc.querySelectorAll('.polaroid-flip-card').forEach(card => {
                    const isFlipped = card.classList.contains('is-flipped');
                    const front = card.querySelector('.polaroid-front');
                    const back = card.querySelector('.polaroid-back');
                    const inner = card.querySelector('.polaroid-inner');

                    // Force natural sizing for the screenshot
                    card.style.height = 'auto';
                    card.style.minHeight = '420px';
                    card.style.transform = 'none';
                    card.style.display = 'block';

                    if (inner) {
                        inner.style.position = 'relative';
                        inner.style.height = 'auto';
                        inner.style.transform = 'none';
                    }

                    if (isFlipped) {
                        if (front) front.remove();
                        if (back) {
                            back.style.position = 'relative';
                            back.style.height = 'auto';
                            back.style.minHeight = '420px';
                            back.style.display = 'flex';
                            back.style.flexDirection = 'column';
                            back.style.justifyContent = 'center';
                            back.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                        }
                    } else {
                        if (back) back.remove();
                        if (front) {
                            front.style.position = 'relative';
                            front.style.height = 'auto';
                            front.style.minHeight = '420px';
                            front.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';

                            // Explicitly fix image distortion
                            const img = front.querySelector('.memory-photo');
                            if (img) {
                                img.style.width = '100%';
                                img.style.height = 'auto';
                                img.style.aspectRatio = '1/1';
                                img.style.objectFit = 'cover';
                            }
                        }
                    }

                    card.style.opacity = '1';
                    card.style.visibility = 'visible';
                });

                clonedDoc.querySelectorAll('.polaroid-frame').forEach(p => {
                    p.style.opacity = '1';
                    p.style.visibility = 'visible';
                    p.style.transform = 'none';
                });

                // Hide flip hints in all screenshots
                clonedDoc.querySelectorAll('.flip-hint').forEach(el => el.style.display = 'none');

                // Page 6: Map
                const mapTiles = clonedDoc.querySelector('.leaflet-tile-pane');
                if (mapTiles) {
                    // html2canvas doesn't see CSS filters well. 
                    // We inject a semi-transparent warm overlay to mimic the vintage/sepia look
                    const tint = clonedDoc.createElement('div');
                    tint.style.cssText = `
                        position: absolute;
                        inset: 0;
                        background: rgba(229, 224, 208, 0.4); 
                        z-index: 15;
                        pointer-events: none;
                        mix-blend-mode: multiply;
                        opacity: 0.8;
                    `;
                    mapTiles.parentElement.appendChild(tint);
                }

                const mapOverlays = clonedDoc.querySelectorAll('.mix-blend-multiply, .mix-blend-overlay, .mix-blend-soft-light');
                mapOverlays.forEach(el => {
                    // Reduce muddy build-up in screenshots
                    el.style.mixBlendMode = 'normal';
                    el.style.opacity = '0.4';
                });

                // Page 7: Cassette
                const cassette = clonedDoc.getElementById('cassette');
                if (cassette) {
                    cassette.style.transform = 'none';
                    cassette.style.opacity = '1';
                    cassette.style.background = 'linear-gradient(145deg, #1a1a1a, #2a2a2a)'; // Deep black plastic
                    cassette.style.boxShadow = '0 30px 60px rgba(0,0,0,0.4)'; // Heavy shadow for 3D depth
                    cassette.style.borderRadius = '12px';

                    const sticker = cassette.querySelector('.sticker-label');
                    if (sticker) {
                        sticker.style.backgroundImage = 'url("assets/textures/natural-paper.png")';
                        sticker.style.backgroundColor = '#fdfaf1';
                        sticker.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)';
                    }
                }

                clonedDoc.querySelectorAll('.cassette-reel, .cassette-tape').forEach(el => {
                    el.style.transform = 'none';
                    el.style.opacity = '1';
                });

                // Page 8: Time Capsule
                const tcContent = clonedDoc.querySelector('.tc-content');
                if (tcContent) {
                    tcContent.style.opacity = '1';
                    tcContent.style.transform = 'none';

                    // Specific fix for Page 8 background layers in clone
                    const p8bg = clonedDoc.querySelector('.inside-box-container');
                    if (p8bg) {
                        p8bg.style.position = 'absolute';
                        p8bg.style.inset = '0';
                        p8bg.style.zIndex = '-2';
                        p8bg.style.background = '#e6dec1';
                    }

                    const p8tissue = clonedDoc.querySelector('.silk-tissue');
                    if (p8tissue) {
                        p8tissue.style.position = 'absolute';
                        p8tissue.style.inset = '-5%';
                        p8tissue.style.zIndex = '-1';
                    }

                    const tcBox = clonedDoc.querySelector('.tc-memory-box');
                    if (tcBox) {
                        tcBox.style.transform = 'none';
                        tcBox.style.boxShadow = '0 25px 50px rgba(0,0,0,0.2)';
                    }

                    // Force correct visibility for elements on Page 8
                    const physicalLetter = clonedDoc.getElementById('tc-physical-letter');
                    if (physicalLetter && !physicalLetter.classList.contains('active')) {
                        physicalLetter.style.display = 'none';
                    }

                    const sealArea = clonedDoc.getElementById('tc-seal-area');
                    // If the finish button is visible on the real page, ensure seal is visible in clone
                    const realFinishBtn = document.getElementById('tc-finish-btn');
                    if (realFinishBtn && window.getComputedStyle(realFinishBtn).opacity === '1') {
                        if (sealArea) sealArea.style.opacity = '1';
                    }
                }
            }
        }).then(canvas => {
            // Restore UI
            if (navButtons) navButtons.style.display = 'flex';
            if (screenshotBtn) screenshotBtn.innerHTML = originalHTML;
            document.body.style.overflow = originalOverflow;
            document.body.style.height = originalHeight;

            // Convert to downloadable image
            const link = document.createElement('a');
            link.download = `memory-page-${this.currentPage + 1}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();

        }).catch(err => {
            console.error('Screenshot failed:', err);
            alert('Screenshot creation failed. Please try again or use your device\'s native screenshot.');
            if (screenshotBtn) screenshotBtn.innerHTML = originalHTML;
            if (navButtons) navButtons.style.display = 'flex';
            document.body.style.overflow = originalOverflow;
            document.body.style.height = originalHeight;
        });
    },

    formatTitle: function (text) {
        if (!text) return "";
        // Applies the signature underline/accent to any text wrapped in <span>
        return text.replace('<span>', '<span class="font-bold not-italic border-b-4 border-cardboard">');
    },

    renderPage: function () {
        console.log("📄 renderPage called, currentPage:", this.currentPage);

        // Always ensure preloader is hidden when rendering
        this.hidePreloader();

        // Safety check - ensure CONFIG exists
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.pages) {
            console.log("📄 CONFIG not ready yet, waiting...");
            setTimeout(() => this.renderPage(), 100);
            return;
        }
        // Ensure window.CONFIG is set
        window.CONFIG = config;

        const pageData = window.CONFIG.pages[this.currentPage];
        console.log("📄 Page data type:", pageData?.type);
        console.log("📄 Page data greeting:", pageData?.greeting);
        const container = document.getElementById('page-content');

        // Clear interval if changing page
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Apply page-specific background if it exists, otherwise use global
        const bgLayer = document.getElementById('dynamic-bg');
        if (pageData.bgGradient) {
            bgLayer.style.background = pageData.bgGradient;
        } else {
            bgLayer.style.background = 'linear-gradient(to bottom, transparent, transparent, rgba(255, 237, 213, 0.3))';
        }

        // Clear all pending animations before new render
        this.clearAllTypewriters();
        this.clearAllAnimations();
        this.clearAllIntervals();

        container.innerHTML = '';

        switch (pageData.type) {
            case 'memory-box':
                this.renderMemoryBox(pageData, container);
                break;
            case 'message':
                this.renderMessagePage(pageData, container);
                break;
            case 'inside-box':
                this.renderInsideBox(pageData, container);
                break;
            case 'lifetime-receipt':
                this.renderLifetimeReceipt(pageData, container);
                break;
            case 'polaroid-stack':
                this.renderPolaroidStack(pageData, container);
                break;
            case 'birthday-newspaper':
                this.renderBirthdayNewspaper(pageData, container);
                break;
            case 'traveler-map':
                this.renderTravelerMap(pageData, container);
                break;
            case 'scratch-card':
                this.renderScratchCard(pageData, container);
                break;
            case 'analog-voice-note':
                this.renderAnalogVoiceNote(pageData, container);
                break;
            case 'time-capsule-stitch':
                // Stop any previous music/voice notes for a silent entry
                if (this.bgMusic) this.fadeVolume(this.bgMusic, 0, 1500);
                if (this.voiceNoteTrack) this.fadeVolume(this.voiceNoteTrack, 0, 1000);

                this.renderTimeCapsuleStitch(pageData, container);
                break;

            default:
                container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><h1>Finish</h1></div>`;
        }
    },

    fadeVolume: function (player, targetVolume, duration = 1000) {
        if (!player) return;
        const initialVolume = player.volume;
        const delta = targetVolume - initialVolume;
        const interval = 50;
        const steps = duration / interval;
        const increment = delta / steps;

        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            const nextVolume = initialVolume + (increment * currentStep);
            player.volume = Math.max(0, Math.min(1, nextVolume));

            if (currentStep >= steps) {
                player.volume = targetVolume;
                clearInterval(fadeInterval);
                if (targetVolume === 0) player.pause();
            }
        }, interval);
    },

    renderMemoryBox: function (data, container) {
        // Hardcoded defaults for removed fields
        const topMessage = data.topMessage || "Tucked away with love...";
        const mainTitle = data.mainTitle || "A Journey through <span>Memories</span>";
        const boxLabel = data.boxLabel || "Strictly Private";

        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-50"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>

            <div class="relative min-h-screen flex flex-col items-center justify-center py-12 px-6 z-10">
                <main class="w-full flex flex-col items-center max-w-4xl">
                    <div class="text-center mb-12 space-y-4 flex flex-col items-center">
                        <span id="typewriter-top" class="font-handwritten text-2xl md:text-3xl text-ribbon-red/80 mb-2 block min-h-[1.5em]"></span>
                        <h1 class="font-serif text-5xl md:text-7xl font-light italic leading-tight max-w-3xl mx-auto">
                            ${this.formatTitle(mainTitle)}
                        </h1>
                    </div>

                    <div class="relative group mb-20 max-w-sm w-full cursor-pointer" onclick="app.rattleBox()">
                        <div id="main-box" class="cardboard-box aspect-square rounded-sm relative flex items-center justify-center border-2 border-cardboard-dark/30 transform transition-transform duration-500 hover:scale-105 active:scale-95">
                            <div class="absolute inset-x-0 h-12 ribbon-texture opacity-90 shadow-sm flex items-center justify-center overflow-hidden">
                                <div class="w-full h-px bg-white/10"></div>
                            </div>
                            <div class="absolute inset-y-0 w-12 ribbon-texture opacity-90 shadow-sm flex items-center justify-center overflow-hidden">
                                <div class="h-full w-px bg-white/10"></div>
                            </div>
                            <div class="z-20 paper-note px-8 py-6 transform rotate-2 bg-paper-white border border-vintage-ink/5 flex flex-col items-center justify-center">
                                <p class="font-handwritten text-sm text-vintage-ink/60 mb-1">${boxLabel}</p>
                                <h3 class="font-marker text-4xl text-vintage-ink">${data.boxTarget}</h3>
                                <div class="mt-4 flex gap-1">
                                    <span class="material-symbols-outlined text-vintage-ink/20 text-xs">favorite</span>
                                    <span class="material-symbols-outlined text-vintage-ink/20 text-xs">favorite</span>
                                </div>
                            </div>
                            <!-- Tapes -->
                            <div class="absolute -top-4 -right-2 w-24 h-8 bg-yellow-100/40 backdrop-blur-[1px] rotate-45 border-l border-r border-vintage-ink/5 shadow-sm flex items-center justify-center">
                                <span class="font-serif text-[8px] opacity-20 tracking-tighter">AUTHENTIC TAPE</span>
                            </div>
                            <div class="absolute -bottom-2 -left-4 w-20 h-10 bg-yellow-100/30 backdrop-blur-[1px] -rotate-12 border-l border-r border-vintage-ink/5 shadow-sm"></div>
                        </div>
                        <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-vintage-ink/5 blur-xl rounded-full"></div>
                    </div>

                    <div class="w-full max-w-xl flex flex-col items-center">
                        <div class="flex flex-col items-center gap-4 w-full mb-4">
                            <div class="paper-note w-full p-10 rotate-1 flex flex-col items-center text-center">
                                <p id="typewriter-question" class="font-handwritten text-2xl md:text-3xl text-vintage-ink/80 mb-8 min-h-[1.5em]"></p>
                                <div class="flex items-center gap-4 w-full max-w-sm border-b-2 border-vintage-ink/30 pb-2">
                                    <div class="relative flex-1">
                                        <input id="secret-input" 
                                               onkeyup="if(event.key === 'Enter') app.checkSecret()"
                                               oninput="const err = document.getElementById('secret-error'); if(err) err.classList.add('hidden')"
                                               class="w-full bg-transparent border-0 focus:ring-0 text-vintage-ink font-inter text-lg px-1 placeholder:text-vintage-ink/30 custom-input focus:placeholder-transparent" 
                                               placeholder="${data.placeholder}" 
                                               type="password"/>
                                    </div>
                                    <button onclick="app.checkSecret()" class="group flex items-center justify-center hover:scale-110 transition-transform">
                                        <span class="material-symbols-outlined text-vintage-ink/60 group-hover:text-vintage-ink">arrow_forward</span>
                                    </button>
                                </div>
                                <div id="secret-error" class="hidden font-handwritten text-ribbon-red text-sm mt-4 animate-pulse">
                                    ❌ Wrong answer! Try remembering again...
                                </div>
                            </div>
                        </div>

                        ${data.countdownEnabled ? `
                        <div class="w-full mt-2 mb-8">
                            <div class="text-center mb-6">
                                <p class="font-handwritten text-xl md:text-2xl italic text-vintage-ink/60 underline decoration-ribbon-red/30">Patiently waiting for the day...</p>
                            </div>
                            <div id="countdown-grid" class="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
                                <!-- Countdown items will be updated by JS -->
                                ${this.getCountdownUI(0, 0, 0, 0)}
                            </div>
                        </div>` : ''}

                        <!-- Brand Logo pindah ke bawah countdown -->
                        <div class="flex items-center gap-2 text-primary opacity-40 hover:opacity-100 transition-opacity mt-4 mb-4">
                            <span class="material-symbols-outlined scale-75" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                                diamond
                            </span>
                            <h2 class="text-[10px] font-bold uppercase tracking-widest">
                                FOR YOU, ALWAYS
                            </h2>
                        </div>
                    </div>
                </main>
            </div>
        `;

        if (data.countdownEnabled) {
            this.startCountdown(data.birthdayDate);
        }

        // In preview: show text instantly | Normal: typewriter animation
        const isPreview = (window.parent && window.parent !== window);

        if (isPreview) {
            // Preview: direct text assignment
            const topEl = document.getElementById('typewriter-top');
            const questionEl = document.getElementById('typewriter-question');
            if (topEl) topEl.innerHTML = topMessage || '';
            if (questionEl) questionEl.innerHTML = data.question || '';
        } else {
            // Normal: typewriter animation
            const timeout1 = setTimeout(() => {
                this.typeWriter('typewriter-top', topMessage, 100, () => {
                    const timeout2 = setTimeout(() => {
                        this.typeWriter('typewriter-question', data.question, 70);
                    }, 500);
                    this.activeTypewriters.push(timeout2);
                });
            }, 800);
            this.activeTypewriters.push(timeout1);
        }
    },

    rattleBox: function () {
        const box = document.getElementById('main-box');
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.pages) return;
        const pageData = config.pages[this.currentPage];

        // Add shake animation
        box.classList.add('shake-animate');
        setTimeout(() => box.classList.remove('shake-animate'), 300);

        // Play rattle sound
        if (pageData.rattleSound) {
            const audio = new Audio(pageData.rattleSound);
            audio.volume = 0.4;
            audio.play().catch(e => console.log("Audio play blocked until user interact"));
        }

        // Haptic Feedback for Mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    },

    // Track active timeouts/animations for cancellation on live update
    activeTypewriters: [],
    activeAnimations: [],

    clearAllTypewriters: function () {
        this.activeTypewriters.forEach(id => clearTimeout(id));
        this.activeTypewriters = [];
    },

    clearAllAnimations: function () {
        this.activeAnimations.forEach(id => clearTimeout(id));
        this.activeAnimations = [];
    },

    clearAllIntervals: function () {
        this.activeIntervals.forEach(id => clearInterval(id));
        this.activeIntervals = [];
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    typeWriter: function (elementId, text, speed = 50, callback = null) {
        console.log("⌨️ typeWriter:", elementId, "text length:", text?.length);
        const element = document.getElementById(elementId);
        if (!element) {
            console.log("⌨️ typeWriter: element not found:", elementId);
            return;
        }

        // In admin preview (iframe), show text immediately
        const isPreview = (window.parent && window.parent !== window);
        if (isPreview) {
            element.innerHTML = text || '';
            if (callback) callback();
            return;
        }

        // Normal typewriter animation for end users
        element.innerHTML = '';
        let i = 0;
        const type = () => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                const timeoutId = setTimeout(type, speed);
                this.activeTypewriters.push(timeoutId);
            } else if (callback) {
                const timeoutId = setTimeout(callback, speed);
                this.activeTypewriters.push(timeoutId);
            }
        };
        type();
    },

    getCountdownUI: function (d, h, m, s) {
        const slots = [
            { val: d, label: 'Days to go', color: 'yellow' },
            { val: h, label: 'Hours', color: 'blue' },
            { val: m, label: 'Minutes', color: 'pink' },
            { val: s, label: 'Seconds', color: 'green' }
        ];
        return slots.map(slot => `
            <div class="post-it bg-${slot.color}-50 p-6 rounded-sm rotate-${Math.floor(Math.random() * 4)} flex flex-col items-center justify-center aspect-square border-b-2 border-${slot.color}-200">
                <div class="font-marker text-5xl text-vintage-ink">${String(slot.val).padStart(2, '0')}</div>
                <div class="font-handwritten text-xs mt-2 text-vintage-ink/50">${slot.label}</div>
            </div>
        `).join('');
    },

    startCountdown: function (targetDate) {
        // Use provided date, fall back to global CONFIG, then to current page's birthdayDate
        const dateStr = targetDate || (window.CONFIG && window.CONFIG.birthdayDate) || new Date().toISOString();
        const target = new Date(dateStr).getTime();

        const update = () => {
            const now = new Date().getTime();
            const diff = target - now;

            if (diff < 0) {
                // Birthday is here!
                document.getElementById('countdown-grid').innerHTML = '<div class="col-span-4 font-marker text-4xl text-center">It\'s Time! 🎂</div>';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const grid = document.getElementById('countdown-grid');
            if (grid) grid.innerHTML = this.getCountdownUI(days, hours, minutes, seconds);
        };

        update();
        this.timerInterval = setInterval(update, 1000);
    },

    checkSecret: function () {
        const input = document.getElementById('secret-input').value.toLowerCase();
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.pages) return;
        const pageData = config.pages[this.currentPage];

        if (input === pageData.correctAnswer.toLowerCase()) {
            // Start the Seamless Unboxing Sequence
            const mainBox = document.getElementById('main-box');
            const lid = mainBox.querySelector('.box-lid-static') || this.createStaticLid(mainBox);

            // 1. Add the flying animation to the lid
            lid.classList.add('lid-open-animation');
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.4); // Mechanical Click/Unlock

            // 2. Fade out the rest of the UI (buttons, countdown, etc.)
            document.querySelectorAll('#page-content > div > *:not(.group)').forEach(el => {
                el.style.transition = 'opacity 0.5s ease';
                el.style.opacity = '0';
            });

            // 3. Scale and fade the box base while it 'opens'
            setTimeout(() => {
                mainBox.style.transition = 'all 0.8s ease';
                mainBox.style.transform = 'scale(1.5)';
                mainBox.style.opacity = '0';
            }, 600);

            // 4. Finally change to the next page
            setTimeout(() => {
                this.nextPage();
            }, 1400);

        } else {
            // Shake effect and error feedback
            const btn = document.querySelector('.group span');
            const errorMsg = document.getElementById('secret-error');
            const input = document.getElementById('secret-input');

            btn.classList.add('text-red-600');
            if (errorMsg) errorMsg.classList.remove('hidden');

            if (input) {
                // Shake the whole input container area
                const container = input.closest('.paper-note');
                if (container) {
                    container.classList.add('shake-animate');
                    setTimeout(() => container.classList.remove('shake-animate'), 500);
                }
            }

            setTimeout(() => {
                btn.classList.remove('text-red-600');
            }, 500);

            // Haptic Feedback for Mobile (vibration pattern for error)
            if ('vibrate' in navigator) {
                navigator.vibrate([50, 100, 50]);
            }
        }
    },

    createStaticLid: function (container) {
        // Creates a lid element that matches the Page 1 box design
        const lid = document.createElement('div');
        lid.className = 'box-lid-static';
        lid.style.cssText = `
            position: absolute; inset: -2px; background-color: #c2a382;
            background-image: var(--cardboard-texture); border: 2px solid rgba(166,135,104,0.3);
            z-index: 40; display: flex; align-items: center; justify-content: center;
        `;
        lid.innerHTML = `
            <div class="absolute inset-x-0 h-10 washi-tape opacity-90 shadow-sm"></div>
            <div class="paper-note px-6 py-4 transform rotate-2 bg-white border border-black/5 flex flex-col items-center justify-center">
                <p class="font-handwritten text-[10px] text-vintage-ink/60 mb-1">Strictly Private</p>
                <h3 class="font-marker text-xl text-vintage-ink">For Sarah</h3>
            </div>
        `;
        container.appendChild(lid);
        return lid;
    },

    renderInsideBox: function (data, container) {
        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-50"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>
            
            <div id="confetti-container" class="fixed inset-0 pointer-events-none z-50 overflow-hidden"></div>
            
            <div id="reveal-content" class="relative min-h-screen flex flex-col items-center justify-center p-8 z-10 content-reveal" style="opacity: 1;">
                <div class="mb-12 text-center flex flex-col items-center">
                    <h2 id="typewriter-greeting" class="font-handwritten text-3xl md:text-5xl text-white/90 drop-shadow-lg min-h-[1.5em]"></h2>
                </div>

                <div class="relative group">
                    <div class="premium-letter flex flex-col items-center justify-between text-center overflow-hidden">
                        <div class="gold-border"></div>
                        
                        <div class="relative z-10 w-full space-y-8">
                            <div class="flex items-center justify-center gap-4">
                                <div class="h-[1px] flex-1 bg-ribbon-red/20"></div>
                                <h3 class="font-serif text-3xl md:text-4xl italic text-ribbon-red px-4">${this.formatTitle(data.letterTitle)}</h3>
                                <div class="h-[1px] flex-1 bg-ribbon-red/20"></div>
                            </div>
                            <p id="typewriter-letterbody" class="font-handwritten text-xl md:text-2xl leading-relaxed text-vintage-ink px-6 min-h-[5em]"></p>
                        </div>
                        
                        <div class="relative z-10 mt-12 mb-8">
                            <p class="font-marker text-2xl text-vintage-ink/60 border-b border-vintage-ink/10 pb-2">${data.letterSign}</p>
                        </div>

                        <div class="wax-seal-premium">
                             <span class="material-symbols-outlined">auto_fix_high</span>
                        </div>
                    </div>

                    <div class="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[110%] h-20 bg-black/40 blur-3xl -z-10 rounded-full"></div>
                </div>

                <div class="mt-20 text-center relative z-20 flex flex-col items-center">
                    <p class="font-handwritten text-2xl text-white/80 italic drop-shadow-md">
                        ${data.footerText}
                    </p>
                    <button onclick="app.nextPage()" class="mt-8 mb-12 px-10 py-4 bg-white/20 border border-white/30 rounded-full font-inter text-sm tracking-widest uppercase text-white hover:text-white hover:bg-white/30 backdrop-blur-sm shadow-lg transition-all hover:scale-105">
                        Open Next Memory 
                    </button>

                    <!-- Brand Logo di bawah -->
                    <div class="flex items-center gap-2 text-primary bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 opacity-60 hover:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined scale-75" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                            diamond
                        </span>
                        <h2 class="text-[10px] font-bold uppercase tracking-widest">
                            FOR YOU, ALWAYS
                        </h2>
                    </div>
                </div>
            </div>
        `;

        this.createComplexConfetti();

        // In preview: show text instantly | Normal: typewriter animation
        const isPreview = (window.parent && window.parent !== window);

        if (isPreview) {
            // Preview: direct text assignment
            const greetingEl = document.getElementById('typewriter-greeting');
            const bodyEl = document.getElementById('typewriter-letterbody');
            if (greetingEl) greetingEl.innerHTML = data.greeting || '';
            if (bodyEl) bodyEl.innerHTML = data.letterBody || '';
        } else {
            // Normal: typewriter animation
            const timeout1 = setTimeout(() => {
                this.typeWriter('typewriter-greeting', data.greeting, 80, () => {
                    const timeout2 = setTimeout(() => {
                        this.typeWriter('typewriter-letterbody', data.letterBody, 40);
                    }, 400);
                    this.activeTypewriters.push(timeout2);
                });
            }, 300);
            this.activeTypewriters.push(timeout1);
        }

        if (data.musicTrack) {
            this.playMusic(data.musicTrack);
        }
    },

    createComplexConfetti: function () {
        const container = document.getElementById('confetti-container');
        const colors = ['#d4af37', '#b33939', '#fcfaf5', '#e8e4d8'];

        for (let i = 0; i < 60; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'paper-confetti';
            const size = Math.random() * 15 + 10;
            confetti.style.width = size + 'px';
            confetti.style.height = (size * (Math.random() + 0.5)) + 'px';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 3 + 4) + 's';
            confetti.style.animationDelay = (Math.random() * 2) + 's';
            container.appendChild(confetti);
        }
    },

    playMusic: async function (track) {
        if (!track) {
            if (this.bgMusic) this.fadeVolume(this.bgMusic, 0, 1000);
            return;
        }

        if (this.bgMusic && this.bgMusic.getAttribute('data-original-src') === track) {
            if (!this.isMuted && this.bgMusic.paused) {
                this.bgMusic.play().catch(e => { });
                this.fadeVolume(this.bgMusic, 0.3, 1500);
            }
            return;
        }

        // Fade out existing if playing
        if (this.bgMusic && !this.bgMusic.paused) {
            this.fadeVolume(this.bgMusic, 0, 800);
            setTimeout(() => this.startNewTrack(track), 850);
        } else {
            this.startNewTrack(track);
        }
    },

    startNewTrack: async function (track) {
        let audioSrc = track;
        try {
            const response = await fetch(track);
            const blob = await response.blob();
            audioSrc = URL.createObjectURL(blob);
        } catch (e) { }

        if (!this.bgMusic) {
            this.bgMusic = new Audio(audioSrc);
            this.bgMusic.id = 'bg-music-player';
            this.bgMusic.loop = true;
            document.body.appendChild(this.bgMusic);
        } else {
            this.bgMusic.src = audioSrc;
        }

        this.bgMusic.setAttribute('data-original-src', track);
        this.bgMusic.volume = 0;
        this.bgMusic.load();

        if (!this.isMuted) {
            this.bgMusic.play().catch(e => console.log("Music play blocked"));
            this.fadeVolume(this.bgMusic, 0.3, 2000);
        }
    },

    toggleMusic: function () {
        this.isMuted = !this.isMuted;
        const player = document.getElementById('bg-music');
        const tapePlayer = document.getElementById('bg-music'); // They use the same ID
        const btn = document.getElementById('music-toggle-btn');

        if (this.bgMusic) {
            if (this.isMuted) {
                this.fadeVolume(this.bgMusic, 0, 1000);
            } else {
                this.bgMusic.play().catch(e => { });
                this.fadeVolume(this.bgMusic, 0.3, 1500);
            }
        }
        if (this.voiceNoteTrack) {
            if (this.isMuted) {
                this.fadeVolume(this.voiceNoteTrack, 0, 500);
            } else if (!this.voiceNoteTrack.paused) {
                this.fadeVolume(this.voiceNoteTrack, 0.5, 1000);
            }
        }

        if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined text-vintage-ink">${this.isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }
    },

    renderMessagePage: function (data, container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-screen text-center p-10">
                <div class="glass-card max-w-2xl p-12 rounded-3xl backdrop-blur-md bg-white/20 border border-white/30 shadow-2xl">
                    <h1 class="font-serif text-5xl mb-6">${data.title}</h1>
                    <p class="font-body text-xl mb-8 leading-relaxed">${data.content}</p>
                    <button onclick="app.nextPage()" class="vintage-stamp px-12 py-5 text-white font-serif font-bold uppercase tracking-widest text-lg hover:scale-110 transition-transform">
                        ${data.buttonText}
                    </button>
                </div>
            </div>
        `;
    },

    renderLifetimeReceipt: function (data, container) {
        // Fallbacks for missing data
        const birthDate = data.birthDate || "2000-01-01";
        const receiptNumber = data.receiptNumber || "MMRY-" + Math.floor(Math.random() * 10000);
        const barcodeText = data.barcodeText || "LOVED-INFINITELY";
        const buttonText = data.buttonText || "Continue";
        const calculatedStats = this.calculateLifeStats(birthDate);

        // Pastikan stats selalu memiliki angka, bukan undefined/NaN
        const stats = {
            years: (data.years !== undefined && data.years !== null) ? data.years : calculatedStats.years,
            months: (data.months !== undefined && data.months !== null) ? data.months : calculatedStats.months,
            days: (data.days !== undefined && data.days !== null) ? data.days : calculatedStats.days,
            hours: (data.hours !== undefined && data.hours !== null) ? data.hours : calculatedStats.hours,
            minutes: (data.minutes !== undefined && data.minutes !== null) ? data.minutes : calculatedStats.minutes,
            seconds: (data.seconds !== undefined && data.seconds !== null) ? data.seconds : calculatedStats.seconds
        };

        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-50"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>
            
            <div class="min-h-screen font-mono text-ink-black flex flex-col items-center justify-start pt-2 pb-12 px-4 relative z-10 overflow-hidden">
                <!-- Printer Hardware -->
                <div class="relative z-50 w-full max-w-[420px] -mb-2">
                    <div id="printer-body" class="printer-body w-full h-44 rounded-t-3xl rounded-b-lg relative border-b-8 border-stone-800 flex flex-col items-center pt-7">
                        <div class="absolute top-5 left-10 flex gap-2">
                            <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-led-pulse"></div>
                            <div class="w-2 h-2 rounded-full bg-orange-300 opacity-50"></div>
                        </div>
                        <div class="absolute top-5 right-10">
                            <div class="w-8 h-4 bg-gray-400/20 rounded-sm border border-gray-400/30 flex items-center justify-center">
                                <div class="w-4 h-[1px] bg-gray-500"></div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 text-stone-500/80 mb-2 pointer-events-none">
                            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                                diamond
                            </span>
                            <h2 class="text-[8px] font-bold uppercase tracking-[0.2em]">
                                FOR YOU, ALWAYS
                            </h2>
                        </div>
                        
                        <!-- The Slot -->
                        <div class="w-[90%] max-w-[340px] h-10 printer-slot-inner rounded-md relative flex items-center justify-center overflow-hidden border-2 border-stone-900 shadow-inner">
                            <div class="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_1px,#000_1px,#000_2px)]"></div>
                        </div>
                    </div>
                </div>

                <!-- Animating Receipt Paper Wrapper -->
                <div id="receipt-paper-wrapper" class="relative w-full max-w-[380px] z-10 receipt-paper-roll" style="transform: translateY(-100%);">
                    <div id="receipt-paper" class="relative receipt-container p-10 py-16 flex flex-col items-center">
                        <div class="jagged-edge jagged-bottom"></div>
                        
                        <div class="text-center mb-6">
                            <h2 class="font-bold text-lg tracking-widest uppercase">${this.formatTitle(data.title)}</h2>
                            <p class="text-[10px] mt-1 opacity-60">REG NO. ${receiptNumber}</p>
                        </div>

                        <div class="w-full border-b border-dashed border-ink-black/30 mb-8"></div>

                        <div id="receipt-rows" class="w-full space-y-5 mb-8">
                            <!-- Rows will be injected one by one -->
                        </div>

                        <div id="total-section" class="w-full border-t-2 border-double border-ink-black/50 pt-4 mb-10 opacity-0 transition-opacity duration-1000">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-base">TOTAL VALUE</span>
                                <span id="priceless-tag" class="font-bold text-xl tracking-tighter">PRICELESS</span>
                            </div>
                        </div>

                        <div id="barcode-section" class="w-full flex flex-col items-center gap-1 opacity-0 transition-opacity duration-1000">
                            <div class="flex items-end justify-center w-full h-10 gap-[1px] cursor-pointer hover:scale-105 transition-transform" onclick="app.beepBarcode()">
                                ${this.generateBarcode()}
                            </div>
                            <p class="text-[9px] tracking-[0.4em] font-sans">${barcodeText}</p>
                        </div>

                        <div id="receipt-footer" class="mt-8 text-center opacity-0">
                            <p class="text-[9px] uppercase tracking-widest opacity-40 italic">${data.footerText}</p>
                        </div>
                    </div>
                </div>

                <!-- Action Button -->
                <div id="continue-btn" class="opacity-0 transition-all duration-1000 relative z-30 transform translate-y-4">
                    <button onclick="app.nextPage()" class="mt-12 group flex flex-col items-center gap-2">
                        <span class="font-body text-ink-black/60 text-sm tracking-widest uppercase hover:text-ink-black transition-colors duration-300">
                            ${buttonText}
                        </span>
                        <div class="h-px w-8 bg-ink-black/20 group-hover:w-16 transition-all duration-300"></div>
                    </button>
                </div>
            </div>
        `;

        // Start the printing sequence
        const printTimer = setTimeout(() => this.animateReceipt(stats, data), 1000);
        this.activeAnimations.push(printTimer);
    },

    animateReceipt: function (stats, data) {
        let rows = [];

        // 1. Jika ada baris manual (Custom Rows)
        if (data.customRows && data.customRows.length > 0) {
            rows = data.customRows.map(row => ({
                label: row.label || "Memory",
                value: row.value || 0
            }));
        }
        // 2. Default Calculator dengan Label Kustom dari Admin
        else {
            rows = [
                { label: data.labelYears || "Years Collected", value: stats.years },
                { label: data.labelMonths || "Months Shared", value: stats.months },
                { label: data.labelDays || "Days Laughed", value: stats.days },
                { label: data.labelHours || "Hours Treasured", value: stats.hours },
                { label: data.labelMinutes || "Minutes Dreaming", value: stats.minutes },
                { label: data.labelSeconds || "Seconds Loved", value: stats.seconds }
            ];
        }

        const wrapper = document.getElementById('receipt-paper-wrapper');
        const printer = document.getElementById('printer-body');
        const container = document.getElementById('receipt-rows');

        if (!container) return;
        container.innerHTML = ''; // Pastikan bersih

        let currentY = -75;
        wrapper.style.transform = `translateY(${currentY}%)`;

        // Tahap 1: Munculkan Header
        const headerTimer = setTimeout(() => {
            currentY = -60;
            wrapper.style.transform = `translateY(${currentY}%)`;
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2324/2324-preview.mp3', 0.1);
        }, 500);
        this.activeAnimations.push(headerTimer);

        let delay = 1500;

        // Tahap 2: Munculkan setiap baris
        rows.forEach((row, index) => {
            const rowTimer = setTimeout(() => {
                printer.classList.add('printer-vibrating');

                currentY += 8;
                wrapper.style.transform = `translateY(${currentY}%)`;

                const rowEl = document.createElement('div');
                rowEl.className = 'flex justify-between items-baseline thermal-line-fade';
                rowEl.style.opacity = '1'; // Pastikan terlihat
                rowEl.innerHTML = `
                    <span class="text-[14px] uppercase tracking-wider text-black font-bold">${row.label}</span>
                    <span id="stat-${index}" class="text-base font-bold text-black">0</span>
                `;
                container.appendChild(rowEl);

                this.playSfx('https://assets.mixkit.co/active_storage/sfx/2324/2324-preview.mp3', 0.15);
                setTimeout(() => printer.classList.remove('printer-vibrating'), 200);

                this.countUp(`stat-${index}`, row.value);
            }, delay);
            this.activeAnimations.push(rowTimer);
            delay += 1000;
        });

        // Final reveal (total & footer)
        const finalTimer = setTimeout(() => {
            printer.classList.add('printer-vibrating');
            currentY = 0;
            wrapper.style.transform = `translateY(${currentY}%)`;

            document.getElementById('total-section').classList.remove('opacity-0');
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', 0.4);

            setTimeout(() => printer.classList.remove('printer-vibrating'), 500);
        }, delay + 500);
        this.activeAnimations.push(finalTimer);

        const footerTimer = setTimeout(() => {
            const barcode = document.getElementById('barcode-section');
            const footer = document.getElementById('receipt-footer');
            if (barcode) barcode.classList.remove('opacity-0');
            if (footer) footer.classList.add('animate-fade-in');

            const btn = document.getElementById('continue-btn');
            if (btn) btn.classList.remove('opacity-0', 'translate-y-4');
        }, delay + 1500);
        this.activeAnimations.push(footerTimer);
    },

    countUp: function (elementId, target) {
        const el = document.getElementById(elementId);
        let current = 0;
        const duration = 20; // more steps
        const step = target / duration;
        let count = 0;

        const interval = setInterval(() => {
            current += step;
            count++;
            if (count >= duration) {
                el.innerText = target.toLocaleString();
                clearInterval(interval);
            } else {
                el.innerText = Math.floor(current).toLocaleString();
            }
        }, 15);
        this.activeIntervals.push(interval);
    },

    beepBarcode: function () {
        this.playSfx('https://assets.mixkit.co/active_storage/sfx/221/221-preview.mp3', 0.3);
        const tag = document.getElementById('priceless-tag');
        if (tag) {
            tag.classList.add('animate-ping');
            setTimeout(() => tag.classList.remove('animate-ping'), 500);
        }
    },

    playSfx: async function (url, volume = 0.5) {
        // SFX should always play, even if music is muted (user request)
        // if (this.isMuted) return;

        try {
            // Stealth Fetch for SFX to bypass IDM
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const audio = new Audio(blobUrl);
            audio.volume = volume;
            audio.play().catch(e => { });

            // Cleanup blob after playing
            audio.onended = () => URL.revokeObjectURL(blobUrl);
        } catch (e) {
            // Fallback
            const audio = new Audio(url);
            audio.volume = volume;
            audio.play().catch(e => { });
        }
    },

    renderReceiptRow: function (label, value) {
        return `
            <div class="flex justify-between items-baseline">
                <span class="text-sm uppercase tracking-wider">${label}</span>
                <span class="text-lg font-bold">${value.toLocaleString()}</span>
            </div>
        `;
    },

    calculateLifeStats: function (birthDateStr) {
        const birthDate = new Date(birthDateStr);
        const now = new Date();
        const diff = now - birthDate;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30.4375); // Average months
        const years = Math.floor(days / 365.25);

        return { years, months, days, hours, minutes, seconds };
    },

    generateBarcode: function () {
        const widths = [1, 3, 1, 1, 4, 2, 1, 1, 3, 1, 2, 5, 1, 3, 2, 1, 4, 1, 1, 3, 2, 1, 1, 4, 1, 2];
        return widths.map(w => `<span class="barcode-line" style="width: ${w}px"></span>`).join('');
    },

    renderPolaroidStack: function (data, container) {
        const isPreview = (window.parent && window.parent !== window);
        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-30"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>

            <div class="min-h-screen flex flex-col items-center justify-start py-8 md:py-16 px-4 relative z-10">
                <!-- Header -->
                <div class="text-center mb-8 md:mb-12 relative">
                    <div class="inline-block relative">
                        <h2 class="font-serif text-4xl md:text-5xl font-bold text-vintage-ink italic tracking-tight relative z-10 drop-shadow-sm">
                            Our <span class="not-italic font-black text-ribbon-red">Memories</span>
                        </h2>
                        <div class="absolute -bottom-2 left-0 right-0 h-3 bg-ribbon-red/10 -skew-x-6 -z-0 rounded-sm"></div>
                    </div>
                    <div class="mt-3 flex items-center justify-center gap-3">
                        <div class="h-px w-10 bg-gradient-to-r from-transparent to-cardboard/40"></div>
                        <p class="font-mono text-[10px] text-vintage-ink/50 tracking-[0.2em] uppercase">Captured Moments</p>
                        <div class="h-px w-10 bg-gradient-to-l from-transparent to-cardboard/40"></div>
                    </div>
                </div>

                <!-- Polaroid Stack Container -->
                <div class="w-full max-w-6xl mx-auto mb-12 relative">
                    <!-- Grid Container -->
                    <div id="polaroid-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        <!-- Polaroids will be injected here -->
                    </div>
                </div>

                <!-- Continue Button -->
                <div id="polaroid-continue-btn" class="${isPreview ? '' : 'opacity-0'} transition-all duration-1000 relative z-30 transform translate-y-4">
                    <button onclick="app.nextPage()" class="group flex flex-col items-center gap-2">
                        <span class="font-body text-vintage-ink/60 text-sm tracking-widest uppercase hover:text-vintage-ink transition-colors duration-300">
                            ${data.buttonText || 'Continue'}
                        </span>
                        <div class="h-px w-8 bg-vintage-ink/20 group-hover:w-16 transition-all duration-300"></div>
                    </button>
                </div>

            </div>
        `;

        const grid = document.getElementById('polaroid-grid');
        const photoData = data.photos || [];
        // isPreview already declared above

        photoData.forEach((photo, index) => {
            const rot = (Math.random() * 8 - 4).toFixed(2);
            const offsetX = (Math.random() * 20 - 10).toFixed(0);
            const offsetY = (Math.random() * 20 - 10).toFixed(0);

            const tapeColors = ['rgba(179, 57, 57, 0.4)', 'rgba(52, 152, 219, 0.3)', 'rgba(46, 204, 113, 0.3)', 'rgba(241, 196, 15, 0.3)'];
            const mainTapeColor = tapeColors[index % tapeColors.length];

            const card = document.createElement('div');

            // Preview: static, visible | Normal: animated
            if (isPreview) {
                card.className = 'w-full max-w-[280px] md:max-w-[320px] polaroid-flip-card relative';
                card.style.cssText = `--card-rot:${rot}deg;--card-x:${offsetX}px;--card-y:${offsetY}px;height:400px;opacity:1;`;
            } else {
                const delay = 1.2 + (index * 0.8);
                card.className = 'w-full max-w-[280px] md:max-w-[320px] polaroid-flip-card animate-polaroid-fall opacity-0 relative';
                card.style.cssText = `--card-rot:${rot}deg;--card-x:${offsetX}px;--card-y:${offsetY}px;height:400px;animation-delay:${delay}s;`;
            }

            const tapeDelay = isPreview ? 0 : (1.2 + index * 0.8 + 1);

            card.innerHTML = `
                <div class="washi-tape-custom washi-top-left ${isPreview ? '' : 'opacity-0 animate-fade-in'}" style="--tape-color: ${mainTapeColor}; ${!isPreview ? `animation-delay: ${tapeDelay}s` : ''}"></div>
                ${index % 2 === 0 ? `<div class="washi-tape-custom washi-bottom-right ${isPreview ? '' : 'opacity-0 animate-fade-in'}" style="--tape-color: ${tapeColors[(index + 1) % tapeColors.length]}; ${!isPreview ? `animation-delay: ${tapeDelay}s` : ''}"></div>` : ''}
                <div class="polaroid-inner">
                    <div class="polaroid-front polaroid-frame">
                        <div class="relative overflow-hidden bg-stone-100">
                            <img src="${photo.url}" class="memory-photo w-full h-[220px] md:h-[260px] object-cover" alt="Memory">
                        </div>
                        <div class="mt-4 flex flex-col gap-1">
                            <p class="handwritten text-xl md:text-2xl leading-tight text-ink-black/80">${photo.caption || ''}</p>
                            <span class="polaroid-date ml-auto uppercase tracking-tighter opacity-50">${photo.date || ''}</span>
                        </div>
                        <div class="flip-hint">Click to flip</div>
                    </div>
                    <div class="polaroid-back polaroid-frame">
                        <div class="scribble-note text-xl md:text-2xl">${photo.backNote || "A memory worth keeping forever..."}</div>
                        <div class="back-seal"><span class="material-symbols-outlined text-4xl">favorite</span></div>
                        <div class="flip-hint">Click to reveal</div>
                    </div>
                </div>
            `;

            card.onclick = () => {
                card.classList.toggle('is-flipped');
                this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.1);
            };

            grid.appendChild(card);
        });

        // Show continue button after polaroids animate in
        const btnDelay = isPreview ? 50 : 500 + (photoData.length * 800);
        const btnTimeout = setTimeout(() => {
            const btn = document.getElementById('polaroid-continue-btn');
            if (btn) btn.classList.remove('opacity-0', 'translate-y-4');
        }, btnDelay);
        this.activeAnimations.push(btnTimeout);
    },

    renderBirthdayNewspaper: function (data, container) {
        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-40"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>

            <div class="min-h-screen flex flex-col items-center justify-start py-12 px-4 relative z-10 overflow-x-hidden overflow-y-auto">
                <div class="w-full max-w-4xl newspaper-paper p-6 md:p-12 relative paper-thud transform rotate-0 md:rotate-1">
                    <div class="news-grain"></div>
                    
                    <!-- Newspaper Header -->
                    <div class="flex flex-col items-center mb-8">
                        <div class="w-full flex justify-between items-end border-b-2 border-black pb-2 mb-2 font-serif text-[10px] md:text-sm tracking-tighter">
                            <span>VOL. XXIV ... NO. 0904</span>
                            <span class="font-bold uppercase">${data.edition}</span>
                            <span>${data.date}</span>
                        </div>
                        <h1 class="text-4xl md:text-7xl font-display font-black tracking-tighter text-center mb-4">
                            ${this.formatTitle(data.title)}
                        </h1>
                        <div class="w-full border-t-4 border-double border-black pt-2 flex justify-between items-center font-bold text-[10px] md:text-sm">
                            <span>WEATHER: 100% CHANCE OF CELEBRATION</span>
                            <span>PRICE: ${data.price}</span>
                        </div>
                    </div>

                    <!-- Main Headline -->
                    <div class="text-center mb-6">
                        <h2 class="newspaper-headline text-3xl md:text-6xl py-4 mb-6 leading-tight">
                            ${this.formatTitle(data.mainHeadline)}
                        </h2>
                        ${data.mainPhoto ? `
                            <div class="w-full max-w-2xl mx-auto mb-8 relative">
                                <img src="${data.mainPhoto}" class="newspaper-main-photo" alt="Newspaper Feature">
                                <p class="text-[10px] uppercase tracking-widest text-center mt-1 font-sans text-ink-black/60">Fig 1. The Subject in Question</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Articles Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 border-top border-black pt-8">
                        <div class="news-column">
                            <h3 class="font-display text-2xl font-bold mb-4 uppercase border-b border-black pb-2">
                                ${data.articles[0].title}
                            </h3>
                            <p class="font-serif text-lg leading-relaxed text-justify first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-1">
                                ${data.articles[0].content}
                            </p>
                        </div>
                        <div class="news-column">
                            <h3 class="font-display text-2xl font-bold mb-4 uppercase border-b border-black pb-2">
                                ${data.articles[1].title}
                            </h3>
                            <div class="bg-black/5 p-4 mb-4 border-l-4 border-black italic font-serif">
                                "The most important headline of the year is finally here."
                            </div>
                            <p class="font-serif text-lg leading-relaxed text-justify">
                                ${data.articles[1].content}
                            </p>
                        </div>
                    </div>

                    <!-- Full Width Article / Letter -->
                    <div class="mt-12 pt-8 border-t-2 border-black">
                        <h3 class="font-display text-3xl font-bold mb-6 text-center italic">
                            ${data.articles[2].title}
                        </h3>
                        <div class="font-serif text-xl leading-loose max-w-2xl mx-auto text-center italic opacity-80">
                            ${data.articles[2].content}
                        </div>
                    </div>

                    <!-- Footer / Barcode -->
                    <div class="mt-16 flex flex-col items-center opacity-40">
                        <div class="w-32 h-8 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_4px)] mb-2"></div>
                        <p class="text-[8px] tracking-[0.5em] font-sans font-bold mb-4">SERIAL NO: 1911-2001-2025</p>
                        
                        <!-- Brand Logo sebagai Penerbit -->
                        <div class="flex items-center gap-1 text-black">
                            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                                diamond
                            </span>
                            <h2 class="text-[8px] font-bold uppercase tracking-[0.2em]">
                                FOR YOU, ALWAYS
                            </h2>
                        </div>
                    </div>
                </div>

                <!-- Continue Button -->
                <div id="news-continue-btn" class="opacity-0 transition-all duration-1000 relative z-30 transform translate-y-4">
                    <button onclick="app.nextPage()" class="mt-12 group flex flex-col items-center gap-2">
                        <span class="font-body text-ink-black/60 text-sm tracking-widest uppercase hover:text-ink-black transition-colors duration-300">
                            ${data.buttonText}
                        </span>
                        <div class="h-px w-8 bg-ink-black/20 group-hover:w-16 transition-all duration-300"></div>
                    </button>
                </div>
            </div>
        `;

        // Entry sound (Thud)
        setTimeout(() => {
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 0.5); // Thud/impact sound
        }, 100);

        // Reveal button
        setTimeout(() => {
            const btn = document.getElementById('news-continue-btn');
            btn.classList.remove('opacity-0', 'translate-y-4');
        }, 3000);
    },

    renderTravelerMap: function (data, container) {
        // Automatically find the first valid location to center the map
        let mapCenter = [51.505, -0.09]; // Default fallback
        let mapZoom = 2; // World view fallback

        // Helper to validate coords (defined locally since isValidCoord might not be available yet)
        const isValidCoord = (coord) => {
            return Array.isArray(coord) &&
                coord.length === 2 &&
                typeof coord[0] === 'number' &&
                typeof coord[1] === 'number' &&
                !isNaN(coord[0]) &&
                !isNaN(coord[1]) &&
                isFinite(coord[0]) &&
                isFinite(coord[1]);
        };

        if (data.pins && data.pins.length > 0) {
            const firstValidPin = data.pins.find(p => isValidCoord(p.coords));
            if (firstValidPin) {
                mapCenter = firstValidPin.coords;
                mapZoom = 10; // Provide a broader overview for the initial view
            }
        }

        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-40"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
                <div class="news-grain absolute inset-0 opacity-20 pointer-events-none"></div>
            </div>

            <div class="min-h-screen flex flex-col items-center justify-start py-6 md:py-10 px-4 relative z-10 overflow-hidden">
                <!-- Map Header -->
                <div class="text-center mb-6 md:mb-8 relative z-30">
                    <div class="inline-block relative">
                        <h2 class="font-serif text-4xl md:text-5xl font-bold text-vintage-ink italic tracking-tight relative z-10">
                            Our <span class="not-italic font-black text-ribbon-red border-b-4 border-cardboard/30 pb-1">Adventure</span>
                        </h2>
                        <div class="absolute -bottom-2 left-0 right-0 h-3 bg-ribbon-red/10 -skew-x-6 -z-0 rounded-sm"></div>
                    </div>
                    <div class="mt-4 flex items-center justify-center gap-3">
                        <div class="h-px w-8 bg-gradient-to-r from-transparent to-ribbon-red/30"></div>
                        <p class="font-mono text-[10px] md:text-xs text-vintage-ink/60 tracking-[0.25em] uppercase font-semibold">
                            <span class="text-ribbon-red font-bold">${data.pins ? data.pins.length : 0}</span> Marks the Spots Where Time Stood Still
                        </p>
                        <div class="h-px w-8 bg-gradient-to-l from-transparent to-ribbon-red/30"></div>
                    </div>
                </div>

                <div class="relative w-full max-w-5xl group">
                    <div class="absolute -top-4 -left-4 w-32 h-10 bg-white/40 backdrop-blur-sm -rotate-45 z-30 shadow-sm border-x border-black/5 opacity-80 pointer-events-none"></div>
                    <div class="absolute -bottom-4 -right-4 w-32 h-10 bg-white/30 backdrop-blur-sm -rotate-45 z-30 shadow-sm border-x border-black/5 opacity-80 pointer-events-none"></div>
                    
                    <div class="relative h-[400px] md:h-[500px] rounded-sm border-[8px] md:border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden bg-[#e5e0d0] map-perspective transition-transform duration-700">
                        <!-- Loading Overlay - Vintage Explorer Style -->
                        <div id="map-loading" class="absolute inset-0 z-50 flex items-center justify-center bg-[#e5e0d0] transition-opacity duration-500">
                            <div class="text-center relative">
                                <!-- Decorative vintage border frame -->
                                <div class="absolute -inset-8 border border-vintage-ink/20 rounded-sm"></div>
                                <div class="absolute -inset-6 border border-vintage-ink/10 rounded-sm"></div>
                                
                                <!-- Compass Rose -->
                                <div class="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-5">
                                    <!-- Outer ring -->
                                    <div class="absolute inset-0 rounded-full border-2 border-vintage-ink/30"></div>
                                    <div class="absolute inset-2 rounded-full border border-vintage-ink/20"></div>
                                    <!-- Cardinal points -->
                                    <div class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-serif font-bold text-vintage-ink/60">N</div>
                                    <div class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-serif font-bold text-vintage-ink/60">S</div>
                                    <div class="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-serif font-bold text-vintage-ink/60">W</div>
                                    <div class="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-serif font-bold text-vintage-ink/60">E</div>
                                    <!-- Spinning needle -->
                                    <div class="absolute inset-0 animate-[spin_3s_linear_infinite]">
                                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 
                                            border-l-[6px] border-r-[6px] border-b-[20px] 
                                            border-l-transparent border-r-transparent border-b-ribbon-red"></div>
                                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 
                                            border-l-[6px] border-r-[6px] border-t-[20px] 
                                            border-l-transparent border-r-transparent border-t-vintage-ink/40"></div>
                                    </div>
                                    <!-- Center dot -->
                                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-vintage-ink rounded-full border-2 border-[#e5e0d0]"></div>
                                </div>
                                
                                <!-- Loading text -->
                                <p id="map-loading-text" class="handwritten text-lg md:text-xl text-vintage-ink/80 tracking-wide">Unfolding the map...</p>
                                
                                <!-- Decorative dots -->
                                <div class="flex items-center justify-center gap-2 mt-3">
                                    <div class="w-1.5 h-1.5 rounded-full bg-ribbon-red/40 animate-bounce" style="animation-delay: 0s"></div>
                                    <div class="w-1.5 h-1.5 rounded-full bg-ribbon-red/40 animate-bounce" style="animation-delay: 0.2s"></div>
                                    <div class="w-1.5 h-1.5 rounded-full bg-ribbon-red/40 animate-bounce" style="animation-delay: 0.4s"></div>
                                </div>
                            </div>
                        </div>
                        <!-- Real Map Container (No filters here) -->
                        <div id="leaflet-map" class="absolute inset-0 z-10"></div>
                        
                        <!-- Specific Map Filter Overlay (Targeting Tiles Only) -->
                        <style>
                            .leaflet-tile-pane {
                                filter: grayscale(100%) sepia(40%) contrast(110%) brightness(90%);
                            }
                        </style>

                        <!-- Grain Overlay -->
                        <div class="absolute inset-0 pointer-events-none z-20 opacity-30 mix-blend-multiply" style="background-image: url('assets/textures/stardust.png')"></div>
                    </div>
                </div>

                <div id="map-continue-btn" class="mt-6 md:mt-10 opacity-0 transition-all duration-1000 relative z-30 transform translate-y-4">
                    <button onclick="app.nextPage()" class="group flex flex-col items-center gap-2">
                        <span class="font-body text-vintage-ink/40 text-xs tracking-[0.3em] uppercase hover:text-vintage-ink transition-colors duration-300">
                            ${data.buttonText || 'Continue'}
                        </span>
                        <div class="h-px w-10 bg-vintage-ink/10 group-hover:w-20 group-hover:bg-ribbon-red/40 transition-all duration-500"></div>
                    </button>

                    <!-- Brand Logo as Map Credits -->
                    <div class="flex items-center gap-2 text-primary opacity-30 hover:opacity-100 transition-opacity mt-8 mb-4">
                        <span class="material-symbols-outlined scale-75" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                            diamond
                        </span>
                        <h2 class="text-[10px] font-bold uppercase tracking-widest">
                            FOR YOU, ALWAYS
                        </h2>
                    </div>
                </div>

                <!-- Discovery Popup - Vintage Explorer Log -->
                <div id="discovery-popup" class="fixed inset-0 z-[60] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-all duration-500">
                    <div class="absolute inset-0 bg-vintage-ink/60 backdrop-blur-sm"></div>
                    
                    <!-- Vintage Travel Document -->
                    <div class="relative bg-[#f5f1e8] p-1 max-w-md w-full transform scale-90 transition-transform duration-500 shadow-2xl">
                        <!-- Outer border -->
                        <div class="border-2 border-vintage-ink/30 p-1">
                            <!-- Inner border with decorative corners -->
                            <div class="border border-vintage-ink/20 p-6 md:p-8 relative">
                                <!-- Corner ornaments -->
                                <div class="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-ribbon-red/60"></div>
                                <div class="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-ribbon-red/60"></div>
                                <div class="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-ribbon-red/60"></div>
                                <div class="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-ribbon-red/60"></div>
                                
                                <!-- Header -->
                                <div class="text-center mb-6">
                                    <!-- Compass icon -->
                                    <div class="relative w-14 h-14 mx-auto mb-3">
                                        <div class="absolute inset-0 rounded-full border-2 border-vintage-ink/30"></div>
                                        <div class="absolute inset-2 rounded-full border border-ribbon-red/40"></div>
                                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <span class="material-symbols-outlined text-2xl text-ribbon-red">explore</span>
                                        </div>
                                    </div>
                                    
                                    <h3 class="font-serif text-xl md:text-2xl font-bold text-vintage-ink tracking-wide">EXPEDITION LOG</h3>
                                    <div class="flex items-center justify-center gap-2 mt-1">
                                        <div class="h-px w-8 bg-vintage-ink/20"></div>
                                        <span class="text-[10px] uppercase tracking-[0.3em] text-vintage-ink/50">Journey Recorded</span>
                                        <div class="h-px w-8 bg-vintage-ink/20"></div>
                                    </div>
                                </div>
                                
                                <!-- Vintage Stats Table -->
                                <div class="relative mb-6">
                                    <!-- Table header -->
                                    <div class="flex border-b-2 border-vintage-ink/20 pb-2 mb-3">
                                        <div class="flex-1 text-center">
                                            <span class="text-[10px] uppercase tracking-wider text-vintage-ink/50 font-bold">Destinations</span>
                                        </div>
                                        <div class="flex-1 text-center border-l border-r border-vintage-ink/10">
                                            <span class="text-[10px] uppercase tracking-wider text-vintage-ink/50 font-bold">Distance</span>
                                        </div>
                                        <div class="flex-1 text-center">
                                            <span class="text-[10px] uppercase tracking-wider text-vintage-ink/50 font-bold">Memories</span>
                                        </div>
                                    </div>
                                    <!-- Stats values -->
                                    <div class="flex py-3 bg-vintage-ink/5">
                                        <div class="flex-1 text-center">
                                            <div id="discovery-locations" class="font-serif text-3xl font-bold text-ribbon-red">0</div>
                                        </div>
                                        <div class="flex-1 text-center border-l border-r border-vintage-ink/10">
                                            <div class="flex items-baseline justify-center">
                                                <span id="discovery-distance" class="font-serif text-3xl font-bold text-ribbon-red">0</span>
                                                <span class="text-xs text-vintage-ink/40 ml-0.5">km</span>
                                            </div>
                                        </div>
                                        <div class="flex-1 text-center">
                                            <div id="discovery-memories" class="font-serif text-3xl font-bold text-ribbon-red">0</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Message in typewriter style -->
                                <div id="discovery-message" class="handwritten text-base text-vintage-ink/80 text-center mb-6 leading-relaxed px-2">
                                    <!-- Stats message inserted here -->
                                </div>
                                
                                <!-- Decorative stamp -->
                                <div class="absolute -top-3 -right-3 transform rotate-12 opacity-80">
                                    <div class="w-16 h-16 rounded-full border-2 border-dashed border-ribbon-red/40 flex items-center justify-center bg-[#f5f1e8]/90">
                                        <div class="text-center">
                                            <span class="material-symbols-outlined text-lg text-ribbon-red">check</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Continue button - vintage style -->
                                <button onclick="app.closeDiscoveryPopup()" class="w-full group relative overflow-hidden">
                                    <div class="border border-vintage-ink/30 py-3 px-6 relative">
                                        <span class="font-mono text-xs uppercase tracking-[0.2em] text-vintage-ink/70 group-hover:text-ribbon-red transition-colors">
                                            Mark as Explored
                                        </span>
                                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-ribbon-red group-hover:w-full transition-all duration-300"></div>
                                    </div>
                                </button>
                                
                                <!-- Bottom decoration -->
                                <div class="flex items-center justify-center gap-1 mt-4 opacity-40">
                                    <div class="w-1 h-1 rounded-full bg-vintage-ink"></div>
                                    <div class="w-1 h-1 rounded-full bg-vintage-ink"></div>
                                    <div class="w-1 h-1 rounded-full bg-vintage-ink"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Journey Animation
        setTimeout(() => {
            this.initMapWithJourney(data, mapCenter, mapZoom);
        }, 300);
    },

    // Map state for journey animation
    mapJourneyState: {
        map: null,
        markers: [],
        pins: [],
        mapCenter: null,
        mapZoom: null,
        completed: false
    },

    // Initialize map with journey animation
    initMapWithJourney: async function (data, mapCenter, mapZoom) {
        // Validate mapCenter before using
        if (!this.isValidCoord(mapCenter)) {
            console.warn('[MapInit] Invalid mapCenter, using default');
            mapCenter = [51.505, -0.09];
            mapZoom = 2;
        }

        this.mapJourneyState.mapCenter = mapCenter;
        this.mapJourneyState.mapZoom = mapZoom;
        this.mapJourneyState.pins = data.pins || [];
        this.mapJourneyState.markers = [];
        this.mapJourneyState.completed = false;

        const loadingText = document.getElementById('map-loading-text');

        // Phase 1: Loading
        if (loadingText) loadingText.textContent = 'Unfolding the map...';
        await this.delay(800);

        if (!window.L) {
            if (loadingText) loadingText.textContent = 'The map seems lost...';
            return;
        }

        // Phase 2: Setup Map
        if (loadingText) loadingText.textContent = 'Charting the course...';
        await this.delay(500);

        // Initialize map with try-catch
        let map;
        try {
            map = L.map('leaflet-map', {
                center: mapCenter,
                zoom: mapZoom,
                zoomControl: false,
                attributionControl: false
            });
        } catch (e) {
            console.error('[MapInit] Error creating map:', e);
            if (loadingText) loadingText.textContent = 'The compass is broken...';
            return;
        }
        this.mapJourneyState.map = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Add zoom control at bottom right for mobile
        if (window.innerWidth < 768) {
            L.control.zoom({ position: 'bottomright' }).addTo(map);
        }

        // Hide loading
        const loadingOverlay = document.getElementById('map-loading');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }

        // Phase 3: Journey Animation - Add markers one by one (only if we have valid pins)
        const validPins = this.mapJourneyState.pins.filter(p => this.isValidCoord(p.coords));
        if (validPins.length > 0) {
            await this.animateMapJourney();
        } else {
            console.warn('[MapInit] No valid pins for journey animation');
            // Just show the continue button
            const continueBtn = document.getElementById('map-continue-btn');
            if (continueBtn) {
                continueBtn.classList.remove('opacity-0', 'translate-y-4');
            }
        }

        // Show continue button
        const continueBtn = document.getElementById('map-continue-btn');
        if (continueBtn) {
            continueBtn.classList.remove('opacity-0', 'translate-y-4');
        }
    },

    // Helper: Validate coordinates are valid numbers
    isValidCoord: function (coord) {
        return Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number' &&
            !isNaN(coord[0]) &&
            !isNaN(coord[1]) &&
            isFinite(coord[0]) &&
            isFinite(coord[1]);
    },

    // Animate markers appearing one by one with dramatic zoom effect
    animateMapJourney: async function () {
        const pins = this.mapJourneyState.pins;
        const map = this.mapJourneyState.map;
        const mapCenter = this.mapJourneyState.mapCenter;
        const mapZoom = this.mapJourneyState.mapZoom;

        // Filter only valid pins first
        const validPins = pins.filter(pin => this.isValidCoord(pin.coords));
        console.log('[Journey] Starting animation with', validPins.length, 'valid pins');

        if (validPins.length === 0) {
            console.warn('[Journey] No valid pins to animate');
            return;
        }

        for (let i = 0; i < validPins.length; i++) {
            const pin = validPins[i];
            const coords = pin.coords;

            console.log('[Journey] Animating pin', i, 'at coords:', coords);

            // PHASE 1: Quick fly to the location (zoom in)
            const flyZoom = window.innerWidth < 768 ? 15 : 14;
            try {
                map.flyTo(coords, flyZoom, {
                    duration: 1.2,
                    easeLinearity: 0.2
                });
            } catch (e) {
                console.error('[Journey] Error flying to pin', i, e);
                continue;
            }

            // Wait for flyTo to complete
            await this.delay(1400);

            // PHASE 2: Create and animate marker appearing
            const markerIcon = L.divIcon({
                className: 'custom-leaflet-pin journey-marker',
                html: `
                    <div class="pin-group relative cursor-pointer" id="marker-${i}" style="transform: translate(-10px, -30px) scale(0); opacity: 0; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">
                        <div class="pin-hover-effect">
                            <span class="material-symbols-outlined text-ribbon-red text-4xl drop-shadow-md">location_on</span>
                            <div class="absolute inset-x-0 bottom-1 w-2 h-1 bg-black/40 blur-sm rounded-full mx-auto"></div>
                            <div class="absolute inset-0 bg-ribbon-red rounded-full opacity-30 animate-ping -z-10"></div>
                        </div>
                        
                        <div id="popover-${i}" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 md:mb-6 w-[180px] md:w-52 opacity-0 scale-75 pointer-events-none transition-all duration-500 ease-out z-[1000]">
                            <div class="polaroid-frame !p-2 md:!p-2.5 !pb-8 md:!pb-10 shadow-[0_15px_30px_rgba(0,0,0,0.3)] md:shadow-[0_25px_50px_rgba(0,0,0,0.35)] border-2 border-stone-200/50 bg-white origin-bottom">
                                <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-12 md:w-14 h-4 md:h-5 bg-yellow-100/60 backdrop-blur-sm border-x border-black/5 z-20"></div>
                                <div class="bg-stone-100 overflow-hidden aspect-square rounded-sm relative w-full">
                                    <img src="${pin.photo || ''}" class="block !w-full !h-full object-cover object-top" style="filter: none !important;" alt="Memory" onerror="this.style.display='none'">
                                </div>
                                <div class="mt-3 md:mt-5 px-1 md:px-2 whitespace-normal">
                                    <p class="font-marker text-base md:text-lg leading-snug text-vintage-ink/90">${pin.label || pin.note || ''}</p>
                                    <p class="text-[10px] md:text-xs mt-1 md:mt-2 font-handwritten text-vintage-ink/60 tracking-wider text-right italic">${pin.date || ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            let marker;
            try {
                marker = L.marker(coords, { icon: markerIcon }).addTo(map);
                this.mapJourneyState.markers.push(marker);
                // Add click handler
                marker.on('click', () => this.handleMarkerClick(i, pin));
            } catch (e) {
                console.error('[Journey] Error creating marker for pin', i, e);
                continue;
            }

            // Animate marker appearing with bounce
            const markerEl = document.getElementById(`marker-${i}`);
            if (markerEl) {
                markerEl.style.transform = 'translate(-10px, -30px) scale(1.3)';
                markerEl.style.opacity = '1';
                await this.delay(100);
                markerEl.style.transform = 'translate(-10px, -30px) scale(1)';
            }

            // Play dramatic sound
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 0.15);

            // Brief pause to let user see the location
            await this.delay(600);

            // PHASE 3: Quick zoom out to see all markers so far (if not the last one)
            if (i < validPins.length - 1) {
                const shownPins = validPins.slice(0, i + 1);
                if (shownPins.length > 1) {
                    try {
                        const bounds = L.latLngBounds(shownPins.map(p => p.coords));
                        map.flyToBounds(bounds, {
                            padding: [60, 60],
                            duration: 1,
                            easeLinearity: 0.25
                        });
                    } catch (e) {
                        console.error('[Journey] Error in flyToBounds:', e);
                        // Fallback to map center
                        try {
                            map.flyTo(mapCenter, mapZoom, { duration: 1 });
                        } catch (e2) {
                            console.error('[Journey] Fallback flyTo also failed:', e2);
                        }
                    }
                    await this.delay(1200);
                } else {
                    try {
                        map.flyTo(mapCenter, mapZoom, { duration: 1 });
                    } catch (e) {
                        console.error('[Journey] Error flying to mapCenter:', e);
                    }
                    await this.delay(1200);
                }
            }

            // Brief pause before next location
            await this.delay(300);
        }

        // Final zoom to see all markers
        if (validPins.length > 1) {
            try {
                const bounds = L.latLngBounds(validPins.map(p => p.coords));
                map.flyToBounds(bounds, {
                    padding: [80, 80],
                    duration: 1.5,
                    easeLinearity: 0.2
                });
            } catch (e) {
                console.error('[Journey] Error in final flyToBounds:', e);
                try {
                    map.flyTo(mapCenter, mapZoom, { duration: 1.2 });
                } catch (e2) {
                    console.error('[Journey] Final fallback flyTo also failed:', e2);
                }
            }
        } else if (validPins.length === 1) {
            // Just one pin - zoom out a bit to give context
            try {
                map.flyTo(validPins[0].coords, 10, { duration: 1.2 });
            } catch (e) {
                console.error('[Journey] Error in final flyTo for single pin:', e);
            }
        }

        // Mark journey as completed
        this.mapJourneyState.completed = true;

        // Show discovery popup after all markers with delay
        setTimeout(() => this.showDiscoveryPopup(), 1800);
    },

    // Handle marker click
    handleMarkerClick: function (index, pin) {
        if (!pin || !this.isValidCoord(pin.coords)) {
            console.warn('[MarkerClick] Invalid pin or coordinates');
            return;
        }

        const popover = document.getElementById(`popover-${index}`);
        const map = this.mapJourneyState.map;
        const isVisible = popover && popover.classList.contains('opacity-100');

        // Close all others
        document.querySelectorAll('[id^="popover-"]').forEach(p => {
            p.classList.add('opacity-0', 'scale-75', 'pointer-events-none');
            p.classList.remove('opacity-100', 'scale-100');
        });

        if (!isVisible) {
            // ZOOM IN
            const zoomLevel = window.innerWidth < 768 ? 17 : 16;
            try {
                map.flyTo(pin.coords, zoomLevel, { duration: 1.5, easeLinearity: 0.25 });
            } catch (e) {
                console.error('[MarkerClick] Error in flyTo:', e);
            }

            if (popover) {
                popover.classList.remove('opacity-0', 'scale-75', 'pointer-events-none');
                popover.classList.add('opacity-100', 'scale-100');
            }
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 0.2);
        } else {
            // ZOOM OUT
            try {
                map.flyTo(this.mapJourneyState.mapCenter, this.mapJourneyState.mapZoom, { duration: 1.5 });
            } catch (e) {
                console.error('[MarkerClick] Error in flyTo (zoom out):', e);
            }
        }
    },

    // Calculate map statistics
    calculateMapStats: function () {
        const pins = this.mapJourneyState.pins || [];
        const validPins = pins.filter(p => this.isValidCoord(p.coords));
        const locations = validPins.length;

        console.log('[MapStats] Calculating stats for', locations, 'valid locations');

        if (locations < 1) {
            return { html: '<p class="text-vintage-ink">Start adding locations to see your journey stats!</p>', locations: 0, distance: 0 };
        }

        // Calculate total distance between consecutive pins
        let totalDistance = 0;

        for (let i = 1; i < validPins.length; i++) {
            if (!this.isValidCoord(validPins[i - 1].coords) || !this.isValidCoord(validPins[i].coords)) continue;

            const dist = this.calculateDistance(
                validPins[i - 1].coords[0], validPins[i - 1].coords[1],
                validPins[i].coords[0], validPins[i].coords[1]
            );
            if (!isNaN(dist) && isFinite(dist)) {
                totalDistance += dist;
                console.log('[MapStats] Distance from', i - 1, 'to', i, ':', dist.toFixed(2), 'km');
            }
        }

        const roundedDistance = Math.round(totalDistance);
        console.log('[MapStats] Total distance:', roundedDistance, 'km');

        let message = '';
        if (locations === 1) {
            message = `<p class="text-vintage-ink font-medium text-base">Together we've explored <span class="text-ribbon-red font-bold text-lg">1 special place</span> that holds our precious memories.</p>`;
        } else if (locations <= 3) {
            message = `<p class="text-vintage-ink font-medium text-base">Together we've explored <span class="text-ribbon-red font-bold text-lg">${locations} different places</span>.</p>`;
        } else {
            message = `<p class="text-vintage-ink font-medium text-base">Our journey spans <span class="text-ribbon-red font-bold text-lg">${locations} memorable places</span>, covering approximately <span class="text-ribbon-red font-bold text-lg">${roundedDistance} km</span> of adventures together.</p>`;
        }

        return { html: message, locations, distance: roundedDistance };
    },

    // Calculate distance between two coordinates (Haversine formula)
    calculateDistance: function (lat1, lon1, lat2, lon2) {
        // Validate all inputs
        if (typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
            typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
            isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2) ||
            !isFinite(lat1) || !isFinite(lon1) || !isFinite(lat2) || !isFinite(lon2)) {
            console.warn('[Distance] Invalid coordinates:', lat1, lon1, lat2, lon2);
            return 0;
        }

        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return isNaN(distance) || !isFinite(distance) ? 0 : distance;
    },

    // Show discovery popup
    showDiscoveryPopup: function () {
        console.log('[Discovery] Showing discovery popup');
        const popup = document.getElementById('discovery-popup');
        const messageEl = document.getElementById('discovery-message');
        const locationsEl = document.getElementById('discovery-locations');
        const distanceEl = document.getElementById('discovery-distance');
        const memoriesEl = document.getElementById('discovery-memories');

        if (!popup) {
            console.error('[Discovery] Popup element not found!');
            return;
        }

        const stats = this.calculateMapStats();
        console.log('[Discovery] Stats:', stats);

        // Update message
        if (messageEl) {
            messageEl.innerHTML = stats.html;
        }

        // Update stats numbers with animation
        if (locationsEl) {
            this.animateNumber(locationsEl, 0, stats.locations, 1000);
        }
        if (distanceEl) {
            this.animateNumber(distanceEl, 0, stats.distance, 1000);
        }
        if (memoriesEl) {
            this.animateNumber(memoriesEl, 0, stats.locations, 1000);
        }

        popup.classList.remove('opacity-0', 'pointer-events-none');
        popup.classList.add('opacity-100', 'pointer-events-auto');

        const modal = popup.querySelector('.relative');
        if (modal) {
            modal.classList.remove('scale-90');
            modal.classList.add('scale-100');
        }

        this.playSfx('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 0.4);
        console.log('[Discovery] Popup displayed');
    },

    // Animate number counting up
    animateNumber: function (element, start, end, duration) {
        if (!element) return;
        const range = end - start;
        const minTimer = 50;
        let stepTime = Math.abs(Math.floor(duration / range));
        stepTime = Math.max(stepTime, minTimer);

        let startTime = new Date().getTime();
        let endTime = startTime + duration;
        let timer;

        const run = () => {
            let now = new Date().getTime();
            let remaining = Math.max((endTime - now) / duration, 0);
            let value = Math.round(end - (remaining * range));
            element.textContent = value;
            if (value == end) {
                clearInterval(timer);
            }
        };

        timer = setInterval(run, stepTime);
        run();
    },

    // Close discovery popup
    closeDiscoveryPopup: function () {
        const popup = document.getElementById('discovery-popup');
        if (!popup) return;

        popup.classList.add('opacity-0', 'pointer-events-none');
        popup.classList.remove('opacity-100', 'pointer-events-auto');

        const modal = popup.querySelector('.relative');
        if (modal) {
            modal.classList.add('scale-90');
            modal.classList.remove('scale-100');
        }
    },

    // Helper: delay function
    delay: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },



    renderAnalogVoiceNote: function (data, container) {
        // Hardcoded defaults for removed fields
        const title = data.title || "A <span>Message</span> for You";
        const sideText = data.sideText || "For You";

        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-50"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
                <div class="crumpled-effect opacity-10"></div>
            </div>

            <div class="min-h-screen flex flex-col items-center justify-center py-8 px-4 relative z-10 overflow-hidden">
                <div class="w-full text-center z-10 mb-8 md:mb-12">
                    <h1 class="font-serif text-3xl md:text-5xl text-ink-warm mb-1 tracking-tight animate-fade-in-down">
                        ${this.formatTitle(title)}
                    </h1>
                    <p class="font-ink text-xl md:text-2xl opacity-70 animate-fade-in" style="animation-delay: 0.5s">Recordings of a heart</p>
                </div>

                <div class="relative group cursor-pointer" onclick="app.toggleTapeAudio('${data.audioUrl}')">
                    <div id="cassette" class="cassette-shell animate-fade-in-up">
                        <div class="screw top-5 left-5" style="--screw-rot: 25deg"></div>
                        <div class="screw top-5 right-5" style="--screw-rot: 125deg"></div>
                        <div class="screw bottom-5 left-5" style="--screw-rot: -15deg"></div>
                        <div class="screw bottom-5 right-5" style="--screw-rot: 75deg"></div>
                        
                        <div class="sticker-label">
                            <div class="flex items-end gap-3 mb-1">
                                <span class="text-[10px] font-bold opacity-40 tracking-[0.2em] font-body">SIDE A</span>
                                <div class="border-b-[1.5px] border-ink-blue/20 w-full mb-1">
                                    <p class="font-ink text-3xl px-2 text-ink-blue rotate-[-0.5deg] leading-none tracking-tight">${sideText}</p>
                                </div>
                            </div>
                            <div class="mt-8 flex justify-between px-2 opacity-30 text-[9px] font-mono tracking-widest">
                            <span>NR [OFF]</span>
                            <span>TYPE I NORMAL BIAS</span>
                        </div>
                        </div>

                        <div class="tape-window">
                            <div class="window-reflection"></div>
                            <div class="tape-bulk-left"></div>
                            <div class="tape-bulk-right"></div>
                            <div class="magnetic-tape-path"></div>
                            
                            <div class="reel-hub">
                                <div id="reel-left" class="reel-teeth-complex">
                                    <div class="gear-tooth" style="transform: translate(-50%, -50%) rotate(0deg)"></div>
                                    <div class="gear-tooth" style="transform: translate(-50%, -50%) rotate(60deg)"></div>
                                    <div class="gear-tooth" style="transform: translate(-50%, -50%) rotate(120deg)"></div>
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <div class="w-5 h-5 rounded-full bg-[#080808]"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="reel-hub">
                                <div id="reel-right" class="reel-teeth-complex">
                                    <div class="gear-tooth" style="transform: translate(-50%, -50%) rotate(30deg)"></div>
                                    <div class="gear-tooth" style="transform: translate(-50%, -50%) rotate(90deg)"></div>
                                    <div class="gear-tooth" style="transform: translate(-50%, -50%) rotate(150deg)"></div>
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <div class="w-5 h-5 rounded-full bg-[#080808]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="w-4/5 h-16 bg-black/5 mt-auto rounded-t-3xl flex justify-around items-center px-20 border-t border-black/10">
                            <div class="w-4 h-4 rounded-full bg-black/20 shadow-inner"></div>
                            <div class="w-4 h-4 rounded-full bg-black/20 shadow-inner"></div>
                        </div>
                    </div>

                    <div class="hand-arrow-container hidden xl:flex animate-fade-in" style="animation-delay: 1.2s; right: -210px;">
                        <span class="font-scribble text-2xl rotate-[10deg] mb-2 text-ink-warm/70 translate-x-4">Press to Listen</span>
                        <svg class="opacity-40 text-ink-warm -rotate-[10deg]" height="90" viewBox="0 0 100 100" width="90">
                            <!-- Curve pointing from top-right to bottom-left -->
                            <path d="M85 20 C 75 50, 45 70, 15 80" fill="none" stroke="currentColor" stroke-dasharray="3 6" stroke-linecap="round" stroke-width="2.5"></path>
                            <!-- Arrowhead at the bottom-left end -->
                            <path d="M32 75 L15 80 L22 62" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path>
                        </svg>
                    </div>
                </div>

                <div id="tape-continue-btn" class="continue-btn-tape opacity-0 translate-y-4 flex flex-col items-center gap-6" onclick="app.nextPage()">
                    <span>${data.buttonText}</span>
                    
                    <!-- Brand Logo di bawah tombol continue -->
                    <div class="flex items-center gap-2 text-primary opacity-30 hover:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined scale-75" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                            diamond
                        </span>
                        <h2 class="text-[10px] font-bold uppercase tracking-widest">
                            FOR YOU, ALWAYS
                        </h2>
                    </div>
                </div>
            </div>
        `;

        // Entry sound (Mechanical click)
        setTimeout(() => {
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.3);
        }, 500);
    },

    toggleTapeAudio: async function (url) {
        const reelLeft = document.getElementById('reel-left');
        const reelRight = document.getElementById('reel-right');
        const cassette = document.getElementById('cassette');

        if (!this.voiceNoteTrack || this.voiceNoteTrack.getAttribute('data-original-src') !== url) {
            let audioSrc = url;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                audioSrc = URL.createObjectURL(blob);
            } catch (e) { }

            if (!this.voiceNoteTrack) {
                this.voiceNoteTrack = new Audio(audioSrc);
                this.voiceNoteTrack.id = 'voice-note-player';
                this.voiceNoteTrack.loop = true;
                document.body.appendChild(this.voiceNoteTrack);
            } else {
                this.voiceNoteTrack.src = audioSrc;
            }
            this.voiceNoteTrack.setAttribute('data-original-src', url);
            this.voiceNoteTrack.load();
        }

        if (this.voiceNoteTrack.paused) {
            // Stop BG music completely when starting voice note
            if (this.bgMusic && !this.isMuted) {
                this.fadeVolume(this.bgMusic, 0, 1000);
            }

            this.voiceNoteTrack.play().catch(e => { });
            this.voiceNoteTrack.volume = 0;
            if (!this.isMuted) this.fadeVolume(this.voiceNoteTrack, 0.6, 1500);

            if (reelLeft) reelLeft.classList.add('animate-spin-slow');
            if (reelRight) reelRight.classList.add('animate-spin-slow');
            if (cassette) cassette.style.transform = 'scale(0.99)';

            setTimeout(() => {
                const btn = document.getElementById('tape-continue-btn');
                if (btn) btn.classList.remove('opacity-0', 'translate-y-4');
            }, 3000);
        } else {
            // Restore BG music volume
            if (this.bgMusic && !this.isMuted) {
                this.fadeVolume(this.bgMusic, 0.3, 1000);
            }
            this.fadeVolume(this.voiceNoteTrack, 0, 800);

            if (reelLeft) reelLeft.classList.remove('animate-spin-slow');
            if (reelRight) reelRight.classList.remove('animate-spin-slow');
            if (cassette) cassette.style.transform = 'scale(1)';
        }

        if ('vibrate' in navigator) navigator.vibrate(30);
    },



    renderTimeCapsuleStitch: function (data, container) {
        // Hardcoded defaults for removed fields
        const title = data.title || "The Time Capsule";
        const subtitle = data.subtitle || "Seal your thoughts for the future";
        const placeholder = data.placeholder || "Write a message to your future self...";
        const buttonText = data.buttonText || "Seal Capsule";

        container.innerHTML = `
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-50"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>
            
            <div class="min-h-screen relative z-10 pt-20 pb-12 md:py-12 px-4">
                <input id="tc-seal-toggle" type="checkbox" class="hidden"/>
                
                <div class="tc-content max-w-6xl w-full flex flex-col items-center gap-8 relative z-10 mx-auto">
                    <div class="text-center space-y-2 mb-8 md:mb-4 animate-fade-in-down">
                        <h1 class="font-serif text-4xl md:text-5xl italic tracking-tight text-ink-black">${title}</h1>
                        <p class="font-body text-base md:text-lg opacity-60 max-w-md mx-auto">${subtitle}</p>
                    </div>

                    <div id="tc-box-target" class="tc-memory-box animate-scale-in" style="animation-delay: 0.5s">
                        <div class="tc-box-flap tc-flap-left"></div>
                        <div class="tc-box-flap tc-flap-right"></div>
                        <div class="tc-box-tape"></div>
                    </div>

                    <!-- Draggable Envelope -->
                    <div id="tc-drag-envelope" class="tc-envelope-container" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(5deg); z-index: 100;">
                        <div class="tc-envelope cursor-pointer" onclick="app.openLetterPopup()">
                            <div class="tc-envelope-flap"></div>
                            <div class="relative z-0 p-12 text-center w-full">
                                <p class="font-handwriting text-xl text-ink-black/40 italic">Click to write...</p>
                                <div class="w-full h-[1px] bg-gray-200 mt-4 mb-3"></div>
                                <div class="w-3/4 h-[1px] bg-gray-100 mx-auto"></div>
                            </div>
                            <!-- Wax Seal Area (Hidden until inside box) -->
                            <div id="tc-seal-area" class="tc-wax-seal-area absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] z-10 opacity-0 pointer-events-none" onclick="event.stopPropagation()">
                                <div class="tc-liquid-wax-container">
                                    <div id="tc-wax-drop" class="tc-wax-drop"></div>
                                </div>
                                <div id="tc-wax-blob-static" class="tc-wax-blob opacity-0"></div>
                                <div id="tc-stamped-seal-final" class="tc-stamped-seal">
                                    <span class="tc-monogram">${data.inisial}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Physical Letter (Shown after writing) -->
                    <div id="tc-physical-letter" class="tc-letter-physical">
                        <div class="font-serif text-xs uppercase tracking-widest opacity-30 mb-8">${new Date().toLocaleDateString()}</div>
                        <div id="tc-letter-content-preview" class="font-handwriting text-xl leading-relaxed text-ink-black/70"></div>
                        <div class="tc-letter-line"></div>
                        <div class="tc-letter-line"></div>
                        <div class="tc-letter-line"></div>
                    </div>

                    <div id="tc-ritual-controls" class="flex flex-col items-center animate-fade-in" style="opacity: 0; pointer-events: none;">
                        <button id="tc-seal-btn" onclick="app.executeInstantStamp()" class="group relative flex flex-col items-center gap-3 transition-transform hover:scale-110 active:scale-95">
                            <div class="w-16 h-16 bg-ribbon-red rounded-full shadow-lg flex items-center justify-center border-2 border-white/20">
                                <span class="material-symbols-outlined text-white/80">auto_fix_high</span>
                            </div>
                            <p class="font-serif text-[10px] uppercase tracking-[0.2em] text-ribbon-red font-bold">Seal the Vault</p>
                        </button>
                    </div>

                    <div class="tc-finish-btn-container mt-8 flex flex-col items-center">
                        <button id="tc-finish-btn" onclick="app.sealAndFinish()" class="font-serif text-sm uppercase tracking-[0.3em] py-4 px-12 border border-ink-charcoal/20 bg-white/50 hover:bg-ink-charcoal hover:text-white transition-all duration-500 rounded-full backdrop-blur-sm mb-12">
                            ${data.buttonText}
                        </button>

                        <!-- Brand Logo at the very end of the journey -->
                        <div id="tc-brand-signature" class="flex items-center gap-2 text-primary opacity-30 hover:opacity-100 transition-opacity pb-8">
                            <span class="material-symbols-outlined scale-75" style="font-variation-settings: 'FILL' 1, 'wght' 700;">
                                diamond
                            </span>
                            <h2 class="text-[10px] font-bold uppercase tracking-widest">
                                FOR YOU, ALWAYS
                            </h2>
                        </div>
                    </div>
                </div>

                <!-- Popup -->
                <div id="tc-letter-popup" class="tc-letter-popup text-ink-black px-4">
                    <div class="tc-letter-box">
                        <span class="tc-letter-close" onclick="app.closeLetterPopup()">CLOSE</span>
                        
                        <div class="mb-10 text-center">
                            <h2 class="font-serif text-3xl italic text-ink-black/80">A Note for Next Year</h2>
                            <div class="h-1 w-12 bg-ribbon-red/20 mx-auto mt-2"></div>
                        </div>
                        
                        <div class="space-y-8 flex-1 flex flex-col">
                            <div>
                                <label class="block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-black/30 mb-2">Recipient Email</label>
                                <input type="email" id="tc-letter-email" 
                                    placeholder="their-email@example.com" 
                                    class="w-full bg-transparent border-b border-black/10 py-3 font-body text-lg focus:outline-none focus:border-ribbon-red/40 text-ink-black placeholder:text-ink-black/10 transition-all" />
                            </div>
                            
                            <div class="flex-1 flex flex-col">
                                <label class="block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-black/30 mb-2">Your Message</label>
                                <textarea id="tc-letter-text" 
                                    class="w-full flex-1 bg-transparent border-none py-2 font-marker text-3xl leading-[1.6] resize-none focus:outline-none text-ink-black/80 placeholder:text-ink-black/10" 
                                    style="background-image: linear-gradient(transparent 39px, rgba(0,0,0,0.03) 39px); background-size: 100% 40px;"
                                    placeholder="${placeholder}"></textarea>
                            </div>

                            <div class="py-6 text-center mt-auto">
                                <button onclick="app.finishWritingLetter()" class="group relative px-10 py-3">
                                    <span class="relative z-10 font-serif text-xs uppercase tracking-[0.4em] text-ink-black/60 group-hover:text-ink-black transition-all">Done</span>
                                    <div class="absolute inset-0 border border-black/5 rounded-full scale-100 group-hover:scale-105 group-hover:bg-black/5 transition-all duration-300"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initTimeCapsuleInteractions();
        this.initWaxRitual();
    },



    initTimeCapsuleInteractions: function () {
        const box = document.getElementById('tc-box-target');
        const envelope = document.getElementById('tc-drag-envelope');
        const letter = document.getElementById('tc-physical-letter');
        const stamp = document.getElementById('tc-stamp-tool');
        const ritualControls = document.getElementById('tc-ritual-controls');

        let letterInEnvelope = false;
        let envelopeInBox = false;

        const placeLetterInEnvelope = () => {
            if (letterInEnvelope) return;
            letterInEnvelope = true;

            letter.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
            const envRect = envelope.getBoundingClientRect();
            const parentRect = letter.parentElement.getBoundingClientRect();

            letter.style.left = (envRect.left - parentRect.left + envRect.width / 2) + 'px';
            letter.style.top = (envRect.top - parentRect.top + envRect.height / 2) + 'px';
            letter.style.opacity = "0";
            letter.style.transform = "translate(-50%, -50%) scale(0.5) rotate(10deg)";

            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.2);

            setTimeout(() => {
                letter.style.display = 'none';
                envelope.querySelector('.tc-envelope').classList.add('has-letter');
                envelope.style.cursor = 'pointer';

                // Automatically place envelope in box after a short delay
                setTimeout(() => {
                    placeEnvelopeInBox();
                }, 300);
            }, 800);
        };

        const placeEnvelopeInBox = () => {
            if (!letterInEnvelope || envelopeInBox) return;
            envelopeInBox = true;

            envelope.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
            const boxRect = box.getBoundingClientRect();
            const parentRect = envelope.parentElement.getBoundingClientRect();

            envelope.style.left = (boxRect.left - parentRect.left + boxRect.width / 2) + 'px';
            envelope.style.top = (boxRect.top - parentRect.top + boxRect.height / 2) + 'px';
            envelope.style.transform = 'translate(-50%, -50%) rotate(-1.5deg)';

            box.classList.add('is-hovered');
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/265/265-preview.mp3', 0.3);

            setTimeout(() => {
                box.classList.remove('is-hovered');

                setTimeout(() => {
                    document.getElementById('tc-seal-area').style.opacity = '1';
                    document.getElementById('tc-seal-area').style.pointerEvents = 'auto';

                    // Show the Red Seal Button instead of the stamp
                    const ritualControls = document.getElementById('tc-ritual-controls');
                    ritualControls.style.opacity = '1';
                    ritualControls.style.pointerEvents = 'auto';
                }, 500);
            }, 1000);
        };

        letter.addEventListener('click', placeLetterInEnvelope);
        envelope.addEventListener('click', () => {
            if (!letterInEnvelope) {
                this.openLetterPopup();
            }
        });
    },

    executeInstantStamp: function () {
        const ritualControls = document.getElementById('tc-ritual-controls');
        const waxDrop = document.getElementById('tc-wax-drop');
        const finalSeal = document.getElementById('tc-stamped-seal-final');
        const finishBtn = document.querySelector('.tc-finish-btn-container');

        // 1. Play Sizzle & Impact Sound
        this.playSfx('https://assets.mixkit.co/active_storage/sfx/2561/2561-preview.mp3', 0.2);

        // 2. Animate the Seal appearing
        if (waxDrop) {
            waxDrop.style.opacity = '1';
            waxDrop.style.width = '85px';
            waxDrop.style.height = '85px';
        }

        setTimeout(() => {
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 0.8);
            if (waxDrop) waxDrop.style.opacity = '0';
            if (finalSeal) {
                finalSeal.style.opacity = '1';
                finalSeal.style.transform = 'scale(1)';
            }

            // 3. Reveal Final Button
            ritualControls.style.opacity = '0';
            ritualControls.style.pointerEvents = 'none';

            finishBtn.style.opacity = '1';
            finishBtn.style.pointerEvents = 'auto';
            finishBtn.style.transform = 'translateY(0)';
        }, 500);
    },



    playCinematicOutro: function () {
        const text = "Your message has been sealed.\n\nSee you in a year...";

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'cinematic-overlay';
        overlay.innerHTML = `<div class="cinematic-text">${text}</div>`;
        document.body.appendChild(overlay);

        // Fade out music slowly
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) {
            const fadeAudio = setInterval(() => {
                if (bgMusic.volume > 0.05) {
                    bgMusic.volume -= 0.05;
                } else {
                    bgMusic.pause();
                    clearInterval(fadeAudio);
                }
            }, 200);
        }

        // Trigger visual fade
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    },

    finishWritingLetter: function () {
        const text = document.getElementById('tc-letter-text').value;
        if (!text.trim()) return;

        const preview = document.getElementById('tc-letter-content-preview');
        preview.innerText = text;

        const physical = document.getElementById('tc-physical-letter');
        physical.classList.add('active');
        physical.style.display = 'block';
        physical.style.opacity = '1';

        this.closeLetterPopup();

        // Hide instructional text on envelope
        const envLabel = document.querySelector('#tc-drag-envelope .font-handwriting');
        if (envLabel) envLabel.style.opacity = '0.1';

        // Automatically place letter in envelope after a short delay
        setTimeout(() => {
            physical.click();
        }, 300);
    },

    initWaxRitual: function () {
        const waxDrop = document.getElementById('tc-wax-drop');
        const finalSeal = document.getElementById('tc-stamped-seal-final');
        const finishBtn = document.querySelector('.tc-finish-btn-container');

        // Initial hidden state for ritual
        finishBtn.style.opacity = '0';
        finishBtn.style.pointerEvents = 'none';
        if (finalSeal) {
            finalSeal.style.opacity = '0';
            finalSeal.style.transform = 'scale(0.8)';
        }
        if (waxDrop) {
            waxDrop.style.opacity = '1';
            waxDrop.style.width = '0';
            waxDrop.style.height = '0';
        }
    },

    openLetterPopup: function () {
        const popup = document.getElementById('tc-letter-popup');
        popup.classList.add('active');
        this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.2);
    },

    closeLetterPopup: function () {
        const popup = document.getElementById('tc-letter-popup');
        popup.classList.remove('active');
        this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.1);
    },

    sealAndFinish: async function () {
        const email = document.getElementById('tc-letter-email').value;
        const message = document.getElementById('tc-letter-text').value;
        const btn = document.getElementById('tc-finish-btn');
        const box = document.querySelector('.tc-memory-box');
        const ritualControls = document.getElementById('tc-ritual-controls');
        const letter = document.getElementById('tc-physical-letter');
        const envelope = document.getElementById('tc-drag-envelope');

        if (!email || !message) {
            alert("Please fill in both the email and the message before sealing.");
            return;
        }

        // 1. Sending Animation/State
        btn.innerHTML = "<span class='animate-pulse'>Sealing into Vault...</span>";
        btn.style.pointerEvents = 'none';

        // 2. The Google Sheet Connection (Async)
        // REPLACE THE URL BELOW with your own Google Web App URL once you deploy it
        const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzFNeClRwfrHxDNqgzjoqEC-J0u2W4DPj1rjEai-wgRGDTEn43fsWa7lC0Dztmv-gxK-Q/exec";

        try {
            if (GOOGLE_SHEETS_URL !== "YOUR_GOOGLE_SCRIPT_URL_HERE") {
                await fetch(GOOGLE_SHEETS_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Essential for Google Apps Script
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, message: message })
                });
            }

            // Proceed with the visual ritual after sending
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.5);

            // Hide letter and envelope
            if (letter) {
                letter.style.transition = 'all 0.8s ease';
                letter.style.opacity = '0';
                letter.style.transform = 'translate(-50%, -50%) scale(0.5)';
                setTimeout(() => letter.style.display = 'none', 800);
            }

            if (envelope) {
                envelope.style.transition = 'all 0.8s ease';
                envelope.style.opacity = '0';
                envelope.style.transform = 'translate(-50%, -50%) scale(0.5)';
                setTimeout(() => envelope.style.display = 'none', 800);
            }

            // 3. Fold Flaps (Sequential) - Using Authentic Cardboard Sound
            setTimeout(() => {
                box.classList.add('is-closed-left');
                // Authentic cardboard box closing sound (Mixkit 2549)
                this.playSfx('https://assets.mixkit.co/active_storage/sfx/2549/2549-preview.mp3', 0.8);
            }, 500);

            setTimeout(() => {
                box.classList.add('is-closed-right');
            }, 1000);

            // 4. Tape Ritual
            setTimeout(() => {
                box.classList.add('is-taped');
                // Subtle tape sound - Removed to let custom audio shine
                // this.playSfx('https://assets.mixkit.co/active_storage/sfx/2552/2552-preview.mp3', 0.3);
            }, 1800);

            // 5. Final State -> Cinematic Outro
            setTimeout(() => {
                btn.innerHTML = "Delivering in 365 Days ✨";
                btn.style.opacity = '1';
                // Trigger the cinematic ending after a moment
                setTimeout(() => {
                    this.playCinematicOutro();
                }, 2000);
            }, 4000);

        } catch (error) {
            console.error("Vault Error:", error);
            btn.innerHTML = "Vault Error - Try Again";
            btn.style.pointerEvents = 'auto';
        }
    },

    playCinematicOutro: function () {
        const text = "Your message has been sealed.\n\nSee you in a year...";

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'cinematic-overlay';
        overlay.innerHTML = `<div class="cinematic-text">${text}</div>`;
        document.body.appendChild(overlay);

        // Fade out music slowly
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) {
            const fadeAudio = setInterval(() => {
                if (bgMusic.volume > 0.05) {
                    bgMusic.volume -= 0.05;
                } else {
                    bgMusic.pause();
                    clearInterval(fadeAudio);
                }
            }, 200);
        }

        // Trigger visual fade
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // REFRESH TO PAGE 1 AFTER 6 SECONDS
        setTimeout(() => {
            location.reload();
        }, 6000);
    },

    finishJourney: function () {
        // No longer used automatically, but keeping it simple for manual calls
        location.reload();
    },

    nextPage: function () {
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.pages) return;
        let next = this.currentPage + 1;
        while (next < config.pages.length && config.pages[next].hidden) {
            next++;
        }

        if (next < config.pages.length) {
            this.navigateWithTransition(next);
        } else {
            // End of journey reached, could potentially show a "The End" state
            console.log("End of visible pages");
        }
    },

    prevPage: function () {
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.pages) return;
        let prev = this.currentPage - 1;
        while (prev >= 0 && config.pages[prev].hidden) {
            prev--;
        }

        if (prev >= 0) {
            this.navigateWithTransition(prev);
        }
    },

    goToPage: function (index) {
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.pages) {
            console.log("📄 goToPage: CONFIG not ready");
            return;
        }
        if (index >= 0 && index < config.pages.length) {
            // Skip transition if already on this page
            if (this.currentPage === index && !this.isTransitioning) {
                return;
            }

            // Prevent multiple transitions at once
            if (this.isTransitioning) {
                console.log('[App] Transition in progress, ignoring request');
                return;
            }

            this.navigateWithTransition(index);
        }
    },

    playSuccessSound: function () {
        // Placeholder for future sound integration
        console.log("Success!");
    },

    renderScratchCard: function (data, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8';

        const header = document.createElement('div');
        header.className = 'text-center space-y-4';
        header.innerHTML = `
            <h1 class="text-3xl font-serif italic text-text-main">${this.formatTitle(data.title || "A Little Surprise")}</h1>
            <p class="text-text-main/60 uppercase tracking-widest text-[10px] font-bold">${data.subtitle || "Scratch to reveal the memory"}</p>
        `;

        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'relative w-full aspect-square max-w-[450px] border-8 border-white shadow-2xl rounded-sm transform rotate-1';

        // Background Image (The "hidden" content)
        const hiddenImg = document.createElement('img');
        hiddenImg.src = data.mainPhoto || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7';
        hiddenImg.className = 'absolute inset-0 w-full h-full object-cover';

        // The Scratch Canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'absolute inset-0 w-full h-full cursor-pointer z-10 touch-none';

        canvasContainer.appendChild(hiddenImg);
        canvasContainer.appendChild(canvas);

        const footer = document.createElement('div');
        footer.id = 'scratch-footer';
        footer.className = 'transition-all duration-700 opacity-0 transform translate-y-4 text-center';
        footer.innerHTML = `
            <p class="text-text-main font-serif italic mb-6 text-xl">${data.finishMessage || "Beautiful, isn't it?"}</p>
            <button class="bg-primary-accent text-white px-10 py-4 rounded-full font-bold shadow-xl hover:scale-110 active:scale-95 transition-all" onclick="app.nextPage()">
                ${data.buttonText || "Continue Journey"}
            </button>
        `;

        wrapper.appendChild(header);
        wrapper.appendChild(canvasContainer);
        wrapper.appendChild(footer);
        container.appendChild(wrapper);

        // Canvas Logic
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let isFinished = false;

        const initCanvas = () => {
            const rect = canvasContainer.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Fill with coating
            ctx.fillStyle = data.overlayColor || '#cbd5e1';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add grain effect
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            for (let i = 0; i < 3000; i++) {
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
            }

            ctx.globalCompositeOperation = 'destination-out';
        };

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const scratch = (e) => {
            if (!isDrawing || isFinished) return;
            const pos = getPos(e);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, parseInt(data.brushSize) || 40, 0, Math.PI * 2);
            ctx.fill();

            checkReveal();
        };

        const checkReveal = () => {
            if (isFinished) return;
            // Sampling for performance
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let transparentPixels = 0;

            for (let i = 0; i < pixels.length; i += 40) { // Check every 10th pixel
                if (pixels[i + 3] < 128) transparentPixels++;
            }

            const revealedPercent = (transparentPixels / (pixels.length / 40)) * 100;

            if (revealedPercent > 70) {
                isFinished = true;
                canvas.style.opacity = '0';
                canvas.style.transition = 'opacity 1.5s ease-out';
                footer.classList.remove('opacity-0', 'translate-y-4');
                this.playSuccessSound();
            }
        };

        canvas.addEventListener('mousedown', () => isDrawing = true);
        canvas.addEventListener('touchstart', () => isDrawing = true);
        window.addEventListener('mouseup', () => isDrawing = false);
        window.addEventListener('touchend', () => isDrawing = false);
        canvas.addEventListener('mousemove', scratch);
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            scratch(e);
        }, { passive: false });

        setTimeout(initCanvas, 300);
    },

    calculateLifeStats: function (birthDateStr) {
        if (!birthDateStr) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

        const birthDate = new Date(birthDateStr);
        if (isNaN(birthDate.getTime())) {
            console.error("Invalid birthDate format:", birthDateStr);
            // Coba parsing manual jika format YYYY-MM-DD
            return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const now = new Date();
        const diffTime = Math.abs(now - birthDate);

        const years = now.getFullYear() - birthDate.getFullYear();
        const months = (years * 12) + (now.getMonth() - birthDate.getMonth());
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        const minutes = Math.floor(diffTime / (1000 * 60));
        const seconds = Math.floor(diffTime / 1000);

        return { years, months, days, hours, minutes, seconds };
    },

    countUp: function (id, endValue) {
        const obj = document.getElementById(id);
        if (!obj) return;

        let startValue = 0;
        let duration = 2000;
        let startTimestamp = null;

        // Remove commas or non-numeric chars if they exist
        const finalValue = parseInt(String(endValue).replace(/,/g, '')) || 0;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = Math.floor(progress * finalValue);
            obj.innerHTML = current.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    },

    generateBarcode: function () {
        let bars = '';
        for (let i = 0; i < 40; i++) {
            const width = Math.random() > 0.5 ? '1px' : '2px';
            const height = (Math.random() * 20 + 60) + '%';
            const opacity = Math.random() > 0.1 ? '0.8' : '0.4';
            bars += `<div style="width: ${width}; height: ${height}; background: black; opacity: ${opacity};"></div>`;
        }
        return bars;
    },

    playSfx: function (url, volume = 0.5) {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(e => console.log("SFX Blocked"));
    },

    beepBarcode: function () {
        this.playSfx('https://assets.mixkit.co/active_storage/sfx/2555/2555-preview.mp3', 0.2);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());

