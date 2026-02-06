// Utility Functions

const utils = {
    // Compress image before upload
    async compressImage(file, maxWidth = 1200, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Resolve with the Blob directly
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob from canvas'));
                        }
                    }, 'image/jpeg', quality);
                };

                img.onerror = () => reject(new Error('Failed to load image for compression'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file for compression'));
            reader.readAsDataURL(file);
        });
    },

    // Extract GPS coordinates and date from photo metadata
    async extractExifData(file) {
        return new Promise((resolve) => {
            if (typeof EXIF === 'undefined') {
                console.warn('[EXIF] EXIF library not loaded');
                resolve(null);
                return;
            }

            if (!file.type.startsWith('image/')) {
                resolve(null);
                return;
            }

            EXIF.getData(file, function () {
                try {
                    const exifData = {};

                    const latDMS = EXIF.getTag(this, 'GPSLatitude');
                    const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                    const lngDMS = EXIF.getTag(this, 'GPSLongitude');
                    const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');

                    if (latDMS && lngDMS) {
                        let lat = utils.dmsToDecimal(latDMS[0], latDMS[1], latDMS[2]);
                        let lng = utils.dmsToDecimal(lngDMS[0], lngDMS[1], lngDMS[2]);

                        if (latRef === 'S') lat = -lat;
                        if (lngRef === 'W') lng = -lng;

                        exifData.lat = lat;
                        exifData.lng = lng;
                    }

                    const dateOriginal = EXIF.getTag(this, 'DateTimeOriginal');
                    const dateDigitized = EXIF.getTag(this, 'DateTimeDigitized');
                    const dateString = dateOriginal || dateDigitized;

                    if (dateString) {
                        const parts = dateString.split(' ')[0].split(':');
                        if (parts.length === 3) {
                            exifData.date = `${parts[0]}-${parts[1]}-${parts[2]}`;
                        }
                    }

                    if (exifData.lat || exifData.date) {
                        resolve(exifData);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('[EXIF] Error extracting data:', error);
                    resolve(null);
                }
            });
        });
    },

    dmsToDecimal(degrees, minutes, seconds) {
        return degrees + (minutes / 60) + (seconds / 3600);
    },

    // Apply Theme Preset
    applyThemePreset(presetKey) {
        if (!THEME_PRESETS) return;

        const preset = Array.isArray(THEME_PRESETS) ? THEME_PRESETS[presetKey] : THEME_PRESETS[presetKey];
        if (!preset) return;

        const setAndTrigger = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = value || '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        // For Birthday: THEME_PRESETS is often an array of { name, colors: [ribbon, paper, cardboard, text] }
        if (Array.isArray(THEME_PRESETS)) {
            const p = THEME_PRESETS[presetKey];
            if (p && p.colors) {
                setAndTrigger('theme_ribbonColor', p.colors[0]);
                setAndTrigger('theme_paperColor', p.colors[1]);
                setAndTrigger('theme_cardboardColor', p.colors[2]);
                setAndTrigger('theme_textColor', p.colors[3]);
            }
        } else {
            // Valentine-style object presets
            setAndTrigger('theme_bg', preset.bg);
            setAndTrigger('theme_color', preset.color);
        }

        requestAnimationFrame(() => {
            if (window.state && state.save) {
                state.save();
                if (state.syncToPreview) state.syncToPreview();
                else if (state.syncPreview) state.syncPreview();
            }
            this.showNotification(`Theme applied!`);
        });
    },

    // Handle media upload
    async handleMediaUpload(input, targetInputId, pageIndex, listKey, itemIdx, fieldKey) {
        const file = input.files[0];
        if (!file) return;

        const targetInput = document.getElementById(targetInputId);
        const originalValue = targetInput ? targetInput.value : '';

        try {
            if (targetInput) {
                targetInput.value = 'Uploading...';
                targetInput.disabled = true;
            }

            let fileToUpload = file;

            if (file.type.startsWith('image/')) {
                try {
                    const compressedBlob = await this.compressImage(file, 1200, 0.85);
                    fileToUpload = new File([compressedBlob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                } catch (err) {
                    console.warn('[Utils] Compression failed, using original:', err);
                }
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);

            // Upload via Cloudflare Worker
            const WORKER_URL = 'https://valentine-upload.aldoramadhan16.workers.dev/upload';
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Upload failed');

            if (targetInput) {
                targetInput.value = result.url;
                targetInput.disabled = false;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // If list item parameters are provided, update the state directly
            if (typeof pageIndex !== 'undefined' && listKey && typeof itemIdx !== 'undefined' && fieldKey) {
                if (window.app && app.updateListItem) {
                    app.updateListItem(pageIndex, listKey, itemIdx, fieldKey, result.url, true);
                    app.renderCurrentStep();
                }
            }

            state.save();
            if (state.syncToPreview) state.syncToPreview();
            else if (state.syncPreview) state.syncPreview();

            utils.showNotification('Uploaded successfully!', 'success');

        } catch (error) {
            console.error('[Utils] Upload failed:', error);
            alert('Upload failed: ' + error.message);
            if (targetInput) {
                targetInput.value = originalValue;
                targetInput.disabled = false;
            }
        }
    },

    // Better upload helper for generic files (used by renderers)
    async handleFileUpload(file) {
        if (!file) return null;
        try {
            let fileToUpload = file;
            if (file.type.startsWith('image/')) {
                const compressedBlob = await this.compressImage(file, 1200, 0.85);
                fileToUpload = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            }
            const formData = new FormData();
            formData.append('file', fileToUpload);
            const response = await fetch('https://valentine-upload.aldoramadhan16.workers.dev/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            return result.success ? result.url : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async handleBulkUpload(files) {
        const results = [];
        for (const file of files) {
            const url = await this.handleFileUpload(file);
            if (url) {
                results.push({
                    src: url,
                    date: "",
                    caption: ""
                });
            }
        }
        return results;
    },

    val(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    },

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value || '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            const dt = new Date(dateString);
            return dt.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showNotification(message, type = 'success', duration = 3000) {
        const notification = document.getElementById('notification');
        const textEl = document.getElementById('notificationText');
        const iconEl = document.getElementById('notificationIcon');

        if (!notification || !textEl) return;

        textEl.textContent = message;
        if (iconEl) {
            iconEl.textContent = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
        }

        notification.classList.add('show');
        notification.style.transform = 'translateX(-50%) translateY(0)';

        setTimeout(() => {
            notification.classList.remove('show');
            notification.style.transform = 'translateX(-50%) translateY(-150%)';
        }, duration);
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copied to clipboard!');
        });
    },

    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    countAllPhotos(config) {
        if (!config || !config.pages) return 0;
        let count = 0;
        const isPhoto = (url) => {
            if (!url || typeof url !== 'string' || url.trim() === '') return false;
            return url.includes('http') || url.includes('assets/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
        };

        config.pages.forEach(page => {
            if (page.mainPhoto && isPhoto(page.mainPhoto)) count++;
            if (page.photos && Array.isArray(page.photos)) {
                page.photos.forEach(p => { if (isPhoto(p.url || p.src)) count++; });
            }
            if (page.articles && Array.isArray(page.articles)) {
                page.articles.forEach(a => { if (isPhoto(a.image)) count++; });
            }
            if (page.pins && Array.isArray(page.pins)) {
                page.pins.forEach(p => { if (isPhoto(p.image)) count++; });
            }
        });
        return count;
    }
};

if (typeof window !== 'undefined') {
    window.utils = utils;
}
