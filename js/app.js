/**
 * app.js
 * Main application logic, animation loop, and event handlers
 * Optimized for performance and maintainability
 */

// ═══════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════

const AppState = {
    audioEngine: null,
    scene: null,
    renderer: null,
    inputHandler: null,
    uiController: null,
    keyStates: {},
    lastTime: performance.now()
};

// Make state available globally for backward compatibility
Object.defineProperty(window, 'audioEngine', {
    get: () => AppState.audioEngine,
    set: (v) => { AppState.audioEngine = v; }
});

Object.defineProperty(window, 'scene', {
    get: () => AppState.scene,
    set: (v) => { AppState.scene = v; }
});

Object.defineProperty(window, 'renderer', {
    get: () => AppState.renderer,
    set: (v) => { AppState.renderer = v; }
});

Object.defineProperty(window, 'inputHandler', {
    get: () => AppState.inputHandler,
    set: (v) => { AppState.inputHandler = v; }
});

Object.defineProperty(window, 'uiController', {
    get: () => AppState.uiController,
    set: (v) => { AppState.uiController = v; }
});

Object.defineProperty(window, 'keyStates', {
    get: () => AppState.keyStates,
    set: (v) => { AppState.keyStates = v; }
});

Object.defineProperty(window, 'lastTime', {
    get: () => AppState.lastTime,
    set: (v) => { AppState.lastTime = v; }
});

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Object-Based Audio Editor...');

    // Initialize engine and scene
    AppState.audioEngine = new AudioEngine();
    AppState.scene = new Scene();

    // Initialize renderer
    const canvas = document.getElementById('sceneCanvas');
    AppState.renderer = new Renderer(canvas);

    // Initialize input handler
    AppState.inputHandler = new InputHandler(AppState.renderer, AppState.scene, AppState.audioEngine);

    // Initialize UI controller
    AppState.uiController = new UIController(AppState.scene, AppState.audioEngine, AppState.renderer);

    // Set up spectator to be selected by default
    AppState.scene.spectator.setSelected(true);

    // Set up event listeners
    setupKeyboardListeners();
    setupCanvasListeners();
    setupUIListeners();
    setupFileInputListeners();
    setupMenuListeners();
    AppState.uiController.setupSpectatorImageListener();
    AppState.uiController.updatePropertiesPanel(null);

    // Set canvas size
    const container = document.getElementById('canvasContainer');
    function resizeCanvas() {
        AppState.renderer.resize(container.clientWidth, container.clientHeight);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation loop
    AppState.lastTime = performance.now();
    requestAnimationFrame(animationLoop);

    console.log('Initialization complete!');
});

// ═══════════════════════════════════════════════════════════
// KEYBOARD LISTENERS
// ═══════════════════════════════════════════════════════════

function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        AppState.keyStates[e.key] = true;

        // Escape to deselect
        if (e.key === 'Escape') {
            AppState.scene.setSelectedIndex(-1);
            AppState.scene.spectator.setSelected(true);
            updateUI();
        }
    });

    document.addEventListener('keyup', (e) => {
        AppState.keyStates[e.key] = false;
    });
}

// ═══════════════════════════════════════════════════════════
// CANVAS LISTENERS
// ═══════════════════════════════════════════════════════════

function setupCanvasListeners() {
    const canvas = document.getElementById('sceneCanvas');

    // Use input handler for mouse events
    canvas.addEventListener('mousedown', (e) => AppState.inputHandler.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => AppState.inputHandler.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => AppState.inputHandler.onMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => AppState.inputHandler.onMouseUp(e));

    // Register wheel event for zoom (passive: false allows preventDefault)
    canvas.addEventListener('wheel', (e) => AppState.inputHandler.onWheel(e), { passive: false });

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
            ['addObjectModal', 'saveSceneModal', 'loadSceneModal'].forEach(modalId => {
                document.getElementById(modalId).classList.remove('active');
            });
        }
    });

    // Click outside modals to close them
    const modals = [
        { modal: document.getElementById('addObjectModal'), overlay: 'addObjectModal' },
        { modal: document.getElementById('saveSceneModal'), overlay: 'saveSceneModal' },
        { modal: document.getElementById('loadSceneModal'), overlay: 'loadSceneModal' }
    ];

    modals.forEach(({ modal }) => {
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
        AppState.uiController.currentAudioFile = audioFileInput.files[0] || null;
    });

    imageFileInput.addEventListener('change', () => {
        AppState.uiController.currentImageFile = imageFileInput.files[0] || null;
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

    // Setup menu buttons
    setupMenuButton('addObjectBtn', () => AppState.uiController.openAddObjectModal());
    setupMenuButton('saveSceneBtn', () => AppState.uiController.openSaveSceneModal());
    setupMenuButton('loadSceneBtn', () => AppState.uiController.openLoadSceneModal());
    setupMenuButton('togglePanelBtn', () => AppState.uiController.toggleObjectsLibrary());
}

/**
 * Setup a menu button with click handler
 * @param {string} buttonId - Button element ID
 * @param {Function} handler - Click handler
 */
function setupMenuButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.addEventListener('click', handler);
    }
}

// ═══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════

function animationLoop(time) {
    const deltaTime = Math.min((time - AppState.lastTime) / 1000, 0.016); // Cap at 60 FPS
    AppState.lastTime = time;

    // Update scene (spectator movement, etc.)
    AppState.scene.update(deltaTime, AppState.keyStates);

    // Update audio listener position
    const specPos = AppState.scene.spectator.getPosition();
    AppState.audioEngine.updateListener(specPos.x, specPos.z);

    // Update all audio sources
    updateAudioSources();

    // Get current mouse position for hover detection
    const mouseX = AppState.inputHandler.lastMouseX;
    const mouseY = AppState.inputHandler.lastMouseY;

    // Render scene
    AppState.renderer.renderScene(AppState.scene, mouseX, mouseY);

    // Update properties panel
    AppState.uiController.updatePropertiesPanel(AppState.scene.getSelectedObject());

    // Continue animation loop
    requestAnimationFrame(animationLoop);
}

// ═══════════════════════════════════════════════════════════
// AUDIO SOURCE MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Update all active audio sources with current positions and properties
 */
function updateAudioSources() {
    const spectatorX = AppState.scene.spectator.x;
    const spectatorZ = AppState.scene.spectator.z;
    const spectatorHearingRange = AppState.scene.spectator.hearingRange || 500;

    AppState.scene.getObjects().forEach(obj => {
        if (obj.audioSource) {
            AppState.audioEngine.updateSource(
                obj.audioSource,
                obj.x,
                obj.z,
                obj.volume,
                obj.pitch,
                obj.muted || false,
                obj.hearingRange || 500,
                spectatorX,
                spectatorZ,
                spectatorHearingRange
            );
        }
    });
}

/**
 * Update UI (backward compatibility)
 */
function updateUI() {
    AppState.uiController.updatePropertiesPanel(AppState.scene.getSelectedObject());
}
