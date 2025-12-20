/**
 * Co-opMaps - Canvas Module
 * Handles canvas rendering, interaction, zooming, and panning
 */

(function() {
    'use strict';

    const canvas = {
        canvasElement: null,
        ctx: null,
        isDragging: false,
        isResizing: false,
        isPanning: false,
        dragStartX: 0,
        dragStartY: 0,
        draggedEnterprise: null,
        resizeHandle: null,
        panStartX: 0,
        panStartY: 0,
        canvasOffsetX: 0,
        canvasOffsetY: 0,

        init() {
            console.log('Canvas module initializing...');
            this.canvasElement = document.getElementById('canvas');
            if (!this.canvasElement) {
                console.error('Canvas element not found');
                return;
            }

            this.ctx = this.canvasElement.getContext('2d');
            this.setupEventListeners();
            this.setCanvasSize('A4');
            this.centerCanvas();
            this.render();
            console.log('Canvas module initialized');
        },

        setupEventListeners() {
            // Mouse events
            this.canvasElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            this.canvasElement.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.canvasElement.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.canvasElement.addEventListener('contextmenu', this.onContextMenu.bind(this));

            // Wheel zoom
            this.canvasElement.addEventListener('wheel', this.onWheel.bind(this));

            // Drop events
            this.canvasElement.addEventListener('dragover', this.onDragOver.bind(this));
            this.canvasElement.addEventListener('drop', this.onDrop.bind(this));

            // Window resize
            window.addEventListener('resize', this.centerCanvas.bind(this));

            // Escape key to cancel operations
            document.addEventListener('escape-pressed', () => {
                this.cancelCurrentOperation();
            });
        },

        setCanvasSize(size) {
            const sizes = {
                'A4': { width: 794, height: 1123 },  // A4 at 96 DPI
                'A3': { width: 1123, height: 1587 }  // A3 at 96 DPI
            };

            const dimensions = sizes[size] || sizes['A4'];
            this.canvasElement.width = dimensions.width;
            this.canvasElement.height = dimensions.height;

            this.centerCanvas();
            this.render();

            if (window.CoopMaps) {
                CoopMaps.showNotification(`Canvas size set to ${size}`, 'info');
            }
        },

        centerCanvas() {
            const container = this.canvasElement.parentElement;
            const containerRect = container.getBoundingClientRect();

            const x = (containerRect.width - this.canvasElement.width) / 2;
            const y = (containerRect.height - this.canvasElement.height) / 2;

            this.canvasOffsetX = Math.max(0, x);
            this.canvasOffsetY = Math.max(0, y);

            this.canvasElement.style.left = this.canvasOffsetX + 'px';
            this.canvasElement.style.top = this.canvasOffsetY + 'px';
        },

        render() {
            if (!this.ctx) return;

            const state = window.CoopMaps.state.data;
            const connectorStyle = window.CoopMaps.state.ui.connectorStyle || 'orthogonal';

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

            // Draw grid (optional)
            // this.drawGrid();

            // Draw all relationships first (so they appear below enterprises)
            if (state.relationships && window.CoopMaps.modules.shapes) {
                state.relationships.forEach(rel => {
                    const isSelected = state.selectedItem &&
                                     state.selectedItem.type === 'relationship' &&
                                     state.selectedItem.id === rel.id;
                    window.CoopMaps.modules.shapes.drawRelationship(
                        this.ctx,
                        rel,
                        state.enterprises,
                        connectorStyle,
                        isSelected
                    );
                });
            }

            // Draw all enterprises
            if (state.enterprises && window.CoopMaps.modules.shapes) {
                state.enterprises.forEach(ent => {
                    const isSelected = state.selectedItem &&
                                     state.selectedItem.type === 'enterprise' &&
                                     state.selectedItem.id === ent.id;
                    window.CoopMaps.modules.shapes.drawEnterprise(this.ctx, ent, isSelected);
                });
            }

            // Draw relationship creation preview if active
            if (window.CoopMaps.modules.relationships &&
                window.CoopMaps.modules.relationships.relationshipCreationActive &&
                window.CoopMaps.modules.relationships.startEnterprise) {
                window.CoopMaps.modules.relationships.drawCreationPreview(this.ctx);
            }
        },

        drawGrid() {
            const gridSize = 20;
            this.ctx.strokeStyle = '#e0e0e0';
            this.ctx.lineWidth = 0.5;

            // Vertical lines
            for (let x = 0; x <= this.canvasElement.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvasElement.height);
                this.ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= this.canvasElement.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvasElement.width, y);
                this.ctx.stroke();
            }
        },

        getMousePos(e) {
            const rect = this.canvasElement.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        },

        getEnterpriseAt(x, y) {
            const state = window.CoopMaps.state.data;
            // Check in reverse order (top to bottom in z-index)
            for (let i = state.enterprises.length - 1; i >= 0; i--) {
                const ent = state.enterprises[i];
                if (x >= ent.x && x <= ent.x + ent.width &&
                    y >= ent.y && y <= ent.y + ent.height) {
                    return ent;
                }
            }
            return null;
        },

        getResizeHandle(enterprise, x, y) {
            const handleSize = 8;
            const handles = [
                { name: 'nw', x: enterprise.x, y: enterprise.y },
                { name: 'n', x: enterprise.x + enterprise.width / 2, y: enterprise.y },
                { name: 'ne', x: enterprise.x + enterprise.width, y: enterprise.y },
                { name: 'e', x: enterprise.x + enterprise.width, y: enterprise.y + enterprise.height / 2 },
                { name: 'se', x: enterprise.x + enterprise.width, y: enterprise.y + enterprise.height },
                { name: 's', x: enterprise.x + enterprise.width / 2, y: enterprise.y + enterprise.height },
                { name: 'sw', x: enterprise.x, y: enterprise.y + enterprise.height },
                { name: 'w', x: enterprise.x, y: enterprise.y + enterprise.height / 2 }
            ];

            for (const handle of handles) {
                if (Math.abs(x - handle.x) <= handleSize / 2 &&
                    Math.abs(y - handle.y) <= handleSize / 2) {
                    return handle.name;
                }
            }
            return null;
        },

        onMouseDown(e) {
            const pos = this.getMousePos(e);
            const state = window.CoopMaps.state.data;

            // Check for relationship creation mode
            if (window.CoopMaps.modules.relationships &&
                window.CoopMaps.modules.relationships.relationshipCreationActive) {
                window.CoopMaps.modules.relationships.handleCanvasClick(pos.x, pos.y);
                return;
            }

            // Middle mouse button or space+drag for panning
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                this.isPanning = true;
                this.panStartX = e.clientX - this.canvasOffsetX;
                this.panStartY = e.clientY - this.canvasOffsetY;
                this.canvasElement.classList.add('grabbing');
                e.preventDefault();
                return;
            }

            // Left click
            if (e.button === 0) {
                const enterprise = this.getEnterpriseAt(pos.x, pos.y);

                if (enterprise) {
                    // Check if clicking on resize handle
                    if (state.selectedItem &&
                        state.selectedItem.type === 'enterprise' &&
                        state.selectedItem.id === enterprise.id) {
                        const handle = this.getResizeHandle(enterprise, pos.x, pos.y);
                        if (handle) {
                            this.isResizing = true;
                            this.resizeHandle = handle;
                            this.draggedEnterprise = enterprise;
                            this.dragStartX = pos.x;
                            this.dragStartY = pos.y;
                            return;
                        }
                    }

                    // Start dragging
                    this.isDragging = true;
                    this.draggedEnterprise = enterprise;
                    this.dragStartX = pos.x - enterprise.x;
                    this.dragStartY = pos.y - enterprise.y;

                    // Select enterprise
                    state.selectedItem = { type: 'enterprise', id: enterprise.id };
                    window.CoopMaps.updateSidebar();
                    this.render();
                } else {
                    // Clicked on empty space - deselect
                    state.selectedItem = null;
                    window.CoopMaps.updateSidebar();
                    this.render();
                }
            }
        },

        onMouseMove(e) {
            const pos = this.getMousePos(e);

            // Panning
            if (this.isPanning) {
                this.canvasOffsetX = e.clientX - this.panStartX;
                this.canvasOffsetY = e.clientY - this.panStartY;
                this.canvasElement.style.left = this.canvasOffsetX + 'px';
                this.canvasElement.style.top = this.canvasOffsetY + 'px';
                return;
            }

            // Dragging
            if (this.isDragging && this.draggedEnterprise) {
                this.draggedEnterprise.x = pos.x - this.dragStartX;
                this.draggedEnterprise.y = pos.y - this.dragStartY;

                // Keep enterprise within canvas bounds
                this.draggedEnterprise.x = Math.max(0, Math.min(this.draggedEnterprise.x,
                    this.canvasElement.width - this.draggedEnterprise.width));
                this.draggedEnterprise.y = Math.max(0, Math.min(this.draggedEnterprise.y,
                    this.canvasElement.height - this.draggedEnterprise.height));

                this.render();
                return;
            }

            // Resizing
            if (this.isResizing && this.draggedEnterprise) {
                const dx = pos.x - this.dragStartX;
                const dy = pos.y - this.dragStartY;
                const ent = this.draggedEnterprise;
                const minSize = 60;

                // Handle different resize directions
                switch (this.resizeHandle) {
                    case 'se': // Bottom-right
                        ent.width = Math.max(minSize, ent.width + dx);
                        ent.height = Math.max(minSize, ent.height + dy);
                        break;
                    case 'nw': // Top-left
                        ent.width = Math.max(minSize, ent.width - dx);
                        ent.height = Math.max(minSize, ent.height - dy);
                        ent.x += dx;
                        ent.y += dy;
                        break;
                    case 'ne': // Top-right
                        ent.width = Math.max(minSize, ent.width + dx);
                        ent.height = Math.max(minSize, ent.height - dy);
                        ent.y += dy;
                        break;
                    case 'sw': // Bottom-left
                        ent.width = Math.max(minSize, ent.width - dx);
                        ent.height = Math.max(minSize, ent.height + dy);
                        ent.x += dx;
                        break;
                    case 'e': // Right
                        ent.width = Math.max(minSize, ent.width + dx);
                        break;
                    case 'w': // Left
                        ent.width = Math.max(minSize, ent.width - dx);
                        ent.x += dx;
                        break;
                    case 'n': // Top
                        ent.height = Math.max(minSize, ent.height - dy);
                        ent.y += dy;
                        break;
                    case 's': // Bottom
                        ent.height = Math.max(minSize, ent.height + dy);
                        break;
                }

                this.dragStartX = pos.x;
                this.dragStartY = pos.y;
                this.render();
                return;
            }

            // Update cursor based on what's under mouse
            const enterprise = this.getEnterpriseAt(pos.x, pos.y);
            if (enterprise) {
                const state = window.CoopMaps.state.data;
                if (state.selectedItem &&
                    state.selectedItem.type === 'enterprise' &&
                    state.selectedItem.id === enterprise.id) {
                    const handle = this.getResizeHandle(enterprise, pos.x, pos.y);
                    if (handle) {
                        this.canvasElement.style.cursor = handle + '-resize';
                        return;
                    }
                }
                this.canvasElement.style.cursor = 'move';
            } else {
                this.canvasElement.style.cursor = 'default';
            }

            // Relationship creation preview
            if (window.CoopMaps.modules.relationships &&
                window.CoopMaps.modules.relationships.relationshipCreationActive) {
                window.CoopMaps.modules.relationships.updatePreview(pos.x, pos.y);
                this.render();
            }
        },

        onMouseUp(e) {
            if (this.isDragging || this.isResizing) {
                window.CoopMaps.saveState();
            }

            this.isDragging = false;
            this.isResizing = false;
            this.isPanning = false;
            this.draggedEnterprise = null;
            this.resizeHandle = null;
            this.canvasElement.classList.remove('grabbing');
        },

        onContextMenu(e) {
            e.preventDefault();
            const pos = this.getMousePos(e);
            const enterprise = this.getEnterpriseAt(pos.x, pos.y);

            if (enterprise) {
                const state = window.CoopMaps.state.data;
                state.selectedItem = { type: 'enterprise', id: enterprise.id };
                this.render();

                // Show context menu
                const menu = document.getElementById('contextMenu');
                if (menu) {
                    menu.style.display = 'block';
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';

                    // Hide menu when clicking elsewhere
                    const hideMenu = () => {
                        menu.style.display = 'none';
                        document.removeEventListener('click', hideMenu);
                    };
                    setTimeout(() => document.addEventListener('click', hideMenu), 100);
                }
            }
        },

        onWheel(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom(delta);
        },

        onDragOver(e) {
            e.preventDefault();
            this.canvasElement.classList.add('drag-over');
        },

        onDrop(e) {
            e.preventDefault();
            this.canvasElement.classList.remove('drag-over');

            const enterpriseType = e.dataTransfer.getData('enterpriseType');
            if (enterpriseType && window.CoopMaps.modules.enterprises) {
                const pos = this.getMousePos(e);
                window.CoopMaps.modules.enterprises.addEnterpriseToCanvas(enterpriseType, pos.x, pos.y);
            }
        },

        // Zoom functions
        zoomIn() {
            this.zoom(0.1);
        },

        zoomOut() {
            this.zoom(-0.1);
        },

        zoomReset() {
            window.CoopMaps.state.ui.zoom = 1;
            this.canvasElement.style.transform = 'scale(1)';
            const btn = document.getElementById('zoomResetBtn');
            if (btn) btn.textContent = '100%';
        },

        zoom(delta) {
            const state = window.CoopMaps.state.ui;
            state.zoom = Math.max(0.25, Math.min(3, state.zoom + delta));
            this.canvasElement.style.transform = `scale(${state.zoom})`;

            const btn = document.getElementById('zoomResetBtn');
            if (btn) btn.textContent = Math.round(state.zoom * 100) + '%';
        },

        // Editing functions
        duplicateSelected() {
            const state = window.CoopMaps.state.data;
            if (state.selectedItem && state.selectedItem.type === 'enterprise') {
                const original = state.enterprises.find(e => e.id === state.selectedItem.id);
                if (original) {
                    const duplicate = JSON.parse(JSON.stringify(original));
                    duplicate.id = window.CoopMaps.generateId();
                    duplicate.x += 20;
                    duplicate.y += 20;
                    duplicate.name = original.name + ' (Copy)';
                    state.enterprises.push(duplicate);

                    state.selectedItem = { type: 'enterprise', id: duplicate.id };
                    window.CoopMaps.saveState();
                    this.render();
                    window.CoopMaps.updateSidebar();
                }
            }
        },

        deleteSelected() {
            const state = window.CoopMaps.state.data;
            if (!state.selectedItem) return;

            if (state.selectedItem.type === 'enterprise') {
                const index = state.enterprises.findIndex(e => e.id === state.selectedItem.id);
                if (index !== -1) {
                    state.enterprises.splice(index, 1);

                    // Also delete relationships connected to this enterprise
                    state.relationships = state.relationships.filter(r =>
                        r.startEnterpriseId !== state.selectedItem.id &&
                        r.endEnterpriseId !== state.selectedItem.id
                    );
                }
            } else if (state.selectedItem.type === 'relationship') {
                const index = state.relationships.findIndex(r => r.id === state.selectedItem.id);
                if (index !== -1) {
                    state.relationships.splice(index, 1);
                }
            }

            state.selectedItem = null;
            window.CoopMaps.saveState();
            this.render();
            window.CoopMaps.updateSidebar();
        },

        bringToFront() {
            const state = window.CoopMaps.state.data;
            if (state.selectedItem && state.selectedItem.type === 'enterprise') {
                const index = state.enterprises.findIndex(e => e.id === state.selectedItem.id);
                if (index !== -1) {
                    const enterprise = state.enterprises.splice(index, 1)[0];
                    state.enterprises.push(enterprise);
                    window.CoopMaps.saveState();
                    this.render();
                }
            }
        },

        sendToBack() {
            const state = window.CoopMaps.state.data;
            if (state.selectedItem && state.selectedItem.type === 'enterprise') {
                const index = state.enterprises.findIndex(e => e.id === state.selectedItem.id);
                if (index !== -1) {
                    const enterprise = state.enterprises.splice(index, 1)[0];
                    state.enterprises.unshift(enterprise);
                    window.CoopMaps.saveState();
                    this.render();
                }
            }
        },

        // Canvas operations
        clearCanvas() {
            if (confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
                const state = window.CoopMaps.state.data;
                state.enterprises = [];
                state.relationships = [];
                state.selectedItem = null;
                window.CoopMaps.saveState();
                this.render();
                window.CoopMaps.updateSidebar();
                window.CoopMaps.showNotification('Canvas cleared', 'info');
            }
        },

        newDiagram() {
            if (confirm('Create a new diagram? Any unsaved changes will be lost.')) {
                this.clearCanvas();
                const state = window.CoopMaps.state.data;
                state.diagramMetadata = {
                    title: 'Untitled Diagram',
                    author: '',
                    date: new Date().toISOString().split('T')[0],
                    wdr: '',
                    scope: {
                        geographic: 'local',
                        economic: '',
                        userDefined: ''
                    },
                    period: 'present'
                };
                window.CoopMaps.updateSidebar();
            }
        },

        autoLayout() {
            const state = window.CoopMaps.state.data;
            if (state.enterprises.length === 0) return;

            // Simple grid layout
            const cols = Math.ceil(Math.sqrt(state.enterprises.length));
            const padding = 40;
            const enterpriseWidth = 140;
            const enterpriseHeight = 100;

            state.enterprises.forEach((ent, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                ent.x = padding + col * (enterpriseWidth + padding);
                ent.y = padding + row * (enterpriseHeight + padding);
                ent.width = enterpriseWidth;
                ent.height = enterpriseHeight;
            });

            window.CoopMaps.saveState();
            this.render();
            window.CoopMaps.showNotification('Auto layout applied', 'success');
        },

        cancelCurrentOperation() {
            this.isDragging = false;
            this.isResizing = false;
            this.isPanning = false;
            this.draggedEnterprise = null;
            this.canvasElement.classList.remove('grabbing');

            if (window.CoopMaps.modules.relationships) {
                window.CoopMaps.modules.relationships.cancelRelationshipCreation();
            }

            this.render();
        },

        undo() {
            window.CoopMaps.undo();
        },

        redo() {
            window.CoopMaps.redo();
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('canvas', canvas);
    }
})();
