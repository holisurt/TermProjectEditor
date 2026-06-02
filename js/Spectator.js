/**
 * Spectator.js
 * Represents the listener (camera/viewpoint) in the scene
 */

class Spectator {
    constructor() {
        // Position in world space
        this.x = 0;
        this.z = 0;

        // Selection state
        this.selected = false;

        // Display properties
        this.radius = 15;
        this.image = null; // Custom spectator image
        this.imagePath = ''; // Path to spectator image file
        this.aspectRatio = 1.0; // Aspect ratio for image display

        // Audio properties
        this.hearingRange = 500; // Max distance to hear audio (in pixels)

        // Movement properties
        this.speed = 200; // World units per second (increased for better control)
    }

    /**
     * Update spectator position based on keyboard input and delta time
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} keyStates - Object with key states { 'w': true/false, ... }
     */
    update(deltaTime, keyStates) {
        if (!this.selected) return;

        const movement = this.speed * deltaTime;
        const isDown = key => keyStates[key] || keyStates[key.toUpperCase()];

        // WASD movement
        if (isDown('w')) {
            this.z -= movement; // Move forward (negative Z)
        }
        if (isDown('s')) {
            this.z += movement; // Move backward (positive Z)
        }
        if (isDown('a')) {
            this.x -= movement; // Move left (negative X)
        }
        if (isDown('d')) {
            this.x += movement; // Move right (positive X)
        }
    }

    /**
     * Get current position
     * @returns {Object} { x, z }
     */
    getPosition() {
        return { x: this.x, z: this.z };
    }

    /**
     * Set position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, z) {
        this.x = x;
        this.z = z;
    }

    /**
     * Set selection state
     * @param {boolean} selected - True if selected
     */
    setSelected(selected) {
        this.selected = selected;
    }

    /**
     * Serialize to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            x: this.x,
            z: this.z,
            hearingRange: this.hearingRange,
            imagePath: this.imagePath,
            aspectRatio: this.aspectRatio
        };
    }

    /**
     * Restore from JSON
     * @param {Object} json - JSON object
     */
    fromJSON(json) {
        this.x = json.x || 0;
        this.z = json.z || 0;
        this.hearingRange = json.hearingRange || 500;
        this.imagePath = json.imagePath || '';
        this.aspectRatio = json.aspectRatio || 1.0;
    }
}
