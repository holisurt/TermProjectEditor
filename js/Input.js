/**
 * Input.js
 * Mouse and keyboard input handling for object manipulation
 * Optimized for performance and clarity
 */

class InputHandler {
    // Constants
    static DRAG_THRESHOLD = 2;

    constructor(renderer, scene, audioEngine) {
        this.renderer = renderer;
        this.scene = scene;
        this.audioEngine = audioEngine;

        // Drag state
        this.draggedIndex = -1;
        this.draggedSpectator = false;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Bind methods for event listeners
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
    }

    /**
     * Get current mouse position in screen space
     * @param {MouseEvent} e - Mouse event
     * @returns {Object} { x, y } screen coordinates
     */
    getMouseScreenPos(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseDown(e) {
        const screenPos = this.getMouseScreenPos(e);
        this.dragStartX = screenPos.x;
        this.dragStartY = screenPos.y;
        this.lastMouseX = screenPos.x;
        this.lastMouseY = screenPos.y;

        // Try to pick an object first
        const pickedIndex = this.renderer.pickObject(screenPos.x, screenPos.y, this.scene);
        if (pickedIndex >= 0) {
            this.handleObjectPicked(pickedIndex);
        } else if (this.renderer.pickSpectator(screenPos.x, screenPos.y, this.scene.spectator)) {
            this.handleSpectatorPicked();
        } else {
            this.handleEmptySpacePicked();
        }
    }

    /**
     * Handle picking an audio object
     * @param {number} index - Object index
     */
    handleObjectPicked(index) {
        this.scene.setSelectedIndex(index);
        this.draggedIndex = index;
        this.draggedSpectator = false;
        this.isPanning = false;
        this.renderer.canvas.style.cursor = 'pointer';
    }

    /**
     * Handle picking the spectator
     */
    handleSpectatorPicked() {
        this.scene.setSelectedIndex(-1);
        this.scene.spectator.setSelected(true);
        this.draggedSpectator = true;
        this.draggedIndex = -1;
        this.isPanning = false;
        
        // Center view on spectator when clicked
        this.renderer.worldX = this.scene.spectator.x;
        this.renderer.worldZ = this.scene.spectator.z;
        
        this.renderer.canvas.style.cursor = 'default';
    }

    /**
     * Handle clicking empty space
     */
    handleEmptySpacePicked() {
        this.scene.setSelectedIndex(-1);
        this.scene.spectator.setSelected(false);
        this.draggedIndex = -1;
        this.draggedSpectator = false;
        this.isPanning = true;
        this.renderer.canvas.style.cursor = 'grabbing';
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseMove(e) {
        const screenPos = this.getMouseScreenPos(e);
        
        // Calculate delta in world space
        const deltaX = (screenPos.x - this.lastMouseX) / this.renderer.zoom;
        const deltaZ = (screenPos.y - this.lastMouseY) / this.renderer.zoom;

        this.lastMouseX = screenPos.x;
        this.lastMouseY = screenPos.y;

        if (this.draggedIndex >= 0 && this.scene.getObjects()[this.draggedIndex]) {
            this.handleObjectDrag(deltaX, deltaZ);
        } else if (this.draggedSpectator) {
            this.handleSpectatorDrag(deltaX, deltaZ);
        } else if (this.isPanning) {
            this.handlePan(deltaX, deltaZ);
        } else {
            this.updateCursorHover(screenPos);
        }
    }

    /**
     * Handle dragging an audio object
     * @param {number} deltaX - X delta in world space
     * @param {number} deltaZ - Z delta in world space
     */
    handleObjectDrag(deltaX, deltaZ) {
        const obj = this.scene.getObjects()[this.draggedIndex];
        obj.x += deltaX;
        obj.z += deltaZ;

        // Update audio source position
        if (obj.audioSource) {
            this.audioEngine.updateSource(
                obj.audioSource,
                obj.x,
                obj.z,
                obj.volume,
                obj.pitch
            );
        }
        
        this.renderer.canvas.style.cursor = 'pointer';
    }

    /**
     * Handle dragging the spectator
     * @param {number} deltaX - X delta in world space
     * @param {number} deltaZ - Z delta in world space
     */
    handleSpectatorDrag(deltaX, deltaZ) {
        const moveAmount = 2.0 * Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
        
        if (Math.abs(deltaX) > Math.abs(deltaZ)) {
            this.scene.spectator.x += deltaX > 0 ? moveAmount : -moveAmount;
        } else {
            this.scene.spectator.z += deltaZ > 0 ? moveAmount : -moveAmount;
        }
        
        this.renderer.canvas.style.cursor = 'default';
    }

    /**
     * Handle panning (dragging empty space)
     * @param {number} deltaX - X delta in world space
     * @param {number} deltaZ - Z delta in world space
     */
    handlePan(deltaX, deltaZ) {
        this.renderer.worldX -= deltaX;
        this.renderer.worldZ -= deltaZ;
        this.renderer.canvas.style.cursor = 'grabbing';
    }

    /**
     * Update cursor based on hover state
     * @param {Object} screenPos - Screen position { x, y }
     */
    updateCursorHover(screenPos) {
        const pickedIndex = this.renderer.pickObject(screenPos.x, screenPos.y, this.scene);
        const pickedSpectator = this.renderer.pickSpectator(screenPos.x, screenPos.y, this.scene.spectator);
        
        if (pickedIndex >= 0) {
            this.renderer.canvas.style.cursor = 'pointer';
        } else if (pickedSpectator) {
            this.renderer.canvas.style.cursor = 'default';
        } else {
            this.renderer.canvas.style.cursor = 'grab';
        }
    }

    /**
     * Handle mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseUp(e) {
        this.draggedIndex = -1;
        this.draggedSpectator = false;
        this.isPanning = false;
        this.renderer.canvas.style.cursor = 'default';
    }

    /**
     * Check if an element is being dragged
     * @returns {boolean} True if dragging
     */
    isDragging() {
        return this.draggedIndex >= 0 || this.draggedSpectator;
    }

    /**
     * Reset drag state
     */
    resetDragState() {
        this.draggedIndex = -1;
        this.draggedSpectator = false;
        this.isPanning = false;
    }

    /**
     * Handle mouse wheel zoom event
     * Zooms toward cursor position
     * @param {WheelEvent} e - Wheel event
     */
    onWheel(e) {
        e.preventDefault();

        const zoomFactor = 0.001;
        const delta = -e.deltaY * zoomFactor;
        const oldZoom = this.renderer.zoom;

        // Clamp zoom level
        this.renderer.zoom = Math.max(0.2, Math.min(5.0, this.renderer.zoom + delta));

        // Get mouse position in screen space
        const screenPos = this.getMouseScreenPos(e);

        // Get mouse position in world space (before zoom change)
        const mouseWorldX = (screenPos.x - this.renderer.width / 2) / oldZoom + this.renderer.worldX;
        const mouseWorldZ = (screenPos.y - this.renderer.height / 2) / oldZoom + this.renderer.worldZ;

        // Adjust camera so that the mouse position stays under the cursor
        this.renderer.worldX = mouseWorldX - (screenPos.x - this.renderer.width / 2) / this.renderer.zoom;
        this.renderer.worldZ = mouseWorldZ - (screenPos.y - this.renderer.height / 2) / this.renderer.zoom;
    }
}
