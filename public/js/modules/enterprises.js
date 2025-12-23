// Module 3: Enterprises Module
(function() {
    'use strict';

    CoopMaps.registerModule('enterprises', {
        enterpriseTypes: [
            {
                id: 'cooperative',
                name: 'Co-operative',
                category: 'mutual',
                fill: 'white',
                description: 'Member-owned and democratically controlled'
            },
            {
                id: 'ncm',
                name: 'Non-co-operative Mutual',
                category: 'mutual',
                fill: 'white',
                description: 'Mutual benefit organization without democratic control'
            },
            {
                id: 'social',
                name: 'Social Enterprise',
                category: 'non-mutual',
                fill: '#FFFF00',
                description: 'Business with social objectives'
            },
            {
                id: 'private',
                name: 'Private Enterprise',
                category: 'non-mutual',
                fill: '#f0f0f0',
                description: 'Privately owned for-profit business'
            },
            {
                id: 'public',
                name: 'Public Enterprise',
                category: 'non-mutual',
                fill: '#f0f0f0',
                description: 'Publicly traded or publicly owned enterprise'
            },
            {
                id: 'state',
                name: 'State Enterprise',
                category: 'non-mutual',
                fill: '#f0f0f0',
                description: 'Government-owned enterprise'
            },
            {
                id: 'partnership',
                name: 'Partnership',
                category: 'non-mutual',
                fill: '#f0f0f0',
                description: 'Business owned by two or more partners'
            },
            {
                id: 'charity',
                name: 'Charity',
                category: 'other',
                fill: '#e8f5e9',
                description: 'Non-profit charitable organization'
            },
            {
                id: 'community',
                name: 'Community Org',
                category: 'other',
                fill: '#e3f2fd',
                description: 'Community-based organization'
            },
            {
                id: 'excluded',
                name: 'Business Excluded from Analysis',
                category: 'other',
                fill: 'white',
                description: 'Not part of the co-operative analysis'
            }
        ],

        sizes: [
            { id: 1, width: 100, height: 60, label: 'Small' },
            { id: 2, width: 140, height: 84, label: 'Medium' },
            { id: 3, width: 180, height: 108, label: 'Large' }
        ],

        init() {
            console.log('Enterprises module initialized');
            this.initializeTooltips();
        },

        initializeTooltips() {
            if (!document.getElementById('enterpriseTooltip')) {
                const tooltip = document.createElement('div');
                tooltip.id = 'enterpriseTooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(44, 62, 80, 0.95);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 1000;
                    max-width: 250px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                `;
                document.body.appendChild(tooltip);
            }
        },

        renderSymbolGallery() {
            let html = `
                <div style="margin-bottom: 25px;">
                    <h3 style="
                        font-size: 18px;
                        color: #2c3e50;
                        margin-bottom: 10px;
                        font-weight: 600;
                    ">Enterprise Types</h3>
                    <p style="
                        font-size: 13px;
                        color: #7f8c8d;
                        line-height: 1.5;
                    ">Drag symbols onto the canvas or click to add at center.
                    Each type represents different organizational structures.</p>
                </div>

                <div class="symbol-gallery" style="
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                ">
            `;

            // Group by category
            const categories = {
                'mutual': { name: 'Mutual Enterprises' },
                'non-mutual': { name: 'Non-Mutual Enterprises' },
                'other': { name: 'Other' }
            };

            Object.entries(categories).forEach(([catId, catInfo]) => {
                const typesInCategory = this.enterpriseTypes.filter(t => t.category === catId);
                if (typesInCategory.length === 0) return;

                html += `
                    <div style="margin-top: 15px;">
                        <h4 style="
                            font-size: 14px;
                            color: #34495e;
                            margin-bottom: 10px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            ${catInfo.name}
                        </h4>
                        <div style="display: grid; gap: 10px;">
                `;

                typesInCategory.forEach(type => {
                    html += `
                        <div class="symbol-item"
                             draggable="true"
                             data-type="${type.id}"
                             data-name="${type.name}"
                             data-description="${type.description}"
                             style="
                                padding: 15px;
                                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                                border: 2px solid #e9ecef;
                                border-radius: 12px;
                                cursor: move;
                                transition: all 0.3s ease;
                                user-select: none;
                                position: relative;
                                overflow: hidden;
                             "
                             onmouseover="
                                this.style.borderColor='#3498db';
                                this.style.transform='translateY(-2px)';
                                this.style.boxShadow='0 6px 20px rgba(52, 152, 219, 0.15)';
                                CoopMaps.modules.enterprises.showTooltip(event, this);
                             "
                             onmouseout="
                                this.style.borderColor='#e9ecef';
                                this.style.transform='translateY(0)';
                                this.style.boxShadow='none';
                                CoopMaps.modules.enterprises.hideTooltip();
                             ">
                            <div style="
                                position: absolute;
                                top: -20px;
                                right: -20px;
                                width: 60px;
                                height: 60px;
                                background: rgba(52, 152, 219, 0.1);
                                border-radius: 50%;
                                pointer-events: none;
                            "></div>
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 15px;
                                position: relative;
                            ">
                                <canvas width="80" height="60" id="preview-${type.id}" style="
                                    background: white;
                                    border-radius: 6px;
                                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                                "></canvas>
                                <div style="flex: 1;">
                                    <div style="
                                        font-weight: 600;
                                        color: #2c3e50;
                                        font-size: 14px;
                                        margin-bottom: 4px;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                    ">
                                        ${type.name}
                                    </div>
                                    <div style="
                                        font-size: 11px;
                                        color: #95a5a6;
                                        line-height: 1.4;
                                    ">${type.description}</div>
                                </div>
                                <div style="
                                    width: 24px;
                                    height: 24px;
                                    background: rgba(52, 152, 219, 0.1);
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    color: #3498db;
                                    font-size: 12px;
                                    font-weight: bold;
                                ">+</div>
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            html += `
                </div>

                <div style="
                    margin-top: 30px;
                    padding: 20px;
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-radius: 12px;
                    border: 1px solid #90caf9;
                ">
                    <h4 style="
                        font-size: 14px;
                        color: #1565c0;
                        margin-bottom: 10px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        Quick Tips
                    </h4>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        font-size: 12px;
                        color: #0d47a1;
                        line-height: 1.6;
                    ">
                        <li>Drag and drop symbols onto the canvas</li>
                        <li>Click a symbol to add it at the canvas center</li>
                        <li>Hold Shift while dragging for grid snapping</li>
                        <li>Double-click enterprises to edit properties</li>
                    </ul>
                </div>
            `;

            // Draw previews after DOM update
            setTimeout(() => {
                this.drawPreviews();
            }, 10);

            return html;
        },

        showTooltip(event, element) {
            const tooltip = document.getElementById('enterpriseTooltip');
            if (!tooltip) return;

            const description = element.dataset.description;
            tooltip.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">${element.dataset.name}</div>
                <div style="opacity: 0.9; font-size: 12px;">${description}</div>
            `;

            const rect = element.getBoundingClientRect();
            tooltip.style.left = rect.right + 10 + 'px';
            tooltip.style.top = rect.top + (rect.height / 2) - 30 + 'px';
            tooltip.style.opacity = '1';
        },

        hideTooltip() {
            const tooltip = document.getElementById('enterpriseTooltip');
            if (tooltip) {
                tooltip.style.opacity = '0';
            }
        },

        bindDragEvents() {
            document.querySelectorAll('.symbol-item').forEach(item => {
                let dragStarted = false;
                let dragGhost = null;

                item.addEventListener('mousedown', (e) => {
                    dragStarted = false;
                });

                item.addEventListener('dragstart', (e) => {
                    dragStarted = true;
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('enterpriseType', item.dataset.type);

                    // Create custom drag image - just the shape, no text
                    const canvas = document.createElement('canvas');
                    canvas.width = 100;
                    canvas.height = 60;
                    const ctx = canvas.getContext('2d');

                    // Draw the enterprise shape centered
                    const tempEnt = {
                        type: item.dataset.type,
                        x: 50,
                        y: 30,
                        width: 80,
                        height: 50
                    };

                    if (CoopMaps.modules.shapes && CoopMaps.modules.shapes.drawEnterprise) {
                        CoopMaps.modules.shapes.drawEnterprise(ctx, tempEnt, false, 1);
                    }

                    // Wrap canvas in a container
                    dragGhost = document.createElement('div');
                    dragGhost.style.position = 'absolute';
                    dragGhost.style.top = '-1000px';
                    dragGhost.style.opacity = '0.8';
                    dragGhost.appendChild(canvas);
                    document.body.appendChild(dragGhost);

                    e.dataTransfer.setDragImage(dragGhost, 50, 30);

                    item.classList.add('dragging');
                    item.style.opacity = '0.5';
                });

                item.addEventListener('dragend', (e) => {
                    item.classList.remove('dragging');
                    item.style.opacity = '1';

                    if (dragGhost) {
                        dragGhost.remove();
                        dragGhost = null;
                    }

                    setTimeout(() => {
                        dragStarted = false;
                    }, 100);
                });

                // Click to add at center
                item.addEventListener('click', (e) => {
                    if (!dragStarted) {
                        // Visual feedback
                        item.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            item.style.transform = '';
                        }, 100);

                        this.addEnterprise(item.dataset.type);

                        // Show success feedback
                        this.showAddFeedback(item);
                    }
                });
            });
        },

        showAddFeedback(element) {
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #27ae60;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                animation: feedbackPulse 0.6s ease;
            `;
            feedback.textContent = 'Added!';
            element.appendChild(feedback);

            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes feedbackPulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);

            setTimeout(() => {
                feedback.remove();
                style.remove();
            }, 600);
        },

        drawPreviews() {
            const shapes = CoopMaps.modules.shapes;
            if (!shapes) return;

            this.enterpriseTypes.forEach(type => {
                const canvas = document.getElementById(`preview-${type.id}`);
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Enable high-quality rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Smaller preview dimensions
                const width = 50;
                const height = 30;
                const x = 15;
                const y = 15;

                const options = {
                    fill: type.fill,
                    stroke: '#34495e',
                    lineWidth: 1.5,
                    noShadow: true,
                    noHighlight: true
                };

                switch (type.id) {
                    case 'cooperative':
                    case 'excluded':
                        shapes.drawRectangle(ctx, x, y, width, height, options);
                        break;
                    case 'ncm':
                    case 'community':
                        shapes.drawRoundedRectangle(ctx, x, y - 3, width, height, 6, options);
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

                // Add subtle indicators preview for applicable types
                if ((type.id === 'cooperative' || type.id === 'ncm') && type.id !== 'excluded') {
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                    ctx.fillRect(x, y - 5, width, 3);
                    ctx.fillRect(x - 5, y, 3, height);
                }
            });
        },

        addEnterprise(typeId) {
            const type = this.enterpriseTypes.find(t => t.id === typeId);
            if (!type) {
                console.error('Enterprise type not found:', typeId);
                return;
            }

            console.log('Adding enterprise type:', typeId);

            // Save state for undo
            if (CoopMaps.saveState) {
                CoopMaps.saveState();
            }

            const size = this.sizes[0]; // Default to small size

            // Get canvas internal dimensions (full resolution)
            const canvas = document.getElementById('canvas');
            const canvasModule = CoopMaps.modules.canvas;
            const canvasSize = canvasModule ? canvasModule.canvasSizes[canvasModule.currentCanvasSize] : { width: canvas.width, height: canvas.height };

            // Calculate center of the canvas in internal coordinates
            const centerX = canvasSize.width / 2;
            const centerY = canvasSize.height / 2;

            // Add some randomness to prevent overlap
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 100;

            const enterprise = {
                id: CoopMaps.generateId(),
                type: typeId,
                name: type.name,
                x: centerX + offsetX - size.width / 2,
                y: centerY + offsetY - size.height / 2,
                width: size.width,
                height: size.height,
                fill: type.fill,
                roles: [],
                tier: 'none',
                isGenericSet: false,
                dateAdded: new Date().toISOString()
            };

            console.log('Created enterprise:', enterprise);

            // Add with entrance animation
            CoopMaps.state.data.enterprises.push(enterprise);
            CoopMaps.state.data.selectedItem = enterprise;

            // Animate the addition
            this.animateEnterpriseAddition(enterprise);

            // Switch to properties tab
            CoopMaps.state.ui.activeTab = 'properties';
            document.querySelector('[data-tab="properties"]').click();
        },

        animateEnterpriseAddition(enterprise) {
            if (!CoopMaps.modules.canvas) return;

            // Skip animation in Express mode
            if (CoopMaps.isExpressMode) {
                CoopMaps.modules.canvas.render();
                return;
            }

            // Store original size
            const originalWidth = enterprise.width;
            const originalHeight = enterprise.height;

            // Start small
            enterprise.width = 0;
            enterprise.height = 0;

            // Animate to full size
            const duration = 300;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                enterprise.width = originalWidth * easeProgress;
                enterprise.height = originalHeight * easeProgress;

                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            animate();
        },

        addEnterpriseAt(typeId, x, y) {
            const type = this.enterpriseTypes.find(t => t.id === typeId);
            if (!type) {
                console.error('Enterprise type not found:', typeId);
                return;
            }

            console.log('Adding enterprise at coordinates:', x, y);

            // Check for duplicates
            const existingAtPosition = CoopMaps.state.data.enterprises.find(e =>
                Math.abs(e.x - (x - e.width / 2)) < 5 &&
                Math.abs(e.y - (y - e.height / 2)) < 5 &&
                e.type === typeId
            );

            if (existingAtPosition) {
                console.log('Enterprise already exists at this position, skipping duplicate');
                return;
            }

            // Save state for undo
            if (CoopMaps.saveState) {
                CoopMaps.saveState();
            }

            const size = this.sizes[0]; // Default to small size
            const enterprise = {
                id: CoopMaps.generateId(),
                type: typeId,
                name: type.name,
                x: x - size.width / 2,
                y: y - size.height / 2,
                width: size.width,
                height: size.height,
                fill: type.fill,
                roles: [],
                tier: 'none',
                isGenericSet: false,
                dateAdded: new Date().toISOString()
            };

            console.log('Created enterprise:', enterprise);

            CoopMaps.state.data.enterprises.push(enterprise);
            CoopMaps.state.data.selectedItem = enterprise;

            // Render immediately without animation
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }

            // Update properties panel immediately (no delay for Express compatibility)
            if (CoopMaps.updateSidebar) {
                CoopMaps.updateSidebar();
            } else {
                // Fallback for Deluxe version - show properties tab
                setTimeout(() => {
                    CoopMaps.state.ui.activeTab = 'properties';
                    const propertiesTab = document.querySelector('[data-tab="properties"]');
                    if (propertiesTab) {
                        propertiesTab.click();
                    }
                }, 50);
            }
        },

        // Get enterprise statistics for dashboard
        getStatistics() {
            const enterprises = CoopMaps.state.data.enterprises;
            const stats = {
                total: enterprises.length,
                byType: {},
                byCategory: {},
                withRoles: 0,
                genericSets: 0
            };

            this.enterpriseTypes.forEach(type => {
                stats.byType[type.id] = 0;
            });

            enterprises.forEach(enterprise => {
                stats.byType[enterprise.type]++;

                const type = this.enterpriseTypes.find(t => t.id === enterprise.type);
                if (type) {
                    stats.byCategory[type.category] = (stats.byCategory[type.category] || 0) + 1;
                }

                if (enterprise.roles && enterprise.roles.length > 0) {
                    stats.withRoles++;
                }

                if (enterprise.isGenericSet) {
                    stats.genericSets++;
                }
            });

            return stats;
        }
    });
})();
