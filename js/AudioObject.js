/**
 * AudioObject.js
 * Represents an audio object in the scene with spatial properties
 * Optimized for performance
 */

class AudioObject {
    // Default audio properties
    static DEFAULT_VOLUME = 1.0;
    static DEFAULT_PITCH = 1.0;
    static DEFAULT_HEARING_RANGE = 500;
    static DEFAULT_WIDTH = 40;
    static DEFAULT_HEIGHT = 40;

    // Audio property ranges
    static VOLUME_MIN = 0.0;
    static VOLUME_MAX = 2.0;
    static PITCH_MIN = 0.5;
    static PITCH_MAX = 2.0;
    static HEARING_RANGE_MIN = 50;
    static HEARING_RANGE_MAX = 1000;

    // Image filter ranges
    static BRIGHTNESS_MIN = -1.0;
    static BRIGHTNESS_MAX = 1.0;
    static SATURATION_MIN = 0.0;
    static SATURATION_MAX = 2.0;
    static HUE_MIN = 0;
    static HUE_MAX = 360;
    static GRAYSCALE_MIN = 0.0;
    static GRAYSCALE_MAX = 1.0;
    static BLUR_MIN = 0.0;
    static BLUR_MAX = 1.0;

    constructor(name, x = 0, z = 0) {
        // Unique identifier
        this.id = generateUUID();
        
        // Basic properties
        this.name = name;
        this.x = x; // World position X
        this.z = z; // World position Z

        // File paths
        this.audioPath = '';
        this.imagePath = '';

        // Audio properties
        this.volume = AudioObject.DEFAULT_VOLUME;
        this.pitch = AudioObject.DEFAULT_PITCH;
        this.muted = false;
        this.hearingRange = AudioObject.DEFAULT_HEARING_RANGE;
        
        // Image filter properties
        this.brightness = 0.0;
        this.saturation = 1.0;
        this.hue = 0.0;
        this.grayscale = 0.0;
        this.blur = 0.0;

        // Selection state
        this.selected = false;

        // Audio data
        this.audioBuffer = null;
        this.audioSource = null; // Web Audio API source node

        // Image data
        this.image = null; // HTML Image or loaded image data

        // Display properties
        this.width = AudioObject.DEFAULT_WIDTH;
        this.height = AudioObject.DEFAULT_HEIGHT;
        this.aspectRatio = 1.0; // Aspect ratio for image display
    }

    /**
     * Set object position in world space
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, z) {
        this.x = x;
        this.z = z;
    }

    /**
     * Get object position
     * @returns {Object} { x, z }
     */
    getPosition() {
        return { x: this.x, z: this.z };
    }

    /**
     * Calculate distance to another position
     * @param {number} x - Target X position
     * @param {number} z - Target Z position
     * @returns {number} Distance
     */
    distanceTo(x, z) {
        const dx = this.x - x;
        const dz = this.z - z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * Set audio properties
     * @param {number} volume - 0.0 - 1.0
     * @param {number} pitch - 0.5 - 2.0
     */
    setAudioProperties(volume, pitch) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.pitch = Math.max(0.5, Math.min(2.0, pitch));
    }

    /**
     * Set image filter properties
     * @param {Object} filters - { brightness, saturation, hue, grayscale, blur }
     */
    setImageFilters(filters) {
        if (filters.brightness !== undefined) this.brightness = filters.brightness;
        if (filters.saturation !== undefined) this.saturation = filters.saturation;
        if (filters.hue !== undefined) this.hue = filters.hue;
        if (filters.grayscale !== undefined) this.grayscale = filters.grayscale;
        if (filters.blur !== undefined) this.blur = filters.blur;
    }

    /**
     * Create CSS filter string for image based on properties
     * @returns {string} CSS filter string
     */
    getCSSFilter() {
        const filters = [];
        
        if (this.brightness !== 0) {
            filters.push(`brightness(${1 + this.brightness})`);
        }
        if (this.saturation !== 1) {
            filters.push(`saturate(${this.saturation})`);
        }
        if (this.hue !== 0) {
            filters.push(`hue-rotate(${this.hue}deg)`);
        }
        if (this.grayscale !== 0) {
            filters.push(`grayscale(${this.grayscale})`);
        }
        if (this.blur !== 0) {
            filters.push(`blur(${this.blur}px)`);
        }

        return filters.length > 0 ? filters.join(' ') : 'none';
    }

    /**
     * Serialize object to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            audioPath: this.audioPath,
            imagePath: this.imagePath,
            x: this.x,
            z: this.z,
            volume: this.volume,
            pitch: this.pitch,
            muted: this.muted,
            hearingRange: this.hearingRange,
            brightness: this.brightness,
            saturation: this.saturation,
            hue: this.hue,
            grayscale: this.grayscale,
            blur: this.blur,
            width: this.width,
            height: this.height,
            aspectRatio: this.aspectRatio
        };
    }

    /**
     * Create AudioObject from JSON data
     * @param {Object} json - JSON representation
     * @returns {AudioObject} New AudioObject instance
     */
    static fromJSON(json) {
        const obj = new AudioObject(json.name || 'Untitled Object', json.x || 0, json.z || 0);
        obj.id = json.id || obj.id;
        obj.audioPath = json.audioPath || '';
        obj.imagePath = json.imagePath || '';
        obj.volume = json.volume ?? AudioObject.DEFAULT_VOLUME;
        obj.pitch = json.pitch ?? AudioObject.DEFAULT_PITCH;
        obj.muted = json.muted ?? false;
        obj.hearingRange = json.hearingRange ?? AudioObject.DEFAULT_HEARING_RANGE;
        obj.brightness = json.brightness ?? 0.0;
        obj.saturation = json.saturation ?? 1.0;
        obj.hue = json.hue ?? 0.0;
        obj.grayscale = json.grayscale ?? 0.0;
        obj.blur = json.blur ?? 0.0;
        obj.width = json.width ?? AudioObject.DEFAULT_WIDTH;
        obj.height = json.height ?? AudioObject.DEFAULT_HEIGHT;
        obj.aspectRatio = json.aspectRatio || 1.0;
        return obj;
    }
}
