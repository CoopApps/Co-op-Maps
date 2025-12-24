/**
 * Canvas Module
 * Handles canvas rendering, drop zones, and coordinate transformations
 */

(function(window) {
    'use strict';

    // Canvas configuration
    let canvas = null;
    let ctx = null;
    let canvasContainer = null;
    let dropIndicator = null;

    // Drop indicator dimensions - should match enterprise default size
    const DROP_INDICATOR_WIDTH = 120;
    const DROP_INDICATOR_HEIGHT = 72;

    /**
     * Initialize canvas module
     */
    function init() {
        canvas = document.getElementById('canvas');
        canvasContainer = document.getElementById('canvas-container');
        dropIndicator = document.getElementById('drop-indicator');

        if (!canvas || !canvasContainer) {
            console.error('Canvas elements not found');
            return;
        }

        ctx = canvas.getContext('2d');

        // Setup canvas
        setupCanvas();

        // Setup drag and drop on canvas container
        setupDragAndDrop();

        // Setup click to deselect
        setupClickHandler();

        // Initial render
        render();
    }

    /**
     * Setup canvas size and background
     */
    function setupCanvas() {
        // Set canvas size based on container or default
        canvas.width = 1200;
        canvas.height = 800;

        // Draw initial background
        drawBackground();
    }

    /**
     * Draw canvas background grid
     */
    function drawBackground() {
        if (!ctx) return;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;

        const gridSize = 20;

        // Vertical lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(canvas.width, y + 0.5);
            ctx.stroke();
        }
    }

    /**
     * Setup drag and drop event handlers
     */
    function setupDragAndDrop() {
        canvasContainer.addEventListener('dragover', handleDragOver);
        canvasContainer.addEventListener('dragleave', handleDragLeave);
        canvasContainer.addEventListener('drop', handleDrop);
        canvasContainer.addEventListener('dragenter', handleDragEnter);
    }

    /**
     * Handle drag enter event
     * @param {DragEvent} e - Drag event
     */
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();

        // Check if we have enterprise data
        if (hasEnterpriseData(e)) {
            showDropIndicator();
        }
    }

    /**
     * Handle drag over event - updates drop indicator position
     * @param {DragEvent} e - Drag event
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();

        // Only allow drop if we have enterprise data
        if (!hasEnterpriseData(e)) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }

        e.dataTransfer.dropEffect = 'copy';

        // Update drop indicator position
        // Center the indicator on the mouse cursor
        updateDropIndicatorPosition(e);
    }

    /**
     * Handle drag leave event
     * @param {DragEvent} e - Drag event
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        // Only hide if we're leaving the container entirely
        // Check if relatedTarget is outside container
        if (!canvasContainer.contains(e.relatedTarget)) {
            hideDropIndicator();
        }
    }

    /**
     * Handle drop event - creates enterprise at drop position
     * @param {DragEvent} e - Drag event
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        hideDropIndicator();

        // Get enterprise type from drag data
        const type = e.dataTransfer.getData('application/x-enterprise-type') ||
                     e.dataTransfer.getData('text/plain');

        if (!type) {
            console.warn('No enterprise type in drop data');
            return;
        }

        // Calculate canvas position
        // The mouse position should be the CENTER of the new enterprise
        const pos = getCanvasPosition(e);

        // Add enterprise at this position (centered on cursor)
        if (window.CoopMaps && window.CoopMaps.enterprises) {
            window.CoopMaps.enterprises.addEnterprise(type, pos.x, pos.y);
        }
    }

    /**
     * Check if drag event contains enterprise data
     * @param {DragEvent} e - Drag event
     * @returns {boolean} True if has enterprise data
     */
    function hasEnterpriseData(e) {
        return e.dataTransfer.types.includes('application/x-enterprise-type') ||
               e.dataTransfer.types.includes('text/plain');
    }

    /**
     * Show drop indicator
     */
    function showDropIndicator() {
        if (dropIndicator) {
            dropIndicator.classList.add('active');
        }
    }

    /**
     * Hide drop indicator
     */
    function hideDropIndicator() {
        if (dropIndicator) {
            dropIndicator.classList.remove('active');
        }
    }

    /**
     * Update drop indicator position - CENTERED on mouse cursor
     * @param {DragEvent} e - Drag event
     */
    function updateDropIndicatorPosition(e) {
        if (!dropIndicator) return;

        // Get position relative to canvas container
        const rect = canvasContainer.getBoundingClientRect();
        const scrollLeft = canvasContainer.scrollLeft;
        const scrollTop = canvasContainer.scrollTop;

        // Mouse position relative to container (accounting for scroll)
        const mouseX = e.clientX - rect.left + scrollLeft;
        const mouseY = e.clientY - rect.top + scrollTop;

        // CENTER the drop indicator on the mouse cursor
        // This is the key fix - subtract HALF the width/height to center it
        const indicatorX = mouseX - (DROP_INDICATOR_WIDTH / 2);
        const indicatorY = mouseY - (DROP_INDICATOR_HEIGHT / 2);

        dropIndicator.style.left = indicatorX + 'px';
        dropIndicator.style.top = indicatorY + 'px';

        showDropIndicator();
    }

    /**
     * Get canvas-relative position from mouse event
     * @param {MouseEvent} e - Mouse event
     * @returns {Object} {x, y} position on canvas
     */
    function getCanvasPosition(e) {
        const rect = canvasContainer.getBoundingClientRect();
        const scrollLeft = canvasContainer.scrollLeft;
        const scrollTop = canvasContainer.scrollTop;

        // Position relative to canvas container
        const containerX = e.clientX - rect.left + scrollLeft;
        const containerY = e.clientY - rect.top + scrollTop;

        // Subtract canvas margin (20px as set in renderEnterprise)
        // This gives us the position on the actual canvas
        const canvasX = containerX - 20;
        const canvasY = containerY - 20;

        return { x: canvasX, y: canvasY };
    }

    /**
     * Setup click handler for deselection
     */
    function setupClickHandler() {
        canvasContainer.addEventListener('click', function(e) {
            // Only handle clicks directly on container or canvas
            if (e.target === canvasContainer || e.target === canvas) {
                // Deselect any selected enterprise
                const selected = document.querySelector('.enterprise.selected');
                if (selected) {
                    selected.classList.remove('selected');
                }

                // Clear properties panel
                const propsContent = document.getElementById('properties-content');
                if (propsContent) {
                    propsContent.innerHTML = `
                        <div class="property-group">
                            <label>Select an enterprise to edit its properties</label>
                        </div>
                    `;
                }
            }
        });
    }

    /**
     * Render canvas (background, grid, etc.)
     */
    function render() {
        drawBackground();
    }

    /**
     * Get canvas element
     * @returns {HTMLCanvasElement} Canvas element
     */
    function getCanvas() {
        return canvas;
    }

    /**
     * Get canvas context
     * @returns {CanvasRenderingContext2D} Canvas 2D context
     */
    function getContext() {
        return ctx;
    }

    // Export module
    window.CoopMaps = window.CoopMaps || {};
    window.CoopMaps.canvas = {
        init: init,
        render: render,
        getCanvas: getCanvas,
        getContext: getContext,
        getCanvasPosition: getCanvasPosition
    };

    // Main init function that initializes all modules
    window.CoopMaps.init = function() {
        // Initialize canvas first
        if (window.CoopMaps.canvas) {
            window.CoopMaps.canvas.init();
        }

        // Then initialize enterprises
        if (window.CoopMaps.enterprises) {
            window.CoopMaps.enterprises.init();
        }

        console.log('Co-opMaps initialized');
    };

})(window);
