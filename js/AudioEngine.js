/**
 * AudioEngine.js
 * Web Audio API wrapper for spatial audio with panning and distance attenuation
 */

class AudioEngine {
    constructor() {
        // Initialize Web Audio API context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // Resume context if suspended (required by modern browsers)
        if (this.audioContext.state === 'suspended') {
            document.addEventListener('click', () => {
                this.audioContext.resume();
            }, { once: true });
        }

        this.activeSources = []; // Track playing sources
    }

    /**
     * Decode audio data from ArrayBuffer
     * @param {ArrayBuffer} arrayBuffer - Raw audio data
     * @returns {Promise<AudioBuffer>} Decoded audio buffer
     */
    decodeAudio(arrayBuffer) {
        return this.audioContext.decodeAudioData(arrayBuffer);
    }

    /**
     * Create a spatial audio source for an object
     * @param {AudioBuffer} audioBuffer - Decoded audio data
     * @param {number} x - X position in world space
     * @param {number} z - Z position in world space
     * @param {number} volume - Volume (0.0 - 1.0)
     * @param {number} pitch - Playback rate (0.5 - 2.0)
     * @returns {Object} Source object with { source, panner, gainNode, buffer }
     */
    createSource(audioBuffer, x = 0, z = 0, volume = 1.0, pitch = 1.0) {
        // Create buffer source
        const bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.loop = true; // BUG FIX 2: Ensure looping is enabled
        bufferSource.playbackRate.value = pitch;

        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        // Create panner for spatial audio
        const panner = this.audioContext.createPanner();
        panner.distanceModel = 'inverse'; // Inverse distance attenuation (like OpenAL)
        panner.refDistance = 1.0;
        panner.maxDistance = 100.0;
        panner.rolloffFactor = 1.0;
        panner.positionX.value = x;
        panner.positionY.value = 0;
        panner.positionZ.value = z;

        // Connect audio graph: source → gain → panner → destination
        bufferSource.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(this.audioContext.destination);

        return {
            source: bufferSource,
            gainNode: gainNode,
            panner: panner,
            buffer: audioBuffer,
            isPlaying: false
        };
    }

    /**
     * Update source position and properties
     * @param {Object} sourceNode - Source object from createSource()
     * @param {number} x - New X position
     * @param {number} z - New Z position
     * @param {number} volume - New volume (0.0 - 2.0)
     * @param {number} pitch - New playback rate
     * @param {boolean} muted - Whether to mute the source
     * @param {number} hearingRange - Object's max distance to hear audio
     * @param {number} listenerX - Listener X position for distance calculation
     * @param {number} listenerZ - Listener Z position for distance calculation
     * @param {number} spectatorHearingRange - Spectator's max hearing range (default 500)
     */
    updateSource(sourceNode, x, z, volume, pitch, muted = false, hearingRange = 500, listenerX = 0, listenerZ = 0, spectatorHearingRange = 500) {
        sourceNode.panner.positionX.value = x;
        sourceNode.panner.positionZ.value = z;
        sourceNode.source.playbackRate.value = pitch;

        // Calculate distance from listener to sound source
        const dx = x - listenerX;
        const dz = z - listenerZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Apply muting and hearing range with distance attenuation
        let finalVolume = 0;
        
        if (!muted) {
            // Check if sound is within spectator's hearing range
            if (distance <= spectatorHearingRange) {
                // Also check object's hearing range
                if (distance <= hearingRange) {
                    // Calculate distance factor (1.0 at distance 0, 0.0 at max hearing range)
                    const distanceFactor = 1.0 - (distance / hearingRange);
                    // Apply volume with distance attenuation
                    finalVolume = volume * Math.max(0, distanceFactor);
                }
            }
        }
        
        // Clamp to valid gain range (0.0 to 2.0 - Web Audio API supports this)
        sourceNode.gainNode.gain.value = Math.max(0, Math.min(2, finalVolume));
    }

    /**
     * Update listener (spectator/camera) position and orientation
     * @param {number} x - Listener X position
     * @param {number} z - Listener Z position
     */
    updateListener(x = 0, z = 0) {
        const listener = this.audioContext.listener;
        
        // Position
        listener.positionX.value = x;
        listener.positionY.value = 0;
        listener.positionZ.value = z;

        // Orientation: facing -Z direction (forward), +Y is up
        listener.forwardX.value = 0;
        listener.forwardY.value = 0;
        listener.forwardZ.value = -1;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
    }

    /**
     * Start playing a source
     * @param {Object} sourceNode - Source object from createSource()
     */
    playSource(sourceNode) {
        if (!sourceNode.isPlaying) {
            sourceNode.source.start();
            sourceNode.isPlaying = true;
            this.activeSources.push(sourceNode);
        }
    }

    /**
     * Stop playing a source
     * @param {Object} sourceNode - Source object from createSource()
     */
    stopSource(sourceNode) {
        if (sourceNode.isPlaying) {
            try {
                sourceNode.source.stop();
                sourceNode.isPlaying = false;
            } catch (e) {
                // Ignore errors if already stopped
            }
            this.activeSources = this.activeSources.filter(s => s !== sourceNode);
        }
    }

    /**
     * Get current audio context state
     * @returns {string} 'running', 'suspended', or 'closed'
     */
    getState() {
        return this.audioContext.state;
    }

    /**
     * Resume audio context (required by user interaction)
     */
    resume() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
