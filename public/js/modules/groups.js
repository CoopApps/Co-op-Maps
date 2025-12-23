/**
 * Co-op Maps - Groups Module
 * Allows grouping enterprises into named clusters that can collapse/expand
 */

(function() {
    'use strict';

    CoopMaps.registerModule('groups', {
        // Default group colors
        colors: [
            '#3498db', '#e74c3c', '#27ae60', '#9b59b6', '#f39c12',
            '#1abc9c', '#e67e22', '#2c3e50', '#16a085', '#c0392b'
        ],
        colorIndex: 0,

        init() {
            console.log('Groups module initialized');
            if (!CoopMaps.state.data.groups) {
                CoopMaps.state.data.groups = [];
            }
        },

        // Get next color for new group
        getNextColor() {
            const color = this.colors[this.colorIndex % this.colors.length];
            this.colorIndex++;
            return color;
        },

        // Show dialog to create a new group from selected enterprises
        showCreateGroupDialog() {
            const selected = this.getSelectedEnterprises();

            if (selected.length < 2) {
                if (CoopMaps.isExpressMode) {
                    alert('Select at least 2 enterprises to create a group.\n\nTip: Hold Shift and click to select multiple enterprises.');
                } else {
                    CoopMaps.showNotification('Select at least 2 enterprises to create a group (Shift+click to multi-select)', 'warning');
                }
                return;
            }

            const existing = document.getElementById('groupModal');
            if (existing) existing.remove();

            const useAnimation = !CoopMaps.isExpressMode;
            const suggestedColor = this.getNextColor();

            const modal = document.createElement('div');
            modal.id = 'groupModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, ${CoopMaps.isExpressMode ? '0.7' : '0.8'});
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);'}
                    padding: ${CoopMaps.isExpressMode ? '20px' : '30px'};
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: ${CoopMaps.isExpressMode ? '16px' : '20px'};">
                        Create Group
                    </h2>

                    <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 14px;">
                        Grouping ${selected.length} selected enterprises
                    </p>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Group Name *
                        </label>
                        <input type="text" id="groupName" placeholder="e.g., Yorkshire Co-ops, Supply Chain" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Group Color
                        </label>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${this.colors.map((color, i) => `
                                <div onclick="document.getElementById('groupColor').value='${color}'; this.parentElement.querySelectorAll('div').forEach(d=>d.style.outline='none'); this.style.outline='3px solid #2c3e50';"
                                    style="
                                        width: 32px;
                                        height: 32px;
                                        background: ${color};
                                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                                        cursor: pointer;
                                        ${color === suggestedColor ? 'outline: 3px solid #2c3e50;' : ''}
                                    "
                                ></div>
                            `).join('')}
                        </div>
                        <input type="hidden" id="groupColor" value="${suggestedColor}">
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="CoopMaps.modules.groups.closeDialog()" style="
                            flex: 1;
                            padding: 12px;
                            border: ${CoopMaps.isExpressMode ? '2px outset #bdc3c7' : '1px solid #ddd'};
                            background: ${CoopMaps.isExpressMode ? '#ecf0f1' : '#f8f9fa'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            color: #2c3e50;
                        ">Cancel</button>
                        <button onclick="CoopMaps.modules.groups.createGroup()" style="
                            flex: 1;
                            padding: 12px;
                            border: none;
                            background: ${CoopMaps.isExpressMode ? '#27ae60' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'};
                            color: white;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">Create Group</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeDialog();
            });

            this.escapeHandler = (e) => {
                if (e.key === 'Escape') this.closeDialog();
            };
            document.addEventListener('keydown', this.escapeHandler);

            setTimeout(() => document.getElementById('groupName')?.focus(), 100);
        },

        closeDialog() {
            const modal = document.getElementById('groupModal');
            if (modal) modal.remove();
            const panelModal = document.getElementById('groupsPanelModal');
            if (panelModal) panelModal.remove();
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
            }
        },

        // Get selected enterprises (those with multiSelected flag or single selected)
        getSelectedEnterprises() {
            const enterprises = CoopMaps.state.data.enterprises || [];
            const selected = enterprises.filter(e => e.multiSelected);

            // If no multi-selected, check for single selected
            if (selected.length === 0 && CoopMaps.state.data.selectedItem) {
                const single = enterprises.find(e => e.id === CoopMaps.state.data.selectedItem);
                if (single) return [single];
            }

            return selected;
        },

        createGroup() {
            const nameInput = document.getElementById('groupName');
            const colorInput = document.getElementById('groupColor');

            const name = nameInput?.value?.trim();
            const color = colorInput?.value || '#3498db';

            if (!name) {
                alert('Please enter a group name');
                return;
            }

            const selected = this.getSelectedEnterprises();
            if (selected.length < 2) {
                alert('Select at least 2 enterprises');
                return;
            }

            // Calculate bounding box
            const bounds = this.calculateBounds(selected);

            // Create group
            const group = {
                id: CoopMaps.generateId(),
                name: name,
                color: color,
                enterpriseIds: selected.map(e => e.id),
                collapsed: false,
                x: bounds.x - 20,
                y: bounds.y - 40,
                width: bounds.width + 40,
                height: bounds.height + 60,
                createdAt: new Date().toISOString()
            };

            if (!CoopMaps.state.data.groups) {
                CoopMaps.state.data.groups = [];
            }

            CoopMaps.state.data.groups.push(group);

            // Clear multi-selection
            selected.forEach(e => e.multiSelected = false);

            CoopMaps.saveState();
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }

            this.closeDialog();

            if (CoopMaps.isExpressMode) {
                alert('Group created: ' + name);
            } else {
                CoopMaps.showNotification('Group created: ' + name, 'success');
            }
        },

        calculateBounds(enterprises) {
            if (!enterprises || enterprises.length === 0) {
                return { x: 0, y: 0, width: 100, height: 100 };
            }

            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            enterprises.forEach(e => {
                minX = Math.min(minX, e.x);
                minY = Math.min(minY, e.y);
                maxX = Math.max(maxX, e.x + (e.width || 140));
                maxY = Math.max(maxY, e.y + (e.height || 84));
            });

            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        },

        // Update group bounds based on enterprise positions
        updateGroupBounds(group) {
            const enterprises = (CoopMaps.state.data.enterprises || [])
                .filter(e => group.enterpriseIds.includes(e.id));

            if (enterprises.length === 0) return;

            const bounds = this.calculateBounds(enterprises);
            group.x = bounds.x - 20;
            group.y = bounds.y - 40;
            group.width = bounds.width + 40;
            group.height = bounds.height + 60;
        },

        // Toggle collapse/expand for a group
        toggleCollapse(groupId) {
            const group = (CoopMaps.state.data.groups || []).find(g => g.id === groupId);
            if (!group) return;

            group.collapsed = !group.collapsed;

            if (group.collapsed) {
                // Store original positions before collapsing
                const enterprises = (CoopMaps.state.data.enterprises || [])
                    .filter(e => group.enterpriseIds.includes(e.id));

                group.originalPositions = {};
                enterprises.forEach(e => {
                    group.originalPositions[e.id] = { x: e.x, y: e.y };
                });
            } else {
                // Restore original positions
                if (group.originalPositions) {
                    const enterprises = CoopMaps.state.data.enterprises || [];
                    enterprises.forEach(e => {
                        if (group.originalPositions[e.id]) {
                            e.x = group.originalPositions[e.id].x;
                            e.y = group.originalPositions[e.id].y;
                        }
                    });
                }
            }

            CoopMaps.saveState();
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }
        },

        // Delete a group (doesn't delete enterprises, just the grouping)
        deleteGroup(groupId) {
            const groups = CoopMaps.state.data.groups || [];
            const index = groups.findIndex(g => g.id === groupId);

            if (index === -1) return;

            const group = groups[index];

            if (!confirm(`Delete group "${group.name}"? (Enterprises will remain)`)) {
                return;
            }

            // If collapsed, restore positions first
            if (group.collapsed && group.originalPositions) {
                const enterprises = CoopMaps.state.data.enterprises || [];
                enterprises.forEach(e => {
                    if (group.originalPositions[e.id]) {
                        e.x = group.originalPositions[e.id].x;
                        e.y = group.originalPositions[e.id].y;
                    }
                });
            }

            groups.splice(index, 1);

            CoopMaps.saveState();
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }

            this.showGroupsPanel(); // Refresh panel
        },

        // Show groups management panel
        showGroupsPanel() {
            const groups = CoopMaps.state.data.groups || [];

            const existing = document.getElementById('groupsPanelModal');
            if (existing) existing.remove();

            const useAnimation = !CoopMaps.isExpressMode;

            const modal = document.createElement('div');
            modal.id = 'groupsPanelModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            const groupsList = groups.length === 0
                ? '<p style="color: #7f8c8d; text-align: center; padding: 20px;">No groups created yet.<br>Select multiple enterprises (Shift+click) and click "Create Group".</p>'
                : groups.map(g => {
                    const count = g.enterpriseIds.length;
                    return `
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 15px;
                            padding: 15px;
                            background: #f8f9fa;
                            ${CoopMaps.isExpressMode ? 'border: 1px solid #bdc3c7;' : 'border-radius: 8px;'}
                            margin-bottom: 10px;
                            border-left: 4px solid ${g.color};
                        ">
                            <div style="
                                width: 24px;
                                height: 24px;
                                background: ${g.color};
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                            "></div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #2c3e50;">${this.escapeHtml(g.name)}</div>
                                <div style="font-size: 12px; color: #7f8c8d;">${count} enterprise${count !== 1 ? 's' : ''} ${g.collapsed ? '(collapsed)' : ''}</div>
                            </div>
                            <div style="display: flex; gap: 5px;">
                                <button onclick="CoopMaps.modules.groups.toggleCollapse('${g.id}')" style="
                                    padding: 8px 12px;
                                    background: ${g.collapsed ? '#27ae60' : '#f39c12'};
                                    color: white;
                                    border: none;
                                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                    cursor: pointer;
                                    font-size: 12px;
                                ">${g.collapsed ? 'Expand' : 'Collapse'}</button>
                                <button onclick="CoopMaps.modules.groups.deleteGroup('${g.id}')" style="
                                    padding: 8px 12px;
                                    background: #e74c3c;
                                    color: white;
                                    border: none;
                                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                    cursor: pointer;
                                    font-size: 12px;
                                ">Delete</button>
                            </div>
                        </div>
                    `;
                }).join('');

            modal.innerHTML = `
                <div style="
                    background: white;
                    ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);'}
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #2c3e50;">
                            Groups (${groups.length})
                        </h2>
                        <button onclick="CoopMaps.modules.groups.closeDialog()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>

                    <div style="margin-bottom: 20px;">
                        ${groupsList}
                    </div>

                    <button onclick="CoopMaps.modules.groups.closeDialog(); CoopMaps.modules.groups.showCreateGroupDialog();" style="
                        width: 100%;
                        padding: 12px;
                        background: ${CoopMaps.isExpressMode ? '#3498db' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'};
                        color: white;
                        border: none;
                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                        cursor: pointer;
                        font-weight: 600;
                    ">+ Create New Group</button>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeDialog();
            });
        },

        // Render groups on canvas
        renderGroups(ctx, zoom, panOffset) {
            const groups = CoopMaps.state.data.groups || [];
            const enterprises = CoopMaps.state.data.enterprises || [];

            groups.forEach(group => {
                // Update bounds if not collapsed
                if (!group.collapsed) {
                    this.updateGroupBounds(group);
                }

                ctx.save();
                ctx.translate(panOffset.x, panOffset.y);
                ctx.scale(zoom, zoom);

                if (group.collapsed) {
                    // Draw collapsed group as a single box
                    const centerX = group.x + group.width / 2;
                    const centerY = group.y + group.height / 2;
                    const size = 60;

                    // Background
                    ctx.fillStyle = group.color + '40'; // 25% opacity
                    ctx.strokeStyle = group.color;
                    ctx.lineWidth = 3;

                    ctx.beginPath();
                    ctx.roundRect(centerX - size, centerY - size/2, size * 2, size, 8);
                    ctx.fill();
                    ctx.stroke();

                    // Icon (stacked squares)
                    ctx.fillStyle = group.color;
                    ctx.fillRect(centerX - 15, centerY - 15, 12, 12);
                    ctx.fillRect(centerX - 5, centerY - 5, 12, 12);
                    ctx.fillRect(centerX + 5, centerY + 5, 12, 12);

                    // Label
                    ctx.fillStyle = '#2c3e50';
                    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(group.name, centerX, centerY + size/2 + 20);
                    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillStyle = '#7f8c8d';
                    ctx.fillText(`(${group.enterpriseIds.length} items)`, centerX, centerY + size/2 + 34);

                } else {
                    // Draw expanded group boundary
                    ctx.strokeStyle = group.color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 4]);

                    ctx.beginPath();
                    ctx.roundRect(group.x, group.y, group.width, group.height, 12);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Group label background
                    ctx.fillStyle = group.color;
                    const labelWidth = ctx.measureText(group.name).width + 20;
                    ctx.beginPath();
                    ctx.roundRect(group.x + 10, group.y - 12, labelWidth, 24, 4);
                    ctx.fill();

                    // Group label text
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(group.name, group.x + 20, group.y + 4);
                }

                ctx.restore();
            });
        },

        // Check if a point is on a collapsed group
        getGroupAtPoint(x, y) {
            const groups = CoopMaps.state.data.groups || [];

            for (const group of groups) {
                if (group.collapsed) {
                    const centerX = group.x + group.width / 2;
                    const centerY = group.y + group.height / 2;
                    const size = 60;

                    if (x >= centerX - size && x <= centerX + size &&
                        y >= centerY - size/2 && y <= centerY + size/2) {
                        return group;
                    }
                }
            }

            return null;
        },

        // Check if enterprise should be hidden (in collapsed group)
        isEnterpriseHidden(enterpriseId) {
            const groups = CoopMaps.state.data.groups || [];
            return groups.some(g => g.collapsed && g.enterpriseIds.includes(enterpriseId));
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    });
})();
