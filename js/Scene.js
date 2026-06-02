/**
 * Scene.js
 * Manages the collection of audio objects and the spectator
 */

class Scene {
    static WIDTH = 3000;
    static HEIGHT = 2000;
    static HALF_WIDTH = Scene.WIDTH / 2;
    static HALF_HEIGHT = Scene.HEIGHT / 2;

    constructor() {
        this.objects = [];           // Array of AudioObject
        this.spectator = new Spectator();
        this.selectedIndex = -1;     // Index of selected object (-1 if none)
        this.backgroundImage = null;
        this.backgroundImageSrc = '';
        this.backgroundImagePath = '';
    }

    /**
     * Add an audio object to the scene
     * @param {AudioObject} audioObject - Object to add
     */
    addObject(audioObject) {
        const pos = this.clampPosition(audioObject.x, audioObject.z);
        audioObject.setPosition(pos.x, pos.z);
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
            } else if (this.selectedIndex > index) {
                this.selectedIndex -= 1;
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
        return this.objects[this.selectedIndex] || null;
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
            if (distance(obj.x, obj.z, x, z) <= threshold) {
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
        const spectatorPos = this.clampPosition(this.spectator.x, this.spectator.z);
        this.spectator.setPosition(spectatorPos.x, spectatorPos.z);
    }

    /**
     * Serialize scene to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            spectator: this.spectator.toJSON(),
            objects: this.objects.map(obj => obj.toJSON()),
            backgroundImageSrc: this.backgroundImageSrc,
            backgroundImagePath: this.backgroundImagePath,
            width: Scene.WIDTH,
            height: Scene.HEIGHT
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

        if (json.backgroundImageSrc) {
            scene.setBackgroundImage(json.backgroundImageSrc, json.backgroundImagePath || '');
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
        this.backgroundImage = null;
        this.backgroundImageSrc = '';
        this.backgroundImagePath = '';
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

    /**
     * Clamp a world position to the fixed 3000x2000 scene bounds.
     * @param {number} x - World X
     * @param {number} z - World Z
     * @returns {Object} Clamped { x, z }
     */
    clampPosition(x, z) {
        return {
            x: clamp(x, -Scene.HALF_WIDTH, Scene.HALF_WIDTH),
            z: clamp(z, -Scene.HALF_HEIGHT, Scene.HALF_HEIGHT)
        };
    }

    /**
     * Set scene background image from a data URL.
     * @param {string} imageSrc - Data URL
     * @param {string} imagePath - Original file name
     */
    setBackgroundImage(imageSrc, imagePath = '') {
        this.backgroundImageSrc = imageSrc;
        this.backgroundImagePath = imagePath;

        if (!imageSrc) {
            this.backgroundImage = null;
            return;
        }

        const img = new Image();
        img.src = imageSrc;
        this.backgroundImage = img;
    }
}
