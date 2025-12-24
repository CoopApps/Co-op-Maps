/**
 * Enterprises Module
 * Handles enterprise symbols, drag-and-drop, and enterprise management
 */

(function(window) {
    'use strict';

    // Enterprise type configurations
    const ENTERPRISE_TYPES = {
        cooperative: {
            name: 'Cooperative',
            color: '#27ae60',
            bgColor: '#d5f5e3',
            icon: '🏢'
        },
        private: {
            name: 'Private Business',
            color: '#e74c3c',
            bgColor: '#fadbd8',
            icon: '🏭'
        },
        ngo: {
            name: 'NGO',
            color: '#3498db',
            bgColor: '#d6eaf8',
            icon: '🤝'
        },
        government: {
            name: 'Government',
            color: '#9b59b6',
            bgColor: '#e8daef',
            icon: '🏛️'
        },
        individual: {
            name: 'Individual',
            color: '#f39c12',
            bgColor: '#fef9e7',
            icon: '👤'
        },
        note: {
            name: 'Note',
            color: '#95a5a6',
            bgColor: '#f4f6f6',
            icon: '📝'
        }
    };

    // Default enterprise sizes
    const DEFAULT_SIZE = {
        width: 120,
        height: 72
    };

    // Drag ghost dimensions (for custom drag image)
    const DRAG_GHOST_WIDTH = 100;
    const DRAG_GHOST_HEIGHT = 60;

    // Store for enterprises
    let enterprises = [];
    let selectedEnterprise = null;
    let dragGhost = null;

    /**
     * Initialize drag events for symbol palette items
     */
    function bindDragEvents() {
        const symbolItems = document.querySelectorAll('.symbol-item[draggable="true"]');

        symbolItems.forEach(function(item) {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    /**
     * Handle drag start - creates custom drag image with correct offset
     * @param {DragEvent} e - The drag event
     */
    function handleDragStart(e) {
        const type = this.dataset.type;
        const typeConfig = ENTERPRISE_TYPES[type];

        if (!typeConfig) return;

        // Set drag data
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-enterprise-type', type);
        e.dataTransfer.setData('text/plain', type);

        // Create custom drag image (ghost)
        const canvas = document.createElement('canvas');
        canvas.width = DRAG_GHOST_WIDTH;
        canvas.height = DRAG_GHOST_HEIGHT;
        const ctx = canvas.getContext('2d');

        // Draw enterprise shape preview
        drawEnterpriseShape(ctx, type, 0, 0, DRAG_GHOST_WIDTH, DRAG_GHOST_HEIGHT);

        // Create ghost container with EXPLICIT dimensions
        // This is critical for correct setDragImage offset calculation
        dragGhost = document.createElement('div');
        dragGhost.style.cssText = `
            position: absolute;
            top: -1000px;
            left: -1000px;
            width: ${DRAG_GHOST_WIDTH}px;
            height: ${DRAG_GHOST_HEIGHT}px;
            opacity: 0.8;
            pointer-events: none;
        `;
        dragGhost.appendChild(canvas);
        document.body.appendChild(dragGhost);

        // Set drag image with offset that centers it on the cursor
        // The offset parameters (x, y) specify where the cursor should be
        // relative to the top-left corner of the drag image
        // To center: offset = dimension / 2
        const offsetX = DRAG_GHOST_WIDTH / 2;  // 50px - center horizontally
        const offsetY = DRAG_GHOST_HEIGHT / 2; // 30px - center vertically
        e.dataTransfer.setDragImage(dragGhost, offsetX, offsetY);

        // Update status
        updateStatus('Dragging ' + typeConfig.name + '...');

        // Add dragging class for visual feedback
        this.classList.add('dragging');
    }

    /**
     * Handle drag end - cleanup
     * @param {DragEvent} e - The drag event
     */
    function handleDragEnd(e) {
        // Remove ghost element
        if (dragGhost && dragGhost.parentNode) {
            dragGhost.parentNode.removeChild(dragGhost);
            dragGhost = null;
        }

        // Remove dragging class
        this.classList.remove('dragging');

        // Update status
        updateStatus('Ready');
    }

    /**
     * Draw enterprise shape on canvas context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} type - Enterprise type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    function drawEnterpriseShape(ctx, type, x, y, width, height) {
        const config = ENTERPRISE_TYPES[type];
        if (!config) return;

        ctx.save();

        // Fill
        ctx.fillStyle = config.bgColor;
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;

        // Draw rounded rectangle
        const radius = type === 'note' ? 4 : 8;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        ctx.fill();

        // Dashed border for notes
        if (type === 'note') {
            ctx.setLineDash([4, 4]);
        }
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Add enterprise at canvas position
     * @param {string} type - Enterprise type
     * @param {number} x - X position on canvas
     * @param {number} y - Y position on canvas
     * @returns {Object} The created enterprise
     */
    function addEnterprise(type, x, y) {
        const config = ENTERPRISE_TYPES[type];
        if (!config) return null;

        const enterprise = {
            id: 'ent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: type,
            name: config.name,
            // Center the enterprise on the drop position
            x: x - DEFAULT_SIZE.width / 2,
            y: y - DEFAULT_SIZE.height / 2,
            width: DEFAULT_SIZE.width,
            height: DEFAULT_SIZE.height,
            zIndex: enterprises.length
        };

        enterprises.push(enterprise);

        // Render the enterprise
        renderEnterprise(enterprise);

        // Hide instructions if visible
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }

        updateStatus('Added ' + config.name);

        return enterprise;
    }

    /**
     * Render enterprise as DOM element
     * @param {Object} enterprise - Enterprise data
     */
    function renderEnterprise(enterprise) {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        // Create enterprise element
        const el = document.createElement('div');
        el.className = 'enterprise ' + enterprise.type;
        el.id = enterprise.id;
        el.style.left = (enterprise.x + 20) + 'px'; // 20px margin for canvas
        el.style.top = (enterprise.y + 20) + 'px';
        el.style.width = enterprise.width + 'px';
        el.style.height = enterprise.height + 'px';
        el.style.zIndex = enterprise.zIndex;
        el.textContent = enterprise.name;

        // Make enterprise draggable within canvas
        el.draggable = true;
        el.addEventListener('mousedown', handleEnterpriseMouseDown);
        el.addEventListener('click', handleEnterpriseClick);

        container.appendChild(el);
    }

    /**
     * Handle enterprise mouse down for dragging
     * @param {MouseEvent} e - Mouse event
     */
    function handleEnterpriseMouseDown(e) {
        // Start drag tracking
        const el = e.currentTarget;
        const enterprise = enterprises.find(ent => ent.id === el.id);
        if (!enterprise) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const origX = enterprise.x;
        const origY = enterprise.y;

        function handleMouseMove(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            enterprise.x = origX + dx;
            enterprise.y = origY + dy;
            el.style.left = (enterprise.x + 20) + 'px';
            el.style.top = (enterprise.y + 20) + 'px';
        }

        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            updateStatus('Moved ' + enterprise.name);
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        e.preventDefault();
    }

    /**
     * Handle enterprise click for selection
     * @param {MouseEvent} e - Mouse event
     */
    function handleEnterpriseClick(e) {
        const el = e.currentTarget;
        const enterprise = enterprises.find(ent => ent.id === el.id);

        // Deselect previous
        if (selectedEnterprise) {
            const prevEl = document.getElementById(selectedEnterprise.id);
            if (prevEl) prevEl.classList.remove('selected');
        }

        // Select new
        selectedEnterprise = enterprise;
        el.classList.add('selected');

        // Update properties panel
        updatePropertiesPanel(enterprise);

        e.stopPropagation();
    }

    /**
     * Update the properties panel with enterprise data
     * @param {Object} enterprise - Enterprise data
     */
    function updatePropertiesPanel(enterprise) {
        const content = document.getElementById('properties-content');
        if (!content || !enterprise) return;

        const config = ENTERPRISE_TYPES[enterprise.type];

        content.innerHTML = `
            <div class="property-group">
                <label>Name</label>
                <input type="text" id="prop-name" value="${enterprise.name}">
            </div>
            <div class="property-group">
                <label>Type</label>
                <select id="prop-type">
                    ${Object.keys(ENTERPRISE_TYPES).map(function(type) {
                        return '<option value="' + type + '"' +
                               (type === enterprise.type ? ' selected' : '') + '>' +
                               ENTERPRISE_TYPES[type].name + '</option>';
                    }).join('')}
                </select>
            </div>
            <div class="property-group">
                <label>Position</label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="prop-x" value="${Math.round(enterprise.x)}" style="width: 50%;">
                    <input type="number" id="prop-y" value="${Math.round(enterprise.y)}" style="width: 50%;">
                </div>
            </div>
            <div class="property-group">
                <label>Size</label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="prop-width" value="${enterprise.width}" style="width: 50%;">
                    <input type="number" id="prop-height" value="${enterprise.height}" style="width: 50%;">
                </div>
            </div>
        `;

        // Bind change events
        document.getElementById('prop-name').addEventListener('change', function() {
            enterprise.name = this.value;
            const el = document.getElementById(enterprise.id);
            if (el) el.textContent = enterprise.name;
        });

        document.getElementById('prop-type').addEventListener('change', function() {
            const oldType = enterprise.type;
            enterprise.type = this.value;
            const el = document.getElementById(enterprise.id);
            if (el) {
                el.classList.remove(oldType);
                el.classList.add(enterprise.type);
            }
        });
    }

    /**
     * Update status bar text
     * @param {string} text - Status text
     */
    function updateStatus(text) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    /**
     * Get all enterprises
     * @returns {Array} Array of enterprises
     */
    function getEnterprises() {
        return enterprises;
    }

    /**
     * Initialize enterprises module
     */
    function init() {
        bindDragEvents();
        updateStatus('Ready');
    }

    // Export module
    window.CoopMaps = window.CoopMaps || {};
    window.CoopMaps.enterprises = {
        init: init,
        addEnterprise: addEnterprise,
        getEnterprises: getEnterprises,
        ENTERPRISE_TYPES: ENTERPRISE_TYPES,
        DEFAULT_SIZE: DEFAULT_SIZE
    };

})(window);
