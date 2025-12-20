/**
 * Co-opMaps - Properties Module
 * Handles properties panel for editing selected enterprises and relationships
 */

(function() {
    'use strict';

    const properties = {
        init() {
            console.log('Properties module initialized');
        },

        render() {
            const state = window.CoopMaps.state.data;

            if (!state.selectedItem) {
                return this.renderNoSelection();
            }

            if (state.selectedItem.type === 'enterprise') {
                const enterprise = state.enterprises.find(e => e.id === state.selectedItem.id);
                if (enterprise) {
                    return this.renderEnterpriseProperties(enterprise);
                }
            } else if (state.selectedItem.type === 'relationship') {
                const relationship = state.relationships.find(r => r.id === state.selectedItem.id);
                if (relationship) {
                    return this.renderRelationshipProperties(relationship);
                }
            }

            return this.renderNoSelection();
        },

        renderNoSelection() {
            return `
                <div style="text-align: center; padding: 60px 20px; color: var(--gray);">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📋</div>
                    <h3 style="margin-bottom: 10px; color: var(--dark);">No Selection</h3>
                    <p style="font-size: 14px;">Select an enterprise or relationship to view and edit its properties.</p>
                </div>
            `;
        },

        renderEnterpriseProperties(enterprise) {
            const shapes = window.CoopMaps.modules.shapes;
            const typeInfo = shapes ? shapes.enterpriseTypes[enterprise.type] : null;

            let html = `
                <div class="properties-panel">
                    <h3 style="margin-bottom: 20px; color: var(--dark); display: flex; align-items: center; gap: 10px;">
                        ${typeInfo ? typeInfo.icon : '🏢'}
                        Enterprise Properties
                    </h3>

                    <!-- Name -->
                    <div class="property-group">
                        <label class="property-label">Name</label>
                        <input
                            type="text"
                            class="property-input"
                            value="${this.escapeHtml(enterprise.name || '')}"
                            onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'name', this.value)"
                        />
                    </div>

                    <!-- Type -->
                    <div class="property-group">
                        <label class="property-label">Type</label>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'type', this.value)"
                        >
                            ${this.renderEnterpriseTypeOptions(enterprise.type)}
                        </select>
                    </div>

                    <!-- Roles -->
                    <div class="property-group">
                        <label class="property-label">Roles</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                            ${this.renderRoleBadges(enterprise)}
                        </div>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.addRole('${enterprise.id}', this.value); this.selectedIndex = 0;"
                        >
                            <option value="">+ Add role...</option>
                            <option value="producer">Producer</option>
                            <option value="processor">Processor</option>
                            <option value="supplier">Supplier</option>
                            <option value="distributor">Distributor</option>
                            <option value="retailer">Retailer</option>
                            <option value="consumer">Consumer</option>
                            <option value="facilitator">Facilitator</option>
                            <option value="regulator">Regulator</option>
                        </select>
                    </div>

                    <!-- Tier -->
                    <div class="property-group">
                        <label class="property-label">Tier</label>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'tier', this.value)"
                        >
                            <option value="primary" ${enterprise.tier === 'primary' ? 'selected' : ''}>Primary</option>
                            <option value="secondary" ${enterprise.tier === 'secondary' ? 'selected' : ''}>Secondary</option>
                            <option value="other" ${enterprise.tier === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>

                    <!-- Generic Set -->
                    <div class="property-group">
                        <label class="property-label" style="display: flex; align-items: center; gap: 8px;">
                            <input
                                type="checkbox"
                                ${enterprise.isGenericSet ? 'checked' : ''}
                                onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'isGenericSet', this.checked)"
                            />
                            Generic Set
                        </label>
                        <p style="font-size: 12px; color: var(--gray); margin-top: 4px;">
                            Represents a set of similar enterprises rather than a specific entity
                        </p>
                    </div>

                    <!-- Appearance -->
                    <h4 style="margin: 24px 0 16px; color: var(--dark); font-size: 16px; border-top: 1px solid var(--light-gray); padding-top: 20px;">
                        Appearance
                    </h4>

                    <!-- Fill Color -->
                    <div class="property-group">
                        <label class="property-label">Fill Color</label>
                        <input
                            type="color"
                            class="property-input"
                            value="${enterprise.fill || '#3498db'}"
                            onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'fill', this.value)"
                        />
                    </div>

                    <!-- Stroke Color -->
                    <div class="property-group">
                        <label class="property-label">Border Color</label>
                        <input
                            type="color"
                            class="property-input"
                            value="${enterprise.stroke || '#2c3e50'}"
                            onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'stroke', this.value)"
                        />
                    </div>

                    <!-- Shape -->
                    <div class="property-group">
                        <label class="property-label">Shape</label>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'shape', this.value)"
                        >
                            <option value="rectangle" ${enterprise.shape === 'rectangle' ? 'selected' : ''}>Rectangle</option>
                            <option value="circle" ${enterprise.shape === 'circle' ? 'selected' : ''}>Circle</option>
                            <option value="diamond" ${enterprise.shape === 'diamond' ? 'selected' : ''}>Diamond</option>
                        </select>
                    </div>

                    <!-- Show Icon -->
                    <div class="property-group">
                        <label class="property-label" style="display: flex; align-items: center; gap: 8px;">
                            <input
                                type="checkbox"
                                ${enterprise.showIcon !== false ? 'checked' : ''}
                                onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'showIcon', this.checked)"
                            />
                            Show Icon
                        </label>
                    </div>

                    <!-- Position & Size -->
                    <h4 style="margin: 24px 0 16px; color: var(--dark); font-size: 16px; border-top: 1px solid var(--light-gray); padding-top: 20px;">
                        Position & Size
                    </h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="property-group">
                            <label class="property-label">X</label>
                            <input
                                type="number"
                                class="property-input"
                                value="${Math.round(enterprise.x)}"
                                onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'x', parseFloat(this.value))"
                            />
                        </div>
                        <div class="property-group">
                            <label class="property-label">Y</label>
                            <input
                                type="number"
                                class="property-input"
                                value="${Math.round(enterprise.y)}"
                                onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'y', parseFloat(this.value))"
                            />
                        </div>
                        <div class="property-group">
                            <label class="property-label">Width</label>
                            <input
                                type="number"
                                class="property-input"
                                value="${Math.round(enterprise.width)}"
                                onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'width', parseFloat(this.value))"
                            />
                        </div>
                        <div class="property-group">
                            <label class="property-label">Height</label>
                            <input
                                type="number"
                                class="property-input"
                                value="${Math.round(enterprise.height)}"
                                onchange="CoopMaps.modules.properties.updateEnterprise('${enterprise.id}', 'height', parseFloat(this.value))"
                            />
                        </div>
                    </div>
                </div>

                <style>
                    .properties-panel {
                        padding: 0;
                    }

                    .property-group {
                        margin-bottom: 16px;
                    }

                    .property-label {
                        display: block;
                        font-size: 13px;
                        font-weight: 600;
                        color: var(--dark);
                        margin-bottom: 6px;
                    }

                    .property-input {
                        width: 100%;
                        padding: 10px;
                        border: 2px solid var(--light-gray);
                        border-radius: 8px;
                        font-size: 14px;
                        transition: var(--transition-fast);
                    }

                    .property-input:focus {
                        outline: none;
                        border-color: var(--primary);
                        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                    }

                    .role-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 12px;
                        background: var(--primary);
                        color: white;
                        border-radius: 16px;
                        font-size: 12px;
                        font-weight: 500;
                    }

                    .role-badge-remove {
                        cursor: pointer;
                        opacity: 0.8;
                        transition: opacity 0.2s;
                    }

                    .role-badge-remove:hover {
                        opacity: 1;
                    }
                </style>
            `;

            return html;
        },

        renderRelationshipProperties(relationship) {
            const state = window.CoopMaps.state.data;
            const startEnt = state.enterprises.find(e => e.id === relationship.startEnterpriseId);
            const endEnt = state.enterprises.find(e => e.id === relationship.endEnterpriseId);

            let html = `
                <div class="properties-panel">
                    <h3 style="margin-bottom: 20px; color: var(--dark);">
                        Relationship Properties
                    </h3>

                    <!-- Connection Info -->
                    <div class="property-group">
                        <label class="property-label">From</label>
                        <input type="text" class="property-input" value="${startEnt ? startEnt.name : 'Unknown'}" disabled />
                    </div>

                    <div class="property-group">
                        <label class="property-label">To</label>
                        <input type="text" class="property-input" value="${endEnt ? endEnt.name : 'Unknown'}" disabled />
                    </div>

                    <!-- Type -->
                    <div class="property-group">
                        <label class="property-label">Exchange Type</label>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.updateRelationship('${relationship.id}', 'type', this.value)"
                        >
                            <option value="G" ${relationship.type === 'G' ? 'selected' : ''}>Goods/Services (G)</option>
                            <option value="F" ${relationship.type === 'F' ? 'selected' : ''}>Finance (F)</option>
                            <option value="K" ${relationship.type === 'K' ? 'selected' : ''}>Knowledge (K)</option>
                            <option value="M" ${relationship.type === 'M' ? 'selected' : ''}>Mixed (M)</option>
                        </select>
                    </div>

                    <!-- Segmentation -->
                    <div class="property-group">
                        <label class="property-label">Start Segmentation</label>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.updateRelationship('${relationship.id}', 'startSegmentation', this.value)"
                        >
                            <option value="individual" ${relationship.startSegmentation === 'individual' ? 'selected' : ''}>Individual</option>
                            <option value="collective" ${relationship.startSegmentation === 'collective' ? 'selected' : ''}>Collective</option>
                        </select>
                    </div>

                    <div class="property-group">
                        <label class="property-label">End Segmentation</label>
                        <select
                            class="property-input"
                            onchange="CoopMaps.modules.properties.updateRelationship('${relationship.id}', 'endSegmentation', this.value)"
                        >
                            <option value="individual" ${relationship.endSegmentation === 'individual' ? 'selected' : ''}>Individual</option>
                            <option value="collective" ${relationship.endSegmentation === 'collective' ? 'selected' : ''}>Collective</option>
                        </select>
                    </div>

                    <!-- Custom Color -->
                    <div class="property-group">
                        <label class="property-label">Custom Color (optional)</label>
                        <input
                            type="color"
                            class="property-input"
                            value="${relationship.color || '#2c3e50'}"
                            onchange="CoopMaps.modules.properties.updateRelationship('${relationship.id}', 'color', this.value)"
                        />
                    </div>
                </div>
            `;

            return html;
        },

        renderEnterpriseTypeOptions(selectedType) {
            const shapes = window.CoopMaps.modules.shapes;
            if (!shapes) return '';

            let html = '';
            Object.keys(shapes.enterpriseTypes).forEach(typeKey => {
                const type = shapes.enterpriseTypes[typeKey];
                html += `<option value="${typeKey}" ${typeKey === selectedType ? 'selected' : ''}>${type.label}</option>`;
            });
            return html;
        },

        renderRoleBadges(enterprise) {
            if (!enterprise.roles || enterprise.roles.length === 0) {
                return '<span style="color: var(--gray); font-size: 12px;">No roles assigned</span>';
            }

            return enterprise.roles.map(role => `
                <span class="role-badge">
                    ${role}
                    <span class="role-badge-remove" onclick="CoopMaps.modules.properties.removeRole('${enterprise.id}', '${role}')">✕</span>
                </span>
            `).join('');
        },

        updateEnterprise(id, property, value) {
            const state = window.CoopMaps.state.data;
            const enterprise = state.enterprises.find(e => e.id === id);

            if (enterprise) {
                enterprise[property] = value;
                window.CoopMaps.saveState();

                if (window.CoopMaps.modules.canvas) {
                    window.CoopMaps.modules.canvas.render();
                }
            }
        },

        updateRelationship(id, property, value) {
            const state = window.CoopMaps.state.data;
            const relationship = state.relationships.find(r => r.id === id);

            if (relationship) {
                relationship[property] = value;
                window.CoopMaps.saveState();

                if (window.CoopMaps.modules.canvas) {
                    window.CoopMaps.modules.canvas.render();
                }
            }
        },

        addRole(enterpriseId, role) {
            if (!role) return;

            const state = window.CoopMaps.state.data;
            const enterprise = state.enterprises.find(e => e.id === enterpriseId);

            if (enterprise) {
                if (!enterprise.roles) enterprise.roles = [];
                if (!enterprise.roles.includes(role)) {
                    enterprise.roles.push(role);
                    window.CoopMaps.saveState();
                    window.CoopMaps.updateSidebar();

                    if (window.CoopMaps.modules.canvas) {
                        window.CoopMaps.modules.canvas.render();
                    }
                }
            }
        },

        removeRole(enterpriseId, role) {
            const state = window.CoopMaps.state.data;
            const enterprise = state.enterprises.find(e => e.id === enterpriseId);

            if (enterprise && enterprise.roles) {
                enterprise.roles = enterprise.roles.filter(r => r !== role);
                window.CoopMaps.saveState();
                window.CoopMaps.updateSidebar();

                if (window.CoopMaps.modules.canvas) {
                    window.CoopMaps.modules.canvas.render();
                }
            }
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('properties', properties);
    }
})();
