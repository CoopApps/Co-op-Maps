/**
 * Co-opMaps - Manuals Module
 * Provides user manuals and help documentation
 */

(function() {
    'use strict';

    const manuals = {
        init() {
            console.log('Manuals module initialized');
        },

        render() {
            return `
                <div class="manuals-panel">
                    <h3 style="margin-bottom: 20px; color: var(--dark); font-size: 18px;">
                        User Manual
                    </h3>
                    <p style="margin-bottom: 24px; color: var(--gray); font-size: 14px;">
                        Learn how to use Co-opMaps to create cooperative ecosystem maps.
                    </p>

                    <div style="display: grid; gap: 12px;">
                        <button class="manual-section-btn" onclick="CoopMaps.modules.manuals.showSection('getting-started')">
                            <div style="font-size: 24px; margin-bottom: 8px;">🚀</div>
                            <div style="font-weight: 600;">Getting Started</div>
                            <div style="font-size: 12px; color: var(--gray);">Basic introduction and first steps</div>
                        </button>

                        <button class="manual-section-btn" onclick="CoopMaps.modules.manuals.showSection('enterprises')">
                            <div style="font-size: 24px; margin-bottom: 8px;">🏢</div>
                            <div style="font-weight: 600;">Adding Enterprises</div>
                            <div style="font-size: 12px; color: var(--gray);">How to add and configure enterprise symbols</div>
                        </button>

                        <button class="manual-section-btn" onclick="CoopMaps.modules.manuals.showSection('relationships')">
                            <div style="font-size: 24px; margin-bottom: 8px;">🔗</div>
                            <div style="font-weight: 600;">Creating Relationships</div>
                            <div style="font-size: 12px; color: var(--gray);">Drawing connectors between enterprises</div>
                        </button>

                        <button class="manual-section-btn" onclick="CoopMaps.modules.manuals.showSection('styling')">
                            <div style="font-size: 24px; margin-bottom: 8px;">🎨</div>
                            <div style="font-weight: 600;">Styling & Appearance</div>
                            <div style="font-size: 12px; color: var(--gray);">Customize colors, shapes, and layout</div>
                        </button>

                        <button class="manual-section-btn" onclick="CoopMaps.modules.manuals.showSection('export')">
                            <div style="font-size: 24px; margin-bottom: 8px;">💾</div>
                            <div style="font-weight: 600;">Exporting & Sharing</div>
                            <div style="font-size: 12px; color: var(--gray);">Export to PNG, PDF, SVG, and JSON</div>
                        </button>

                        <button class="manual-section-btn" onclick="CoopMaps.modules.manuals.showSection('shortcuts')">
                            <div style="font-size: 24px; margin-bottom: 8px;">⌨️</div>
                            <div style="font-weight: 600;">Keyboard Shortcuts</div>
                            <div style="font-size: 12px; color: var(--gray);">Speed up your workflow</div>
                        </button>
                    </div>
                </div>

                <style>
                    .manual-section-btn {
                        padding: 16px;
                        text-align: center;
                        background: white;
                        border: 2px solid var(--light-gray);
                        border-radius: 12px;
                        cursor: pointer;
                        transition: var(--transition-fast);
                    }

                    .manual-section-btn:hover {
                        border-color: var(--primary);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                    }
                </style>
            `;
        },

        showManualDialog() {
            this.showSection('getting-started');
        },

        showSection(sectionId) {
            const content = this.getSectionContent(sectionId);

            const html = `
                <div class="modal" id="manualModal" style="display: flex;">
                    <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                        ${content}
                        <button class="btn-primary" onclick="document.getElementById('manualModal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existing = document.getElementById('manualModal');
            if (existing) existing.remove();

            document.body.insertAdjacentHTML('beforeend', html);
        },

        getSectionContent(sectionId) {
            const sections = {
                'getting-started': `
                    <h2 style="margin-bottom: 20px;">🚀 Getting Started</h2>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">What is Co-opMaps?</h3>
                    <p style="margin-bottom: 16px; line-height: 1.6;">
                        Co-opMaps is a tool for mapping cooperative ecosystems. It helps you visualize the
                        relationships between cooperatives, mutual aid organizations, public sector entities,
                        and other economic actors in your region or sector.
                    </p>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Quick Start</h3>
                    <ol style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Add enterprises:</strong> Drag symbols from the left sidebar onto the canvas</li>
                        <li><strong>Create relationships:</strong> Click "Create Relationship" button, then click two enterprises</li>
                        <li><strong>Customize:</strong> Select any item to edit its properties in the Properties tab</li>
                        <li><strong>Save:</strong> Go to Diagrams tab and click "Save Current"</li>
                        <li><strong>Export:</strong> Click Export button to download as PNG, PDF, or SVG</li>
                    </ol>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Navigation</h3>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Pan:</strong> Hold Shift and drag on the canvas</li>
                        <li><strong>Zoom:</strong> Use mouse wheel or zoom buttons in toolbar</li>
                        <li><strong>Select:</strong> Click on any enterprise or relationship</li>
                        <li><strong>Move:</strong> Drag enterprises to reposition them</li>
                        <li><strong>Resize:</strong> Drag the handles on selected enterprises</li>
                    </ul>
                `,

                'enterprises': `
                    <h2 style="margin-bottom: 20px;">🏢 Adding Enterprises</h2>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Enterprise Types</h3>
                    <p style="margin-bottom: 16px;">Co-opMaps supports six types of enterprises:</p>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Cooperative:</strong> Member-owned and democratically controlled enterprise</li>
                        <li><strong>Mutual Aid:</strong> Voluntary reciprocal exchange of resources and services</li>
                        <li><strong>Public Sector:</strong> Government or public institution</li>
                        <li><strong>Private Sector:</strong> Privately owned business</li>
                        <li><strong>Civil Society:</strong> Non-profit or community organization</li>
                        <li><strong>Household:</strong> Family or household unit</li>
                    </ul>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Adding an Enterprise</h3>
                    <ol style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Go to the <strong>Symbols</strong> tab in the sidebar</li>
                        <li>Find the enterprise type you want to add</li>
                        <li>Drag the symbol onto the canvas</li>
                        <li>Drop it where you want it to appear</li>
                    </ol>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Editing Properties</h3>
                    <ol style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Click on an enterprise to select it</li>
                        <li>Go to the <strong>Properties</strong> tab</li>
                        <li>Edit the name, type, roles, tier, and appearance</li>
                        <li>Changes are saved automatically</li>
                    </ol>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Roles & Tiers</h3>
                    <p style="margin-bottom: 16px;">
                        <strong>Roles:</strong> Define what function the enterprise performs (producer, processor, supplier, etc.)
                    </p>
                    <p style="margin-bottom: 16px;">
                        <strong>Tiers:</strong> Indicate importance (Primary, Secondary, Other). Primary and secondary
                        enterprises show a colored dot indicator.
                    </p>
                `,

                'relationships': `
                    <h2 style="margin-bottom: 20px;">🔗 Creating Relationships</h2>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Relationship Types</h3>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>G - Goods/Services:</strong> Exchange of products or services</li>
                        <li><strong>F - Finance:</strong> Financial transactions or funding</li>
                        <li><strong>K - Knowledge:</strong> Information, training, or knowledge sharing</li>
                        <li><strong>M - Mixed:</strong> Multiple types of exchange</li>
                    </ul>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Creating a Relationship</h3>
                    <ol style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Click the <strong>"Create Relationship"</strong> button (or press <kbd>R</kbd>)</li>
                        <li>Click on the first enterprise (start point)</li>
                        <li>Click on the second enterprise (end point)</li>
                        <li>Select the relationship type from the dialog</li>
                        <li>Press ESC to cancel at any time</li>
                    </ol>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Connector Styles</h3>
                    <p style="margin-bottom: 16px;">
                        Use the connector style button to toggle between:
                    </p>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Orthogonal:</strong> Right-angle connectors (easier to follow)</li>
                        <li><strong>Direct:</strong> Straight line connectors (more compact)</li>
                    </ul>
                `,

                'styling': `
                    <h2 style="margin-bottom: 20px;">🎨 Styling & Appearance</h2>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Customizing Enterprises</h3>
                    <p style="margin-bottom: 16px;">Select an enterprise and use the Properties panel to customize:</p>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Fill Color:</strong> Background color of the enterprise box</li>
                        <li><strong>Border Color:</strong> Outline color</li>
                        <li><strong>Shape:</strong> Rectangle, Circle, or Diamond</li>
                        <li><strong>Show Icon:</strong> Toggle the emoji icon display</li>
                    </ul>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Layout Tools</h3>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Auto Layout:</strong> Automatically arrange enterprises in a grid</li>
                        <li><strong>Bring to Front:</strong> Move selected enterprise on top of others</li>
                        <li><strong>Send to Back:</strong> Move selected enterprise behind others</li>
                    </ul>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Canvas Size</h3>
                    <p style="margin-bottom: 16px;">
                        Choose between A4 or A3 canvas size from the dropdown in the toolbar.
                    </p>
                `,

                'export': `
                    <h2 style="margin-bottom: 20px;">💾 Exporting & Sharing</h2>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Export Formats</h3>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>PNG:</strong> High-quality image for presentations and documents</li>
                        <li><strong>PDF:</strong> Professional document with metadata</li>
                        <li><strong>SVG:</strong> Vector format for editing in design tools</li>
                        <li><strong>JSON:</strong> Raw data for backup and sharing with other Co-opMaps users</li>
                    </ul>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Saving & Loading</h3>
                    <p style="margin-bottom: 16px;">
                        Go to the <strong>Diagrams</strong> tab to:
                    </p>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Save your current diagram to browser storage</li>
                        <li>Load previously saved diagrams</li>
                        <li>Import diagrams from JSON files</li>
                        <li>Delete saved diagrams</li>
                    </ul>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Autosave</h3>
                    <p style="margin-bottom: 16px;">
                        Co-opMaps automatically saves your work every minute. If you close the browser
                        and return within 24 hours, you'll be prompted to restore your work.
                    </p>
                `,

                'shortcuts': `
                    <h2 style="margin-bottom: 20px;">⌨️ Keyboard Shortcuts</h2>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">General</h3>
                    <table style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">Ctrl+Z</td>
                            <td style="padding: 8px;">Undo</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">Ctrl+Y</td>
                            <td style="padding: 8px;">Redo</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">Ctrl+S</td>
                            <td style="padding: 8px;">Save diagram</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">ESC</td>
                            <td style="padding: 8px;">Cancel current operation</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">Delete</td>
                            <td style="padding: 8px;">Delete selected item</td>
                        </tr>
                    </table>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Canvas</h3>
                    <table style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">R</td>
                            <td style="padding: 8px;">Toggle relationship creation mode</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">Shift+Drag</td>
                            <td style="padding: 8px;">Pan the canvas</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--light-gray);">
                            <td style="padding: 8px; font-family: monospace; background: var(--light-gray);">Mouse Wheel</td>
                            <td style="padding: 8px;">Zoom in/out</td>
                        </tr>
                    </table>

                    <h3 style="margin: 24px 0 12px; color: var(--dark);">Context Menu</h3>
                    <p style="margin-bottom: 16px;">
                        Right-click on an enterprise to access:
                    </p>
                    <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Duplicate</li>
                        <li>Delete</li>
                        <li>Bring to Front</li>
                        <li>Send to Back</li>
                    </ul>
                `
            };

            return sections[sectionId] || sections['getting-started'];
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('manuals', manuals);
    }
})();
