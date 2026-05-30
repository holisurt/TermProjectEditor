/**
 * Scene.js
 * Manages the collection of audio objects and the spectator
 */

class Scene {
    constructor() {
        this.objects = [];           // Array of AudioObject
        this.spectator = new Spectator();
        this.selectedIndex = -1;     // Index of selected object (-1 if none)
    }

    /**
     * Add an audio object to the scene
     * @param {AudioObject} audioObject - Object to add
     */
    addObject(audioObject) {
        this.objects.push(audioObject);
    }

    /**
     * Remove an audio object from the scene
     * @param {number} index - Index of object to remove
     */
    removeObject(index) {
        if (index >= 0 && index < this.objects.length) {
            this.objects.splice(index, 1);
            if (this.selectedIndex === index) {
                this.selectedIndex = -1;
            }
        }
    }

    /**
     * Remove object by ID
     * @param {string} id - Object ID
     */
    removeObjectById(id) {
        const index = this.objects.findIndex(obj => obj.id === id);
        if (index >= 0) {
            this.removeObject(index);
        }
    }

    /**
     * Get currently selected object
     * @returns {AudioObject|null} Selected object or null
     */
    getSelectedObject() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.objects.length) {
            return this.objects[this.selectedIndex];
        }
        return null;
    }

    /**
     * Set selected object by index
     * @param {number} index - Index of object to select (-1 to deselect)
     */
    setSelectedIndex(index) {
        // Deselect previous
        if (this.selectedIndex >= 0 && this.selectedIndex < this.objects.length) {
            this.objects[this.selectedIndex].selected = false;
        }

        this.selectedIndex = index;

        // Select new
        if (index >= 0 && index < this.objects.length) {
            this.objects[index].selected = true;
            this.spectator.setSelected(false);
        }
    }

    /**
     * Find object index by ID
     * @param {string} id - Object ID
     * @returns {number} Index or -1 if not found
     */
    findObjectIndex(id) {
        return this.objects.findIndex(obj => obj.id === id);
    }

    /**
     * Find object by ID
     * @param {string} id - Object ID
     * @returns {AudioObject|null} Object or null
     */
    findObjectById(id) {
        return this.objects.find(obj => obj.id === id) || null;
    }

    /**
     * Find object at world position (raycast)
     * @param {number} x - World X position
     * @param {number} z - World Z position
     * @param {number} threshold - Click radius in world units
     * @returns {AudioObject|null} Clicked object or null
     */
    pickObject(x, z, threshold = 30) {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            const dx = obj.x - x;
            const dz = obj.z - z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= threshold) {
                return obj;
            }
        }
        return null;
    }

    /**
     * Update scene (spectator movement, animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} keyStates - Keyboard state
     */
    update(deltaTime, keyStates) {
        this.spectator.update(deltaTime, keyStates);
    }

    /**
     * Serialize scene to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            spectator: this.spectator.toJSON(),
            objects: this.objects.map(obj => obj.toJSON())
        };
    }

    /**
     * Restore scene from JSON
     * @param {Object} json - JSON object
     * @returns {Scene} Restored scene
     */
    static fromJSON(json) {
        const scene = new Scene();
        
        if (json.spectator) {
            scene.spectator.fromJSON(json.spectator);
        }

        if (json.objects && Array.isArray(json.objects)) {
            json.objects.forEach(objData => {
                scene.addObject(AudioObject.fromJSON(objData));
            });
        }

        return scene;
    }

    /**
     * Clear all objects and reset spectator
     */
    clear() {
        this.objects = [];
        this.selectedIndex = -1;
        this.spectator = new Spectator();
    }

    /**
     * Get all objects (for iteration)
     * @returns {Array<AudioObject>} Array of objects
     */
    getObjects() {
        return this.objects;
    }

    /**
     * Get object count
     * @returns {number} Number of objects
     */
    getObjectCount() {
        return this.objects.length;
    }
}
