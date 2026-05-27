/**
 * UI.js
 * UIController for managing all UI interactions and state
 */

class UIController {
    constructor(scene, audioEngine, renderer) {
        this.scene = scene;
        this.audioEngine = audioEngine;
        this.renderer = renderer;

        // Add Object modal state
        this.currentAudioFile = null;
        this.currentImageFile = null;

        // Toast notification
        this.toastTimeout = null;
    }

    /**
     * Open Add Object modal
     */
    openAddObjectModal() {
        this.audioEngine.resume();
        document.getElementById('addObjectModal').classList.add('active');
        document.getElementById('modalObjectName').focus();
        
        // Clear inputs
        document.getElementById('modalObjectName').value = '';
        document.getElementById('modalAudioFile').value = '';
        document.getElementById('modalImageFile').value = '';
        this.currentAudioFile = null;
        this.currentImageFile = null;
    }

    /**
     * Close Add Object modal
     */
    closeAddObjectModal() {
        document.getElementById('addObjectModal').classList.remove('active');
        this.currentAudioFile = null;
        this.currentImageFile = null;
    }

    /**
     * Handle Add Object confirmation
     */
    async onAddObjectConfirm() {
        const nameInput = document.getElementById('modalObjectName');
        const audioFileInput = document.getElementById('modalAudioFile');
        const imageFileInput = document.getElementById('modalImageFile');

        const name = nameInput.value.trim();

        if (!name) {
            alert('Please enter an object name');
            return;
        }

        // Create audio object
        const newObj = new AudioObject(name, 0, 0);

        try {
            // Load audio file
            if (audioFileInput.files.length > 0) {
                const audioFile = audioFileInput.files[0];
                const arrayBuffer = await audioFile.arrayBuffer();
                const audioBuffer = await this.audioEngine.decodeAudio(arrayBuffer);
                
                newObj.audioBuffer = audioBuffer;
                newObj.audioPath = audioFile.name;

                // Create and play audio source
                const sourceNode = this.audioEngine.createSource(
                    audioBuffer,
                    newObj.x,
                    newObj.z,
                    newObj.volume,
                    newObj.pitch
                );
                newObj.audioSource = sourceNode;
                this.audioEngine.playSource(sourceNode);
            }

            // Load image file
            if (imageFileInput.files.length > 0) {
                const imageFile = imageFileInput.files[0];
                await this.loadImageFile(imageFile, newObj);
            }

            // Add to scene
            this.scene.addObject(newObj);

            // Update UI
            this.updateObjectsLibrary();
            this.closeAddObjectModal();
            this.showToast('Object added!');
        } catch (error) {
            console.error('Error adding object:', error);
            alert('Failed to add object: ' + error.message);
        }
    }

    /**
     * Load image file into AudioObject
     * @param {File} imageFile - Image file
     * @param {AudioObject} obj - Target object
     */
    loadImageFile(imageFile, obj) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    obj.image = img;
                    obj.imagePath = imageFile.name;
                    resolve();
                };
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read image file'));
            };

            reader.readAsDataURL(imageFile);
        });
    }

    /**
     * Handle property slider/input change
     * @param {string} propertyName - Property name (e.g., 'volume', 'pitch')
     * @param {*} value - New value
     */
    onPropertySliderChange(propertyName, value) {
        const obj = this.scene.getSelectedObject();
        if (!obj) return;

        // Convert value to appropriate type
        const numValue = parseFloat(value);

        // Audio properties
        if (propertyName === 'volume') {
            obj.volume = Math.max(0, Math.min(2, numValue));
        } else if (propertyName === 'pitch') {
            obj.pitch = Math.max(0.5, Math.min(2.0, numValue));
        } else if (propertyName === 'hearingRange') {
            obj.hearingRange = Math.max(50, Math.min(1000, numValue));
        }
        // Image properties
        else if (propertyName === 'brightness') {
            obj.brightness = Math.max(-1, Math.min(1, numValue));
        } else if (propertyName === 'saturation') {
            obj.saturation = Math.max(0, Math.min(2, numValue));
        } else if (propertyName === 'hue') {
            obj.hue = ((numValue % 360) + 360) % 360;
        } else if (propertyName === 'grayscale') {
            obj.grayscale = Math.max(0, Math.min(1, numValue));
        } else if (propertyName === 'blur') {
            obj.blur = Math.max(0, Math.min(1, numValue));
        }

        // Update audio source if applicable
        if (obj.audioSource && (propertyName === 'volume' || propertyName === 'pitch' || propertyName === 'hearingRange')) {
            this.audioEngine.updateSource(
                obj.audioSource,
                obj.x,
                obj.z,
                obj.volume,
                obj.pitch,
                obj.muted,
                obj.hearingRange,
                this.scene.spectator.x,
                this.scene.spectator.z
            );
        }
    }

    /**
     * Update properties panel with object data
     * @param {AudioObject|null} obj - Object to display, or null
     */
    updatePropertiesPanel(obj) {
        if (!obj) {
            // Disable all controls
            document.getElementById('sceneInfoInput').value = '';
            document.getElementById('objectNameInput').disabled = true;
            document.getElementById('objectNameInput').value = '';

            const allSliders = [
                'volumeSlider', 'pitchSlider', 'hearingRangeSlider',
                'brightnessSlider', 'saturationSlider', 'hueSlider',
                'grayscaleSlider', 'blurSlider'
            ];

            allSliders.forEach(id => {
                document.getElementById(id).disabled = true;
            });

            document.getElementById('muteCheckbox').disabled = true;
            document.getElementById('muteCheckbox').checked = false;

            return;
        }

        // Enable and populate controls
        document.getElementById('sceneInfoInput').value = `${this.scene.getObjects().length} objects`;
        
        document.getElementById('objectNameInput').disabled = false;
        document.getElementById('objectNameInput').value = obj.name;

        // Audio sliders
        document.getElementById('volumeSlider').disabled = false;
        document.getElementById('volumeSlider').value = obj.volume;
        document.getElementById('volumeValue').textContent = obj.volume.toFixed(2);

        document.getElementById('pitchSlider').disabled = false;
        document.getElementById('pitchSlider').value = obj.pitch;
        document.getElementById('pitchValue').textContent = obj.pitch.toFixed(2);

        // Mute checkbox
        document.getElementById('muteCheckbox').disabled = false;
        document.getElementById('muteCheckbox').checked = obj.muted;

        // Hearing range slider
        document.getElementById('hearingRangeSlider').disabled = false;
        document.getElementById('hearingRangeSlider').value = obj.hearingRange;
        document.getElementById('hearingRangeValue').textContent = obj.hearingRange + 'px';

        // Image sliders
        document.getElementById('brightnessSlider').disabled = false;
        document.getElementById('brightnessSlider').value = obj.brightness;
        document.getElementById('brightnessValue').textContent = obj.brightness.toFixed(2);

        document.getElementById('saturationSlider').disabled = false;
        document.getElementById('saturationSlider').value = obj.saturation;
        document.getElementById('saturationValue').textContent = obj.saturation.toFixed(2);

        document.getElementById('hueSlider').disabled = false;
        document.getElementById('hueSlider').value = obj.hue;
        document.getElementById('hueValue').textContent = obj.hue.toFixed(0) + '°';

        document.getElementById('grayscaleSlider').disabled = false;
        document.getElementById('grayscaleSlider').value = obj.grayscale;
        document.getElementById('grayscaleValue').textContent = obj.grayscale.toFixed(2);

        document.getElementById('blurSlider').disabled = false;
        document.getElementById('blurSlider').value = obj.blur;
        document.getElementById('blurValue').textContent = obj.blur.toFixed(2);

        // Update objects list highlighting
        this.updateObjectsList();
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
        
        document.getElementById('sceneFilename').value = `scene_${today}_${timestamp}`;
        document.getElementById('saveSceneModal').classList.add('active');
        document.getElementById('sceneFilename').focus();
    }

    /**
     * Close Save Scene modal
     */
    closeSaveSceneModal() {
        document.getElementById('saveSceneModal').classList.remove('active');
    }

    /**
     * Handle Save Scene confirmation
     */
    onSaveSceneConfirm() {
        const filenameInput = document.getElementById('sceneFilename');
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
        const sceneSelect = document.getElementById('sceneSelect');
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

        document.getElementById('loadSceneModal').classList.add('active');
    }

    /**
     * Close Load Scene modal
     */
    closeLoadSceneModal() {
        document.getElementById('loadSceneModal').classList.remove('active');
    }

    /**
     * Handle Load Scene confirmation
     */
    async onLoadSceneConfirm() {
        const sceneSelect = document.getElementById('sceneSelect');
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
            const newScene = new Scene();
            newScene.spectator.fromJSON(sceneData.spectator);

            // Load objects
            if (sceneData.objects && Array.isArray(sceneData.objects)) {
                for (const objData of sceneData.objects) {
                    const obj = AudioObject.fromJSON(objData);

                    // Try to recreate audio source if we have buffer data
                    if (objData.audioPath) {
                        // For now, we can't reload from path, but we can create empty source
                        const emptyBuffer = this.audioEngine.audioContext.createBuffer(1, 1, 44100);
                        const sourceNode = this.audioEngine.createSource(
                            emptyBuffer,
                            obj.x,
                            obj.z,
                            obj.volume,
                            obj.pitch
                        );
                        obj.audioSource = sourceNode;
                    }

                    newScene.addObject(obj);
                }
            }

            // Replace scene
            window.scene = newScene;
            this.scene = newScene;

            // Update UI
            this.updateObjectsLibrary();
            this.updatePropertiesPanel(null);
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
        const list = document.getElementById('objectsList');
        list.innerHTML = '';

        this.scene.getObjects().forEach((obj, index) => {
            const item = document.createElement('div');
            item.className = 'library-item';

            if (this.scene.selectedIndex === index) {
                item.classList.add('selected');
            }

            item.textContent = obj.name;
            item.style.cursor = 'pointer';
            item.title = `Click to select "${obj.name}"`;

            item.addEventListener('click', () => {
                this.scene.setSelectedIndex(index);
                this.updateObjectsLibrary();
                this.updatePropertiesPanel(this.scene.getSelectedObject());
            });

            list.appendChild(item);
        });

        // Show empty state if no objects
        if (this.scene.getObjects().length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.padding = '16px';
            emptyMsg.style.color = '#a0a0a0';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.fontSize = '12px';
            emptyMsg.textContent = 'No objects in scene.\nClick "Add Object" to create one.';
            list.appendChild(emptyMsg);
        }
    }

    /**
     * Toggle Objects Library sidebar
     */
    toggleObjectsLibrary() {
        const library = document.getElementById('objectsLibrary');
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
        let toast = document.getElementById('toast');
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
            
            this.updateObjectsLibrary();
            this.updateObjectsList();
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
    updateObjectsList() {
        const container = document.getElementById('objectsListContainer');
        container.innerHTML = '';

        const objects = this.scene.getObjects();

        if (objects.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'padding: 12px; color: #a0a0a0; text-align: center; font-size: 12px;';
            emptyMsg.textContent = 'No objects in scene';
            container.appendChild(emptyMsg);
            return;
        }

        objects.forEach((obj, index) => {
            const item = document.createElement('div');
            item.className = 'object-item' + (this.scene.selectedIndex === index ? ' selected' : '');
            
            // Object name label
            const nameSpan = document.createElement('span');
            nameSpan.className = 'object-item-name';
            nameSpan.textContent = obj.name;
            nameSpan.style.cursor = 'pointer';
            nameSpan.addEventListener('click', () => {
                this.scene.setSelectedIndex(index);
                this.updateObjectsList();
                this.updateObjectsLibrary();
                this.updatePropertiesPanel(obj);
            });
            item.appendChild(nameSpan);

            // Action buttons container
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'object-item-actions';

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'button small';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditObjectModal(obj, index);
            });
            actionsDiv.appendChild(editBtn);

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'button small danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteObject(index);
            });
            actionsDiv.appendChild(deleteBtn);

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
            this.audioEngine.updateSource(
                obj.audioSource,
                obj.x,
                obj.z,
                obj.volume,
                obj.pitch,
                obj.muted,
                obj.hearingRange,
                this.scene.spectator.x,
                this.scene.spectator.z
            );
        }
    }

    /**
     * Open Edit Object modal
     * @param {AudioObject} obj - Object to edit
     * @param {number} index - Object index
     */
    openEditObjectModal(obj, index) {
        this.currentEditingObjectIndex = index;

        document.getElementById('editObjectName').textContent = obj.name;
        document.getElementById('editObjectNameInput').value = obj.name;
        document.getElementById('editAudioFile').value = '';
        document.getElementById('editImageFile').value = '';

        document.getElementById('editObjectModal').classList.add('active');
    }

    /**
     * Close Edit Object modal
     */
    closeEditObjectModal() {
        document.getElementById('editObjectModal').classList.remove('active');
        this.currentEditingObjectIndex = -1;
    }

    /**
     * Handle Edit Object confirmation
     */
    async onEditObjectConfirm() {
        if (this.currentEditingObjectIndex < 0 || this.currentEditingObjectIndex >= this.scene.getObjects().length) {
            alert('Invalid object selection');
            return;
        }

        const obj = this.scene.getObjects()[this.currentEditingObjectIndex];
        if (!obj) return;

        const newName = document.getElementById('editObjectNameInput').value.trim();
        const audioFileInput = document.getElementById('editAudioFile');
        const imageFileInput = document.getElementById('editImageFile');

        if (newName && newName !== obj.name) {
            obj.name = newName;
        }

        try {
            // Replace audio file if provided
            if (audioFileInput.files.length > 0) {
                const audioFile = audioFileInput.files[0];
                const arrayBuffer = await audioFile.arrayBuffer();
                const audioBuffer = await this.audioEngine.decodeAudio(arrayBuffer);
                
                // Stop old source if playing
                if (obj.audioSource) {
                    this.audioEngine.stopSource(obj.audioSource);
                }

                obj.audioBuffer = audioBuffer;
                obj.audioPath = audioFile.name;

                // Create new source and play
                const sourceNode = this.audioEngine.createSource(
                    audioBuffer,
                    obj.x,
                    obj.z,
                    obj.volume,
                    obj.pitch
                );
                obj.audioSource = sourceNode;
                this.audioEngine.playSource(sourceNode);
            }

            // Replace image file if provided
            if (imageFileInput.files.length > 0) {
                const imageFile = imageFileInput.files[0];
                await this.loadImageFile(imageFile, obj);
            }

            this.closeEditObjectModal();
            this.updateObjectsList();
            this.updateObjectsLibrary();
            this.updatePropertiesPanel(obj);
            this.showToast('Object updated!');
        } catch (error) {
            console.error('Error updating object:', error);
            alert('Failed to update object: ' + error.message);
        }
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
