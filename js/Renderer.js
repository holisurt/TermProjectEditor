/**
 * Renderer.js
 * 2D Canvas rendering engine for the scene
 * Optimized for performance and visual clarity
 */

class Renderer {
    // Grid settings
    static GRID_SIZE = 50;
    static GRID_COLOR = '#2d2d3d';
    
    // Spectator settings
    static SPECTATOR_RADIUS = 15;
    static SPECTATOR_LABEL = 'LISTENER';
    static HEARING_RANGE_ALPHA = 'rgba(0, 200, 136, ';
    
    // Object settings
    static OBJECT_LABEL_OFFSET = 6;
    static HEARING_RANGE_RING_ALPHA = 'rgba(0, 255, 150, ';
    
    // Selection colors
    static SELECTED_COLOR = '#ffff00';
    static DEFAULT_BORDER_COLOR = '#888888';
    static SELECTION_BORDER_WIDTH = 3;
    static DEFAULT_BORDER_WIDTH = 1;

    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.width = canvasElement.width;
        this.height = canvasElement.height;

        // Camera/viewport settings
        this.worldX = 0;
        this.worldZ = 0;
        this.zoom = 1.0;

        // Hover state
        this.hoveredObjectId = null;
    }

    /**
     * Resize the canvas and viewport
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X position
     * @param {number} worldZ - World Z position (depth)
     * @returns {Object} { x: screenX, y: screenY }
     */
    worldToScreen(worldX, worldZ) {
        const screenX = (worldX - this.worldX) * this.zoom + this.width / 2;
        const screenY = (worldZ - this.worldZ) * this.zoom + this.height / 2;
        return { x: screenX, y: screenY };
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @returns {Object} { x: worldX, z: worldZ }
     */
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.width / 2) / this.zoom + this.worldX;
        const worldZ = (screenY - this.height / 2) / this.zoom + this.worldZ;
        return { x: worldX, z: worldZ };
    }

    /**
     * Render the entire scene
     * @param {Scene} scene - Scene to render
     * @param {number} mouseX - Current mouse X (for hovering)
     * @param {number} mouseY - Current mouse Y (for hovering)
     */
    renderScene(scene, mouseX = -1, mouseY = -1) {
        this.clampViewportToScene();

        // Clear canvas
        this.ctx.fillStyle = '#15151a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawSceneArea(scene);
        this.drawGrid(scene);

        // Draw all objects
        scene.getObjects().forEach((obj, index) => {
            const isSelected = scene.selectedIndex === index;
            this.renderObject(obj, isSelected);
        });

        // Draw spectator
        this.renderSpectator(scene.spectator);

        // Check hover state
        if (mouseX >= 0 && mouseY >= 0) {
            this.updateHoveredObject(scene, mouseX, mouseY);
            this.renderTooltip(scene, mouseX, mouseY);
        }
    }

    /**
     * Draw gridlines in the background
     */
    drawSceneArea(scene) {
        const topLeft = this.worldToScreen(-Scene.HALF_WIDTH, -Scene.HALF_HEIGHT);
        const bottomRight = this.worldToScreen(Scene.HALF_WIDTH, Scene.HALF_HEIGHT);
        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        this.ctx.save();
        this.ctx.fillStyle = '#1a1a20';
        this.ctx.fillRect(topLeft.x, topLeft.y, width, height);

        if (scene.backgroundImage && scene.backgroundImage.complete) {
            this.ctx.drawImage(scene.backgroundImage, topLeft.x, topLeft.y, width, height);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            this.ctx.fillRect(topLeft.x, topLeft.y, width, height);
        }

        this.ctx.strokeStyle = '#777777';
        this.ctx.lineWidth = Math.max(1, this.zoom);
        this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
        this.ctx.restore();
    }

    drawGrid() {
        const gridSize = 50;
        const gridColor = '#2d2d3d';
        const topLeft = this.worldToScreen(-Scene.HALF_WIDTH, -Scene.HALF_HEIGHT);
        const bottomRight = this.worldToScreen(Scene.HALF_WIDTH, Scene.HALF_HEIGHT);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
        this.ctx.clip();
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 0.5;

        // Convert grid to screen space
        const screenSize = gridSize * this.zoom;

        // Calculate grid offset based on camera position
        const offsetX = ((this.worldX % gridSize) * this.zoom) + this.width / 2;
        const offsetY = ((this.worldZ % gridSize) * this.zoom) + this.height / 2;

        // Draw vertical lines
        for (let x = offsetX % screenSize - screenSize; x < this.width; x += screenSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, topLeft.y);
            this.ctx.lineTo(x, bottomRight.y);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = offsetY % screenSize - screenSize; y < this.height; y += screenSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(topLeft.x, y);
            this.ctx.lineTo(bottomRight.x, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    /**
     * Render the spectator (listener)
     * @param {Spectator} spectator - Spectator object
     */
    renderSpectator(spectator) {
        const screenPos = this.worldToScreen(spectator.x, spectator.z);
        const spectatorRadius = 15 * this.zoom;

        // Draw hearing range circle based on spectator's hearing range
        const hearingRangeRadius = spectator.hearingRange * this.zoom;
        this.ctx.fillStyle = 'rgba(0, 200, 136, 0.1)';
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, hearingRangeRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw hearing range border
        this.ctx.strokeStyle = 'rgba(0, 200, 136, 0.3)';
        this.ctx.lineWidth = 1 * this.zoom;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, hearingRangeRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw spectator body
        if (spectator.image && spectator.image.complete) {
            this.drawScaledImage(
                spectator.image,
                screenPos.x,
                screenPos.y,
                spectatorRadius * 2,
                spectatorRadius * 2,
                'none',
                true
            );
        } else {
            // Default spectator circle
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, spectatorRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw selection highlight if selected
        if (spectator.selected) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3 * this.zoom;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, spectatorRadius + 8 * this.zoom, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw direction indicator (forward arrow)
            const arrowLen = 20 * this.zoom;
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2 * this.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(screenPos.x, screenPos.y);
            this.ctx.lineTo(screenPos.x, screenPos.y - arrowLen);
            this.ctx.stroke();
        } else {
            // Draw subtle border when not selected
            this.ctx.strokeStyle = '#888888';
            this.ctx.lineWidth = 1 * this.zoom;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, spectatorRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw label
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = `${12 * this.zoom}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('LISTENER', screenPos.x, screenPos.y + spectatorRadius + 8 * this.zoom);
    }

    /**
     * Render an audio object
     * @param {AudioObject} obj - Object to render
     * @param {boolean} isSelected - Whether this object is selected
     */
    renderObject(obj, isSelected) {
        const screenPos = this.worldToScreen(obj.x, obj.z);
        const screenWidth = obj.width * this.zoom;
        const screenHeight = obj.height * this.zoom;

        // Draw object image or placeholder
        if (obj.image && obj.image.complete) {
            const filterString = this.buildFilterString(
                obj.brightness,
                obj.saturation,
                obj.hue,
                obj.grayscale,
                obj.blur
            );
            this.drawScaledImage(
                obj.image,
                screenPos.x,
                screenPos.y,
                screenWidth,
                screenHeight,
                filterString,
                false
            );
        } else {
            // Placeholder rectangle
            const hueShift = (obj.hue / 360) * 360;
            const baseColor = `hsl(${hueShift}, 70%, 50%)`;
            this.ctx.fillStyle = baseColor;
            this.ctx.fillRect(
                screenPos.x - screenWidth / 2,
                screenPos.y - screenHeight / 2,
                screenWidth,
                screenHeight
            );
        }

        // Draw selection highlight
        if (isSelected) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3 * this.zoom;
            this.ctx.strokeRect(
                screenPos.x - screenWidth / 2,
                screenPos.y - screenHeight / 2,
                screenWidth,
                screenHeight
            );
        } else {
            // Subtle border
            this.ctx.strokeStyle = '#888888';
            this.ctx.lineWidth = 1 * this.zoom;
            this.ctx.strokeRect(
                screenPos.x - screenWidth / 2,
                screenPos.y - screenHeight / 2,
                screenWidth,
                screenHeight
            );
        }

        // Draw hearing range ring (for selected objects)
        if (isSelected && obj.hearingRange) {
            const screenRadius = obj.hearingRange * this.zoom;
            
            // Semi-transparent fill
            this.ctx.fillStyle = 'rgba(0, 255, 150, 0.08)';
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ring border
            this.ctx.strokeStyle = 'rgba(0, 255, 150, 0.4)';
            this.ctx.lineWidth = 2 * this.zoom;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw object label
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = `${12 * this.zoom}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(
            obj.name,
            screenPos.x,
            screenPos.y + screenHeight / 2 + 6 * this.zoom
        );
    }

    /**
     * Build CSS filter string from effect parameters
     * @returns {string} CSS filter string
     */
    buildFilterString(brightness, saturation, hue, grayscale, blur) {
        const filters = [];

        // Brightness (1.0 is normal, range -1.0 to 1.0)
        filters.push(`brightness(${1 + brightness})`);

        // Saturation (1.0 is normal, range 0.0 to 2.0)
        filters.push(`saturate(${saturation})`);

        // Hue rotation (0-360 degrees)
        if (hue !== 0) {
            filters.push(`hue-rotate(${hue}deg)`);
        }

        // Grayscale (0.0 to 1.0)
        if (grayscale !== 0) {
            filters.push(`grayscale(${grayscale})`);
        }

        // Blur (0.0 to 1.0, scale to pixels)
        if (blur !== 0) {
            filters.push(`blur(${blur * 4}px)`);
        }

        return filters.length > 0 ? filters.join(' ') : 'none';
    }

    /**
     * Draw an image with proper scaling and aspect ratio
     * @param {Image} image - Image to draw
     * @param {number} screenX - Center screen X position
     * @param {number} screenY - Center screen Y position
     * @param {number} screenWidth - Desired screen width
     * @param {number} screenHeight - Desired screen height
     * @param {string} filterString - CSS filter string
     * @param {boolean} isCircular - If true, draw as circular crop
     */
    drawScaledImage(image, screenX, screenY, screenWidth, screenHeight, filterString = 'none', isCircular = false) {
        this.ctx.filter = filterString;

        if (isCircular) {
            // Draw circular cropped image
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, screenWidth / 2, 0, Math.PI * 2);
            this.ctx.clip();
        }

        this.ctx.drawImage(
            image,
            screenX - screenWidth / 2,
            screenY - screenHeight / 2,
            screenWidth,
            screenHeight
        );

        if (isCircular) {
            this.ctx.restore();
        }

        this.ctx.filter = 'none';
    }

    /**
     * Update hovered object based on mouse position
     * @param {Scene} scene - Scene
     * @param {number} mouseX - Screen X
     * @param {number} mouseY - Screen Y
     */
    updateHoveredObject(scene, mouseX, mouseY) {
        const worldPos = this.screenToWorld(mouseX, mouseY);

        this.hoveredObjectId = null;

        // Check each object for hover
        for (const obj of scene.getObjects()) {
            const screenPos = this.worldToScreen(obj.x, obj.z);
            const screenWidth = obj.width * this.zoom;
            const screenHeight = obj.height * this.zoom;

            const left = screenPos.x - screenWidth / 2;
            const top = screenPos.y - screenHeight / 2;
            const right = left + screenWidth;
            const bottom = top + screenHeight;

            if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
                this.hoveredObjectId = obj.id;
                break;
            }
        }
    }

    /**
     * Render tooltip near cursor
     * @param {Scene} scene - Scene
     * @param {number} mouseX - Screen X
     * @param {number} mouseY - Screen Y
     */
    renderTooltip(scene, mouseX, mouseY) {
        if (!this.hoveredObjectId) return;

        const obj = scene.findObjectById(this.hoveredObjectId);
        if (!obj) return;

        const tooltipText = `${obj.name} (Vol: ${obj.volume.toFixed(2)}, Pitch: ${obj.pitch.toFixed(2)})`;
        const padding = 8;
        const textMetrics = this.ctx.measureText(tooltipText);
        const textWidth = textMetrics.width;
        const textHeight = 16;

        const tooltipX = mouseX + 10;
        const tooltipY = mouseY + 10;

        // Draw tooltip background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(
            tooltipX - padding / 2,
            tooltipY - padding / 2,
            textWidth + padding,
            textHeight + padding
        );

        // Draw tooltip border
        this.ctx.strokeStyle = '#0088ff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            tooltipX - padding / 2,
            tooltipY - padding / 2,
            textWidth + padding,
            textHeight + padding
        );

        // Draw tooltip text
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(tooltipText, tooltipX, tooltipY);
    }

    /**
     * Pick object at screen position
     * @param {number} screenX - Screen X
     * @param {number} screenY - Screen Y
     * @param {Scene} scene - Scene
     * @returns {number} Object index, or -1 if none picked
     */
    pickObject(screenX, screenY, scene) {
        // Check in reverse order (top to bottom)
        for (let i = scene.getObjects().length - 1; i >= 0; i--) {
            const obj = scene.getObjects()[i];
            const screenPos = this.worldToScreen(obj.x, obj.z);
            const screenWidth = obj.width * this.zoom;
            const screenHeight = obj.height * this.zoom;

            const left = screenPos.x - screenWidth / 2;
            const top = screenPos.y - screenHeight / 2;
            const right = left + screenWidth;
            const bottom = top + screenHeight;

            if (screenX >= left && screenX <= right && screenY >= top && screenY <= bottom) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Check if spectator was clicked
     * @param {number} screenX - Screen X
     * @param {number} screenY - Screen Y
     * @param {Spectator} spectator - Spectator object
     * @returns {boolean} True if clicked
     */
    pickSpectator(screenX, screenY, spectator) {
        const screenPos = this.worldToScreen(spectator.x, spectator.z);
        const pickRadius = 25 * this.zoom;

        const dx = screenX - screenPos.x;
        const dy = screenY - screenPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist <= pickRadius;
    }

    /**
     * Get camera/viewport center in world coords
     * @returns {Object} { x, z }
     */
    getViewportCenter() {
        return { x: this.worldX, z: this.worldZ };
    }

    /**
     * Set camera position
     * @param {number} worldX - World X
     * @param {number} worldZ - World Z
     */
    setViewport(worldX, worldZ) {
        this.worldX = worldX;
        this.worldZ = worldZ;
        this.clampViewportToScene();
    }

    /**
     * Set zoom level
     * @param {number} zoom - Zoom factor (1.0 = normal)
     */
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(5.0, zoom));
        this.clampViewportToScene();
    }

    /**
     * Keep the viewport center inside the fixed scene bounds.
     */
    clampViewportToScene() {
        this.worldX = Math.max(-Scene.HALF_WIDTH, Math.min(Scene.HALF_WIDTH, this.worldX));
        this.worldZ = Math.max(-Scene.HALF_HEIGHT, Math.min(Scene.HALF_HEIGHT, this.worldZ));
    }
}
