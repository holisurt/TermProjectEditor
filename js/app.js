/**
 * app.js
 * Main application logic, animation loop, and event handlers
 */

// ═══════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════

window.audioEngine = null;
window.scene = null;
window.renderer = null;
window.inputHandler = null;
window.uiController = null;
window.keyStates = {};
window.lastTime = performance.now();

// UI state
const uiState = {
    selectedObjectId: null
};

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Object-Based Audio Editor...');

    // Initialize engine and scene
    window.audioEngine = new AudioEngine();
    window.scene = new Scene();

    // Initialize renderer
    const canvas = document.getElementById('sceneCanvas');
    window.renderer = new Renderer(canvas);

    // Initialize input handler
    window.inputHandler = new InputHandler(window.renderer, window.scene, window.audioEngine);

    // Initialize UI controller
    window.uiController = new UIController(window.scene, window.audioEngine, window.renderer);

    // Set up spectator to be selected by default
    window.scene.spectator.setSelected(true);

    // Set up event listeners
    setupKeyboardListeners();
    setupCanvasListeners();
    setupUIListeners();
    setupFileInputListeners();
    setupMenuListeners();

    // Set canvas size
    const container = document.getElementById('canvasContainer');
    function resizeCanvas() {
        window.renderer.resize(container.clientWidth, container.clientHeight);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation loop
    window.lastTime = performance.now();
    requestAnimationFrame(animationLoop);

    console.log('Initialization complete!');
});

// ═══════════════════════════════════════════════════════════
// KEYBOARD LISTENERS
// ═══════════════════════════════════════════════════════════

function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        window.keyStates[e.key] = true;

        // Escape to deselect
        if (e.key === 'Escape') {
            window.scene.setSelectedIndex(-1);
            window.scene.spectator.setSelected(true);
            updateUI();
        }
    });

    document.addEventListener('keyup', (e) => {
        window.keyStates[e.key] = false;
    });
}

// ═══════════════════════════════════════════════════════════
// CANVAS LISTENERS
// ═══════════════════════════════════════════════════════════

function setupCanvasListeners() {
    const canvas = document.getElementById('sceneCanvas');

    // Use input handler for mouse events
    canvas.addEventListener('mousedown', (e) => window.inputHandler.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => window.inputHandler.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => window.inputHandler.onMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => window.inputHandler.onMouseUp(e));

    // BUG FIX 3: Register wheel event for zoom (passive: false allows preventDefault)
    canvas.addEventListener('wheel', (e) => window.inputHandler.onWheel(e), { passive: false });

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ═══════════════════════════════════════════════════════════
// UI LISTENERS
// ═══════════════════════════════════════════════════════════

function setupUIListeners() {
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('addObjectModal').classList.remove('active');
            document.getElementById('saveSceneModal').classList.remove('active');
            document.getElementById('loadSceneModal').classList.remove('active');
        }
    });

    // Click outside modals to close them
    const modals = [
        { modal: document.getElementById('addObjectModal'), overlay: 'addObjectModal' },
        { modal: document.getElementById('saveSceneModal'), overlay: 'saveSceneModal' },
        { modal: document.getElementById('loadSceneModal'), overlay: 'loadSceneModal' }
    ];

    modals.forEach(({ modal, overlay }) => {
        const overlayEl = modal.querySelector('.modal-overlay');
        if (overlayEl) {
            overlayEl.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    });
}

// ═══════════════════════════════════════════════════════════
// FILE INPUT LISTENERS
// ═══════════════════════════════════════════════════════════

function setupFileInputListeners() {
    // Store file references when files are selected
    const audioFileInput = document.getElementById('modalAudioFile');
    const imageFileInput = document.getElementById('modalImageFile');

    audioFileInput.addEventListener('change', () => {
        window.uiController.currentAudioFile = audioFileInput.files[0] || null;
    });

    imageFileInput.addEventListener('change', () => {
        window.uiController.currentImageFile = imageFileInput.files[0] || null;
    });
}

// ═══════════════════════════════════════════════════════════
// MENU LISTENERS
// ═══════════════════════════════════════════════════════════

function setupMenuListeners() {
    // File menu dropdown toggle
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileDropdown = document.getElementById('fileDropdown');
    
    fileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-item')) {
            fileDropdown.classList.remove('active');
        }
    });

    // Add Object button
    document.getElementById('addObjectBtn').addEventListener('click', () => {
        window.uiController.openAddObjectModal();
    });

    // Save Scene button
    document.getElementById('saveSceneBtn').addEventListener('click', () => {
        window.uiController.openSaveSceneModal();
    });

    // Load Scene button
    document.getElementById('loadSceneBtn').addEventListener('click', () => {
        window.uiController.openLoadSceneModal();
    });

    // Objects Library toggle button
    const toggleBtn = document.getElementById('togglePanelBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            window.uiController.toggleObjectsLibrary();
        });
    }
}

// ═══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════

function animationLoop(time) {
    const deltaTime = Math.min((time - window.lastTime) / 1000, 0.016); // Cap at 60 FPS
    window.lastTime = time;

    // Update scene (spectator movement, etc.)
    window.scene.update(deltaTime, window.keyStates);

    // Update audio listener position
    const specPos = window.scene.spectator.getPosition();
    window.audioEngine.updateListener(specPos.x, specPos.z);

    // Update all audio sources
    updateAudioSources();

    // Get current mouse position for hover detection
    const rect = window.renderer.canvas.getBoundingClientRect();
    const mouseX = window.inputHandler.lastMouseX;
    const mouseY = window.inputHandler.lastMouseY;

    // Render scene
    window.renderer.renderScene(window.scene, mouseX, mouseY);

    // Update properties panel
    window.uiController.updatePropertiesPanel(window.scene.getSelectedObject());

    // Continue animation loop
    requestAnimationFrame(animationLoop);
}

// ═══════════════════════════════════════════════════════════
// AUDIO SOURCE MANAGEMENT
// ═══════════════════════════════════════════════════════════

function updateAudioSources() {
    const spectatorX = window.scene.spectator.x;
    const spectatorZ = window.scene.spectator.z;

    window.scene.getObjects().forEach(obj => {
        if (obj.audioSource) {
            window.audioEngine.updateSource(
                obj.audioSource,
                obj.x,
                obj.z,
                obj.volume,
                obj.pitch,
                obj.muted || false,
                obj.hearingRange || 500,
                spectatorX,
                spectatorZ
            );
        }
    });
}
