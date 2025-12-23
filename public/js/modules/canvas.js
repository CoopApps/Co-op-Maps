/**
 * Co-opMaps - Canvas Module
 * Enhanced canvas with improved visuals, grid-free export support, and advanced auto-layout
 */

(function() {
    'use strict';

    // Enhanced Canvas Module with improved visuals and grid-free export support
    CoopMaps.registerModule('canvas', {
        canvas: null,
        ctx: null,
        isDragging: false,
        draggedItem: null,
        dragOffset: { x: 0, y: 0 },
        mouseDownTime: 0,
        clickStartX: 0,
        clickStartY: 0,
        potentialSelection: null,
        isExporting: false, // Flag to disable grid during export
        isPanning: false,
        panStart: { x: 0, y: 0 },
        panOffset: { x: 0, y: 0 },
        minZoom: 0.1, // Dynamic minimum zoom (zoom-to-fit)
        canvasSizes: {
            // Landscape orientations at 96 DPI
            'A4': { width: 1123, height: 794 },   // 297mm x 210mm landscape
            'A3': { width: 1587, height: 1123 },  // 420mm x 297mm landscape
            'A2': { width: 2245, height: 1587 },  // 594mm x 420mm landscape
            'A1': { width: 3179, height: 2245 }   // 841mm x 594mm landscape
        },
        currentCanvasSize: 'A4', // Track current size

        init() {
            if (this.initialized) {
                console.log('Canvas already initialized, skipping');
                return;
            }

            console.log('Enhanced Canvas module initialized');
            this.canvas = document.getElementById('canvas');
            this.ctx = this.canvas.getContext('2d');

            // Enable better rendering
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            this.initialized = true;

            // Set initial canvas size
            this.setCanvasSize('A4');

            // Initialize dark mode from stored preference
            this.initDarkMode();

            this.bindCanvasEvents();
            this.setupDragAndDrop();
            this.setupKeyboardShortcuts();
            this.render();
        },

        setCanvasSize(size) {
            const canvasSize = this.canvasSizes[size];
            if (!canvasSize) return;

            this.canvas.width = canvasSize.width;
            this.canvas.height = canvasSize.height;

            this.currentCanvasSize = size;
            CoopMaps.state.ui.canvasSize = size;

            // Update select dropdown if it exists (both express and deluxe versions)
            const select = document.getElementById('canvasSizeSelect') || document.getElementById('canvasSizeSelector');
            if (select && select.value !== size) {
                select.value = size;
            }

            // Calculate zoom to fit entire page on screen
            const container = document.querySelector('.canvas-area');
            if (container) {
                const containerRect = container.getBoundingClientRect();

                // Add padding so canvas doesn't touch edges
                const padding = 40;
                const availableWidth = containerRect.width - (padding * 2);
                const availableHeight = containerRect.height - (padding * 2);

                // Calculate zoom needed to fit
                const zoomX = availableWidth / canvasSize.width;
                const zoomY = availableHeight / canvasSize.height;
                const fitZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 100%

                // Store minimum zoom and set zoom to fit
                this.minZoom = Math.max(0.05, fitZoom); // Absolute minimum 5%
                CoopMaps.state.ui.zoom = fitZoom;

                // Reset pan offset when changing size
                this.panOffset = { x: 0, y: 0 };

                // Set CSS dimensions to scaled size for proper centering
                // Canvas internal resolution stays at full size for quality
                this.canvas.style.width = (canvasSize.width * fitZoom) + 'px';
                this.canvas.style.height = (canvasSize.height * fitZoom) + 'px';

                // Update zoom display if it exists
                const zoomDisplay = document.getElementById('zoomLevel');
                if (zoomDisplay) {
                    zoomDisplay.textContent = Math.round(fitZoom * 100) + '%';
                }
            }

            this.render();
        },

        updateCanvasSize() {
            // Read size from state and update canvas
            const size = CoopMaps.state.data.diagramProperties?.canvasSize || 'A4';
            this.setCanvasSize(size);
        },

        setupDragAndDrop() {
            let dropHandled = false;

            // Enhanced drag visual feedback
            this.canvas.addEventListener('dragenter', (e) => {
                e.preventDefault();
                this.canvas.classList.add('drag-over');
                this.showDropZone(e);
            });

            this.canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                this.updateDropZone(e);
            });

            this.canvas.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.canvas.classList.remove('drag-over');
                this.hideDropZone();
            });

            this.canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.canvas.classList.remove('drag-over');
                this.hideDropZone();

                if (dropHandled) {
                    dropHandled = false;
                    return false;
                }
                dropHandled = true;
                setTimeout(() => { dropHandled = false; }, 100);

                const enterpriseType = e.dataTransfer.getData('enterpriseType');
                console.log('Canvas drop - enterprise type:', enterpriseType);

                if (enterpriseType && CoopMaps.modules.enterprises) {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    // Add drop animation
                    this.animateEnterpriseDrop(enterpriseType, x, y);
                }

                return false;
            });
        },

        // Visual feedback for drag and drop
        showDropZone(e) {
            if (!this.dropIndicator) {
                this.dropIndicator = document.createElement('div');
                this.dropIndicator.style.cssText = `
                    position: absolute;
                    width: 120px;
                    height: 72px;
                    border: 3px dashed #3498db;
                    border-radius: 8px;
                    background: rgba(52, 152, 219, 0.1);
                    pointer-events: none;
                    transition: all 0.2s ease;
                    z-index: 1000;
                `;
                this.canvas.parentElement.appendChild(this.dropIndicator);
            }
            this.updateDropZone(e);
        },

        updateDropZone(e) {
            if (this.dropIndicator) {
                const rect = this.canvas.getBoundingClientRect();
                this.dropIndicator.style.left = (e.clientX - rect.left - 60) + 'px';
                this.dropIndicator.style.top = (e.clientY - rect.top - 36) + 'px';
            }
        },

        hideDropZone() {
            if (this.dropIndicator) {
                this.dropIndicator.remove();
                this.dropIndicator = null;
            }
        },

        animateEnterpriseDrop(enterpriseType, x, y) {
            // Smooth drop animation
            const startY = y - 50;
            const endY = y;
            const duration = 300;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                const currentY = startY + (endY - startY) * easeProgress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    CoopMaps.modules.enterprises.addEnterpriseAt(enterpriseType, x, currentY);
                }
            };

            animate();
        },

        bindCanvasEvents() {
            const self = this;

            this.canvas.addEventListener('mousedown', (e) => {
                self.mouseDownTime = Date.now();
                const rect = self.canvas.getBoundingClientRect();
                const scale = CoopMaps.state.ui.zoom;
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;

                self.clickStartX = x;
                self.clickStartY = y;

                // Check if Express mode symbol is selected for placement
                if (CoopMaps.selectedSymbolType) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Place the selected symbol at click location
                    if (CoopMaps.modules.enterprises && CoopMaps.modules.enterprises.addEnterpriseAt) {
                        CoopMaps.modules.enterprises.addEnterpriseAt(CoopMaps.selectedSymbolType, x, y);
                    }

                    // Clear selection
                    CoopMaps.selectedSymbolType = null;
                    const symbolBtns = document.querySelectorAll('.symbol-btn');
                    symbolBtns.forEach(btn => btn.classList.remove('selected'));

                    return;
                }

                const clickedItem = self.getItemAtPosition(x, y);

                if (clickedItem) {
                    e.preventDefault();
                    e.stopPropagation();

                    self.potentialSelection = clickedItem;

                    if (CoopMaps.modules.relationships && CoopMaps.modules.relationships.relationshipCreationActive) {
                        CoopMaps.modules.relationships.handleCanvasClick(x, y);
                        self.render();
                        return;
                    } else {
                        self.isDragging = false;
                        self.draggedItem = clickedItem;
                        self.dragOffset = {
                            x: x - clickedItem.x,
                            y: y - clickedItem.y
                        };

                        self.draggedItem.originalX = clickedItem.x;
                        self.draggedItem.originalY = clickedItem.y;

                        CoopMaps.state.data.selectedItem = clickedItem;
                    }
                } else {
                    self.draggedItem = null;
                    self.isDragging = false;
                    CoopMaps.state.data.selectedItem = null;
                    CoopMaps.updateSidebar();

                    if (CoopMaps.modules.relationships && CoopMaps.modules.relationships.relationshipCreationActive) {
                        CoopMaps.modules.relationships.startEnterprise = null;
                        self.render();
                    } else {
                        // Start panning if clicking on empty space
                        self.isPanning = true;
                        self.panStart = { x: e.clientX, y: e.clientY };
                        self.canvas.style.cursor = 'grab';
                    }
                }
            });

            this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent default browser context menu

                // Calculate canvas coordinates
                const rect = self.canvas.getBoundingClientRect();
                const scale = CoopMaps.state.ui.zoom;
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;

                // Check if relationships module handles it
                if (CoopMaps.modules.relationships && CoopMaps.modules.relationships.handleCanvasRightClick) {
                    if (CoopMaps.modules.relationships.handleCanvasRightClick(x, y)) {
                        return; // Relationship handled it
                    }
                }

                // Handle right-click for enterprises

                const clickedItem = self.getItemAtPosition(x, y);

                if (clickedItem) {
                    CoopMaps.state.data.selectedItem = clickedItem;
                    self.render();

                    const menu = document.getElementById('contextMenu');
                    menu.style.display = 'block';
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';

                    // Add entrance animation
                    menu.style.opacity = '0';
                    menu.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        menu.style.transition = 'all 0.2s ease';
                        menu.style.opacity = '1';
                        menu.style.transform = 'scale(1)';
                    }, 10);
                }
            });

            this.canvas.addEventListener('mousemove', (e) => {
                const rect = self.canvas.getBoundingClientRect();
                const scale = CoopMaps.state.ui.zoom;
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;

                if (self.draggedItem && !self.isDragging && (Date.now() - self.mouseDownTime > 100)) {
                    const distance = Math.sqrt(Math.pow(x - self.draggedItem.x - self.dragOffset.x, 2) +
                                             Math.pow(y - self.draggedItem.y - self.dragOffset.y, 2));
                    if (distance > 5) {
                        self.isDragging = true;
                        self.canvas.style.cursor = 'move';
                        console.log('Started dragging');
                    }
                }

                // Handle panning
                if (self.isPanning) {
                    const dx = e.clientX - self.panStart.x;
                    const dy = e.clientY - self.panStart.y;
                    self.panOffset.x += dx;
                    self.panOffset.y += dy;
                    self.panStart = { x: e.clientX, y: e.clientY };
                    self.canvas.style.cursor = 'grabbing';
                    self.render();
                    return;
                }

                if (self.isDragging && self.draggedItem) {
                    self.draggedItem.x = x - self.dragOffset.x;
                    self.draggedItem.y = y - self.dragOffset.y;
                    self.render();
                } else if (!self.draggedItem) {
                    const hoverItem = self.getItemAtPosition(x, y);
                    // Check if Express mode symbol is selected
                    if (CoopMaps.selectedSymbolType) {
                        self.canvas.style.cursor = 'crosshair';
                    } else if (CoopMaps.modules.relationships && CoopMaps.modules.relationships.relationshipCreationActive) {
                        // Update relationship preview
                        if (CoopMaps.modules.relationships.updatePreview) {
                            CoopMaps.modules.relationships.updatePreview(x, y);
                        }
                        self.canvas.style.cursor = hoverItem ? 'crosshair' : 'default';
                    } else if (hoverItem) {
                        self.canvas.style.cursor = 'pointer';
                    } else {
                        // Show grab cursor on empty space to indicate panning is available
                        self.canvas.style.cursor = 'grab';
                    }
                }
            });

            this.canvas.addEventListener('mouseup', (e) => {
                const rect = self.canvas.getBoundingClientRect();
                const scale = CoopMaps.state.ui.zoom;
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;

                const clickDistance = Math.sqrt(
                    Math.pow(x - self.clickStartX, 2) +
                    Math.pow(y - self.clickStartY, 2)
                );

                if (!self.isDragging && clickDistance < 5 && self.potentialSelection) {
                    console.log('Click detected on:', self.potentialSelection.name);

                    CoopMaps.state.data.selectedItem = self.potentialSelection;
                    CoopMaps.state.ui.activeTab = 'properties';

                    // Update sidebar - check for both Deluxe and Express versions
                    if (CoopMaps.updateSidebar) {
                        // Express version has updateSidebar function
                        CoopMaps.updateSidebar();
                    } else {
                        // Deluxe version has sidebar-content and tabs
                        document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                        const propertiesTab = document.querySelector('[data-tab="properties"]');
                        if (propertiesTab) {
                            propertiesTab.classList.add('active');
                        }

                        const sidebarContent = document.getElementById('sidebar-content');
                        if (sidebarContent && CoopMaps.modules.properties) {
                            console.log('Updating properties panel for:', self.potentialSelection.name);
                            sidebarContent.innerHTML = CoopMaps.modules.properties.render();
                        }
                    }

                    self.render();
                }

                // Save state if dragging occurred
                if (self.isDragging && self.draggedItem) {
                    CoopMaps.saveState();
                }

                self.isDragging = false;
                self.draggedItem = null;
                self.potentialSelection = null;
                self.mouseDownTime = 0;
                self.isPanning = false;

                // Reset cursor - show grab on empty space, pointer on items
                const hoverItem = self.getItemAtPosition(x, y);
                if (hoverItem) {
                    self.canvas.style.cursor = 'pointer';
                } else {
                    self.canvas.style.cursor = 'grab';
                }
            });

            this.canvas.addEventListener('mouseleave', () => {
                self.isDragging = false;
                self.draggedItem = null;
                self.mouseDownTime = 0;
                self.isPanning = false;
                self.canvas.style.cursor = 'default';
            });

            // Enhanced zoom with smooth animation
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.smoothZoom(delta, e.clientX, e.clientY);
            });

            // Hide context menu on click elsewhere
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('contextMenu');
                if (!menu.contains(e.target)) {
                    menu.style.display = 'none';
                }
            });

        },

        setupKeyboardShortcuts() {
            const self = this;

            document.addEventListener('keydown', (e) => {
                // Ignore if typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }

                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const modKey = isMac ? e.metaKey : e.ctrlKey;

                // Delete selected
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (CoopMaps.state.data.selectedItem || self.selectedItems.length > 0) {
                        e.preventDefault();
                        self.deleteSelectedItems();
                    }
                }

                // Copy (Ctrl/Cmd+C)
                if (modKey && e.key === 'c') {
                    e.preventDefault();
                    self.copySelected();
                }

                // Paste (Ctrl/Cmd+V)
                if (modKey && e.key === 'v') {
                    e.preventDefault();
                    self.pasteFromClipboard();
                }

                // Duplicate (Ctrl/Cmd+D)
                if (modKey && e.key === 'd') {
                    e.preventDefault();
                    self.duplicateSelected();
                }

                // Select all (Ctrl/Cmd+A)
                if (modKey && e.key === 'a') {
                    e.preventDefault();
                    self.selectedItems = [...CoopMaps.state.data.enterprises];
                    if (self.selectedItems.length > 0) {
                        CoopMaps.showNotification(`Selected ${self.selectedItems.length} items`, 'info');
                    }
                    self.render();
                }

                // Escape - deselect all
                if (e.key === 'Escape') {
                    self.selectedItems = [];
                    CoopMaps.state.data.selectedItem = null;
                    if (CoopMaps.modules.relationships) {
                        CoopMaps.modules.relationships.cancelRelationshipCreation();
                    }
                    self.render();
                }

                // Arrow keys - nudge selected items
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    const items = self.selectedItems.length > 0
                        ? self.selectedItems
                        : (CoopMaps.state.data.selectedItem ? [CoopMaps.state.data.selectedItem] : []);

                    if (items.length > 0) {
                        e.preventDefault();
                        const distance = e.shiftKey ? 10 : 1;
                        const dx = e.key === 'ArrowLeft' ? -distance : (e.key === 'ArrowRight' ? distance : 0);
                        const dy = e.key === 'ArrowUp' ? -distance : (e.key === 'ArrowDown' ? distance : 0);

                        items.forEach(item => {
                            item.x += dx;
                            item.y += dy;
                        });
                        self.render();
                    }
                }
            });
        },

        getItemAtPosition(x, y) {
            // Check in reverse order (top to bottom)
            for (let i = CoopMaps.state.data.enterprises.length - 1; i >= 0; i--) {
                const enterprise = CoopMaps.state.data.enterprises[i];
                let effectiveHeight = enterprise.height;

                if (enterprise.type === 'ncm') {
                    effectiveHeight = enterprise.height * 1.2;
                }

                if (x >= enterprise.x && x <= enterprise.x + enterprise.width &&
                    y >= enterprise.y && y <= enterprise.y + effectiveHeight) {
                    return enterprise;
                }
            }
            return null;
        },

        render(excludeGrid = false) {
            // Store export state
            this.isExporting = excludeGrid;

            // Clear canvas with subtle gradient background
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Enhanced background
            if (!this.isExporting) {
                const bgGradient = this.ctx.createRadialGradient(
                    this.canvas.width / 2, this.canvas.height / 2, 0,
                    this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
                );
                bgGradient.addColorStop(0, '#fafafa');
                bgGradient.addColorStop(1, '#f0f0f0');
                this.ctx.fillStyle = bgGradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else {
                // Clean white background for exports
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // Apply pan offset (zoom is handled by CSS transform)
            this.ctx.save();
            const zoom = CoopMaps.state.ui.zoom || 1;
            this.ctx.translate(this.panOffset.x / zoom, this.panOffset.y / zoom);

            // Draw grid only if not exporting and grid is enabled
            if (!excludeGrid && !this.isExporting && CoopMaps.state.ui.showGrid) {
                this.drawEnhancedGrid();
            }

            // Draw diagram title - ONLY ONE TITLE at the top center
            this.drawDiagramTitle();

            // Draw relationships with better visuals
            if (CoopMaps.modules.relationships && CoopMaps.modules.relationships.drawRelationships) {
                CoopMaps.modules.relationships.drawRelationships(this.ctx);
            }

            // Draw enterprises with enhanced visuals
            CoopMaps.state.data.enterprises.forEach(enterprise => {
                this.drawEnterprise(enterprise);
            });

            // Draw relationship creation preview
            if (CoopMaps.modules.relationships && CoopMaps.modules.relationships.drawCreationPreview) {
                CoopMaps.modules.relationships.drawCreationPreview(this.ctx);
            }

            // Draw annotations/notes
            this.drawAnnotations();

            // Draw selection highlight
            if (CoopMaps.state.data.selectedItem && !this.isExporting) {
                this.drawSelectionHighlight(CoopMaps.state.data.selectedItem);
            }

            // Draw multi-select highlights
            this.drawMultiSelectHighlights();

            this.ctx.restore();

            // Reset export state
            this.isExporting = false;
        },

        drawEnhancedGrid() {
            this.ctx.save();

            const gridSize = 20;
            const majorGridSize = 100;

            // Minor grid lines - increased opacity for better visibility
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            this.ctx.lineWidth = 0.5;

            for (let x = 0; x < this.canvas.width; x += gridSize) {
                if (x % majorGridSize !== 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, 0);
                    this.ctx.lineTo(x, this.canvas.height);
                    this.ctx.stroke();
                }
            }

            for (let y = 0; y < this.canvas.height; y += gridSize) {
                if (y % majorGridSize !== 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, y);
                    this.ctx.lineTo(this.canvas.width, y);
                    this.ctx.stroke();
                }
            }

            // Major grid lines - increased opacity for better visibility
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            this.ctx.lineWidth = 1;

            for (let x = 0; x < this.canvas.width; x += majorGridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }

            for (let y = 0; y < this.canvas.height; y += majorGridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }

            this.ctx.restore();
        },

        drawDiagramTitle() {
            const props = CoopMaps.state.data.diagramProperties || {};
            const title = props.title || 'Untitled Diagram';
            const canvasSize = this.canvasSizes[this.currentCanvasSize];
            const baseSize = this.canvasSizes['A4']; // A4 is the reference size

            // Calculate scale factor based on canvas size relative to A4
            // This ensures the title looks proportionally the same on all canvas sizes
            const scale = Math.sqrt((canvasSize.width * canvasSize.height) / (baseSize.width * baseSize.height));

            // Scaled values - all sizes will look like A4's proportions
            const titleFontSize = Math.round(28 * scale);
            const dateFontSize = Math.round(14 * scale);
            const authorFontSize = Math.round(12 * scale);
            const lineHeight = Math.round(35 * scale);
            const titleY = Math.round(50 * scale);
            const marginPadding = Math.round(100 * scale);
            const bgPadding = Math.round(30 * scale);
            const borderRadius = Math.round(8 * scale);
            const subtitleSpacing = Math.round(20 * scale);
            const authorSpacing = Math.round(15 * scale);

            // Position at the top center
            const titleX = canvasSize.width / 2;

            // Enhanced title styling
            this.ctx.save();

            this.ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Word wrap logic
            const maxWidth = canvasSize.width - (marginPadding * 2);
            const words = title.split(' ');
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const testLine = currentLine + ' ' + words[i];
                const metrics = this.ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);

            // Calculate background size based on number of lines
            const totalHeight = lines.length * lineHeight + Math.round(20 * scale);
            const bgHeight = totalHeight;

            // Find the widest line for background
            let maxLineWidth = 0;
            lines.forEach(line => {
                const metrics = this.ctx.measureText(line);
                maxLineWidth = Math.max(maxLineWidth, metrics.width);
            });
            const bgWidth = Math.min(maxLineWidth + (bgPadding * 2), canvasSize.width - marginPadding);

            // Title background with gradient
            const bgGradient = this.ctx.createLinearGradient(
                titleX - bgWidth/2, titleY - bgHeight/2,
                titleX - bgWidth/2, titleY + bgHeight/2
            );
            bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            bgGradient.addColorStop(1, 'rgba(250, 250, 250, 0.95)');

            // Rounded rectangle for title background
            this.drawRoundedRect(
                titleX - bgWidth/2, titleY - bgHeight/2,
                bgWidth, bgHeight, borderRadius
            );
            this.ctx.fillStyle = bgGradient;
            this.ctx.fill();

            // Subtle border
            this.ctx.strokeStyle = 'rgba(44, 62, 80, 0.1)';
            this.ctx.lineWidth = Math.max(1, Math.round(scale));
            this.ctx.stroke();

            // Draw title text lines
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            this.ctx.shadowBlur = 2 * scale;
            this.ctx.shadowOffsetY = 1 * scale;
            this.ctx.fillStyle = '#2c3e50';

            const startY = titleY - (lines.length - 1) * lineHeight / 2;
            lines.forEach((line, index) => {
                this.ctx.fillText(line, titleX, startY + index * lineHeight);
            });

            // Adjust position for date and author based on number of title lines
            const subtitleY = titleY + bgHeight/2 + subtitleSpacing;

            // Date subtitle
            if (CoopMaps.state.data.diagramProperties.date) {
                this.ctx.font = `${dateFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.shadowColor = 'transparent';
                this.ctx.fillText(CoopMaps.state.data.diagramProperties.date, titleX, subtitleY);
            }

            // Author info if present
            if (CoopMaps.state.data.diagramProperties.author) {
                this.ctx.font = `${authorFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                this.ctx.fillStyle = '#95a5a6';
                this.ctx.fillText('by ' + CoopMaps.state.data.diagramProperties.author, titleX, subtitleY + authorSpacing);
            }

            this.ctx.restore();
        },

        drawRoundedRect(x, y, width, height, radius) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
        },

        drawSelectionHighlight(enterprise) {
            this.ctx.save();

            const padding = 15;
            let highlightHeight = enterprise.height + padding * 2;
            if (enterprise.type === 'ncm') {
                highlightHeight = enterprise.height * 1.2 + padding * 2;
            }

            // Animated selection ring
            const time = Date.now() / 1000;
            const pulse = Math.sin(time * 3) * 0.2 + 0.8;

            this.ctx.strokeStyle = `rgba(52, 152, 219, ${pulse})`;
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([8, 4]);
            this.ctx.lineDashOffset = time * 10;

            this.drawRoundedRect(
                enterprise.x - padding,
                enterprise.y - padding,
                enterprise.width + padding * 2,
                highlightHeight,
                8
            );
            this.ctx.stroke();

            // Corner handles
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = '#3498db';
            const handleSize = 6;
            const handles = [
                { x: enterprise.x - padding, y: enterprise.y - padding },
                { x: enterprise.x + enterprise.width + padding, y: enterprise.y - padding },
                { x: enterprise.x - padding, y: enterprise.y + highlightHeight - padding },
                { x: enterprise.x + enterprise.width + padding, y: enterprise.y + highlightHeight - padding }
            ];

            handles.forEach(handle => {
                this.ctx.fillRect(
                    handle.x - handleSize/2,
                    handle.y - handleSize/2,
                    handleSize,
                    handleSize
                );
            });

            this.ctx.restore();
        },

        drawEnterprise(enterprise) {
            if (!enterprise || !enterprise.type) {
                console.error('Invalid enterprise:', enterprise);
                return;
            }

            const shapes = CoopMaps.modules.shapes;
            if (!shapes) {
                console.error('Shapes module not loaded');
                return;
            }

            const isSelected = CoopMaps.state.data.selectedItem === enterprise;
            const isHighlighted = CoopMaps.modules.relationships &&
                                CoopMaps.modules.relationships.highlightedEnterprise === enterprise;

            // Draw highlight for relationship mode
            if (isHighlighted && !this.isExporting) {
                this.ctx.save();
                this.ctx.strokeStyle = '#3498db';
                this.ctx.lineWidth = 4;
                this.ctx.setLineDash([5, 5]);
                this.ctx.globalAlpha = 0.5;

                let highlightHeight = enterprise.height + 30;
                if (enterprise.type === 'ncm') {
                    highlightHeight = enterprise.height * 1.2 + 30;
                }

                this.drawRoundedRect(
                    enterprise.x - 15,
                    enterprise.y - 15,
                    enterprise.width + 30,
                    highlightHeight,
                    12
                );
                this.ctx.stroke();
                this.ctx.restore();
            }

            // Enhanced draw options
            const drawOptions = {
                fill: enterprise.fill || 'white',
                stroke: enterprise.stroke || '#2c3e50',
                lineWidth: isSelected ? 3 : 2,
                noShadow: this.isExporting,
                noHighlight: this.isExporting
            };

            // Function to draw the base shape
            const drawBaseShape = (ctx, x, y, width, height, options) => {
                switch (enterprise.type) {
                    case 'cooperative':
                    case 'excluded':
                        shapes.drawRectangle(ctx, x, y, width, height, options);
                        break;
                    case 'ncm':
                    case 'community':
                        shapes.drawRoundedRectangle(ctx, x, y, width, height, 15, options);
                        break;
                    case 'social':
                    case 'charity':
                        shapes.drawPill(ctx, x, y, width, height, options);
                        break;
                    case 'private':
                    case 'partnership':
                        shapes.drawEllipse(ctx, x, y, width, height, options);
                        break;
                    case 'state':
                    case 'public':
                        shapes.drawDiamond(ctx, x, y, width, height, options);
                        break;
                }
            };

            // Draw stack effect if generic set
            if (enterprise.isGenericSet) {
                shapes.drawStackEffect(this.ctx, drawBaseShape, enterprise.x, enterprise.y, enterprise.width, enterprise.height, drawOptions);
            } else {
                drawBaseShape(this.ctx, enterprise.x, enterprise.y, enterprise.width, enterprise.height, drawOptions);
            }

            // Always draw indicators for cooperatives and NCMs (NOT for excluded businesses)
            if ((enterprise.type === 'cooperative' || enterprise.type === 'ncm') && enterprise.type !== 'excluded') {
                shapes.drawParticipationIndicators(
                    this.ctx,
                    enterprise.x,
                    enterprise.y,
                    enterprise.width,
                    enterprise.height,
                    enterprise.roles || []
                );

                shapes.drawTierIndicators(
                    this.ctx,
                    enterprise.x,
                    enterprise.y,
                    enterprise.width,
                    enterprise.height,
                    enterprise.tier || 'none',
                    enterprise.type
                );
            }

            // Enhanced label with better typography
            this.ctx.save();
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            let textX = enterprise.x + enterprise.width / 2;
            let textY = enterprise.y + enterprise.height / 2;

            // Wrap text if it's too long
            const maxWidth = enterprise.width - 12;
            const words = (enterprise.name || 'Enterprise').split(' ');
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const testLine = currentLine + ' ' + words[i];
                const metrics = this.ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);

            const lineHeight = 16;
            const totalHeight = lines.length * lineHeight;
            const startY = textY - totalHeight / 2 + lineHeight / 2;

            // Text shadow for better readability
            if (!this.isExporting) {
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                this.ctx.shadowBlur = 2;
            }

            lines.forEach((line, index) => {
                this.ctx.fillText(line, textX, startY + index * lineHeight);
            });

            this.ctx.restore();
        },

        smoothZoom(factor, mouseX, mouseY) {
            const targetZoom = CoopMaps.state.ui.zoom * factor;

            // Use dynamic minZoom (zoom-to-fit) instead of hardcoded 0.1
            if (targetZoom >= this.minZoom && targetZoom <= 5) {
                // Animate zoom
                const startZoom = CoopMaps.state.ui.zoom;
                const duration = 200;
                const startTime = Date.now();
                const self = this;
                const canvasSize = this.canvasSizes[this.currentCanvasSize];

                // Reset pan offset when zooming to keep canvas centered
                this.panOffset = { x: 0, y: 0 };

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);

                    CoopMaps.state.ui.zoom = startZoom + (targetZoom - startZoom) * easeProgress;

                    // Update CSS dimensions for proper centering
                    self.canvas.style.width = (canvasSize.width * CoopMaps.state.ui.zoom) + 'px';
                    self.canvas.style.height = (canvasSize.height * CoopMaps.state.ui.zoom) + 'px';

                    // Update zoom display
                    const zoomDisplay = document.getElementById('zoomLevel');
                    if (zoomDisplay) {
                        zoomDisplay.textContent = Math.round(CoopMaps.state.ui.zoom * 100) + '%';
                    }

                    self.render();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };

                animate();
            }
        },

        clearCanvas() {
            if (confirm('Clear all enterprises and relationships? This action cannot be undone.')) {
                // Save state for undo
                CoopMaps.saveState();

                // Animate clear
                const fadeOut = () => {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.9;
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.restore();

                    setTimeout(() => {
                        CoopMaps.state.data.enterprises = [];
                        CoopMaps.state.data.relationships = [];
                        this.render();
                    }, 100);
                };

                fadeOut();
            }
        },

        newDiagram() {
            if (confirm('Create new diagram? This will clear the current diagram.')) {
                CoopMaps.saveState();

                CoopMaps.state.data.enterprises = [];
                CoopMaps.state.data.relationships = [];
                CoopMaps.state.data.selectedItem = null;
                CoopMaps.state.data.diagramProperties = {
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

                // Reset persistence module
                if (CoopMaps.modules.persistence) {
                    CoopMaps.modules.persistence.currentDiagramId = null;
                    CoopMaps.modules.persistence.isDirty = true;
                    CoopMaps.modules.persistence.updateSaveIndicator();
                }

                this.render();
                CoopMaps.updateSidebar();
            }
        },

        zoomIn() {
            this.smoothZoom(1.2);
        },

        zoomOut() {
            this.smoothZoom(0.8);
        },

        zoomReset() {
            // Reset to fit zoom (minZoom) instead of 100%
            const startZoom = CoopMaps.state.ui.zoom;
            const targetZoom = this.minZoom;
            const duration = 300;
            const startTime = Date.now();
            const self = this;
            const canvasSize = this.canvasSizes[this.currentCanvasSize];

            // Reset pan offset
            this.panOffset = { x: 0, y: 0 };

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                CoopMaps.state.ui.zoom = startZoom + (targetZoom - startZoom) * easeProgress;

                // Update CSS dimensions for proper centering
                self.canvas.style.width = (canvasSize.width * CoopMaps.state.ui.zoom) + 'px';
                self.canvas.style.height = (canvasSize.height * CoopMaps.state.ui.zoom) + 'px';

                // Update zoom display
                const zoomDisplay = document.getElementById('zoomLevel');
                if (zoomDisplay) {
                    zoomDisplay.textContent = Math.round(CoopMaps.state.ui.zoom * 100) + '%';
                }

                self.render();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            animate();
        },

        autoLayout() {
            const enterprises = CoopMaps.state.data.enterprises;
            if (enterprises.length === 0) return;

            // Save state for undo
            CoopMaps.saveState();

            // Get current canvas size
            const canvasSize = this.canvasSizes[this.currentCanvasSize];
            const margin = 100;
            const titleSpace = 120;

            // Calculate available space
            const availableWidth = canvasSize.width - (margin * 2);
            const availableHeight = canvasSize.height - titleSpace - margin;
            const centerX = canvasSize.width / 2;
            const centerY = titleSpace + (availableHeight / 2);

            // Store original positions
            const originalState = enterprises.map(e => ({
                x: e.x,
                y: e.y,
                width: e.width,
                height: e.height
            }));

            // Initialize positions at current locations
            const nodes = enterprises.map((e, i) => ({
                id: e.id,
                x: e.x + e.width / 2,
                y: e.y + e.height / 2,
                width: e.width,
                height: e.height,
                vx: 0,
                vy: 0,
                index: i,
                connections: new Set() // Track connected nodes
            }));

            // Check if all nodes are at the same position
            const avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
            const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
            const allSamePosition = nodes.every(n => Math.abs(n.x - avgX) < 10 && Math.abs(n.y - avgY) < 10);

            // Build relationship information
            const links = [];
            const relationshipCounts = new Map();
            const linkPairs = new Set(); // Track unique node pairs that are connected

            CoopMaps.state.data.relationships.forEach(rel => {
                const sourceIndex = nodes.findIndex(n => n.id === rel.startId);
                const targetIndex = nodes.findIndex(n => n.id === rel.endId);
                if (sourceIndex !== -1 && targetIndex !== -1) {
                    links.push({
                        source: sourceIndex,
                        target: targetIndex,
                        id: rel.id
                    });

                    // Track connections
                    nodes[sourceIndex].connections.add(targetIndex);
                    nodes[targetIndex].connections.add(sourceIndex);

                    // Count relationships between this pair
                    const key = sourceIndex < targetIndex ? `${sourceIndex}-${targetIndex}` : `${targetIndex}-${sourceIndex}`;
                    relationshipCounts.set(key, (relationshipCounts.get(key) || 0) + 1);
                    linkPairs.add(key);
                }
            });

            // Initial layout if needed
            if (allSamePosition || enterprises.length === 1) {
                if (links.length > 0) {
                    // Use force-directed pre-layout for connected graphs
                    this.initialForceLayout(nodes, links, centerX, centerY, availableWidth, availableHeight);
                } else if (enterprises.length <= 8) {
                    // Circle arrangement for small unconnected groups
                    const radius = Math.min(availableWidth, availableHeight) * 0.3;
                    nodes.forEach((node, i) => {
                        const angle = (i / nodes.length) * 2 * Math.PI - Math.PI/2;
                        node.x = centerX + radius * Math.cos(angle);
                        node.y = centerY + radius * Math.sin(angle);
                    });
                } else {
                    // Grid arrangement for larger unconnected groups
                    const cols = Math.ceil(Math.sqrt(nodes.length));
                    const rows = Math.ceil(nodes.length / cols);
                    const cellWidth = availableWidth / cols;
                    const cellHeight = availableHeight / rows;

                    nodes.forEach((node, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        node.x = margin + cellWidth * (col + 0.5);
                        node.y = titleSpace + cellHeight * (row + 0.5);
                    });
                }
            }

            // Calculate forces with crossing minimization
            const maxRelationshipCount = Math.max(...Array.from(relationshipCounts.values()), 1);
            const BADGE_SPACING = 60;
            const maxBadgeOffset = (maxRelationshipCount - 1) * BADGE_SPACING / 2;

            // Adjusted parameters
            const IDEAL_LINK_DISTANCE = 200 + maxBadgeOffset;
            const REPULSION_STRENGTH = 60;
            const ATTRACTION_STRENGTH = 0.15;
            const CENTER_STRENGTH = 0.02;
            const CROSSING_PENALTY = 30; // New parameter for crossing avoidance
            const ITERATIONS = 150; // More iterations for better convergence
            const DAMPING = 0.85;
            const MIN_DISTANCE = 120 + maxBadgeOffset;

            // Helper function to check if two line segments intersect
            const linesIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
                const det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
                if (Math.abs(det) < 0.001) return false; // Parallel lines

                const t = ((x3 - x1) * (y4 - y3) - (x4 - x3) * (y3 - y1)) / det;
                const u = -((x1 - x2) * (y3 - y1) - (y1 - y2) * (x3 - x1)) / det;

                return t > 0.1 && t < 0.9 && u > 0.1 && u < 0.9; // Avoid endpoint intersections
            };

            // Run force simulation
            for (let iter = 0; iter < ITERATIONS; iter++) {
                // Reset forces
                nodes.forEach(node => {
                    node.fx = 0;
                    node.fy = 0;
                });

                // Apply repulsion between all nodes
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const node1 = nodes[i];
                        const node2 = nodes[j];

                        let dx = node2.x - node1.x;
                        let dy = node2.y - node1.y;
                        let distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 1) {
                            dx = (Math.random() - 0.5) * 10;
                            dy = (Math.random() - 0.5) * 10;
                            distance = Math.sqrt(dx * dx + dy * dy);
                        }

                        // Account for badge space
                        const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
                        const relCount = relationshipCounts.get(pairKey) || 0;
                        const extraSpace = relCount > 1 ? (relCount - 1) * BADGE_SPACING : 0;
                        const minDist = Math.max(
                            MIN_DISTANCE + extraSpace,
                            (node1.width + node2.width) / 2 + 60 + extraSpace,
                            (node1.height + node2.height) / 2 + 60 + extraSpace
                        );

                        // Repulsion force
                        if (distance < minDist * 2) {
                            const force = REPULSION_STRENGTH * Math.pow(1 - distance / (minDist * 2), 2);
                            const fx = (dx / distance) * force;
                            const fy = (dy / distance) * force;

                            node1.fx -= fx;
                            node1.fy -= fy;
                            node2.fx += fx;
                            node2.fy += fy;
                        }
                    }
                }

                // Apply attraction along links
                links.forEach(link => {
                    const source = nodes[link.source];
                    const target = nodes[link.target];

                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

                    // Adjust ideal distance based on number of relationships
                    const pairKey = link.source < link.target ? `${link.source}-${link.target}` : `${link.target}-${link.source}`;
                    const relCount = relationshipCounts.get(pairKey) || 1;
                    const idealDist = IDEAL_LINK_DISTANCE + (relCount > 1 ? (relCount - 1) * BADGE_SPACING * 0.5 : 0);

                    const force = ATTRACTION_STRENGTH * (distance - idealDist) / distance;
                    const fx = dx * force;
                    const fy = dy * force;

                    source.fx += fx;
                    source.fy += fy;
                    target.fx -= fx;
                    target.fy -= fy;
                });

                // Apply crossing minimization forces
                for (let i = 0; i < links.length; i++) {
                    for (let j = i + 1; j < links.length; j++) {
                        const link1 = links[i];
                        const link2 = links[j];

                        // Skip if links share a node
                        if (link1.source === link2.source || link1.source === link2.target ||
                            link1.target === link2.source || link1.target === link2.target) {
                            continue;
                        }

                        const n1 = nodes[link1.source];
                        const n2 = nodes[link1.target];
                        const n3 = nodes[link2.source];
                        const n4 = nodes[link2.target];

                        // Check if lines intersect
                        if (linesIntersect(n1.x, n1.y, n2.x, n2.y, n3.x, n3.y, n4.x, n4.y)) {
                            // Apply force to uncross the lines
                            // Move nodes perpendicular to their connections
                            const dx1 = n2.x - n1.x;
                            const dy1 = n2.y - n1.y;
                            const dx2 = n4.x - n3.x;
                            const dy2 = n4.y - n3.y;

                            // Perpendicular directions
                            const perp1x = -dy1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
                            const perp1y = dx1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
                            const perp2x = -dy2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
                            const perp2y = dx2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);

                            // Determine which direction to push
                            const cross = (n2.x - n1.x) * (n3.y - n1.y) - (n2.y - n1.y) * (n3.x - n1.x);
                            const sign = cross > 0 ? 1 : -1;

                            // Apply crossing penalty force
                            const force = CROSSING_PENALTY * (1 - iter / ITERATIONS); // Decrease over time

                            n1.fx += sign * perp1x * force * 0.25;
                            n1.fy += sign * perp1y * force * 0.25;
                            n2.fx += sign * perp1x * force * 0.25;
                            n2.fy += sign * perp1y * force * 0.25;
                            n3.fx -= sign * perp2x * force * 0.25;
                            n3.fy -= sign * perp2y * force * 0.25;
                            n4.fx -= sign * perp2x * force * 0.25;
                            n4.fy -= sign * perp2y * force * 0.25;
                        }
                    }
                }

                // Apply gentle centering force
                nodes.forEach(node => {
                    const dx = centerX - node.x;
                    const dy = centerY - node.y;
                    node.fx += dx * CENTER_STRENGTH;
                    node.fy += dy * CENTER_STRENGTH;
                });

                // Update velocities and positions
                nodes.forEach(node => {
                    // Update velocity with damping
                    node.vx = (node.vx + node.fx) * DAMPING;
                    node.vy = (node.vy + node.fy) * DAMPING;

                    // Limit maximum velocity
                    const maxVelocity = 5;
                    const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                    if (velocity > maxVelocity) {
                        node.vx = (node.vx / velocity) * maxVelocity;
                        node.vy = (node.vy / velocity) * maxVelocity;
                    }

                    // Update position
                    node.x += node.vx;
                    node.y += node.vy;

                    // Keep within bounds
                    const halfWidth = node.width / 2;
                    const halfHeight = node.height / 2;
                    node.x = Math.max(margin + halfWidth, Math.min(canvasSize.width - margin - halfWidth, node.x));
                    node.y = Math.max(titleSpace + halfHeight, Math.min(canvasSize.height - margin - halfHeight, node.y));
                });

                // Early termination if velocities are small
                const totalVelocity = nodes.reduce((sum, node) =>
                    sum + Math.abs(node.vx) + Math.abs(node.vy), 0);
                if (totalVelocity < 0.1 && iter > 30) break;
            }

            // Apply final positions
            const finalPositions = nodes.map(node => ({
                x: node.x - node.width / 2,
                y: node.y - node.height / 2
            }));

            // Calculate bounding box of the final layout (including badges and curve offsets)
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            // First, include all enterprises
            finalPositions.forEach((pos, i) => {
                const enterprise = enterprises[i];
                minX = Math.min(minX, pos.x - 20); // Extra padding for indicators
                minY = Math.min(minY, pos.y - 20);
                maxX = Math.max(maxX, pos.x + enterprise.width + 20);
                maxY = Math.max(maxY, pos.y + enterprise.height + 20);
            });

            // Account for relationship badges and curves
            CoopMaps.state.data.relationships.forEach((rel, idx) => {
                const startNode = nodes.find(n => n.id === rel.startId);
                const endNode = nodes.find(n => n.id === rel.endId);
                if (!startNode || !endNode) return;

                // Get the relationship count for this pair
                const id1 = rel.startId < rel.endId ? rel.startId : rel.endId;
                const id2 = rel.startId < rel.endId ? rel.endId : rel.startId;
                const normalizedPair = `${id1}-${id2}`;
                const allRelsBetween = CoopMaps.state.data.relationships.filter(r => {
                    const rid1 = r.startId < r.endId ? r.startId : r.endId;
                    const rid2 = r.startId < r.endId ? r.endId : r.startId;
                    return `${rid1}-${rid2}` === normalizedPair;
                });

                if (allRelsBetween.length > 1) {
                    // Calculate curve offset for this relationship
                    const relIndex = allRelsBetween.findIndex(r => r.id === rel.id);
                    const totalRels = allRelsBetween.length;
                    const spacingPerRel = BADGE_SPACING;
                    const totalWidth = (totalRels - 1) * spacingPerRel;
                    const offsetFromCenter = (relIndex * spacingPerRel) - (totalWidth / 2);

                    // Estimate curve bounds
                    const midX = (startNode.x + endNode.x) / 2;
                    const midY = (startNode.y + endNode.y) / 2;
                    const dx = endNode.x - startNode.x;
                    const dy = endNode.y - startNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const perpX = -dy / distance;
                    const perpY = dx / distance;

                    const baseScale = Math.max(1, 300 / distance);
                    const lengthScale = distance > 300 ? Math.sqrt(distance / 300) : 1;
                    const curveOffset = offsetFromCenter * baseScale * lengthScale;

                    const controlX = midX + (perpX * curveOffset);
                    const controlY = midY + (perpY * curveOffset);

                    // Expand bounds to include control point + badge radius
                    minX = Math.min(minX, controlX - 30);
                    minY = Math.min(minY, controlY - 30);
                    maxX = Math.max(maxX, controlX + 30);
                    maxY = Math.max(maxY, controlY + 30);
                }
            });

            // Calculate the optimal zoom level
            const layoutWidth = maxX - minX;
            const layoutHeight = maxY - minY;

            // Target to fit within canvas with some padding
            const targetPadding = 60;
            const targetWidth = canvasSize.width - targetPadding * 2;
            const targetHeight = canvasSize.height - targetPadding * 2;

            // Calculate zoom needed to fit
            const zoomX = targetWidth / layoutWidth;
            const zoomY = targetHeight / layoutHeight;
            let targetZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in past 100%

            // Clamp zoom to reasonable bounds
            targetZoom = Math.max(0.1, Math.min(targetZoom, 1));

            // Store original zoom
            const originalZoom = CoopMaps.state.ui.zoom;

            // Calculate movement distance
            let maxMovement = 0;
            enterprises.forEach((e, i) => {
                const dx = finalPositions[i].x - e.x;
                const dy = finalPositions[i].y - e.y;
                const movement = Math.sqrt(dx * dx + dy * dy);
                maxMovement = Math.max(maxMovement, movement);
            });

            // Animate both position and zoom changes (skip animation in Express mode)
            const needsZoomChange = Math.abs(targetZoom - originalZoom) > 0.01;

            if ((maxMovement > 10 || needsZoomChange) && !CoopMaps.isExpressMode) {
                const duration = 800; // Slightly longer for zoom animation
                const startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);

                    // Animate positions
                    enterprises.forEach((enterprise, index) => {
                        enterprise.x = originalState[index].x +
                            (finalPositions[index].x - originalState[index].x) * easeProgress;
                        enterprise.y = originalState[index].y +
                            (finalPositions[index].y - originalState[index].y) * easeProgress;
                    });

                    // Animate zoom
                    if (needsZoomChange) {
                        CoopMaps.state.ui.zoom = originalZoom + (targetZoom - originalZoom) * easeProgress;

                        // Update zoom display if it exists
                        const zoomBtn = document.getElementById('zoomResetBtn');
                        if (zoomBtn) {
                            const zoomPercent = Math.round(CoopMaps.state.ui.zoom * 100);
                            zoomBtn.textContent = `${zoomPercent}%`;
                        }
                    }

                    this.render();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        CoopMaps.showNotification('Layout optimized and zoomed to fit', 'success');
                    }
                };

                animate();
            } else {
                // Instant update (no animation) - for Express mode or small movements
                enterprises.forEach((enterprise, index) => {
                    enterprise.x = finalPositions[index].x;
                    enterprise.y = finalPositions[index].y;
                });
                if (needsZoomChange) {
                    CoopMaps.state.ui.zoom = targetZoom;
                    // Update zoom display if it exists
                    const zoomBtn = document.getElementById('zoomResetBtn');
                    if (zoomBtn) {
                        const zoomPercent = Math.round(CoopMaps.state.ui.zoom * 100);
                        zoomBtn.textContent = `${zoomPercent}%`;
                    }
                }
                this.render();
                CoopMaps.showNotification(CoopMaps.isExpressMode ? 'Layout applied' : 'Layout is already optimized', 'success');
            }
        },

        // Helper method for initial force layout
        initialForceLayout(nodes, links, centerX, centerY, width, height) {
            // Quick force-directed pre-layout to get a good starting position
            const iterations = 50;
            const k = Math.sqrt((width * height) / nodes.length) * 0.5;

            for (let iter = 0; iter < iterations; iter++) {
                // Repulsive forces
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const dx = nodes[j].x - nodes[i].x;
                        const dy = nodes[j].y - nodes[i].y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = k * k / dist;

                        nodes[i].x -= (dx / dist) * force;
                        nodes[i].y -= (dy / dist) * force;
                        nodes[j].x += (dx / dist) * force;
                        nodes[j].y += (dy / dist) * force;
                    }
                }

                // Attractive forces along edges
                links.forEach(link => {
                    const dx = nodes[link.target].x - nodes[link.source].x;
                    const dy = nodes[link.target].y - nodes[link.source].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = dist * dist / k * 0.1;

                    nodes[link.source].x += (dx / dist) * force;
                    nodes[link.source].y += (dy / dist) * force;
                    nodes[link.target].x -= (dx / dist) * force;
                    nodes[link.target].y -= (dy / dist) * force;
                });

                // Center the layout
                const avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
                const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
                const offsetX = centerX - avgX;
                const offsetY = centerY - avgY;

                nodes.forEach(node => {
                    node.x += offsetX * 0.1;
                    node.y += offsetY * 0.1;
                });
            }
        },

        deleteSelected() {
            const selected = CoopMaps.state.data.selectedItem;
            if (selected) {
                CoopMaps.saveState();

                // Fade out animation
                const fadeAndDelete = () => {
                    const index = CoopMaps.state.data.enterprises.indexOf(selected);
                    if (index > -1) {
                        CoopMaps.state.data.enterprises.splice(index, 1);
                        CoopMaps.state.data.selectedItem = null;

                        // Remove connected relationships
                        CoopMaps.state.data.relationships = CoopMaps.state.data.relationships.filter(
                            rel => rel.startId !== selected.id && rel.endId !== selected.id
                        );

                        this.render();
                        CoopMaps.updateSidebar();
                    }
                };

                fadeAndDelete();
                document.getElementById('contextMenu').style.display = 'none';
            }
        },

        bringToFront() {
            const selected = CoopMaps.state.data.selectedItem;
            if (selected) {
                CoopMaps.saveState();

                const index = CoopMaps.state.data.enterprises.indexOf(selected);
                if (index > -1) {
                    CoopMaps.state.data.enterprises.splice(index, 1);
                    CoopMaps.state.data.enterprises.push(selected);
                    this.render();
                }

                document.getElementById('contextMenu').style.display = 'none';
            }
        },

        sendToBack() {
            const selected = CoopMaps.state.data.selectedItem;
            if (selected) {
                CoopMaps.saveState();

                const index = CoopMaps.state.data.enterprises.indexOf(selected);
                if (index > -1) {
                    CoopMaps.state.data.enterprises.splice(index, 1);
                    CoopMaps.state.data.enterprises.unshift(selected);
                    this.render();
                }

                document.getElementById('contextMenu').style.display = 'none';
            }
        },

        undo() {
            CoopMaps.undo();
        },

        redo() {
            CoopMaps.redo();
        },

        // Print canvas with optimized styling
        printCanvas() {
            // Create a temporary canvas for printing at full resolution
            const tempCanvas = document.createElement('canvas');
            const canvasSize = this.canvasSizes[this.currentCanvasSize];
            tempCanvas.width = canvasSize.width;
            tempCanvas.height = canvasSize.height;

            const tempCtx = tempCanvas.getContext('2d');

            // Store current state
            const originalCtx = this.ctx;
            const originalCanvas = this.canvas;

            // Temporarily swap context
            this.ctx = tempCtx;
            this.canvas = tempCanvas;

            // Render without grid
            this.render(true);

            // Restore original
            this.ctx = originalCtx;
            this.canvas = originalCanvas;

            // Create print window
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Diagram - ${CoopMaps.state.data.diagramProperties?.title || 'Co-opMaps'}</title>
                    <style>
                        @page { size: ${this.currentCanvasSize}; margin: 0.5cm; }
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <img src="${tempCanvas.toDataURL('image/png')}" />
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        },

        // Search for enterprises by name
        searchEnterprises(query) {
            if (!query || query.trim() === '') {
                // Clear selection and highlights
                this.searchResults = [];
                this.render();
                return [];
            }

            const searchTerm = query.toLowerCase().trim();
            const enterprises = CoopMaps.state.data.enterprises;

            this.searchResults = enterprises.filter(e =>
                e.name.toLowerCase().includes(searchTerm) ||
                e.type.toLowerCase().includes(searchTerm)
            );

            // Highlight first result
            if (this.searchResults.length > 0) {
                CoopMaps.state.data.selectedItem = this.searchResults[0];
                this.centerOnEnterprise(this.searchResults[0]);
            }

            this.render();
            return this.searchResults;
        },

        // Center view on a specific enterprise
        centerOnEnterprise(enterprise) {
            if (!enterprise) return;

            const canvasSize = this.canvasSizes[this.currentCanvasSize];
            const targetX = enterprise.x + enterprise.width / 2;
            const targetY = enterprise.y + enterprise.height / 2;

            // Calculate pan offset to center the enterprise
            const containerRect = document.querySelector('.canvas-area')?.getBoundingClientRect();
            if (containerRect) {
                const zoom = CoopMaps.state.ui.zoom;
                this.panOffset.x = (containerRect.width / 2) - (targetX * zoom);
                this.panOffset.y = (containerRect.height / 2) - (targetY * zoom);
            }

            this.render();
        },

        // Clipboard for copy/paste
        clipboard: null,

        // Snap-to-grid settings
        snapToGrid: false,
        gridSnapSize: 20,

        // Notes/annotations
        annotations: [],

        // Multi-select support
        selectedItems: [],
        isMultiSelecting: false,
        selectionRect: null,

        startMultiSelect(x, y) {
            this.isMultiSelecting = true;
            this.selectionRect = { x, y, width: 0, height: 0 };
        },

        updateMultiSelect(x, y) {
            if (!this.isMultiSelecting || !this.selectionRect) return;

            this.selectionRect.width = x - this.selectionRect.x;
            this.selectionRect.height = y - this.selectionRect.y;
            this.render();
        },

        endMultiSelect() {
            if (!this.isMultiSelecting || !this.selectionRect) return;

            // Normalize rectangle (handle negative dimensions)
            const rect = {
                x: this.selectionRect.width < 0 ? this.selectionRect.x + this.selectionRect.width : this.selectionRect.x,
                y: this.selectionRect.height < 0 ? this.selectionRect.y + this.selectionRect.height : this.selectionRect.y,
                width: Math.abs(this.selectionRect.width),
                height: Math.abs(this.selectionRect.height)
            };

            // Find all enterprises within selection rectangle
            this.selectedItems = CoopMaps.state.data.enterprises.filter(e => {
                const ex = e.x + e.width / 2;
                const ey = e.y + e.height / 2;
                return ex >= rect.x && ex <= rect.x + rect.width &&
                       ey >= rect.y && ey <= rect.y + rect.height;
            });

            this.isMultiSelecting = false;
            this.selectionRect = null;
            this.render();

            if (this.selectedItems.length > 0) {
                CoopMaps.showNotification(`Selected ${this.selectedItems.length} items`, 'info');
            }
        },

        // Delete all selected items
        deleteSelectedItems() {
            if (this.selectedItems.length === 0) {
                // Fall back to single selection
                if (CoopMaps.state.data.selectedItem) {
                    this.deleteSelected();
                }
                return;
            }

            CoopMaps.saveState();

            const selectedIds = new Set(this.selectedItems.map(e => e.id));

            // Remove enterprises
            CoopMaps.state.data.enterprises = CoopMaps.state.data.enterprises.filter(
                e => !selectedIds.has(e.id)
            );

            // Remove relationships connected to deleted enterprises
            CoopMaps.state.data.relationships = CoopMaps.state.data.relationships.filter(
                r => !selectedIds.has(r.startId) && !selectedIds.has(r.endId)
            );

            const count = this.selectedItems.length;
            this.selectedItems = [];
            CoopMaps.state.data.selectedItem = null;
            this.render();

            CoopMaps.showNotification(`Deleted ${count} items`, 'success');
        },

        // Move all selected items
        moveSelectedItems(dx, dy) {
            if (this.selectedItems.length === 0) return;

            this.selectedItems.forEach(item => {
                item.x += dx;
                item.y += dy;
            });

            this.render();
        },

        // Draw selection rectangle
        drawSelectionRect() {
            if (!this.isMultiSelecting || !this.selectionRect) return;

            this.ctx.save();
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';

            this.ctx.beginPath();
            this.ctx.rect(
                this.selectionRect.x,
                this.selectionRect.y,
                this.selectionRect.width,
                this.selectionRect.height
            );
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.restore();
        },

        // Draw highlights for multi-selected items
        drawMultiSelectHighlights() {
            if (this.selectedItems.length <= 1) return;

            this.ctx.save();
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([8, 4]);

            this.selectedItems.forEach(item => {
                this.ctx.beginPath();
                this.ctx.rect(item.x - 5, item.y - 5, item.width + 10, item.height + 10);
                this.ctx.stroke();
            });

            this.ctx.restore();
        },

        // ===== COPY/PASTE FUNCTIONALITY =====

        copySelected() {
            const items = this.selectedItems.length > 0
                ? this.selectedItems
                : (CoopMaps.state.data.selectedItem ? [CoopMaps.state.data.selectedItem] : []);

            if (items.length === 0) {
                CoopMaps.showNotification('No items selected to copy', 'info');
                return;
            }

            // Deep copy the items
            this.clipboard = items.map(item => JSON.parse(JSON.stringify(item)));
            CoopMaps.showNotification(`Copied ${items.length} item(s)`, 'success');
        },

        pasteFromClipboard() {
            if (!this.clipboard || this.clipboard.length === 0) {
                CoopMaps.showNotification('Nothing to paste', 'info');
                return;
            }

            CoopMaps.saveState();

            // Calculate offset for pasted items
            const offset = 30;
            const newItems = [];

            this.clipboard.forEach(item => {
                const newItem = {
                    ...JSON.parse(JSON.stringify(item)),
                    id: CoopMaps.generateId(),
                    x: item.x + offset,
                    y: item.y + offset
                };
                CoopMaps.state.data.enterprises.push(newItem);
                newItems.push(newItem);
            });

            // Select the newly pasted items
            this.selectedItems = newItems;
            if (newItems.length === 1) {
                CoopMaps.state.data.selectedItem = newItems[0];
            }

            this.render();
            CoopMaps.showNotification(`Pasted ${newItems.length} item(s)`, 'success');
        },

        duplicateSelected() {
            const selected = CoopMaps.state.data.selectedItem;
            if (selected) {
                CoopMaps.saveState();

                const duplicate = {
                    ...JSON.parse(JSON.stringify(selected)),
                    id: CoopMaps.generateId(),
                    x: selected.x + 30,
                    y: selected.y + 30
                };

                CoopMaps.state.data.enterprises.push(duplicate);
                CoopMaps.state.data.selectedItem = duplicate;
                this.render();

                document.getElementById('contextMenu').style.display = 'none';
                CoopMaps.showNotification('Duplicated item', 'success');
            }
        },

        // ===== ALIGNMENT TOOLS =====

        alignLeft() {
            const items = this.selectedItems.length > 1 ? this.selectedItems : [];
            if (items.length < 2) {
                CoopMaps.showNotification('Select multiple items to align', 'info');
                return;
            }

            CoopMaps.saveState();
            const minX = Math.min(...items.map(item => item.x));
            items.forEach(item => { item.x = minX; });
            this.render();
            CoopMaps.showNotification('Aligned left', 'success');
        },

        alignCenter() {
            const items = this.selectedItems.length > 1 ? this.selectedItems : [];
            if (items.length < 2) {
                CoopMaps.showNotification('Select multiple items to align', 'info');
                return;
            }

            CoopMaps.saveState();
            const centers = items.map(item => item.x + item.width / 2);
            const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
            items.forEach(item => { item.x = avgCenter - item.width / 2; });
            this.render();
            CoopMaps.showNotification('Aligned center', 'success');
        },

        alignRight() {
            const items = this.selectedItems.length > 1 ? this.selectedItems : [];
            if (items.length < 2) {
                CoopMaps.showNotification('Select multiple items to align', 'info');
                return;
            }

            CoopMaps.saveState();
            const maxRight = Math.max(...items.map(item => item.x + item.width));
            items.forEach(item => { item.x = maxRight - item.width; });
            this.render();
            CoopMaps.showNotification('Aligned right', 'success');
        },

        alignTop() {
            const items = this.selectedItems.length > 1 ? this.selectedItems : [];
            if (items.length < 2) {
                CoopMaps.showNotification('Select multiple items to align', 'info');
                return;
            }

            CoopMaps.saveState();
            const minY = Math.min(...items.map(item => item.y));
            items.forEach(item => { item.y = minY; });
            this.render();
            CoopMaps.showNotification('Aligned top', 'success');
        },

        alignMiddle() {
            const items = this.selectedItems.length > 1 ? this.selectedItems : [];
            if (items.length < 2) {
                CoopMaps.showNotification('Select multiple items to align', 'info');
                return;
            }

            CoopMaps.saveState();
            const middles = items.map(item => item.y + item.height / 2);
            const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length;
            items.forEach(item => { item.y = avgMiddle - item.height / 2; });
            this.render();
            CoopMaps.showNotification('Aligned middle', 'success');
        },

        alignBottom() {
            const items = this.selectedItems.length > 1 ? this.selectedItems : [];
            if (items.length < 2) {
                CoopMaps.showNotification('Select multiple items to align', 'info');
                return;
            }

            CoopMaps.saveState();
            const maxBottom = Math.max(...items.map(item => item.y + item.height));
            items.forEach(item => { item.y = maxBottom - item.height; });
            this.render();
            CoopMaps.showNotification('Aligned bottom', 'success');
        },

        distributeHorizontally() {
            const items = this.selectedItems.length > 2 ? this.selectedItems : [];
            if (items.length < 3) {
                CoopMaps.showNotification('Select 3+ items to distribute', 'info');
                return;
            }

            CoopMaps.saveState();

            // Sort by x position
            const sorted = [...items].sort((a, b) => a.x - b.x);
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const totalWidth = (last.x + last.width) - first.x;
            const itemsWidth = sorted.reduce((sum, item) => sum + item.width, 0);
            const spacing = (totalWidth - itemsWidth) / (sorted.length - 1);

            let currentX = first.x;
            sorted.forEach((item, i) => {
                if (i > 0) {
                    item.x = currentX;
                }
                currentX = item.x + item.width + spacing;
            });

            this.render();
            CoopMaps.showNotification('Distributed horizontally', 'success');
        },

        distributeVertically() {
            const items = this.selectedItems.length > 2 ? this.selectedItems : [];
            if (items.length < 3) {
                CoopMaps.showNotification('Select 3+ items to distribute', 'info');
                return;
            }

            CoopMaps.saveState();

            // Sort by y position
            const sorted = [...items].sort((a, b) => a.y - b.y);
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const totalHeight = (last.y + last.height) - first.y;
            const itemsHeight = sorted.reduce((sum, item) => sum + item.height, 0);
            const spacing = (totalHeight - itemsHeight) / (sorted.length - 1);

            let currentY = first.y;
            sorted.forEach((item, i) => {
                if (i > 0) {
                    item.y = currentY;
                }
                currentY = item.y + item.height + spacing;
            });

            this.render();
            CoopMaps.showNotification('Distributed vertically', 'success');
        },

        // ===== SNAP TO GRID =====

        toggleSnapToGrid() {
            this.snapToGrid = !this.snapToGrid;
            CoopMaps.showNotification(`Snap to grid ${this.snapToGrid ? 'enabled' : 'disabled'}`, 'info');
            return this.snapToGrid;
        },

        snapPosition(value) {
            if (!this.snapToGrid) return value;
            return Math.round(value / this.gridSnapSize) * this.gridSnapSize;
        },

        // ===== NOTES/ANNOTATIONS =====

        addAnnotation(x, y, text = '') {
            const annotation = {
                id: CoopMaps.generateId(),
                x: x,
                y: y,
                text: text || 'New Note',
                width: 150,
                height: 80,
                color: '#fff9c4',
                fontSize: 12
            };

            if (!CoopMaps.state.data.annotations) {
                CoopMaps.state.data.annotations = [];
            }
            CoopMaps.state.data.annotations.push(annotation);
            this.render();
            CoopMaps.showNotification('Note added', 'success');
            return annotation;
        },

        drawAnnotations() {
            const annotations = CoopMaps.state.data.annotations || [];
            if (annotations.length === 0) return;

            this.ctx.save();

            annotations.forEach(note => {
                // Draw note background
                this.ctx.fillStyle = note.color || '#fff9c4';
                this.ctx.strokeStyle = '#e6d85e';
                this.ctx.lineWidth = 1;

                // Rounded rectangle
                this.drawRoundedRect(note.x, note.y, note.width, note.height, 4);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw fold effect
                this.ctx.fillStyle = '#e6d85e';
                this.ctx.beginPath();
                this.ctx.moveTo(note.x + note.width - 15, note.y);
                this.ctx.lineTo(note.x + note.width, note.y + 15);
                this.ctx.lineTo(note.x + note.width - 15, note.y + 15);
                this.ctx.closePath();
                this.ctx.fill();

                // Draw text
                this.ctx.fillStyle = '#333';
                this.ctx.font = `${note.fontSize || 12}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'top';

                // Word wrap
                const words = note.text.split(' ');
                const lines = [];
                let currentLine = '';
                const maxWidth = note.width - 16;

                words.forEach(word => {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const metrics = this.ctx.measureText(testLine);
                    if (metrics.width > maxWidth && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                });
                lines.push(currentLine);

                const lineHeight = (note.fontSize || 12) + 4;
                lines.slice(0, Math.floor((note.height - 16) / lineHeight)).forEach((line, i) => {
                    this.ctx.fillText(line, note.x + 8, note.y + 8 + i * lineHeight);
                });
            });

            this.ctx.restore();
        },

        showAddNoteDialog() {
            const canvasSize = this.canvasSizes[this.currentCanvasSize];
            const x = canvasSize.width / 2 - 75;
            const y = canvasSize.height / 2 - 40;

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'addNoteModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <h2>Add Note</h2>
                    <div class="form-group">
                        <label>Note Text</label>
                        <textarea id="noteText" rows="4" placeholder="Enter your note..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Color</label>
                        <select id="noteColor">
                            <option value="#fff9c4">Yellow</option>
                            <option value="#c8e6c9">Green</option>
                            <option value="#bbdefb">Blue</option>
                            <option value="#ffccbc">Orange</option>
                            <option value="#f8bbd0">Pink</option>
                        </select>
                    </div>
                    <div class="modal-buttons">
                        <button type="button" class="btn-primary" onclick="
                            const text = document.getElementById('noteText').value;
                            const color = document.getElementById('noteColor').value;
                            const annotation = CoopMaps.modules.canvas.addAnnotation(${x}, ${y}, text);
                            annotation.color = color;
                            CoopMaps.modules.canvas.render();
                            document.getElementById('addNoteModal').remove();
                        ">Add Note</button>
                        <button type="button" class="btn-secondary" onclick="document.getElementById('addNoteModal').remove()">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('noteText').focus();
        },

        // ===== DARK MODE =====

        darkMode: false,

        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            document.body.classList.toggle('dark-mode', this.darkMode);

            // Store preference
            localStorage.setItem('coopMaps-darkMode', this.darkMode);

            this.render();
            CoopMaps.showNotification(`Dark mode ${this.darkMode ? 'enabled' : 'disabled'}`, 'info');
            return this.darkMode;
        },

        initDarkMode() {
            // Check stored preference
            const stored = localStorage.getItem('coopMaps-darkMode');
            if (stored === 'true') {
                this.darkMode = true;
                document.body.classList.add('dark-mode');
            }
        }
    });

    console.log('canvas.module.js loaded successfully');
})();
