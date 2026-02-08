/**
 * MUSIC PLAYER PAGE - Extends window.app
 * Vintage Music Box / Vinyl Player Design with Playlist Support
 */

(function () {
    'use strict';

    // Wait for window.app to be available
    if (!window.app) {
        console.error('[MusicPlayer] window.app not found!');
        return;
    }

    // Playlist state
    window.app.musicPlayerState = {
        tracks: [],
        currentTrackIndex: 0,
        isPlaying: false
    };

    // ==========================================
    // RENDER FUNCTION
    // ==========================================
    window.app.renderMusicPlayer = function (data, container) {
        const buttonText = data.buttonText || "Continue";
        const currentYear = new Date().getFullYear();

        // Support both old single-song format and new tracks array format
        let tracks = [];
        if (data.tracks && data.tracks.length > 0) {
            tracks = data.tracks;
        } else if (data.songTitle || data.audioUrl) {
            // Legacy single-song format
            tracks = [{ songTitle: data.songTitle || "Your Song", artist: data.artist || "Your Artist", audioUrl: data.audioUrl || "" }];
        } else {
            tracks = [{ songTitle: "Your Song", artist: "Your Artist", audioUrl: "" }];
        }

        // Store tracks in state
        this.musicPlayerState.tracks = tracks;
        this.musicPlayerState.currentTrackIndex = 0;

        const firstTrack = tracks[0];
        const hasMultipleTracks = tracks.length > 1;

        container.innerHTML = `
            <!-- Background - Matches other pages -->
            <div class="fixed inset-0 inside-box-container z-0">
                <div class="silk-tissue opacity-50"></div>
                <div class="crumpled-effect opacity-10"></div>
                <div class="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
            </div>

            <!-- Main Container -->
            <div class="min-h-screen flex flex-col items-center justify-center py-8 px-4 relative z-10 overflow-hidden">
                
                <!-- Enhanced Title Section -->
                <div class="title-section">
                    <div class="title-ornament">
                        <div class="title-line"></div>
                        <span class="title-diamond">◆</span>
                        <div class="title-line"></div>
                    </div>
                    <h1 class="main-title">
                        A <span>Melody</span> for You
                    </h1>
                    <p class="title-subtitle">Every note carries a memory</p>
                </div>

                <!-- Music Box -->
                <div class="music-box-container animate-music-box-in" id="musicBoxContainer">
                    
                    <!-- Hand-drawn Arrow (Desktop) -->
                    <div class="music-box-arrow hidden lg:block">
                        <span class="music-box-arrow-text">Press to Play</span>
                        <svg width="70" height="50" viewBox="0 0 80 60" fill="none" stroke="currentColor" stroke-width="1.5" class="text-vintage-ink">
                            <path d="M70 10 C 60 30, 40 45, 15 50" stroke-dasharray="4 6" stroke-linecap="round"/>
                            <path d="M25 44 L15 50 L22 58" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>

                    <!-- Wooden Base -->
                    <div class="music-box-base">
                        
                        <!-- Side Label -->
                        <div class="track-side-label">Side A</div>
                        <div class="track-catalog-number">FY-${currentYear}</div>

                        <!-- Inner Lining -->
                        <div class="music-box-interior">
                            
                            <!-- Vinyl Record -->
                            <div class="vinyl-record" id="vinylRecord" data-audio-url="${firstTrack.audioUrl || ''}">
                                
                                <!-- Label -->
                                <div class="vinyl-label">
                                    <span class="vinyl-label-text">33 RPM</span>
                                    <span class="vinyl-label-title">For You</span>
                                    <div class="vinyl-spindle"></div>
                                </div>
                                
                            </div>

                            <!-- Tone Arm -->
                            <div class="tone-arm-container">
                                <div class="tone-arm-pivot"></div>
                                <div class="tone-arm" id="toneArm"></div>
                            </div>

                            <!-- Visualizer Bars -->
                            <div class="visualizer" id="visualizer">
                                <div class="visualizer-bar"></div>
                                <div class="visualizer-bar"></div>
                                <div class="visualizer-bar"></div>
                                <div class="visualizer-bar"></div>
                                <div class="visualizer-bar"></div>
                            </div>

                        </div>

                        <!-- Control Panel -->
                        <div class="control-panel">
                            
                            ${hasMultipleTracks ? `
                                <!-- Previous Track Button -->
                                <button class="track-nav-btn" id="prevTrackBtn" aria-label="Previous Track" onclick="app.prevTrack()">
                                    <span class="material-symbols-outlined">skip_previous</span>
                                </button>
                            ` : ''}
                            
                            <!-- Play/Pause Button -->
                            <button class="play-button" id="playButton" aria-label="Play/Pause">
                                <span class="material-symbols-outlined icon-play">play_arrow</span>
                                <span class="material-symbols-outlined icon-pause">pause</span>
                            </button>
                            
                            ${hasMultipleTracks ? `
                                <!-- Next Track Button -->
                                <button class="track-nav-btn" id="nextTrackBtn" aria-label="Next Track" onclick="app.nextTrack()">
                                    <span class="material-symbols-outlined">skip_next</span>
                                </button>
                            ` : ''}

                            <!-- Volume Control -->
                            <div class="volume-control">
                                <span class="material-symbols-outlined volume-icon" id="volumeIcon">volume_mute</span>
                                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="60" aria-label="Volume">
                            </div>

                        </div>

                    </div>
                    
                    <!-- Track Info Card (below music box) -->
                    <div class="track-info-card">
                        <div class="track-song-title" id="currentSongTitle">${firstTrack.songTitle || 'Your Song'}</div>
                        <div class="track-artist" id="currentArtist">${firstTrack.artist || 'Your Artist'}</div>
                        ${hasMultipleTracks ? `
                            <div class="track-counter" id="trackCounter">
                                <span id="currentTrackNum">1</span> / ${tracks.length}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Continue Button -->
                <button class="music-continue-btn" id="musicContinueBtn" onclick="app.nextPage()">
                    ${buttonText}
                </button>
                
                <!-- Branding -->
                <div class="music-continue-brand">
                    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">diamond</span>
                    <span>For You, Always</span>
                </div>

            </div>
        `;

        // Initialize the music box with first track
        this.initMusicBox(firstTrack.audioUrl || '');

        // Entry sound
        setTimeout(() => {
            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', 0.2);
        }, 400);
    };

    // ==========================================
    // INITIALIZATION & HANDLERS
    // ==========================================
    window.app.initMusicBox = function (audioUrl) {
        const vinylRecord = document.getElementById('vinylRecord');
        const playButton = document.getElementById('playButton');
        const volumeSlider = document.getElementById('volumeSlider');

        if (!vinylRecord || !playButton) return;

        // Bind click events
        vinylRecord.addEventListener('click', () => this.toggleMusicBox());
        playButton.addEventListener('click', () => this.toggleMusicBox());

        // Volume control
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                if (this.musicBoxAudio) {
                    this.musicBoxAudio.volume = volume;
                }
                this.updateVolumeIcon(volume);
            });
        }

        // Load audio if URL provided
        if (audioUrl) {
            this.loadMusicBoxAudio(audioUrl);
        }

        // Update time display periodically
        this.musicBoxTimeInterval = setInterval(() => {
            this.updateMusicBoxTime();
        }, 1000);
    };

    window.app.loadMusicBoxAudio = async function (url) {
        if (!url) return;

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const audioSrc = URL.createObjectURL(blob);

            this.musicBoxAudio = new Audio(audioSrc);
            this.musicBoxAudio.loop = false; // Don't loop single track, we'll handle playlist looping
            this.musicBoxAudio.volume = this.isMuted ? 0 : (document.getElementById('volumeSlider')?.value / 100 || 0.6);
            this.musicBoxAudio.setAttribute('data-original-src', url);

            // When track ends, go to next track (or loop back)
            this.musicBoxAudio.onended = () => {
                if (this.musicPlayerState.tracks.length > 1) {
                    this.nextTrack();
                } else {
                    // Single track: loop it
                    this.musicBoxAudio.currentTime = 0;
                    this.musicBoxAudio.play();
                }
            };

        } catch (e) {
            this.musicBoxAudio = new Audio(url);
            this.musicBoxAudio.loop = false;
            this.musicBoxAudio.volume = this.isMuted ? 0 : (document.getElementById('volumeSlider')?.value / 100 || 0.6);

            this.musicBoxAudio.onended = () => {
                if (this.musicPlayerState.tracks.length > 1) {
                    this.nextTrack();
                } else {
                    this.musicBoxAudio.currentTime = 0;
                    this.musicBoxAudio.play();
                }
            };
        }
    };

    // ==========================================
    // TRACK NAVIGATION
    // ==========================================
    window.app.nextTrack = function () {
        const state = this.musicPlayerState;
        if (state.tracks.length <= 1) return;

        const wasPlaying = this.musicBoxAudio && !this.musicBoxAudio.paused;

        // Move to next track (loop back to 0 if at end)
        state.currentTrackIndex = (state.currentTrackIndex + 1) % state.tracks.length;
        this.switchToTrack(state.currentTrackIndex, wasPlaying);
    };

    window.app.prevTrack = function () {
        const state = this.musicPlayerState;
        if (state.tracks.length <= 1) return;

        const wasPlaying = this.musicBoxAudio && !this.musicBoxAudio.paused;

        // Move to previous track (loop to end if at 0)
        state.currentTrackIndex = (state.currentTrackIndex - 1 + state.tracks.length) % state.tracks.length;
        this.switchToTrack(state.currentTrackIndex, wasPlaying);
    };

    window.app.switchToTrack = async function (trackIndex, autoPlay = false) {
        const state = this.musicPlayerState;
        const track = state.tracks[trackIndex];
        if (!track) return;

        // Update UI
        const titleEl = document.getElementById('currentSongTitle');
        const artistEl = document.getElementById('currentArtist');
        const trackNumEl = document.getElementById('currentTrackNum');

        if (titleEl) titleEl.textContent = track.songTitle || 'Unknown Track';
        if (artistEl) artistEl.textContent = track.artist || 'Unknown Artist';
        if (trackNumEl) trackNumEl.textContent = trackIndex + 1;

        // Stop current audio
        if (this.musicBoxAudio) {
            this.musicBoxAudio.pause();
            this.musicBoxAudio.currentTime = 0;
        }

        // Load new track
        if (track.audioUrl) {
            await this.loadMusicBoxAudio(track.audioUrl);

            // Auto-play if was playing before
            if (autoPlay && this.musicBoxAudio) {
                if (this.isMuted) this.musicBoxAudio.volume = 0;
                this.musicBoxAudio.play();
                document.getElementById('vinylRecord')?.classList.add('playing');
                document.getElementById('toneArm')?.classList.add('playing');
                document.getElementById('playButton')?.classList.add('playing');
                document.getElementById('musicBoxContainer')?.classList.add('playing');
                document.getElementById('visualizer')?.classList.add('is-active');
            }
        }

        // Add a subtle animation
        const titleSection = document.querySelector('.track-info-card');
        if (titleSection) {
            titleSection.style.animation = 'none';
            titleSection.offsetHeight; // Trigger reflow
            titleSection.style.animation = 'fadeIn 0.3s ease';
        }
    };

    // ==========================================
    // TOGGLE PLAYBACK
    // ==========================================
    window.app.toggleMusicBox = async function () {
        const vinylRecord = document.getElementById('vinylRecord');
        const toneArm = document.getElementById('toneArm');
        const playButton = document.getElementById('playButton');
        const container = document.getElementById('musicBoxContainer');
        const continueBtn = document.getElementById('musicContinueBtn');

        if (!this.musicBoxAudio && vinylRecord) {
            const url = vinylRecord.getAttribute('data-audio-url');
            if (url) await this.loadMusicBoxAudio(url);
        }

        if (!this.musicBoxAudio) return;

        if (this.musicBoxAudio.paused) {
            // START PLAYING

            if (this.bgMusic && !this.isMuted) {
                this.fadeVolume(this.bgMusic, 0, 1000);
            }
            if (this.voiceNoteTrack && !this.isMuted) {
                this.fadeVolume(this.voiceNoteTrack, 0, 1000);
            }

            this.musicBoxAudio.play().catch(e => console.log('Audio play failed:', e));
            this.musicBoxAudio.volume = 0;
            if (!this.isMuted) {
                const targetVolume = document.getElementById('volumeSlider')?.value / 100 || 0.6;
                this.fadeVolume(this.musicBoxAudio, targetVolume, 1200);
            }

            vinylRecord?.classList.add('playing');
            toneArm?.classList.add('playing');
            playButton?.classList.add('playing');
            container?.classList.add('playing');

            setTimeout(() => {
                continueBtn?.classList.add('visible');
            }, 3000);

            this.playSfx('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 0.15);

        } else {
            // STOP PLAYING

            this.fadeVolume(this.musicBoxAudio, 0, 600);
            setTimeout(() => {
                this.musicBoxAudio?.pause();
            }, 600);

            if (this.bgMusic && !this.isMuted) {
                this.fadeVolume(this.bgMusic, 0.3, 1000);
            }

            vinylRecord?.classList.remove('playing');
            toneArm?.classList.remove('playing');
            playButton?.classList.remove('playing');
            container?.classList.remove('playing');
        }

        if ('vibrate' in navigator) navigator.vibrate(25);
    };

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    window.app.updateVolumeIcon = function (volume) {
        const icon = document.getElementById('volumeIcon');
        if (!icon) return;

        if (volume === 0) {
            icon.textContent = 'volume_off';
        } else if (volume < 0.3) {
            icon.textContent = 'volume_mute';
        } else if (volume < 0.7) {
            icon.textContent = 'volume_down';
        } else {
            icon.textContent = 'volume_up';
        }
    };

    window.app.updateMusicBoxTime = function () {
        if (!this.musicBoxAudio || this.musicBoxAudio.paused) return;

        const current = this.formatTime(this.musicBoxAudio.currentTime);
        const duration = this.formatTime(this.musicBoxAudio.duration || 0);
    };

    // ==========================================
    // CLEANUP
    // ==========================================
    window.app.cleanupMusicBox = function () {
        if (this.musicBoxTimeInterval) {
            clearInterval(this.musicBoxTimeInterval);
            this.musicBoxTimeInterval = null;
        }

        if (this.musicBoxAudio) {
            this.musicBoxAudio.pause();
            this.musicBoxAudio = null;
        }
    };

    console.log('[MusicPlayer] Module loaded successfully');
})();
