/**
 * Co-op Maps - Manuals Module
 * User documentation and help system with modal dialog and comprehensive content
 */

(function() {
    'use strict';

    // Manuals Module - User documentation and help system
    CoopMaps.registerModule('manuals', {
        currentSection: 'getting-started',
        isDialogOpen: false,

        init() {
            console.log('Manuals module initialized');
        },

        showManualDialog() {
            if (this.isDialogOpen) return;

            this.isDialogOpen = true;

            const useAnimation = !CoopMaps.isExpressMode;
            const expressStyles = CoopMaps.isExpressMode;

            // Create modal dialog
            const modal = document.createElement('div');
            modal.id = 'manualModal';
            modal.className = 'modal';
            modal.style.cssText = `
                display: flex;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                align-items: center;
                justify-content: center;
                ${useAnimation ? 'backdrop-filter: blur(5px);' : ''}
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: white;
                    border-radius: ${expressStyles ? '0' : '16px'};
                    padding: 0;
                    max-width: 900px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: ${expressStyles ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                    border: ${expressStyles ? '2px solid #7f8c8d' : 'none'};
                    ${useAnimation ? 'animation: slideIn 0.3s ease;' : ''}
                    display: flex;
                    flex-direction: column;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        padding: 30px;
                        color: white;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                    ">
                        <div>
                            <h2 style="
                                font-size: 28px;
                                margin: 0 0 8px 0;
                                font-weight: 600;
                            ">User Manual</h2>
                            <p style="
                                margin: 0;
                                opacity: 0.9;
                                font-size: 15px;
                            ">Learn how to use Co-op Maps effectively</p>
                        </div>
                        <button onclick="CoopMaps.modules.manuals.closeManualDialog()" style="
                            background: rgba(255, 255, 255, 0.2);
                            border: none;
                            width: 44px;
                            height: 44px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            color: white;
                            font-size: 28px;
                        "
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'; this.style.transform='scale(1.1)';"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.transform='scale(1)';">
                            ×
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div style="
                        flex: 1;
                        display: flex;
                        overflow: hidden;
                    ">
                        <!-- Sidebar Navigation -->
                        <div style="
                            width: 200px;
                            background: #f8f9fa;
                            padding: 20px 0;
                            overflow-y: auto;
                            flex-shrink: 0;
                            border-right: 1px solid #e9ecef;
                        ">
                            ${this.renderManualNavigation()}
                        </div>

                        <!-- Content -->
                        <div id="manualContent" style="
                            flex: 1;
                            padding: 40px;
                            overflow-y: auto;
                            background: white;
                        ">
                            ${this.renderSectionContent(this.currentSection)}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="
                        padding: 20px 30px;
                        background: #f8f9fa;
                        border-top: 1px solid #e9ecef;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                    ">
                        <div style="
                            font-size: 13px;
                            color: #7f8c8d;
                        ">
                            Co-op Maps v${CoopMaps.version} User Manual
                        </div>
                        <button onclick="CoopMaps.modules.manuals.printManual()" style="
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(52, 152, 219, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.2)';">
                            Print Manual
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add styles
            this.addManualStyles();

            // Handle escape key
            this.escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeManualDialog();
                }
            };
            document.addEventListener('keydown', this.escapeHandler);

            // Handle click outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeManualDialog();
                }
            });
        },

        closeManualDialog() {
            const modal = document.getElementById('manualModal');
            if (modal) {
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modal.remove();
                    this.isDialogOpen = false;
                }, 300);
            }

            // Remove escape handler
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
                this.escapeHandler = null;
            }
        },

        renderManualNavigation() {
            const sections = [
                { id: 'getting-started', label: 'Getting Started', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>' },
                { id: 'enterprises', label: 'Enterprises', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-8h6v8"/></svg>' },
                { id: 'relationships', label: 'Relationships', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' },
                { id: 'diagrams', label: 'Diagrams', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
                { id: 'shortcuts', label: 'Shortcuts', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h8M6 16h.001M10 16h8"/></svg>' },
                { id: 'tips', label: 'Tips & Tricks', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.77.77M1 12h1M4.22 19.78l.77-.77M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/></svg>' }
            ];

            return sections.map(section => `
                <div class="manual-nav-item ${this.currentSection === section.id ? 'active' : ''}"
                     onclick="CoopMaps.modules.manuals.switchSection('${section.id}')"
                     style="
                        padding: 12px 24px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: ${this.currentSection === section.id ? '#3498db' : '#7f8c8d'};
                        background: ${this.currentSection === section.id ? 'white' : 'transparent'};
                        border-left: 4px solid ${this.currentSection === section.id ? '#3498db' : 'transparent'};
                        font-weight: ${this.currentSection === section.id ? '600' : '500'};
                     "
                     onmouseover="if('${this.currentSection}' !== '${section.id}') { this.style.background='#ecf0f1'; this.style.color='#2c3e50'; }"
                     onmouseout="if('${this.currentSection}' !== '${section.id}') { this.style.background='transparent'; this.style.color='#7f8c8d'; }">
                    <span style="display: flex; align-items: center;">${section.icon}</span>
                    <span>${section.label}</span>
                </div>
            `).join('');
        },

        render() {
            const section = this.currentSection;

            return `
                <div style="animation: fadeIn 0.3s ease;">
                    <!-- Manual Navigation -->
                    <div style="
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        padding: 20px;
                        margin: -25px -25px 25px -25px;
                        border-radius: 0 0 16px 16px;
                        color: white;
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                    ">
                        <h3 style="
                            font-size: 20px;
                            margin: 0 0 8px 0;
                            font-weight: 600;
                        ">User Manual</h3>
                        <p style="
                            margin: 0;
                            opacity: 0.9;
                            font-size: 14px;
                        ">Learn how to use Co-op Maps effectively</p>
                    </div>

                    <!-- Section Tabs -->
                    <div style="
                        display: flex;
                        gap: 8px;
                        margin-bottom: 20px;
                        flex-wrap: wrap;
                    ">
                        ${this.renderSectionTab('getting-started', 'Getting Started')}
                        ${this.renderSectionTab('enterprises', 'Enterprises')}
                        ${this.renderSectionTab('relationships', 'Relationships')}
                        ${this.renderSectionTab('diagrams', 'Diagrams')}
                        ${this.renderSectionTab('shortcuts', 'Shortcuts')}
                        ${this.renderSectionTab('tips', 'Tips & Tricks')}
                    </div>

                    <!-- Content Area -->
                    <div style="
                        background: white;
                        padding: 25px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                        max-height: 60vh;
                        overflow-y: auto;
                    ">
                        ${this.renderSectionContent(section)}
                    </div>

                    <!-- Quick Help -->
                    <div style="
                        margin-top: 20px;
                        padding: 20px;
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                        border-radius: 12px;
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="
                            font-size: 16px;
                            color: #2c3e50;
                            margin: 0 0 12px 0;
                            font-weight: 600;
                        ">Need More Help?</h4>
                        <p style="
                            font-size: 13px;
                            color: #7f8c8d;
                            margin: 0 0 12px 0;
                            line-height: 1.6;
                        ">
                            This manual covers the basics of using Co-op Maps.
                            For additional support or to report issues, please visit our support page.
                        </p>
                        <button onclick="CoopMaps.modules.manuals.showManualDialog()" style="
                            padding: 10px 20px;
                            background: white;
                            color: #3498db;
                            border: 2px solid #3498db;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.background='#3498db'; this.style.color='white';"
                        onmouseout="this.style.background='white'; this.style.color='#3498db';">
                            Open Full Manual
                        </button>
                    </div>
                </div>

                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .manual-content h4 {
                        color: #2c3e50;
                        margin: 20px 0 12px 0;
                        font-size: 16px;
                        font-weight: 600;
                    }

                    .manual-content p {
                        color: #546e7a;
                        line-height: 1.6;
                        margin-bottom: 12px;
                    }

                    .manual-content ul {
                        margin: 0 0 16px 20px;
                        color: #546e7a;
                    }

                    .manual-content li {
                        margin-bottom: 8px;
                        line-height: 1.5;
                    }

                    .manual-content code {
                        background: #f8f9fa;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-family: monospace;
                        font-size: 13px;
                        color: #e74c3c;
                    }
                </style>
            `;
        },

        renderSectionTab(id, label) {
            const isActive = this.currentSection === id;
            return `
                <button
                    onclick="CoopMaps.modules.manuals.switchSection('${id}')"
                    style="
                        padding: 8px 16px;
                        background: ${isActive ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : 'white'};
                        color: ${isActive ? 'white' : '#7f8c8d'};
                        border: 2px solid ${isActive ? '#3498db' : '#e9ecef'};
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: ${isActive ? '600' : '500'};
                        transition: all 0.2s ease;
                    "
                    onmouseover="if(!${isActive}) { this.style.borderColor='#3498db'; this.style.background='#f8f9fa'; }"
                    onmouseout="if(!${isActive}) { this.style.borderColor='#e9ecef'; this.style.background='white'; }">
                    ${label}
                </button>
            `;
        },

        switchSection(section) {
            this.currentSection = section;

            // Update in sidebar view
            const content = document.getElementById('sidebar-content');
            if (content && CoopMaps.state.ui.activeTab === 'manuals') {
                content.innerHTML = this.render();
            }

            // Update in modal view
            const manualContent = document.getElementById('manualContent');
            if (manualContent) {
                manualContent.innerHTML = this.renderSectionContent(section);

                // Update navigation
                document.querySelectorAll('.manual-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                const activeItem = document.querySelector(`.manual-nav-item[onclick*="${section}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }
            }
        },

        renderSectionContent(section) {
            const content = {
                'getting-started': this.getGettingStartedContent(),
                'enterprises': this.getEnterprisesContent(),
                'relationships': this.getRelationshipsContent(),
                'diagrams': this.getDiagramsContent(),
                'shortcuts': this.getShortcutsContent(),
                'tips': this.getTipsContent()
            };

            return `<div class="manual-content">${content[section] || 'Content not found'}</div>`;
        },

        getGettingStartedContent() {
            return `
                <h4>Welcome to Co-op Maps</h4>
                <p>
                    Co-op Maps is a powerful tool for mapping and visualizing co-operative ecosystems.
                    This manual will help you get started with creating your first diagram.
                </p>

                <h4>Basic Workflow</h4>
                <ol>
                    <li><strong>Add Enterprises:</strong> Click on enterprise types in the Symbols tab and drag them onto the canvas</li>
                    <li><strong>Edit Properties:</strong> Click on any enterprise to edit its name, size, and other properties</li>
                    <li><strong>Create Relationships:</strong> Press 'R' or click the relationship button, then click two enterprises to connect them</li>
                    <li><strong>Save Your Work:</strong> Use the Diagrams tab to save, load, and manage your diagrams</li>
                </ol>

                <h4>Canvas Navigation</h4>
                <ul>
                    <li><strong>Pan:</strong> Click and drag on empty canvas space (cursor changes to grabbing hand)</li>
                    <li><strong>Zoom:</strong> Use mouse wheel or zoom buttons in toolbar</li>
                    <li><strong>Fit to Content:</strong> Click the Fit button to zoom to show all enterprises</li>
                    <li><strong>Select:</strong> Click on an enterprise to select it</li>
                    <li><strong>Multi-select:</strong> Hold Shift and click multiple enterprises to select them for alignment</li>
                </ul>

                <h4>Canvas Sizes</h4>
                <p>
                    Choose between A4, A3, A2, or A1 landscape canvas sizes using the dropdown in the toolbar.
                    The canvas automatically adjusts zoom to fit your selected size on screen.
                </p>

                <h4>Display Options</h4>
                <ul>
                    <li><strong>Dark Mode:</strong> Toggle dark mode for comfortable viewing in low-light environments</li>
                    <li><strong>Minimap:</strong> Enable the minimap to see an overview of your diagram and quickly navigate (Deluxe only)</li>
                    <li><strong>Snap to Grid:</strong> Toggle grid snapping for precise positioning</li>
                </ul>

                <h4>First Steps</h4>
                <ol>
                    <li>Start by dragging a Co-operative enterprise from the Symbols tab onto the canvas</li>
                    <li>Click on it and rename it in the Properties tab</li>
                    <li>Add more enterprises to represent your ecosystem</li>
                    <li>Connect them with relationships to show how they interact</li>
                    <li>Save your diagram using Ctrl+S or the Save button</li>
                </ol>
            `;
        },

        getEnterprisesContent() {
            return `
                <h4>Enterprise Types</h4>
                <p>Co-op Maps supports six different enterprise types:</p>

                <ul>
                    <li><strong>Co-operative (Rectangle):</strong> Member-owned and democratically controlled organizations</li>
                    <li><strong>Non-co-operative Mutual (Rounded Rectangle):</strong> Mutual benefit organizations without democratic member control</li>
                    <li><strong>Social Enterprise (Pill Shape):</strong> Businesses with social or environmental objectives</li>
                    <li><strong>Private Enterprise (Ellipse):</strong> Privately owned for-profit business</li>
                    <li><strong>State Enterprise (Diamond):</strong> Government-owned and operated enterprises</li>
                    <li><strong>Excluded Business (Rectangle):</strong> Businesses not part of the co-operative analysis</li>
                </ul>

                <h4>Adding Enterprises</h4>
                <p>There are two ways to add enterprises:</p>
                <ul>
                    <li><strong>Drag and Drop:</strong> Drag from the symbols panel onto the canvas</li>
                    <li><strong>Click to Add:</strong> Click a symbol to add it at the canvas center</li>
                </ul>

                <h4>Enterprise Properties</h4>
                <p>Select an enterprise and switch to the Properties tab to edit:</p>
                <ul>
                    <li><strong>Name:</strong> The display name of the enterprise</li>
                    <li><strong>Size:</strong> Choose from Small, Medium, or Large</li>
                    <li><strong>Generic Set:</strong> Enable to show multiple enterprises as a stack</li>
                    <li><strong>Position:</strong> Fine-tune X and Y coordinates</li>
                </ul>

                <h4>Participation Roles (Co-ops & NCMs only)</h4>
                <p>Colored indicators across the top show participation roles:</p>
                <ul>
                    <li><strong>Red (P):</strong> Producers - Left position</li>
                    <li><strong>Blue (U):</strong> Users - Center position</li>
                    <li><strong>Green (I):</strong> Investors - Right position</li>
                </ul>

                <h4>Structural Tiers (Co-ops & NCMs only)</h4>
                <p>Indicators on the left show position in value chain:</p>
                <ul>
                    <li><strong>Primary (P):</strong> Raw materials, production - Bottom</li>
                    <li><strong>Secondary (S):</strong> Processing, manufacturing - Middle</li>
                    <li><strong>Tertiary (T):</strong> Retail, distribution, services - Top</li>
                </ul>

                <h4>Enterprise Customization</h4>
                <ul>
                    <li><strong>Fill Color:</strong> Change the background color using preset colors or a custom color picker</li>
                    <li><strong>Logo/Image:</strong> Add a logo or image to any enterprise (click Logo button or use context menu)</li>
                    <li><strong>Lock/Unlock:</strong> Lock enterprises to prevent accidental movement</li>
                </ul>

                <h4>Context Menu</h4>
                <p>Right-click on any enterprise to access:</p>
                <ul>
                    <li><strong>Duplicate:</strong> Create a copy offset from the original</li>
                    <li><strong>Delete:</strong> Remove the enterprise and its relationships</li>
                    <li><strong>Lock/Unlock:</strong> Toggle position locking</li>
                    <li><strong>Add Logo:</strong> Import an image for the enterprise</li>
                    <li><strong>Bring to Front:</strong> Move above other enterprises</li>
                    <li><strong>Send to Back:</strong> Move behind other enterprises</li>
                </ul>
            `;
        },

        getRelationshipsContent() {
            return `
                <h4>Creating Relationships</h4>
                <p>To create relationships between enterprises:</p>
                <ol>
                    <li>Click the "Create Relationship" button or press 'R'</li>
                    <li>Click the first enterprise (start point)</li>
                    <li>Click the second enterprise (end point)</li>
                    <li>Select the relationship type from the dialog</li>
                </ol>

                <h4>Relationship Types</h4>
                <ul>
                    <li><strong>G - Governance:</strong> Has a reserved governance role in</li>
                    <li><strong>I - Investment:</strong> Holds an investment in</li>
                    <li><strong>L - Asset Lock:</strong> Has an asset lock to</li>
                    <li><strong>M - Membership:</strong> Is a member of</li>
                    <li><strong>O - Ownership:</strong> Owns</li>
                    <li><strong>P - Partnership:</strong> Is a partner member of</li>
                    <li><strong>S - Supply:</strong> Supplies</li>
                    <li><strong>Inner Segment:</strong> Bidirectional relationship (special type)</li>
                </ul>

                <h4>Relationship Markers</h4>
                <p>When connecting to generic sets, you can specify scope:</p>
                <ul>
                    <li><strong>Individual:</strong> Connection to one enterprise (normal arrow)</li>
                    <li><strong>Entire Set:</strong> Connection to all enterprises (filled marker)</li>
                    <li><strong>Subset:</strong> Connection to some enterprises (hollow marker)</li>
                </ul>

                <h4>Managing Relationships</h4>
                <ul>
                    <li>Relationships appear as lines with colored badges showing the type</li>
                    <li>To delete a relationship, you must delete one of the connected enterprises</li>
                    <li>Use Auto Layout to automatically arrange connected enterprises</li>
                    <li>Dashed lines indicate subset connections</li>
                </ul>

                <h4>Visual Indicators</h4>
                <p>Relationships use visual cues to convey information:</p>
                <ul>
                    <li><strong>Line Style:</strong> Solid for full connections, dashed for subsets</li>
                    <li><strong>Badges:</strong> Colored circles with letters indicate relationship type</li>
                    <li><strong>Arrows:</strong> Show direction of relationship</li>
                    <li><strong>Markers:</strong> Special symbols for generic set connections</li>
                </ul>
            `;
        },

        getDiagramsContent() {
            return `
                <h4>Saving Diagrams</h4>
                <p>Your work is saved in your browser's local storage:</p>
                <ul>
                    <li><strong>Save Current:</strong> Save changes to the current diagram (Ctrl+S)</li>
                    <li><strong>Save As New:</strong> Create a new saved diagram</li>
                    <li><strong>Auto-save:</strong> Enable to automatically save every minute</li>
                </ul>

                <h4>Managing Diagrams</h4>
                <p>The Diagrams tab shows all your saved diagrams with options to:</p>
                <ul>
                    <li><strong>Load:</strong> Open a saved diagram</li>
                    <li><strong>Rename:</strong> Change the diagram name</li>
                    <li><strong>Duplicate:</strong> Create a copy of a diagram</li>
                    <li><strong>Delete:</strong> Remove a diagram permanently</li>
                </ul>

                <h4>Import/Export</h4>
                <ul>
                    <li><strong>Export to File:</strong> Save diagram as .coopmaps file for backup or sharing</li>
                    <li><strong>Import from File:</strong> Load a previously exported diagram</li>
                    <li><strong>Export as Image:</strong> Save as PNG, SVG, or PDF via Export button</li>
                </ul>

                <h4>Diagram Properties</h4>
                <p>Edit diagram metadata in the Properties tab when nothing is selected:</p>
                <ul>
                    <li><strong>Title:</strong> Name of your diagram</li>
                    <li><strong>Author:</strong> Your name or organization</li>
                    <li><strong>Date:</strong> Creation or modification date</li>
                    <li><strong>WDR:</strong> Worldwide Diagram Reference (optional)</li>
                    <li><strong>Scope:</strong> Geographic extent, time period, and economic sectors</li>
                </ul>

                <h4>Storage Management</h4>
                <p>Monitor your browser storage usage:</p>
                <ul>
                    <li>Storage meter shows how much space is used</li>
                    <li>Delete old diagrams to free up space</li>
                    <li>Export important diagrams as backup</li>
                    <li>Browser typically allows 5-10MB of storage</li>
                </ul>
            `;
        },

        getShortcutsContent() {
            return `
                <h4>Keyboard Shortcuts</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 2px solid #e9ecef;">
                        <th style="padding: 12px; text-align: left; color: #2c3e50;">Action</th>
                        <th style="padding: 12px; text-align: left; color: #2c3e50;">Windows/Linux</th>
                        <th style="padding: 12px; text-align: left; color: #2c3e50;">Mac</th>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Save Diagram</td>
                        <td style="padding: 12px;"><code>Ctrl+S</code></td>
                        <td style="padding: 12px;"><code>Cmd+S</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Undo</td>
                        <td style="padding: 12px;"><code>Ctrl+Z</code></td>
                        <td style="padding: 12px;"><code>Cmd+Z</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Redo</td>
                        <td style="padding: 12px;"><code>Ctrl+Shift+Z</code></td>
                        <td style="padding: 12px;"><code>Cmd+Shift+Z</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Copy Selected</td>
                        <td style="padding: 12px;"><code>Ctrl+C</code></td>
                        <td style="padding: 12px;"><code>Cmd+C</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Paste</td>
                        <td style="padding: 12px;"><code>Ctrl+V</code></td>
                        <td style="padding: 12px;"><code>Cmd+V</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Duplicate</td>
                        <td style="padding: 12px;"><code>Ctrl+D</code></td>
                        <td style="padding: 12px;"><code>Cmd+D</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Select All</td>
                        <td style="padding: 12px;"><code>Ctrl+A</code></td>
                        <td style="padding: 12px;"><code>Cmd+A</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Delete Selected</td>
                        <td style="padding: 12px;" colspan="2"><code>Delete</code> or <code>Backspace</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Relationship Mode</td>
                        <td style="padding: 12px;" colspan="2"><code>R</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Nudge 1px</td>
                        <td style="padding: 12px;" colspan="2"><code>Arrow Keys</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Nudge 10px</td>
                        <td style="padding: 12px;" colspan="2"><code>Shift+Arrow Keys</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Show Shortcuts</td>
                        <td style="padding: 12px;" colspan="2"><code>?</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f8f9fa;">
                        <td style="padding: 12px;">Exit Mode/Dialog</td>
                        <td style="padding: 12px;" colspan="2"><code>Escape</code></td>
                    </tr>
                </table>

                <h4>Mouse Controls</h4>
                <ul>
                    <li><strong>Left Click:</strong> Select enterprise</li>
                    <li><strong>Shift+Click:</strong> Add/remove from multi-selection (for alignment tools)</li>
                    <li><strong>Right Click:</strong> Context menu with actions</li>
                    <li><strong>Drag Enterprise:</strong> Move selected enterprise (unless locked)</li>
                    <li><strong>Drag Canvas:</strong> Pan the view (cursor shows grab hand)</li>
                    <li><strong>Scroll Wheel:</strong> Zoom in/out</li>
                </ul>

                <h4>Toolbar Buttons</h4>
                <p>Quick access to common actions:</p>
                <ul>
                    <li><strong>Undo/Redo:</strong> Navigate through action history</li>
                    <li><strong>New:</strong> Create a new blank diagram</li>
                    <li><strong>Clear:</strong> Remove all enterprises and relationships</li>
                    <li><strong>Auto Layout:</strong> Automatically arrange your diagram</li>
                    <li><strong>Connector Style:</strong> Toggle between orthogonal (right-angle) and direct (straight-line) connectors</li>
                    <li><strong>Create Relationship:</strong> Enter relationship mode to connect enterprises</li>
                    <li><strong>Zoom Controls:</strong> Adjust view scale (+/- buttons, zoom dropdown)</li>
                    <li><strong>Fit:</strong> Zoom to show all content on screen</li>
                    <li><strong>Snap:</strong> Toggle grid snapping for precise positioning</li>
                    <li><strong>Align:</strong> Alignment and distribution tools for multiple selected items</li>
                    <li><strong>Note:</strong> Add text annotations to your diagram</li>
                    <li><strong>Logo:</strong> Import an image/logo for the selected enterprise</li>
                    <li><strong>Map:</strong> Toggle the minimap for navigation (Deluxe only)</li>
                    <li><strong>Dark Mode:</strong> Toggle light/dark theme</li>
                    <li><strong>Export:</strong> Save as PNG, SVG, or PDF</li>
                    <li><strong>Print:</strong> Print the current diagram</li>
                    <li><strong>Symbol Key:</strong> View reference guide</li>
                    <li><strong>Manual:</strong> Open this help guide</li>
                </ul>

                <h4>Connector Styles</h4>
                <p>Co-op Maps supports two connector styles for relationships:</p>
                <ul>
                    <li><strong>Orthogonal (Default):</strong> Connectors use right angles, creating clean paths that route around enterprises. Best for professional diagrams and complex layouts.</li>
                    <li><strong>Direct:</strong> Connectors use straight lines between enterprises. Best for simple diagrams or when showing direct connections.</li>
                    <li><strong>Toggle:</strong> Click the connector style button (shows └─ or /) to switch between styles.</li>
                    <li><strong>Persistence:</strong> Your connector style preference is saved with each diagram.</li>
                </ul>
            `;
        },

        getTipsContent() {
            return `
                <h4>Pro Tips</h4>
                <ul>
                    <li><strong>Use Auto Layout:</strong> Let the algorithm arrange your diagram optimally, especially useful for complex relationship networks</li>
                    <li><strong>Generic Sets:</strong> Use these to represent multiple similar enterprises without cluttering your diagram</li>
                    <li><strong>Custom Colors:</strong> Use fill colors to highlight important enterprises or group related ones visually</li>
                    <li><strong>Add Logos:</strong> Import company logos or icons to make enterprises instantly recognizable</li>
                    <li><strong>Lock Position:</strong> Lock important enterprises to prevent accidental movement while editing others</li>
                    <li><strong>Dark Mode:</strong> Switch to dark mode for comfortable viewing during extended sessions</li>
                    <li><strong>Minimap:</strong> Enable the minimap for quick navigation in large diagrams (Deluxe only)</li>
                    <li><strong>Export Options:</strong> Export as SVG for editing in design software, PDF for reports</li>
                    <li><strong>Save Often:</strong> Use Ctrl+S frequently or enable auto-save</li>
                </ul>

                <h4>Best Practices</h4>
                <ul>
                    <li><strong>Start Simple:</strong> Begin with key enterprises, then add supporting ones</li>
                    <li><strong>Name Clearly:</strong> Use descriptive names that explain the enterprise's role</li>
                    <li><strong>Group Related:</strong> Position related enterprises near each other</li>
                    <li><strong>Document Metadata:</strong> Fill in diagram properties for future reference</li>
                    <li><strong>Use Tiers:</strong> Show value chain position with tier indicators</li>
                    <li><strong>Regular Backups:</strong> Export important diagrams periodically</li>
                </ul>

                <h4>Common Issues</h4>
                <ul>
                    <li><strong>Can't see relationships:</strong> Use Auto Layout to spread enterprises apart</li>
                    <li><strong>Diagram too crowded:</strong> Switch to A3 canvas or use generic sets</li>
                    <li><strong>Lost work:</strong> Enable auto-save to prevent data loss</li>
                    <li><strong>Export quality:</strong> Use SVG or PDF for best print quality</li>
                    <li><strong>Browser storage full:</strong> Export old diagrams and delete them</li>
                </ul>

                <h4>Advanced Features</h4>
                <ul>
                    <li><strong>Symbol Key:</strong> Generate a printable reference guide for your diagram</li>
                    <li><strong>Alignment Tools:</strong> Use Shift+Click to multi-select, then align or distribute items</li>
                    <li><strong>Fit to Content:</strong> Automatically zoom to show all enterprises on screen</li>
                    <li><strong>Snap to Grid:</strong> Toggle grid snapping for precise positioning</li>
                    <li><strong>Hybrid Tiers:</strong> Enterprises can operate across multiple tiers</li>
                    <li><strong>Inner Segments:</strong> Create bidirectional relationships with different types at each end</li>
                    <li><strong>Stack Effect:</strong> Generic sets show with 3D appearance</li>
                    <li><strong>Custom Positioning:</strong> Fine-tune X/Y coordinates in properties</li>
                    <li><strong>Notes/Annotations:</strong> Add text notes to your diagram for documentation</li>
                </ul>

                <h4>Diagram Types</h4>
                <p>Co-op Maps can be used to create various diagram types:</p>
                <ul>
                    <li><strong>Ecosystem Maps:</strong> Show all enterprises in a co-operative ecosystem</li>
                    <li><strong>Value Chain Analysis:</strong> Use tiers to show production flow</li>
                    <li><strong>Ownership Structures:</strong> Use ownership relationships to show control</li>
                    <li><strong>Network Analysis:</strong> Show complex inter-relationships</li>
                    <li><strong>Governance Maps:</strong> Highlight governance relationships</li>
                </ul>
            `;
        },

        addManualStyles() {
            if (!document.getElementById('manualStyles')) {
                const style = document.createElement('style');
                style.id = 'manualStyles';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }

                    @keyframes slideIn {
                        from { transform: translateY(-30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }

                    .manual-nav-item.active {
                        background: white !important;
                        color: #3498db !important;
                        border-left: 4px solid #3498db !important;
                    }

                    .manual-content {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #2c3e50;
                    }

                    .manual-content h4 {
                        color: #2c3e50;
                        margin: 24px 0 16px 0;
                        font-size: 20px;
                        font-weight: 600;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #e9ecef;
                    }

                    .manual-content h4:first-child {
                        margin-top: 0;
                    }

                    .manual-content p {
                        color: #546e7a;
                        line-height: 1.7;
                        margin-bottom: 16px;
                        font-size: 15px;
                    }

                    .manual-content ul, .manual-content ol {
                        margin: 0 0 20px 20px;
                        color: #546e7a;
                        font-size: 15px;
                    }

                    .manual-content li {
                        margin-bottom: 10px;
                        line-height: 1.6;
                    }

                    .manual-content code {
                        background: #f8f9fa;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-family: 'Consolas', 'Monaco', monospace;
                        font-size: 14px;
                        color: #e74c3c;
                        border: 1px solid #e9ecef;
                    }

                    .manual-content table {
                        width: 100%;
                        margin: 20px 0;
                        border-collapse: collapse;
                        font-size: 14px;
                    }

                    .manual-content table th {
                        background: #f8f9fa;
                        font-weight: 600;
                        text-align: left;
                        padding: 12px;
                        border-bottom: 2px solid #e9ecef;
                    }

                    .manual-content table td {
                        padding: 12px;
                        border-bottom: 1px solid #f8f9fa;
                    }

                    .manual-content table tr:hover {
                        background: #f8f9fa;
                    }

                    .manual-content strong {
                        color: #2c3e50;
                        font-weight: 600;
                    }

                    @media print {
                        .manual-nav-item, button {
                            display: none !important;
                        }

                        .manual-content {
                            padding: 0 !important;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        },

        printManual() {
            window.print();
        }
    });

    console.log('manuals.module.js loaded successfully');
})();
