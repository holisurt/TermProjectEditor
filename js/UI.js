/**
 * UI.js
 * UIController for managing all UI interactions and state
 */

class UIController {
    constructor(scene, audioEngine, renderer) {
        this.scene = scene;
        this.audioEngine = audioEngine;
        this.renderer = renderer;

        // Modal and panel state
        this.currentEditingObjectIndex = -1;
        this.objectsListSignature = '';
        this.propertiesPanelSignature = '';

        // Toast notification
        this.toastTimeout = null;
    }

    el(id) {
        return document.getElementById(id);
    }

    setModal(id, active) {
        this.el(id).classList.toggle('active', active);
    }

    resetInputs(...ids) {
        ids.forEach(id => { this.el(id).value = ''; });
    }

    createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }

    createEmptyState(text, padding = 12) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = `padding: ${padding}px; color: #a0a0a0; text-align: center; font-size: 12px;`;
        emptyMsg.textContent = text;
        return emptyMsg;
    }

    getObjectControlIds() {
        return [
            'volumeSlider', 'pitchSlider', 'hearingRangeSlider',
            'brightnessSlider', 'saturationSlider', 'hueSlider',
            'grayscaleSlider', 'blurSlider'
        ];
    }

    setObjectControlsEnabled(enabled) {
        this.getObjectControlIds().forEach(id => { this.el(id).disabled = !enabled; });
        this.el('objectNameInput').disabled = !enabled;
        this.el('muteCheckbox').disabled = !enabled;
        if (!enabled) {
            this.el('sceneInfoInput').value = '';
            this.el('objectNameInput').value = '';
            this.el('muteCheckbox').checked = false;
        }
    }

    setSliderControl(sliderId, valueId, value, formatter = v => Number(v).toFixed(2)) {
        this.el(sliderId).disabled = false;
        this.el(sliderId).value = value;
        this.el(valueId).textContent = formatter(value);
    }

    getPropertiesPanelSignature(obj) {
        if (!obj) {
            const spectator = this.scene.spectator;
            return JSON.stringify({
                selected: spectator.selected ? 'spectator' : 'none',
                hearingRange: spectator.hearingRange,
                imageSrc: spectator.image && spectator.image.src || '',
                objectCount: this.scene.getObjects().length
            });
        }

        return JSON.stringify({
            selected: obj.id,
            objectCount: this.scene.getObjects().length,
            name: obj.name,
            volume: obj.volume,
            pitch: obj.pitch,
            muted: obj.muted,
            hearingRange: obj.hearingRange,
            brightness: obj.brightness,
            saturation: obj.saturation,
            hue: obj.hue,
            grayscale: obj.grayscale,
            blur: obj.blur
        });
    }

    /**
     * Open Add Object modal
     */
    openAddObjectModal() {
        this.audioEngine.resume();
        this.setModal('addObjectModal', true);
        this.resetInputs('modalObjectName', 'modalAudioFile', 'modalImageFile');
        this.el('modalObjectName').focus();
    }

    /**
     * Close Add Object modal
     */
    closeAddObjectModal() {
        this.setModal('addObjectModal', false);
    }

    /**
     * Handle Add Object confirmation
     */
    async onAddObjectConfirm() {
        await this.audioEngine.resume();

        const nameInput = this.el('modalObjectName');
        const audioFileInput = this.el('modalAudioFile');
        const imageFileInput = this.el('modalImageFile');

        const name = nameInput.value.trim();

        if (!name) {
            alert('Please enter an object name');
            return;
        }

        // Create audio object
        const newObj = new AudioObject(name, 0, 0);

        try {
            if (audioFileInput.files.length > 0) {
                await this.loadAudioFile(audioFileInput.files[0], newObj);
            }

            if (imageFileInput.files.length > 0) {
                await this.loadImageFile(imageFileInput.files[0], newObj);
            }

            // Add to scene
            this.scene.addObject(newObj);
            this.scene.setSelectedIndex(this.scene.getObjects().length - 1);
            this.updateAllAudioSources();

            // Update UI
            this.updateObjectsLibrary();
            this.updateObjectsList(true);
            this.updatePropertiesPanel(newObj);
            this.closeAddObjectModal();
            this.showToast('Object added!');
        } catch (error) {
            console.error('Error adding object:', error);
            alert('Failed to add object: ' + error.message);
        }
    }

    /**
     * Load image file into AudioObject with aspect ratio preservation
     * @param {File} imageFile - Image file
     * @param {AudioObject} obj - Target object
     */
    async loadImageFile(imageFile, obj) {
        const dataUrl = await this.fileToDataUrl(imageFile);
        const img = await this.loadImageElement(dataUrl);
        obj.image = img;
        obj.imagePath = imageFile.name;
        obj.imageDataUrl = dataUrl;
        obj.width = 40;
        obj.aspectRatio = img.width / img.height;
        obj.height = obj.width / obj.aspectRatio;
    }

    /**
     * Convert a file to a data URL so saved scenes can restore local files.
     * @param {File} file - File to encode
     * @returns {Promise<string>} Data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    loadImageElement(dataUrl, errorMessage = 'Failed to load image') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(errorMessage));
            img.src = dataUrl;
        });
    }

    /**
     * Decode an audio data URL into an AudioBuffer.
     * @param {string} dataUrl - Audio data URL
     * @returns {Promise<AudioBuffer>} Decoded audio buffer
     */
    async decodeAudioDataUrl(dataUrl) {
        const response = await fetch(dataUrl);
        const arrayBuffer = await response.arrayBuffer();
        return this.audioEngine.decodeAudio(arrayBuffer);
    }

    createAndPlaySource(obj, audioBuffer) {
        const sourceNode = this.audioEngine.createSource(audioBuffer, obj.x, obj.z, obj.volume, obj.pitch);
        obj.audioBuffer = audioBuffer;
        obj.audioSource = sourceNode;
        this.audioEngine.playSource(sourceNode);
    }

    async loadAudioFile(audioFile, obj, stopExisting = false) {
        const audioBuffer = await this.audioEngine.decodeAudio(await audioFile.arrayBuffer());
        if (stopExisting && obj.audioSource) this.audioEngine.stopSource(obj.audioSource);
        obj.audioPath = audioFile.name;
        obj.audioDataUrl = await this.fileToDataUrl(audioFile);
        this.createAndPlaySource(obj, audioBuffer);
    }

    /**
     * Restore an object's image from a saved data URL.
     * @param {AudioObject} obj - Object to update
     * @param {string} dataUrl - Image data URL
     * @returns {Promise<void>}
     */
    async loadObjectImageDataUrl(obj, dataUrl) {
        const img = await this.loadImageElement(dataUrl, 'Failed to restore object image');
        obj.image = img;
        obj.imageDataUrl = dataUrl;
        obj.aspectRatio = img.width / img.height;
        if (!obj.width) obj.width = 40;
        obj.height = obj.width / obj.aspectRatio;
    }

    /**
     * Handle property slider/input change
     * @param {string} propertyName - Property name (e.g., 'volume', 'pitch')
     * @param {*} value - New value
     */
    onPropertySliderChange(propertyName, value) {
        const obj = this.scene.getSelectedObject();
        if (!obj) return;

        const numValue = parseFloat(value);
        const rangeConfig = {
            volume: [0, 2, 'volumeValue', v => v.toFixed(2), true],
            pitch: [0.5, 2, 'pitchValue', v => v.toFixed(2), true],
            hearingRange: [50, 1000, 'hearingRangeValue', v => `${v}px`, true],
            brightness: [-1, 1],
            saturation: [0, 2],
            grayscale: [0, 1],
            blur: [0, 1]
        };

        if (propertyName === 'hue') {
            obj.hue = ((numValue % 360) + 360) % 360;
        } else if (rangeConfig[propertyName]) {
            const [min, max, valueId, format] = rangeConfig[propertyName];
            obj[propertyName] = clamp(numValue, min, max);
            if (valueId) this.el(valueId).textContent = format(obj[propertyName]);
        }

        if (obj.audioSource && rangeConfig[propertyName] && rangeConfig[propertyName][4]) {
            this.updateAllAudioSources();
        }
    }

    /**
     * Update properties panel with object data
     * @param {AudioObject|null} obj - Object to display, or null
     */
    updatePropertiesPanel(obj) {
        const signature = this.getPropertiesPanelSignature(obj);
        if (signature === this.propertiesPanelSignature) return;
        this.propertiesPanelSignature = signature;

        const isSpectatorSelected = obj === null && this.scene.spectator.selected;
        
        this.el('spectatorPropertiesSection').style.display = isSpectatorSelected ? 'block' : 'none';
        this.updateObjectsList();

        if (isSpectatorSelected) {
            this.setObjectControlsEnabled(false);
            this.el('spectatorHearingRangeSlider').value = this.scene.spectator.hearingRange;
            this.el('spectatorHearingRangeValue').textContent = this.scene.spectator.hearingRange + 'px';
            this.el('spectatorImagePreview').src = this.scene.spectator.image ? this.scene.spectator.image.src || '' : '';
            return;
        }

        // Hide spectator properties if not selected
        if (!obj) {
            this.setObjectControlsEnabled(false);
            return;
        }

        this.setObjectControlsEnabled(true);
        this.el('sceneInfoInput').value = `${this.scene.getObjects().length} objects`;
        this.el('objectNameInput').value = obj.name;
        this.el('muteCheckbox').checked = obj.muted;
        this.setSliderControl('volumeSlider', 'volumeValue', obj.volume);
        this.setSliderControl('pitchSlider', 'pitchValue', obj.pitch);
        this.setSliderControl('hearingRangeSlider', 'hearingRangeValue', obj.hearingRange, v => `${v}px`);

        this.setSliderControl('brightnessSlider', 'brightnessValue', obj.brightness);
        this.setSliderControl('saturationSlider', 'saturationValue', obj.saturation);

        this.el('hueSlider').disabled = false;
        this.el('hueSlider').value = obj.hue;
        this.el('hueValue').textContent = obj.hue.toFixed(0) + '°';

        this.setSliderControl('grayscaleSlider', 'grayscaleValue', obj.grayscale);
        this.setSliderControl('blurSlider', 'blurValue', obj.blur);

    }

    /**
     * Open Save Scene modal
     */
    openSaveSceneModal() {
        // Generate default filename
        const today = new Date().toISOString().slice(0, 10);
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(/:/g, '-');
        
        this.el('sceneFilename').value = `scene_${today}_${timestamp}`;
        this.setModal('saveSceneModal', true);
        this.el('sceneFilename').focus();
    }

    /**
     * Close Save Scene modal
     */
    closeSaveSceneModal() {
        this.setModal('saveSceneModal', false);
    }

    /**
     * Handle Save Scene confirmation
     */
    onSaveSceneConfirm() {
        const filenameInput = this.el('sceneFilename');
        const filename = filenameInput.value.trim();

        if (!filename) {
            alert('Please enter a filename');
            return;
        }

        try {
            const sceneData = this.scene.toJSON();
            const key = `scene_${filename}`;

            localStorage.setItem(key, JSON.stringify(sceneData));

            // Optional: Auto-download
            const blob = new Blob([JSON.stringify(sceneData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.scene.json`;
            
            // Only auto-download if user wants (commented out for safety)
            // a.click();
            
            URL.revokeObjectURL(url);

            this.closeSaveSceneModal();
            this.showToast(`Scene saved: ${filename}`);
        } catch (error) {
            console.error('Error saving scene:', error);
            alert('Failed to save scene: ' + error.message);
        }
    }

    /**
     * Open Load Scene modal
     */
    openLoadSceneModal() {
        const sceneSelect = this.el('sceneSelect');
        sceneSelect.innerHTML = '';

        // Get all saved scenes from localStorage
        const keys = Object.keys(localStorage).filter(k => k.startsWith('scene_'));

        if (keys.length === 0) {
            sceneSelect.appendChild(new Option('-- No saved scenes --', ''));
        } else {
            keys.forEach(key => {
                const sceneName = key.substring(6); // Remove 'scene_' prefix
                sceneSelect.appendChild(new Option(sceneName, sceneName));
            });
        }

        this.setModal('loadSceneModal', true);
    }

    /**
     * Close Load Scene modal
     */
    closeLoadSceneModal() {
        this.setModal('loadSceneModal', false);
    }

    /**
     * Handle Load Scene confirmation
     */
    async onLoadSceneConfirm() {
        await this.audioEngine.resume();

        const sceneSelect = this.el('sceneSelect');
        const sceneName = sceneSelect.value;

        if (!sceneName) {
            alert('Please select a scene');
            return;
        }

        try {
            const key = `scene_${sceneName}`;
            const sceneDataStr = localStorage.getItem(key);
            const sceneData = JSON.parse(sceneDataStr);

            // Create new scene
            const newScene = Scene.fromJSON(sceneData);

            // Load objects
            if (sceneData.objects && Array.isArray(sceneData.objects)) {
                for (let i = 0; i < sceneData.objects.length; i++) {
                    const objData = sceneData.objects[i];
                    const obj = newScene.getObjects()[i];
                    if (!obj) continue;

                    if (objData.imageDataUrl) {
                        await this.loadObjectImageDataUrl(obj, objData.imageDataUrl);
                    }

                    if (objData.audioDataUrl) {
                        const audioBuffer = await this.decodeAudioDataUrl(objData.audioDataUrl);
                        this.createAndPlaySource(obj, audioBuffer);
                    }
                }
            }

            this.scene.getObjects().forEach(obj => {
                if (obj.audioSource) {
                    this.audioEngine.stopSource(obj.audioSource);
                }
            });

            // Replace scene
            window.scene = newScene;
            this.scene = newScene;
            if (window.inputHandler) {
                window.inputHandler.scene = newScene;
            }
            this.objectsListSignature = '';
            this.propertiesPanelSignature = '';

            // Update UI
            this.syncSceneBackgroundPreview();
            this.updateObjectsLibrary();
            this.updateObjectsList(true);
            this.scene.spectator.setSelected(true);
            this.updatePropertiesPanel(null);
            this.updateAllAudioSources();
            this.closeLoadSceneModal();
            this.showToast(`Scene loaded: ${sceneName}`);
        } catch (error) {
            console.error('Error loading scene:', error);
            alert('Failed to load scene: ' + error.message);
        }
    }

    /**
     * Update Objects Library list
     */
    updateObjectsLibrary() {
        const list = this.el('objectsList');
        const objects = this.scene.getObjects();
        list.innerHTML = '';

        objects.forEach((obj, index) => {
            const item = document.createElement('div');
            item.className = 'library-item' + (this.scene.selectedIndex === index ? ' selected' : '');
            item.textContent = obj.name;
            item.title = `Click to select "${obj.name}"`;
            item.addEventListener('click', () => {
                this.scene.setSelectedIndex(index);
                this.updateObjectsLibrary();
                this.updatePropertiesPanel(this.scene.getSelectedObject());
            });

            list.appendChild(item);
        });

        if (objects.length === 0) list.appendChild(this.createEmptyState('No objects in scene.\nClick "Add Object" to create one.', 16));
    }

    /**
     * Toggle Objects Library sidebar
     */
    toggleObjectsLibrary() {
        const library = this.el('objectsLibrary');
        library.classList.toggle('active');
    }

    /**
     * Handle object name change
     * @param {string} newName - New name
     */
    onObjectNameChange(newName) {
        const obj = this.scene.getSelectedObject();
        if (obj) {
            obj.name = newName;
            this.updateObjectsLibrary();
            this.updateObjectsList(true);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     */
    showToast(message) {
        // Clear existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        // Create or get toast element
        let toast = this.el('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: rgba(0, 200, 136, 0.9);
                color: #000;
                padding: 12px 20px;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 500;
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.display = 'block';

        // Auto-hide after 3 seconds
        this.toastTimeout = setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    /**
     * Delete selected object
     */
    /**
     * Delete selected object from scene
     * @param {number} objectIndex - Index of object to delete
     */
    deleteObject(objectIndex) {
        if (objectIndex >= 0 && objectIndex < this.scene.getObjects().length) {
            const obj = this.scene.getObjects()[objectIndex];
            if (obj && obj.audioSource) {
                this.audioEngine.stopSource(obj.audioSource);
            }
            this.scene.removeObject(objectIndex);
            
            // Clear selection after deletion
            this.scene.setSelectedIndex(-1);
            this.scene.spectator.setSelected(true);
            
            this.updateObjectsLibrary(true);
            this.updateObjectsList(true);
            this.updatePropertiesPanel(null);
            this.showToast('Object deleted');
        }
    }

    /**
     * Delete selected object (legacy)
     */
    deleteSelectedObject() {
        if (this.scene.selectedIndex >= 0) {
            this.deleteObject(this.scene.selectedIndex);
        }
    }

    /**
     * Update the objects list in the properties panel
     */
    updateObjectsList(force = false) {
        const container = this.el('objectsListContainer');
        const objects = this.scene.getObjects();
        const signature = JSON.stringify({
            selectedIndex: this.scene.selectedIndex,
            objects: objects.map(obj => ({ id: obj.id, name: obj.name }))
        });

        if (!force && signature === this.objectsListSignature) {
            return;
        }

        this.objectsListSignature = signature;
        container.innerHTML = '';

        if (objects.length === 0) {
            container.appendChild(this.createEmptyState('No objects in scene'));
            return;
        }

        objects.forEach((obj, index) => {
            const item = document.createElement('div');
            item.className = 'object-item' + (this.scene.selectedIndex === index ? ' selected' : '');
            item.addEventListener('click', () => {
                this.scene.setSelectedIndex(index);
                this.updateObjectsList(true);
                this.updateObjectsLibrary(true);
                this.updatePropertiesPanel(this.scene.getSelectedObject());
            });
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'object-item-name';
            nameSpan.textContent = obj.name;
            item.appendChild(nameSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'object-item-actions';
            actionsDiv.appendChild(this.createButton('Edit', 'button small', (e) => {
                e.stopPropagation();
                this.openEditObjectModal(obj, index);
            }));
            actionsDiv.appendChild(this.createButton('Delete', 'button small danger', (e) => {
                e.stopPropagation();
                this.deleteObject(index);
            }));

            item.appendChild(actionsDiv);
            container.appendChild(item);
        });
    }

    /**
     * Handle property checkbox change (e.g., mute)
     * @param {string} propertyName - Property name
     * @param {boolean} checked - Checkbox state
     */
    onPropertyCheckboxChange(propertyName, checked) {
        const obj = this.scene.getSelectedObject();
        if (!obj) return;

        if (propertyName === 'muted') {
            obj.muted = checked;
        }

        // Update audio source if applicable
        if (obj.audioSource) {
            this.updateAllAudioSources();
        }
    }

    /**
     * Open Edit Object modal
     * @param {AudioObject} obj - Object to edit
     * @param {number} index - Object index
     */
    openEditObjectModal(obj, index) {
        this.scene.setSelectedIndex(index);
        this.currentEditingObjectIndex = index;

        this.el('editObjectName').textContent = obj.name;
        this.el('editObjectNameInput').value = obj.name;
        this.resetInputs('editAudioFile', 'editImageFile');
        this.setModal('editObjectModal', true);
    }

    /**
     * Close Edit Object modal
     */
    closeEditObjectModal() {
        this.setModal('editObjectModal', false);
        this.currentEditingObjectIndex = -1;
    }

    /**
     * Handle Edit Object confirmation
     */
    async onEditObjectConfirm() {
        await this.audioEngine.resume();

        if (this.currentEditingObjectIndex < 0 || this.currentEditingObjectIndex >= this.scene.getObjects().length) {
            alert('Invalid object selection');
            return;
        }

        const obj = this.scene.getObjects()[this.currentEditingObjectIndex];
        if (!obj) return;

        const newName = this.el('editObjectNameInput').value.trim();
        const audioFileInput = this.el('editAudioFile');
        const imageFileInput = this.el('editImageFile');

        if (newName && newName !== obj.name) {
            obj.name = newName;
        }

        try {
            if (audioFileInput.files.length > 0) {
                await this.loadAudioFile(audioFileInput.files[0], obj, true);
                this.updateAllAudioSources();
            }

            if (imageFileInput.files.length > 0) {
                await this.loadImageFile(imageFileInput.files[0], obj);
            }

            const editedIndex = this.currentEditingObjectIndex;
            this.closeEditObjectModal();
            this.scene.setSelectedIndex(editedIndex);
            this.updateObjectsList(true);
            this.updateObjectsLibrary(true);
            this.updatePropertiesPanel(obj);
            this.showToast('Object updated!');
        } catch (error) {
            console.error('Error updating object:', error);
            alert('Failed to update object: ' + error.message);
        }
    }

    /**
     * Handle spectator property change
     * @param {string} propertyName - Property name (e.g., 'hearingRange')
     * @param {*} value - New value
     */
    onSpectatorPropertyChange(propertyName, value) {
        if (propertyName === 'hearingRange') {
            const numValue = parseFloat(value);
            this.scene.spectator.hearingRange = clamp(numValue, 50, 2000);
            this.el('spectatorHearingRangeValue').textContent = this.scene.spectator.hearingRange + 'px';
            this.updateAllAudioSources();
        }
    }

    /**
     * Handle spectator image file upload
     */
    setupSpectatorImageListener() {
        const spectatorImageInput = this.el('spectatorImageFile');
        
        spectatorImageInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const imageFile = e.target.files[0];
                try {
                    await this.loadSpectatorImage(imageFile);
                    this.showToast('Spectator image updated!');
                } catch (error) {
                    alert('Failed to load image: ' + error.message);
                }
            }
        });
    }

    /**
     * Load spectator image from file with aspect ratio preservation
     * @param {File} imageFile - Image file
     */
    async loadSpectatorImage(imageFile) {
        const dataUrl = await this.fileToDataUrl(imageFile);
        const img = await this.loadImageElement(dataUrl);
        this.scene.spectator.image = img;
        this.scene.spectator.imagePath = imageFile.name;
        this.scene.spectator.aspectRatio = img.width / img.height;
        this.el('spectatorImagePreview').src = dataUrl;
    }

    /**
     * Register scene background upload controls.
     */
    setupSceneBackgroundListener() {
        const backgroundInput = this.el('sceneBackgroundFile');
        if (!backgroundInput) return;

        backgroundInput.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;

            try {
                await this.loadSceneBackgroundImage(e.target.files[0]);
                this.showToast('Scene background updated!');
            } catch (error) {
                alert('Failed to load background: ' + error.message);
            }
        });

        this.syncSceneBackgroundPreview();
    }

    /**
     * Load scene background from an image file.
     * @param {File} imageFile - Background image file
     */
    async loadSceneBackgroundImage(imageFile) {
        const dataUrl = await this.fileToDataUrl(imageFile);
        await this.loadImageElement(dataUrl, 'Failed to load background image');
        this.scene.setBackgroundImage(dataUrl, imageFile.name);
        this.syncSceneBackgroundPreview();
    }

    /**
     * Remove the current scene background image.
     */
    clearSceneBackground() {
        this.scene.setBackgroundImage('', '');
        const input = this.el('sceneBackgroundFile');
        const preview = this.el('sceneBackgroundPreview');

        if (input) input.value = '';
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        this.showToast('Scene background cleared');
    }

    /**
     * Reflect the current scene background state in the preview.
     */
    syncSceneBackgroundPreview() {
        const preview = this.el('sceneBackgroundPreview');
        if (!preview) return;

        if (this.scene.backgroundImageSrc) {
            preview.src = this.scene.backgroundImageSrc;
            preview.style.display = 'block';
        } else {
            preview.src = '';
            preview.style.display = 'none';
        }
    }

    /**
     * Refresh gain/panner values for every active audio source.
     */
    updateAllAudioSources() {
        const spectatorX = this.scene.spectator.x;
        const spectatorZ = this.scene.spectator.z;
        const spectatorHearingRange = this.scene.spectator.hearingRange;

        this.scene.getObjects().forEach(obj => {
            if (!obj.audioSource) return;

            this.audioEngine.updateSource(
                obj.audioSource,
                obj.x,
                obj.z,
                obj.volume,
                obj.pitch,
                obj.muted,
                obj.hearingRange,
                spectatorX,
                spectatorZ,
                spectatorHearingRange
            );
        });
    }
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
