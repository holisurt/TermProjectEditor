/**
 * Utils.js
 * Utility functions and helpers for the application
 */

/**
 * Generate a unique UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} z2 - Second point Z
 * @returns {number} Distance
 */
function distance(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Format a number to fixed decimal places
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
function formatNumber(value, decimals = 2) {
    return parseFloat(value).toFixed(decimals);
}

/**
 * Check if a point is within a rectangle
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} rectX - Rectangle left
 * @param {number} rectY - Rectangle top
 * @param {number} rectW - Rectangle width
 * @param {number} rectH - Rectangle height
 * @returns {boolean} True if point is within rectangle
 */
function pointInRect(x, y, rectX, rectY, rectW, rectH) {
    return x >= rectX && x <= rectX + rectW && y >= rectY && y <= rectY + rectH;
}

/**
 * Check if a point is within a circle
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} circleX - Circle center X
 * @param {number} circleY - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if point is within circle
 */
function pointInCircle(x, y, circleX, circleY, radius) {
    const dx = x - circleX;
    const dy = y - circleY;
    return (dx * dx + dy * dy) <= (radius * radius);
}

/**
 * Lerp between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Ease in quad
 * @param {number} t - Time (0-1)
 * @returns {number} Eased value
 */
function easeInQuad(t) {
    return t * t;
}

/**
 * Ease out quad
 * @param {number} t - Time (0-1)
 * @returns {number} Eased value
 */
function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

/**
 * Ease in-out quad
 * @param {number} t - Time (0-1)
 * @returns {number} Eased value
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
