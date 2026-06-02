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
['audioEngine', 'scene', 'renderer', 'inputHandler', 'uiController', 'keyStates', 'lastTime'].forEach(key => {
    Object.defineProperty(window, key, {
        get: () => AppState[key],
        set: (value) => { AppState[key] = value; }
    });
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
    setupMenuListeners();
    AppState.uiController.setupSpectatorImageListener();
    AppState.uiController.setupSceneBackgroundListener();
    AppState.uiController.updateObjectsLibrary();
    AppState.uiController.updateObjectsList(true);
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

    [
        ['mousedown', 'onMouseDown'],
        ['mousemove', 'onMouseMove'],
        ['mouseup', 'onMouseUp'],
        ['mouseleave', 'onMouseUp']
    ].forEach(([eventName, handlerName]) => {
        canvas.addEventListener(eventName, (e) => AppState.inputHandler[handlerName](e));
    });

    canvas.addEventListener('wheel', (e) => AppState.inputHandler.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ═══════════════════════════════════════════════════════════
// UI LISTENERS
// ═══════════════════════════════════════════════════════════

function setupUIListeners() {
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ['addObjectModal', 'saveSceneModal', 'loadSceneModal', 'editObjectModal'].forEach(modalId => {
                document.getElementById(modalId).classList.remove('active');
            });
        }
    });

    ['addObjectModal', 'saveSceneModal', 'loadSceneModal', 'editObjectModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) overlay.addEventListener('click', () => modal.classList.remove('active'));
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
