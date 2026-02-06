/**
 * Map Picker Module for Birthday Admin
 * Handles Interactive Map Selection using Leaflet.js
 * Features:
 * 1. Photon API Search (Better than Nominatim)
 * 2. Paste Google Maps Link Support
 * 3. Click on Map & Manual Coordinates
 */

const mapPicker = {
    map: null,
    marker: null,
    currentTarget: null, // { pageIndex, fieldKey, itemIdx, key }
    searchDebounce: null,

    // Initialize map
    init() {
        if (this.map) return;

        // Detect if mobile
        const isMobile = window.innerWidth < 768;

        // Create map instance - default to Jakarta
        this.map = L.map('leafletPickerContainer', {
            zoomControl: !isMobile, // Hide zoom control on mobile (use pinch)
            tap: true,
            touchZoom: true,
            scrollWheelZoom: false // Disable scroll zoom to prevent page scroll issues
        }).setView([-6.2088, 106.8456], 13);

        // Add zoom control at bottom right for mobile
        if (isMobile) {
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);
        }

        // Add OSM tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        // Map click handler
        this.map.on('click', (e) => {
            this.setMarker(e.latlng);
            this.hideResults();
        });

        // Initialize search events
        const searchInput = document.getElementById('mapSearchInput');
        const gmapsInput = document.getElementById('gmapsLinkInput');

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.search(true);
                }
            });

            // Live searching as you type
            searchInput.addEventListener('input', () => {
                if (this.searchDebounce) clearTimeout(this.searchDebounce);
                this.searchDebounce = setTimeout(() => this.search(false), 500);
            });
        }

        // Google Maps Link paste handler
        if (gmapsInput) {
            gmapsInput.addEventListener('input', () => {
                this.handleGoogleMapsLink(gmapsInput.value);
            });

            gmapsInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleGoogleMapsLink(gmapsInput.value);
                }, 100);
            });
        }

        // Close results on outside click
        document.addEventListener('click', (e) => {
            const searchInput = document.getElementById('mapSearchInput');
            const resultsContainer = document.getElementById('mapSearchResults');
            if (searchInput && resultsContainer) {
                if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                    this.hideResults();
                }
            }
        });
    },

    // Open picker for a specific location
    open(pageIndex, fieldKey, itemIdx, key) {
        this.currentTarget = { pageIndex, fieldKey, itemIdx, key };
        const modal = document.getElementById('mapPickerModal');
        modal.classList.remove('hidden');

        // Reset to Search tab
        this.switchTab('search');

        // Clear search inputs
        const searchInput = document.getElementById('mapSearchInput');
        const gmapsInput = document.getElementById('gmapsLinkInput');
        if (searchInput) searchInput.value = '';
        if (gmapsInput) {
            gmapsInput.value = '';
            gmapsInput.placeholder = 'Paste Google Maps link here (e.g., https://maps.app.goo.gl/...)';
        }
        this.hideResults();

        // Attach Google Maps link handler
        this.attachGmapsHandler();

        // Initial map setup
        setTimeout(() => {
            this.init();
            this.map.invalidateSize();

            // If coordinates already exist, move to them
            const coordsInput = document.getElementById(`map-coords-${pageIndex}-${fieldKey}-${itemIdx}`);
            const coordsText = coordsInput ? (coordsInput.value || coordsInput.textContent || '') : '';
            if (coordsText.includes(',')) {
                const [lat, lng] = coordsText.split(',').map(v => parseFloat(v.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    this.setMarker({ lat, lng });
                    this.map.setView([lat, lng], 15);
                } else {
                    this.resetMarker();
                }
            } else {
                this.resetMarker();
            }
        }, 100);
    },

    // Attach Google Maps link handler
    attachGmapsHandler() {
        const gmapsInput = document.getElementById('gmapsLinkInput');
        if (!gmapsInput) return;

        // Remove old listeners by cloning
        const newInput = gmapsInput.cloneNode(true);
        gmapsInput.parentNode.replaceChild(newInput, gmapsInput);

        // Add fresh event listeners
        newInput.addEventListener('input', (e) => {
            this.handleGoogleMapsLink(e.target.value);
        });

        newInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.handleGoogleMapsLink(newInput.value);
            }, 100);
        });
    },

    // Close picker
    close() {
        const modal = document.getElementById('mapPickerModal');
        modal.classList.add('hidden');
        this.currentTarget = null;
    },

    // Set pin on map
    setMarker(latlng) {
        this.selectedLatLng = latlng;

        // Surgical Precision Pin Definition
        const redPinIcon = L.divIcon({
            className: 'map-pin-div-icon',
            html: `
                <div class="map-pin-wrapper">
                    <svg class="map-pin-svg" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 52C20 52 40 38.2 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 38.2 20 52 20 52Z" fill="#EF4444"/>
                        <circle cx="20" cy="20" r="10" fill="white"/>
                        <circle cx="20" cy="20" r="4" fill="#EF4444"/>
                    </svg>
                </div>
            `,
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            popupAnchor: [0, -52]
        });

        if (this.marker) {
            this.marker.setIcon(redPinIcon);
            this.marker.setLatLng(latlng);
        } else {
            this.marker = L.marker(latlng, {
                icon: redPinIcon,
                draggable: true
            }).addTo(this.map);

            this.marker.on('dragend', () => {
                this.selectedLatLng = this.marker.getLatLng();
                this.updateUI();
            });
        }

        this.updateUI();
    },

    resetMarker() {
        if (this.marker) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
        this.selectedLatLng = null;
        this.updateUI();
    },

    // Update Modal UI
    async updateUI() {
        const text = document.getElementById('selectedLocationText');
        const btn = document.getElementById('confirmLocationBtn');

        if (this.selectedLatLng) {
            const { lat, lng } = this.selectedLatLng;
            text.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            text.classList.remove('italic', 'text-gray-400');
            btn.disabled = false;

            // Optional: Get Address from Nominatim
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                    headers: { 'User-Agent': 'BirthdayGiftApp/1.0' }
                });
                const data = await response.json();
                if (data.display_name) {
                    text.textContent = data.display_name;
                }
            } catch (e) {
                console.warn('Reverse geocoding failed');
            }
        } else {
            text.textContent = 'Click on map to pick...';
            text.classList.add('italic', 'text-gray-400');
            btn.disabled = true;
        }
    },

    // Photon API Search
    async search(isFinal = false) {
        const queryInput = document.getElementById('mapSearchInput');
        const query = queryInput ? queryInput.value.trim() : '';
        if (query.length < 3) {
            this.hideResults();
            return;
        }

        try {
            // Use Photon API - biased to Indonesia
            const response = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lat=-6.2&lon=106.8&lang=en`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await response.json();

            if (data && data.features && data.features.length > 0) {
                this.showResults(data.features);

                if (isFinal) {
                    this.selectPhotonResult(data.features[0]);
                }
            } else if (isFinal) {
                utils.showNotification('Location not found', 'error');
                this.hideResults();
            }
        } catch (error) {
            console.error('Search failed:', error);
            this.searchNominatim(query, isFinal);
        }
    },

    // Fallback search using Nominatim
    async searchNominatim(query, isFinal) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`,
                { headers: { 'User-Agent': 'BirthdayGiftApp/1.0' } }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const features = data.map(item => ({
                    geometry: { coordinates: [parseFloat(item.lon), parseFloat(item.lat)] },
                    properties: {
                        name: item.display_name.split(',')[0],
                        city: item.address?.city || item.address?.town || '',
                        country: item.address?.country || ''
                    }
                }));
                this.showResults(features);

                if (isFinal) {
                    this.selectPhotonResult(features[0]);
                }
            } else if (isFinal) {
                utils.showNotification('Location not found', 'error');
            }
        } catch (error) {
            console.error('Nominatim fallback failed:', error);
        }
    },

    showResults(results) {
        const container = document.getElementById('mapSearchResults');
        if (!container) return;

        container.innerHTML = results.map((res) => `
            <div class="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-start gap-3 transition-colors group"
                onclick='mapPicker.selectPhotonResult(${JSON.stringify(res).replace(/'/g, "&#39;")})'>
                <div class="p-2 bg-gray-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <span class="material-symbols-outlined text-gray-400 group-hover:text-indigo-600 text-lg">location_on</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-gray-900 truncate">${this.formatPhotonTitle(res)}</div>
                    <div class="text-[11px] text-gray-500 truncate mt-0.5">${this.formatPhotonSubtitle(res)}</div>
                </div>
            </div>
        `).join('');
        container.classList.remove('hidden');
    },

    hideResults() {
        const container = document.getElementById('mapSearchResults');
        if (container) container.classList.add('hidden');
    },

    formatPhotonTitle(res) {
        const props = res.properties || {};
        return props.name || props.street || props.city || 'Unknown Location';
    },

    formatPhotonSubtitle(res) {
        const props = res.properties || {};
        const parts = [];

        // Add City and Country specifically as requested
        if (props.city) parts.push(props.city);
        if (props.state && props.state !== props.city) parts.push(props.state);
        if (props.country) parts.push(props.country);

        return parts.join(', ') || 'No detailed address available';
    },

    selectPhotonResult(res) {
        const coords = res.geometry.coordinates;
        const latlng = { lat: coords[1], lng: coords[0] };
        this.map.setView(latlng, 16);
        this.setMarker(latlng);
        this.hideResults();

        const input = document.getElementById('mapSearchInput');
        if (input) input.value = this.formatPhotonTitle(res);
    },

    // Google Maps Link Parser
    handleGoogleMapsLink(url) {
        if (!url || url.length < 5) return;

        // Try to parse as raw coordinates
        const rawCoords = this.parseRawCoordinates(url);
        if (rawCoords) {
            this.applyCoordinates(rawCoords);
            return;
        }

        // Check if it's a short link
        if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
            this.showShortLinkHelp();
            return;
        }

        const coords = this.extractCoordsFromGoogleMapsLink(url);

        if (coords) {
            const latlng = { lat: coords.lat, lng: coords.lng };

            if (!this.map) {
                utils.showNotification('Map not ready, please try again', 'error');
                return;
            }

            this.map.setView(latlng, 16);
            this.setMarker(latlng);
            utils.showNotification('Location detected from link!', 'success');

            const gmapsInput = document.getElementById('gmapsLinkInput');
            if (gmapsInput) {
                gmapsInput.value = '';
                gmapsInput.placeholder = 'Location set! Paste another link...';
            }
        }
    },

    showShortLinkHelp() {
        const helpMessage = `
            <div style="text-align:left; font-size: 13px; line-height: 1.6;">
                <p style="margin-bottom: 12px;"><strong>Short links don't contain coordinates.</strong></p>
                <p style="margin-bottom: 8px;">To get the correct link:</p>
                <ol style="margin-left: 20px; margin-bottom: 12px;">
                    <li>Open <strong>Google Maps</strong> in browser (not app)</li>
                    <li>Find the location you want</li>
                    <li>Copy URL from <strong>browser address bar</strong></li>
                    <li>Paste that URL here</li>
                </ol>
                <p style="font-size: 11px; color: #666;">Example URL:<br>
                <code style="background:#f0f0f0; padding:2px 6px; border-radius:4px; font-size:10px;">https://www.google.com/maps/@-6.2088,106.8456,15z</code></p>
            </div>
        `;

        let helpModal = document.getElementById('shortLinkHelpModal');
        if (!helpModal) {
            helpModal = document.createElement('div');
            helpModal.id = 'shortLinkHelpModal';
            helpModal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                z-index: 500;
                max-width: 400px;
                border: 1px solid #e5e7eb;
            `;
            document.body.appendChild(helpModal);
        }

        helpModal.innerHTML = `
            ${helpMessage}
            <button onclick="document.getElementById('shortLinkHelpModal').remove()" 
                style="margin-top: 16px; width: 100%; background: #6366f1; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;">
                Got it
            </button>
        `;
        helpModal.classList.remove('hidden');

        const gmapsInput = document.getElementById('gmapsLinkInput');
        if (gmapsInput) gmapsInput.value = '';
    },

    parseRawCoordinates(input) {
        const cleaned = input.trim();
        const pattern = /^(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/;
        const match = cleaned.match(pattern);

        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }
        return null;
    },

    applyCoordinates(coords) {
        const latlng = { lat: coords.lat, lng: coords.lng };

        if (!this.map) {
            utils.showNotification('Map not ready, please try again', 'error');
            return;
        }

        this.map.setView(latlng, 16);
        this.setMarker(latlng);
        utils.showNotification('Coordinates applied!', 'success');

        const gmapsInput = document.getElementById('gmapsLinkInput');
        if (gmapsInput) {
            gmapsInput.value = '';
            gmapsInput.placeholder = 'Location set!';
        }
    },

    extractCoordsFromGoogleMapsLink(url) {
        let lat, lng;

        // Pattern 1: /@lat,lng format
        const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const match1 = url.match(pattern1);
        if (match1) {
            lat = parseFloat(match1[1]);
            lng = parseFloat(match1[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // Pattern 2: ?q=lat,lng
        const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const match2 = url.match(pattern2);
        if (match2) {
            lat = parseFloat(match2[1]);
            lng = parseFloat(match2[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // Pattern 3: lat,lng anywhere
        const pattern3 = /(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/;
        const match3 = url.match(pattern3);
        if (match3) {
            lat = parseFloat(match3[1]);
            lng = parseFloat(match3[2]);
            if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }

        return null;
    },

    // Tab Switching
    switchTab(tab) {
        const searchTab = document.getElementById('tabSearch');
        const pasteTab = document.getElementById('tabPasteLink');
        const searchContent = document.getElementById('searchTabContent');
        const pasteContent = document.getElementById('pasteTabContent');

        if (!searchTab || !pasteTab || !searchContent || !pasteContent) return;

        if (tab === 'search') {
            searchTab.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all bg-white text-indigo-600 shadow-sm border border-slate-200';
            pasteTab.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-slate-500 hover:text-slate-700';
            searchContent.classList.remove('hidden');
            pasteContent.classList.add('hidden');
        } else {
            pasteTab.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all bg-white text-emerald-600 shadow-sm border border-slate-200';
            searchTab.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-slate-500 hover:text-slate-700';
            pasteContent.classList.remove('hidden');
            searchContent.classList.add('hidden');
            this.attachGmapsHandler();
        }
    },

    // Confirm selection and update state
    confirm() {
        if (!this.selectedLatLng || !this.currentTarget) return;

        const { lat, lng } = this.selectedLatLng;
        const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const { pageIndex, fieldKey, itemIdx, key } = this.currentTarget;

        // Update the field
        const coordsArray = [lat, lng];
        app.updateListItem(pageIndex, fieldKey, itemIdx, key, coordsArray, false);

        // Re-render to show updated coordinates
        app.renderCurrentStep();

        this.close();
        utils.showNotification('Location updated!', 'success');
    }
};

window.mapPicker = mapPicker;
