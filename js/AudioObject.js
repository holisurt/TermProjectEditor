/**
 * AudioObject.js
 * Represents an audio object in the scene with spatial properties
 */

class AudioObject {
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
        this.volume = 1.0;      // 0.0 - 2.0
        this.pitch = 1.0;       // 0.5 - 2.0
        this.muted = false;     // Mute toggle
        this.hearingRange = 500; // Max distance to hear audio in pixels
        
        // Image filter properties
        this.brightness = 0.0;  // -1.0 to 1.0
        this.saturation = 1.0;  // 0.0 to 2.0
        this.hue = 0.0;         // 0.0 to 360
        this.grayscale = 0.0;   // 0.0 to 1.0
        this.blur = 0.0;        // 0.0 to 1.0 (pixels)

        // Selection state
        this.selected = false;

        // Audio data
        this.audioBuffer = null;
        this.audioSource = null; // Web Audio API source node

        // Image data
        this.image = null; // HTML Image or loaded image data

        // Display properties
        this.width = 40;
        this.height = 40;
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
            height: this.height
        };
    }

    /**
     * Create AudioObject from JSON
     * @param {Object} json - JSON object
     * @returns {AudioObject} Reconstructed object
     */
    static fromJSON(json) {
        const obj = new AudioObject(json.name, json.x, json.z);
        obj.id = json.id;
        obj.audioPath = json.audioPath;
        obj.imagePath = json.imagePath;
        obj.volume = json.volume;
        obj.pitch = json.pitch;
        obj.brightness = json.brightness;
        obj.saturation = json.saturation;
        obj.hue = json.hue;
        obj.grayscale = json.grayscale;
        obj.blur = json.blur;
        obj.width = json.width;
        obj.height = json.height;
        return obj;
    }
}

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
