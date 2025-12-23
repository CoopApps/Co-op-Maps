// Module 5: Properties Module
(function() {
    'use strict';

    // Enhanced Properties Module with improved visual design
    CoopMaps.registerModule('properties', {
        init() {
            console.log('Enhanced Properties module initialized');
        },

        render() {
            const selected = CoopMaps.state.data.selectedItem;

            if (!selected) {
                // Show diagram properties when nothing is selected
                return this.renderDiagramProperties();
            }

            // Show enterprise properties
            return this.renderEnterpriseProperties(selected);
        },

        renderDiagramProperties() {
            const metadata = CoopMaps.state.data.diagramProperties;
            const stats = CoopMaps.modules.enterprises ? CoopMaps.modules.enterprises.getStatistics() : null;

            return `
                <div style="animation: fadeIn 0.3s ease;">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 25px;
                        margin: -25px -25px 25px -25px;
                        border-radius: 0 0 16px 16px;
                        color: white;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
                    ">
                        <h3 style="
                            font-size: 20px;
                            margin: 0 0 8px 0;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        ">
                            Diagram Properties
                        </h3>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                            Configure your co-operative ecosystem diagram
                        </p>
                    </div>

                    <!-- Basic Properties -->
                    <div class="property-group" style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 20px 0;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            Basic Information
                        </h4>

                        <div class="property-field" style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 13px;
                                color: #546e7a;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">Diagram Title</label>
                            <input type="text"
                                   value="${metadata.title || ''}"
                                   onchange="CoopMaps.modules.properties.updateDiagramProperty('title', this.value)"
                                   placeholder="Enter diagram title"
                                   style="
                                       width: 100%;
                                       padding: 12px 16px;
                                       border: 2px solid #e9ecef;
                                       border-radius: 8px;
                                       font-size: 14px;
                                       transition: all 0.2s ease;
                                       background: #f8f9fa;
                                   "
                                   onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                   onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="property-field">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: #546e7a;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                ">Author</label>
                                <input type="text"
                                       value="${metadata.author || ''}"
                                       onchange="CoopMaps.modules.properties.updateDiagramProperty('author', this.value)"
                                       placeholder="Your name"
                                       style="
                                           width: 100%;
                                           padding: 12px 16px;
                                           border: 2px solid #e9ecef;
                                           border-radius: 8px;
                                           font-size: 14px;
                                           transition: all 0.2s ease;
                                           background: #f8f9fa;
                                       "
                                       onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                       onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                            </div>

                            <div class="property-field">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: #546e7a;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                ">Date</label>
                                <input type="date"
                                       value="${metadata.date || ''}"
                                       onchange="CoopMaps.modules.properties.updateDiagramProperty('date', this.value)"
                                       style="
                                           width: 100%;
                                           padding: 12px 16px;
                                           border: 2px solid #e9ecef;
                                           border-radius: 8px;
                                           font-size: 14px;
                                           transition: all 0.2s ease;
                                           background: #f8f9fa;
                                           cursor: pointer;
                                       "
                                       onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                       onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                            </div>
                        </div>

                        <div class="property-field" style="margin-top: 16px;">
                            <label style="
                                display: block;
                                font-size: 13px;
                                color: #546e7a;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">WDR (Worldwide Diagram Reference)</label>
                            <input type="text"
                                   value="${metadata.wdr || ''}"
                                   onchange="CoopMaps.modules.properties.updateDiagramProperty('wdr', this.value)"
                                   placeholder="e.g., WDR-2024-001"
                                   style="
                                       width: 100%;
                                       padding: 12px 16px;
                                       border: 2px solid #e9ecef;
                                       border-radius: 8px;
                                       font-size: 14px;
                                       transition: all 0.2s ease;
                                       background: #f8f9fa;
                                   "
                                   onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                   onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                        </div>
                    </div>

                    <!-- Scope Properties -->
                    <div class="property-group" style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 20px 0;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            Diagram Scope
                        </h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="property-field">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: #546e7a;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                ">Extent</label>
                                <select onchange="CoopMaps.modules.properties.updateScopeProperty('geographic', this.value)"
                                        style="
                                            width: 100%;
                                            padding: 12px 16px;
                                            border: 2px solid #e9ecef;
                                            border-radius: 8px;
                                            font-size: 14px;
                                            background: #f8f9fa;
                                            cursor: pointer;
                                            transition: all 0.2s ease;
                                        "
                                        onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                        onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                                    <option value="local" ${metadata.scope?.geographic === 'local' ? 'selected' : ''}>Local</option>
                                    <option value="regional" ${metadata.scope?.geographic === 'regional' ? 'selected' : ''}>Regional</option>
                                    <option value="national" ${metadata.scope?.geographic === 'national' ? 'selected' : ''}>National</option>
                                    <option value="international" ${metadata.scope?.geographic === 'international' ? 'selected' : ''}>International</option>
                                </select>
                            </div>

                            <div class="property-field">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: #546e7a;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                ">Time Period</label>
                                <select onchange="CoopMaps.modules.properties.updateDiagramProperty('period', this.value)"
                                        style="
                                            width: 100%;
                                            padding: 12px 16px;
                                            border: 2px solid #e9ecef;
                                            border-radius: 8px;
                                            font-size: 14px;
                                            background: #f8f9fa;
                                            cursor: pointer;
                                            transition: all 0.2s ease;
                                        "
                                        onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                        onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                                    <option value="past" ${metadata.period === 'past' ? 'selected' : ''}>Past (Historical)</option>
                                    <option value="present" ${metadata.period === 'present' ? 'selected' : ''}>Present (Contemporary)</option>
                                    <option value="future" ${metadata.period === 'future' ? 'selected' : ''}>Future (Predictive/Proposal)</option>
                                </select>
                            </div>
                        </div>

                        <div class="property-field" style="margin-top: 16px;">
                            <label style="
                                display: block;
                                font-size: 13px;
                                color: #546e7a;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">Economic Sectors</label>
                            <input type="text"
                                   value="${metadata.scope?.economic || ''}"
                                   onchange="CoopMaps.modules.properties.updateScopeProperty('economic', this.value)"
                                   placeholder="e.g., Agriculture, Finance, Technology"
                                   style="
                                       width: 100%;
                                       padding: 12px 16px;
                                       border: 2px solid #e9ecef;
                                       border-radius: 8px;
                                       font-size: 14px;
                                       transition: all 0.2s ease;
                                       background: #f8f9fa;
                                   "
                                   onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                   onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                        </div>
                    </div>

                    ${stats ? `
                    <!-- Statistics -->
                    <div class="property-group" style="
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 16px 0;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            Diagram Statistics
                        </h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div style="
                                background: white;
                                padding: 16px;
                                border-radius: 8px;
                                text-align: center;
                            ">
                                <div style="font-size: 32px; font-weight: bold; color: #3498db;">
                                    ${stats.total}
                                </div>
                                <div style="font-size: 13px; color: #7f8c8d; margin-top: 4px;">
                                    Total Enterprises
                                </div>
                            </div>

                            <div style="
                                background: white;
                                padding: 16px;
                                border-radius: 8px;
                                text-align: center;
                            ">
                                <div style="font-size: 32px; font-weight: bold; color: #27ae60;">
                                    ${CoopMaps.state.data.relationships.length}
                                </div>
                                <div style="font-size: 13px; color: #7f8c8d; margin-top: 4px;">
                                    Relationships
                                </div>
                            </div>
                        </div>

                        ${stats.total > 0 ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3);">
                            <div style="font-size: 13px; color: #546e7a;">
                                <strong>By Type:</strong>
                                ${Object.entries(stats.byType)
                                    .filter(([type, count]) => count > 0)
                                    .map(([type, count]) => `${this.getTypeName(type)} (${count})`)
                                    .join(', ') || 'None'}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Call to Action -->
                    <div style="
                        text-align: center;
                        padding: 30px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 12px;
                        color: white;
                        margin-top: 30px;
                    ">
                        <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                            Click on any enterprise in the canvas to edit its properties
                        </p>
                    </div>
                </div>

                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
            `;
        },

        renderEnterpriseProperties(selected) {
            // Get current size
            const currentSizeIndex = CoopMaps.modules.enterprises.sizes.findIndex(s =>
                s.width === selected.width && s.height === selected.height
            );
            const currentSize = currentSizeIndex !== -1 ? CoopMaps.modules.enterprises.sizes[currentSizeIndex].id : 1;

            // Get enterprise type info
            const typeInfo = CoopMaps.modules.enterprises.enterpriseTypes.find(t => t.id === selected.type);

            // Determine if we should show role and tier options
            const showRolesAndTiers = (selected.type === 'cooperative' || selected.type === 'ncm') && selected.type !== 'excluded';

            return `
                <div style="animation: fadeIn 0.3s ease;">
                    <!-- Header with Enterprise Info -->
                    <div style="
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        padding: 20px;
                        margin: -25px -25px 25px -25px;
                        border-radius: 0 0 16px 16px;
                        color: white;
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                    ">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="flex: 1;">
                                <h3 style="
                                    font-size: 18px;
                                    margin: 0 0 4px 0;
                                    font-weight: 600;
                                ">
                                    ${selected.name || 'Unnamed Enterprise'}
                                </h3>
                                <p style="margin: 0; opacity: 0.9; font-size: 13px;">
                                    ${this.getTypeName(selected.type)} • ID: ${selected.id.substring(0, 8)}...
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Basic Properties -->
                    <div class="property-group" style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 20px 0;
                            font-weight: 600;
                        ">Basic Properties</h4>

                        <div class="property-field" style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 13px;
                                color: #546e7a;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">Name</label>
                            <input type="text"
                                   value="${selected.name || ''}"
                                   onchange="CoopMaps.modules.properties.updateProperty('name', this.value)"
                                   placeholder="Enter enterprise name"
                                   style="
                                       width: 100%;
                                       padding: 12px 16px;
                                       border: 2px solid #e9ecef;
                                       border-radius: 8px;
                                       font-size: 14px;
                                       transition: all 0.2s ease;
                                       background: #f8f9fa;
                                   "
                                   onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                   onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                        </div>

                        <div class="property-field" style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 13px;
                                color: #546e7a;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">Size</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                ${CoopMaps.modules.enterprises.sizes.map((size, index) => `
                                    <button onclick="CoopMaps.modules.properties.updateSize(${size.id})"
                                            style="
                                                padding: 12px 8px;
                                                border: 2px solid ${currentSize === size.id ? '#3498db' : '#e9ecef'};
                                                background: ${currentSize === size.id ? '#3498db' : 'white'};
                                                color: ${currentSize === size.id ? 'white' : '#2c3e50'};
                                                border-radius: 8px;
                                                cursor: pointer;
                                                font-size: 12px;
                                                font-weight: ${currentSize === size.id ? '600' : '400'};
                                                transition: all 0.2s ease;
                                            "
                                            onmouseover="if(${currentSize} !== ${size.id}) { this.style.borderColor='#3498db'; this.style.background='#e3f2fd'; }"
                                            onmouseout="if(${currentSize} !== ${size.id}) { this.style.borderColor='#e9ecef'; this.style.background='white'; }">
                                        ${size.label}
                                    </button>
                                `).join('')}
                            </div>
                            <p style="
                                margin: 8px 0 0 0;
                                font-size: 11px;
                                color: #95a5a6;
                                text-align: center;
                            ">
                                Current: ${selected.width}×${selected.height}px
                            </p>
                        </div>

                        <div class="property-field">
                            <label style="
                                display: flex;
                                align-items: center;
                                cursor: pointer;
                                padding: 12px 16px;
                                background: ${selected.isGenericSet ? '#e8f5e9' : '#f8f9fa'};
                                border: 2px solid ${selected.isGenericSet ? '#4caf50' : '#e9ecef'};
                                border-radius: 8px;
                                transition: all 0.2s ease;
                            "
                            onmouseover="this.style.background='${selected.isGenericSet ? '#c8e6c9' : '#e3f2fd'}'"
                            onmouseout="this.style.background='${selected.isGenericSet ? '#e8f5e9' : '#f8f9fa'}'">
                                <input type="checkbox"
                                       ${selected.isGenericSet ? 'checked' : ''}
                                       onchange="CoopMaps.modules.properties.updateProperty('isGenericSet', this.checked)"
                                       style="
                                           width: 18px;
                                           height: 18px;
                                           margin-right: 12px;
                                           cursor: pointer;
                                       ">
                                <div>
                                    <div style="font-weight: 500; color: #2c3e50; margin-bottom: 2px;">
                                        Generic Set (Multiple Enterprises)
                                    </div>
                                    <div style="font-size: 12px; color: #7f8c8d;">
                                        Shows a stack effect to represent multiple enterprises
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div class="property-field" style="margin-top: 16px;">
                            <label style="
                                display: block;
                                font-size: 13px;
                                color: #546e7a;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">Fill Color</label>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="color"
                                       value="${selected.fill || '#ffffff'}"
                                       onchange="CoopMaps.modules.properties.updateProperty('fill', this.value)"
                                       style="
                                           width: 50px;
                                           height: 40px;
                                           border: 2px solid #e9ecef;
                                           border-radius: 8px;
                                           cursor: pointer;
                                           padding: 2px;
                                       ">
                                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                    ${['#ffffff', '#f8f9fa', '#e3f2fd', '#e8f5e9', '#fff9c4', '#ffccbc', '#f8bbd0', '#e1bee7'].map(color => `
                                        <button onclick="CoopMaps.modules.properties.updateProperty('fill', '${color}')"
                                                style="
                                                    width: 28px;
                                                    height: 28px;
                                                    background: ${color};
                                                    border: 2px solid ${selected.fill === color ? '#3498db' : '#dee2e6'};
                                                    border-radius: 6px;
                                                    cursor: pointer;
                                                    transition: all 0.2s;
                                                "
                                                onmouseover="this.style.transform='scale(1.1)'"
                                                onmouseout="this.style.transform='scale(1)'">
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    ${showRolesAndTiers ? `
                    <!-- Participation Roles -->
                    <div class="property-group" style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 12px 0;
                            font-weight: 600;
                        ">Participation Roles</h4>
                        <p style="
                            font-size: 12px;
                            color: #7f8c8d;
                            margin-bottom: 16px;
                            line-height: 1.5;
                        ">
                            Colored indicators appear across the top edge of the enterprise
                        </p>

                        ${this.renderRoleOption('producers', 'Producers', '#e74c3c', 'Red - Left position', selected.roles)}
                        ${this.renderRoleOption('users', 'Users', '#3498db', 'Blue - Center position', selected.roles)}
                        ${this.renderRoleOption('investors', 'Investors', '#27ae60', 'Green - Right position', selected.roles)}
                    </div>

                    <!-- Structural Composition -->
                    <div class="property-group" style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 12px 0;
                            font-weight: 600;
                        ">Structural Composition</h4>
                        <p style="
                            font-size: 12px;
                            color: #7f8c8d;
                            margin-bottom: 16px;
                            line-height: 1.5;
                        ">
                            Indicators appear on the left edge of the enterprise
                        </p>

                        <select onchange="CoopMaps.modules.properties.updateProperty('tier', this.value)"
                                style="
                                    width: 100%;
                                    padding: 12px 16px;
                                    border: 2px solid #e9ecef;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    background: #f8f9fa;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                "
                                onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                            <option value="none" ${selected.tier === 'none' || !selected.tier ? 'selected' : ''}>None (Empty indicators)</option>
                            <option value="primary" ${selected.tier === 'primary' ? 'selected' : ''}>Primary (Bottom indicator)</option>
                            <option value="secondary" ${selected.tier === 'secondary' ? 'selected' : ''}>Secondary (Middle indicator)</option>
                            <option value="tertiary" ${selected.tier === 'tertiary' ? 'selected' : ''}>Tertiary (Top indicator)</option>
                            <option value="hybrid-primary-secondary" ${selected.tier === 'hybrid-primary-secondary' ? 'selected' : ''}>Hybrid Primary-Secondary</option>
                            <option value="hybrid-secondary-tertiary" ${selected.tier === 'hybrid-secondary-tertiary' ? 'selected' : ''}>Hybrid Secondary-Tertiary</option>
			    <option value="hybrid-primary-tertiary" ${selected.tier === 'hybrid-primary-tertiary' ? 'selected' : ''}>Hybrid Primary-Tertiary</option>
			    <option value="hybrid-all" ${selected.tier === 'hybrid-all' ? 'selected' : ''}>Hybrid All Tiers</option>
                        </select>
                    </div>
                    ` : ''}

                    <!-- Position -->
                    <div class="property-group" style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 20px 0;
                            font-weight: 600;
                        ">Position</h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="property-field">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: #546e7a;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                ">X Position</label>
                                <input type="number"
                                       value="${Math.round(selected.x)}"
                                       onchange="CoopMaps.modules.properties.updateProperty('x', parseInt(this.value))"
                                       style="
                                           width: 100%;
                                           padding: 12px 16px;
                                           border: 2px solid #e9ecef;
                                           border-radius: 8px;
                                           font-size: 14px;
                                           transition: all 0.2s ease;
                                           background: #f8f9fa;
                                       "
                                       onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                       onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                            </div>

                            <div class="property-field">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: #546e7a;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                ">Y Position</label>
                                <input type="number"
                                       value="${Math.round(selected.y)}"
                                       onchange="CoopMaps.modules.properties.updateProperty('y', parseInt(this.value))"
                                       style="
                                           width: 100%;
                                           padding: 12px 16px;
                                           border: 2px solid #e9ecef;
                                           border-radius: 8px;
                                           font-size: 14px;
                                           transition: all 0.2s ease;
                                           background: #f8f9fa;
                                       "
                                       onfocus="this.style.borderColor='#3498db'; this.style.background='white';"
                                       onblur="this.style.borderColor='#e9ecef'; this.style.background='#f8f9fa';">
                            </div>
                        </div>
                    </div>

                    <!-- Relationships Info -->
                    ${this.renderRelationshipsInfo(selected)}

                    <!-- Actions -->
                    <div class="property-group" style="
                        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                        padding: 20px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(238, 90, 36, 0.2);
                        text-align: center;
                    ">
                        <button onclick="CoopMaps.modules.properties.deleteSelected()"
                                style="
                                    background: white;
                                    color: #e74c3c;
                                    border: none;
                                    padding: 12px 24px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    border-radius: 8px;
                                    transition: all 0.2s ease;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 8px;
                                "
                                onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                            Delete Enterprise
                        </button>
                    </div>

                    ${selected.dateAdded ? `
                    <div style="
                        text-align: center;
                        font-size: 11px;
                        color: #95a5a6;
                        margin-top: 20px;
                    ">
                        Added: ${new Date(selected.dateAdded).toLocaleString()}
                    </div>
                    ` : ''}
                </div>

                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
            `;
        },

        renderRelationshipsInfo(selected) {
            const relationships = CoopMaps.state.data.relationships;
            const incoming = relationships.filter(r => r.endId === selected.id);
            const outgoing = relationships.filter(r => r.startId === selected.id);

            if (incoming.length === 0 && outgoing.length === 0) {
                return '';
            }

            return `
                <div class="property-group" style="
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e9ecef;
                ">
                    <h4 style="
                        font-size: 16px;
                        color: #2c3e50;
                        margin: 0 0 16px 0;
                        font-weight: 600;
                    ">Relationships</h4>

                    ${outgoing.length > 0 ? `
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 13px; color: #546e7a; font-weight: 500; margin-bottom: 8px;">
                            Outgoing (${outgoing.length})
                        </div>
                        ${outgoing.map(rel => {
                            const target = CoopMaps.state.data.enterprises.find(e => e.id === rel.endId);
                            const type = CoopMaps.modules.relationships ?
                                CoopMaps.modules.relationships.relationshipTypes.find(t => t.id === rel.type) : null;
                            return target ? `
                                <div style="
                                    font-size: 12px;
                                    color: #7f8c8d;
                                    padding: 4px 0;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                ">
                                    <span style="
                                        background: ${type ? type.color : '#95a5a6'};
                                        color: ${type && type.color === '#f1c40f' ? '#2c3e50' : 'white'};
                                        padding: 2px 6px;
                                        border-radius: 4px;
                                        font-size: 10px;
                                        font-weight: bold;
                                    ">${type ? type.id : 'Unknown'}</span>
                                    → ${target.name || 'Unnamed'}
                                </div>
                            ` : '';
                        }).join('')}
                    </div>
                    ` : ''}

                    ${incoming.length > 0 ? `
                    <div>
                        <div style="font-size: 13px; color: #546e7a; font-weight: 500; margin-bottom: 8px;">
                            Incoming (${incoming.length})
                        </div>
                        ${incoming.map(rel => {
                            const source = CoopMaps.state.data.enterprises.find(e => e.id === rel.startId);
                            const type = CoopMaps.modules.relationships ?
                                CoopMaps.modules.relationships.relationshipTypes.find(t => t.id === rel.type) : null;
                            return source ? `
                                <div style="
                                    font-size: 12px;
                                    color: #7f8c8d;
                                    padding: 4px 0;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                ">
                                    <span style="
                                        background: ${type ? type.color : '#95a5a6'};
                                        color: ${type && type.color === '#f1c40f' ? '#2c3e50' : 'white'};
                                        padding: 2px 6px;
                                        border-radius: 4px;
                                        font-size: 10px;
                                        font-weight: bold;
                                    ">${type ? type.id : 'Unknown'}</span>
                                    ← ${source.name || 'Unnamed'}
                                </div>
                            ` : '';
                        }).join('')}
                    </div>
                    ` : ''}
                </div>
            `;
        },

        renderRoleOption(role, label, color, description, selectedRoles) {
            const isChecked = selectedRoles?.includes(role);
            return `
                <label style="
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    padding: 12px 16px;
                    background: ${isChecked ? color + '10' : '#f8f9fa'};
                    border: 2px solid ${isChecked ? color : '#e9ecef'};
                    border-radius: 8px;
                    margin-bottom: 8px;
                    transition: all 0.2s ease;
                "
                onmouseover="this.style.background='${isChecked ? color + '20' : '#e3f2fd'}'"
                onmouseout="this.style.background='${isChecked ? color + '10' : '#f8f9fa'}'">
                    <input type="checkbox"
                           ${isChecked ? 'checked' : ''}
                           onchange="CoopMaps.modules.properties.toggleRole('${role}')"
                           style="
                               width: 18px;
                               height: 18px;
                               margin-right: 12px;
                               cursor: pointer;
                           ">
                    <div style="
                        width: 24px;
                        height: 24px;
                        background: ${color};
                        border-radius: 4px;
                        margin-right: 12px;
                    "></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #2c3e50;">
                            ${label}
                        </div>
                        <div style="font-size: 12px; color: #7f8c8d;">
                            ${description}
                        </div>
                    </div>
                </label>
            `;
        },

        getTypeName(typeId) {
            if (!CoopMaps.modules.enterprises) return typeId;
            const type = CoopMaps.modules.enterprises.enterpriseTypes.find(t => t.id === typeId);
            return type ? type.name : typeId;
        },

        updateProperty(property, value) {
            const selected = CoopMaps.state.data.selectedItem;
            if (selected) {
                // Save state for undo
                CoopMaps.saveState();

                selected[property] = value;

                // Mark as dirty for persistence
                document.dispatchEvent(new CustomEvent('diagram-changed'));

                CoopMaps.modules.canvas.render();

                // Re-render properties panel to show updated values
                if (property === 'name') {
                    const sidebarContent = document.getElementById('sidebar-content');
                    if (sidebarContent) {
                        sidebarContent.innerHTML = this.render();
                    }
                }
            }
        },

        updateSize(sizeId) {
            const selected = CoopMaps.state.data.selectedItem;
            const size = CoopMaps.modules.enterprises.sizes.find(s => s.id == sizeId);

            if (selected && size) {
                CoopMaps.saveState();

                // Animate size change
                const startWidth = selected.width;
                const startHeight = selected.height;
                const targetWidth = size.width;
                const targetHeight = size.height;

                const duration = 200;
                const startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);

                    selected.width = startWidth + (targetWidth - startWidth) * easeProgress;
                    selected.height = startHeight + (targetHeight - startHeight) * easeProgress;

                    CoopMaps.modules.canvas.render();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Mark as dirty
                        document.dispatchEvent(new CustomEvent('diagram-changed'));

                        // Update UI
                        const sidebarContent = document.getElementById('sidebar-content');
                        if (sidebarContent) {
                            sidebarContent.innerHTML = this.render();
                        }
                    }
                };

                animate();
            }
        },

        toggleRole(role) {
            const selected = CoopMaps.state.data.selectedItem;
            if (!selected) return;

            CoopMaps.saveState();

            if (!selected.roles) {
                selected.roles = [];
            }

            const index = selected.roles.indexOf(role);
            if (index > -1) {
                selected.roles.splice(index, 1);
            } else {
                selected.roles.push(role);
            }

            // Mark as dirty
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            CoopMaps.modules.canvas.render();

            // Update UI with animation
            const sidebarContent = document.getElementById('sidebar-content');
            if (sidebarContent) {
                sidebarContent.innerHTML = this.render();
            }
        },

        updateDiagramProperty(property, value) {
            CoopMaps.saveState();
            CoopMaps.state.data.diagramProperties[property] = value;

            // Mark as dirty
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }
        },

        updateScopeProperty(property, value) {
            CoopMaps.saveState();

            // Ensure scope object exists
            if (!CoopMaps.state.data.diagramProperties.scope) {
                CoopMaps.state.data.diagramProperties.scope = {
                    geographic: 'local',
                    economic: '',
                    userDefined: ''
                };
            }

            CoopMaps.state.data.diagramProperties.scope[property] = value;

            // Mark as dirty
            document.dispatchEvent(new CustomEvent('diagram-changed'));
        },

        deleteSelected() {
            const selected = CoopMaps.state.data.selectedItem;
            if (selected && confirm(`Delete "${selected.name || 'this enterprise'}"?\n\nThis will also remove any relationships connected to this enterprise.`)) {
                CoopMaps.saveState();

                // Animate deletion
                const originalWidth = selected.width;
                const originalHeight = selected.height;
                const duration = 300;
                const startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);

                    selected.width = originalWidth * (1 - easeProgress);
                    selected.height = originalHeight * (1 - easeProgress);

                    CoopMaps.modules.canvas.render();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Remove any relationships connected to this enterprise
                        CoopMaps.state.data.relationships = CoopMaps.state.data.relationships.filter(
                            rel => rel.startId !== selected.id && rel.endId !== selected.id
                        );

                        // Remove the enterprise
                        const index = CoopMaps.state.data.enterprises.indexOf(selected);
                        if (index > -1) {
                            CoopMaps.state.data.enterprises.splice(index, 1);
                            CoopMaps.state.data.selectedItem = null;

                            // Mark as dirty
                            document.dispatchEvent(new CustomEvent('diagram-changed'));

                            CoopMaps.modules.canvas.render();

                            // Show diagram properties
                            const sidebarContent = document.getElementById('sidebar-content');
                            if (sidebarContent) {
                                sidebarContent.innerHTML = this.render();
                            }
                        }
                    }
                };

                animate();
            }
        }
    });

    console.log('properties.module.js loaded successfully');
})();
