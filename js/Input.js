/**
 * Input.js
 * Mouse and keyboard input handling for object manipulation
 */

class InputHandler {
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
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseDown(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        this.dragStartX = screenX;
        this.dragStartY = screenY;
        this.lastMouseX = screenX;
        this.lastMouseY = screenY;

        // Try to pick an object first
        const pickedIndex = this.renderer.pickObject(screenX, screenY, this.scene);
        if (pickedIndex >= 0) {
            // Object picked - select and prepare to drag
            this.scene.setSelectedIndex(pickedIndex);
            this.draggedIndex = pickedIndex;
            this.draggedSpectator = false;
            this.isPanning = false;
            this.renderer.canvas.style.cursor = 'pointer';
        } else if (this.renderer.pickSpectator(screenX, screenY, this.scene.spectator)) {
            // Spectator picked - deselect objects and allow spectator control
            this.scene.setSelectedIndex(-1);
            this.scene.spectator.setSelected(true);
            this.draggedSpectator = true;
            this.draggedIndex = -1;
            this.isPanning = false;
            
            // BUG FIX 4A: Center the view on the spectator when clicked
            this.renderer.worldX = this.scene.spectator.x;
            this.renderer.worldZ = this.scene.spectator.z;
            
            this.renderer.canvas.style.cursor = 'default';
        } else {
            // Nothing picked - deselect all and start panning
            this.scene.setSelectedIndex(-1);
            this.scene.spectator.setSelected(false);
            this.draggedIndex = -1;
            this.draggedSpectator = false;
            
            // BUG FIX 4B: Start panning mode for empty space click
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            
            this.renderer.canvas.style.cursor = 'grabbing';
        }
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseMove(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // BUG FIX 1: Properly convert screen delta to world delta accounting for zoom
        const deltaX = (screenX - this.lastMouseX) / this.renderer.zoom;
        const deltaZ = (screenY - this.lastMouseY) / this.renderer.zoom;

        this.lastMouseX = screenX;
        this.lastMouseY = screenY;

        // Handle dragging object
        if (this.draggedIndex >= 0 && this.scene.getObjects()[this.draggedIndex]) {
            const obj = this.scene.getObjects()[this.draggedIndex];
            
            // BUG FIX 1: Direct mapping of screen delta to world coordinates
            obj.x += deltaX;
            obj.z += deltaZ;

            // Update audio source position immediately
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
        // Handle dragging spectator
        else if (this.draggedSpectator) {
            const moveAmount = 2.0 * Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
            
            if (Math.abs(deltaX) > Math.abs(deltaZ)) {
                this.scene.spectator.x += deltaX > 0 ? moveAmount : -moveAmount;
            } else {
                this.scene.spectator.z += deltaZ > 0 ? moveAmount : -moveAmount;
            }
            
            this.renderer.canvas.style.cursor = 'default';
        }
        // BUG FIX 4B: Handle panning (dragging empty space)
        else if (this.isPanning) {
            this.renderer.worldX -= deltaX;
            this.renderer.worldZ -= deltaZ;
            
            this.renderer.canvas.style.cursor = 'grabbing';
        }
        // Update cursor for non-dragging hover
        else {
            const pickedIndex = this.renderer.pickObject(screenX, screenY, this.scene);
            const pickedSpectator = this.renderer.pickSpectator(screenX, screenY, this.scene.spectator);
            
            if (pickedIndex >= 0) {
                this.renderer.canvas.style.cursor = 'pointer';
            } else if (pickedSpectator) {
                this.renderer.canvas.style.cursor = 'default';
            } else {
                this.renderer.canvas.style.cursor = 'grab';
            }
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
     * Handle mouse wheel zoom event (BUG FIX 3)
     * @param {WheelEvent} e - Wheel event
     */
    onWheel(e) {
        e.preventDefault();

        const zoomFactor = 0.001;
        const delta = -e.deltaY * zoomFactor;

        const oldZoom = this.renderer.zoom;
        this.renderer.zoom = Math.max(0.2, Math.min(5.0, this.renderer.zoom + delta));

        // Zoom toward mouse cursor position
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Adjust world position to zoom toward cursor
        const zoomRatio = this.renderer.zoom / oldZoom;
        this.renderer.worldX = mouseX / this.renderer.zoom - zoomRatio * (mouseX / oldZoom - this.renderer.worldX);
        this.renderer.worldZ = mouseY / this.renderer.zoom - zoomRatio * (mouseY / oldZoom - this.renderer.worldZ);
    }
}
