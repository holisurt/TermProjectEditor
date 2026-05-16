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

        // WASD movement
        if (keyStates['w'] || keyStates['W']) {
            this.z -= movement; // Move forward (negative Z)
        }
        if (keyStates['s'] || keyStates['S']) {
            this.z += movement; // Move backward (positive Z)
        }
        if (keyStates['a'] || keyStates['A']) {
            this.x -= movement; // Move left (negative X)
        }
        if (keyStates['d'] || keyStates['D']) {
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
            z: this.z
        };
    }

    /**
     * Restore from JSON
     * @param {Object} json - JSON object
     */
    fromJSON(json) {
        this.x = json.x || 0;
        this.z = json.z || 0;
    }
}
