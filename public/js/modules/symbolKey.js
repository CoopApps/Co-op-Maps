// Module 8: Symbol Key Module
(function() {
    'use strict';

    CoopMaps.registerModule('symbolKey', {
        init() {
            console.log('Symbol Key module initialized');
            this.setupPrintStyles();
        },

        setupPrintStyles() {
            if (!document.getElementById('symbolKeyPrintStyles')) {
                const style = document.createElement('style');
                style.id = 'symbolKeyPrintStyles';
                style.textContent = `
                    @media print {
                        .symbol-key-panel {
                            position: static !important;
                            width: 100% !important;
                            max-width: 800px !important;
                            margin: 0 auto !important;
                            box-shadow: none !important;
                            page-break-inside: avoid;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        },

        generateKey() {
            console.log('Generating symbol key panel');
            const panel = document.getElementById('symbolKeyPanel');

            // Toggle: if panel is visible, hide it; otherwise, show it
            if (panel && panel.classList.contains('visible')) {
                this.hidePanel();
            } else {
                this.showPanel();
                this.populateSymbolKey();
            }
        },

        showPanel() {
            let panel = document.getElementById('symbolKeyPanel');
            if (!panel) {
                panel = this.createPanel();
                document.body.appendChild(panel);
            }

            // Animate panel entrance
            setTimeout(() => {
                panel.classList.add('visible');
            }, 10);
        },

        hidePanel() {
            const panel = document.getElementById('symbolKeyPanel');
            if (panel) {
                panel.classList.remove('visible');
                setTimeout(() => {
                    panel.remove();
                }, 300);
            }
        },

        createPanel() {
            const isDarkMode = document.body.classList.contains('dark-mode');
            const panel = document.createElement('div');
            panel.id = 'symbolKeyPanel';
            panel.className = 'symbol-key-panel';
            panel.style.cssText = `
                position: fixed;
                top: 100px;
                right: -340px;
                width: 340px;
                height: calc(100vh - 110px);
                background: ${isDarkMode ? '#1e1e2e' : 'white'};
                box-shadow: -2px 0 20px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
                transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 999;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-radius: 8px 0 0 8px;
                border: 1px solid ${isDarkMode ? '#3a3a4e' : 'rgba(0,0,0,0.05)'};
                border-right: none;
            `;

            panel.innerHTML = `
                <div class="right-panel-header" style="
                    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                    padding: 12px 16px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        <span style="font-size: 14px; font-weight: 600;">Symbol Key</span>
                    </div>
                    <button class="close-button no-print" onclick="CoopMaps.modules.symbolKey.hidePanel()" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        width: 28px;
                        height: 28px;
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        color: white;
                        font-size: 18px;
                    "
                    onmouseover="this.style.background='rgba(255, 255, 255, 0.2)';"
                    onmouseout="this.style.background='rgba(255, 255, 255, 0.1)';">
                        ×
                    </button>
                </div>

                <div class="symbol-key-actions no-print" style="
                    padding: 10px 12px;
                    background: ${isDarkMode ? '#252538' : '#f8f9fa'};
                    border-bottom: 1px solid ${isDarkMode ? '#3a3a4e' : '#ecf0f1'};
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                ">
                    <button onclick="CoopMaps.modules.symbolKey.exportKeyAsPDF()" style="
                        flex: 1;
                        padding: 8px 12px;
                        background: white;
                        color: #2c3e50;
                        border: 1px solid #ecf0f1;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    "
                    onmouseover="this.style.borderColor='#3498db'; this.style.color='#3498db';"
                    onmouseout="this.style.borderColor='#ecf0f1'; this.style.color='#2c3e50';">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        PDF
                    </button>
                    <button onclick="window.print()" style="
                        flex: 1;
                        padding: 8px 12px;
                        background: white;
                        color: #2c3e50;
                        border: 1px solid #ecf0f1;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    "
                    onmouseover="this.style.borderColor='#3498db'; this.style.color='#3498db';"
                    onmouseout="this.style.borderColor='#ecf0f1'; this.style.color='#2c3e50';">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Print
                    </button>
                </div>

                <div class="right-panel-content" id="symbolKeyContent" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                    background: ${isDarkMode ? '#1a1a2e' : '#fafafa'};
                ">
                    <div class="loading" style="
                        text-align: center;
                        padding: 30px;
                        color: ${isDarkMode ? '#888' : '#7f8c8d'};
                        font-size: 12px;
                    ">
                        <div style="
                            width: 30px;
                            height: 30px;
                            border: 2px solid ${isDarkMode ? '#3a3a4e' : '#e9ecef'};
                            border-top: 2px solid #3498db;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 12px;
                        "></div>
                        Loading...
                        <style>
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        </style>
                    </div>
                </div>
            `;

            // Add CSS for panel visibility
            const style = document.createElement('style');
            style.textContent = `
                .symbol-key-panel.visible {
                    right: 0 !important;
                }
                .symbol-key-panel::-webkit-scrollbar {
                    width: 6px;
                }
                .symbol-key-panel::-webkit-scrollbar-track {
                    background: transparent;
                }
                .symbol-key-panel::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.15);
                    border-radius: 3px;
                }
            `;
            document.head.appendChild(style);

            return panel;
        },

        populateSymbolKey() {
            const content = document.getElementById('symbolKeyContent');
            if (!content) return;

            const isDarkMode = document.body.classList.contains('dark-mode');
            const diagramTitle = CoopMaps.state.data.diagramProperties.title || 'Co-operative Diagram';
            const stats = this.getUsageStatistics();

            // Compact color scheme matching app aesthetic
            const colors = {
                bg: isDarkMode ? '#2a2a3e' : 'white',
                bgAlt: isDarkMode ? '#252538' : '#f8f9fa',
                border: isDarkMode ? '#3a3a4e' : '#ecf0f1',
                text: isDarkMode ? '#e0e0e0' : '#2c3e50',
                textMuted: isDarkMode ? '#888' : '#7f8c8d',
                primary: '#3498db',
                canvasBg: isDarkMode ? '#1e1e2e' : 'white'
            };

            let html = `
                <!-- Diagram Stats Bar -->
                <div style="
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                    font-size: 11px;
                ">
                    <span style="
                        background: ${colors.bg};
                        border: 1px solid ${colors.border};
                        padding: 4px 10px;
                        border-radius: 4px;
                        color: ${colors.text};
                    ">${stats.enterprises} enterprises</span>
                    <span style="
                        background: ${colors.bg};
                        border: 1px solid ${colors.border};
                        padding: 4px 10px;
                        border-radius: 4px;
                        color: ${colors.text};
                    ">${stats.relationships} relationships</span>
                </div>
            `;

            // Enterprise Types - Compact Grid
            html += `
                <div class="key-section" style="
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    margin-bottom: 10px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Enterprise Types</div>
                    <div style="padding: 8px;">
            `;

            const types = [
                { id: 'cooperative', name: 'Co-operative', abbr: 'COOP' },
                { id: 'ncm', name: 'Non-co-op Mutual', abbr: 'NCM' },
                { id: 'social', name: 'Social Enterprise', abbr: 'SOC' },
                { id: 'private', name: 'Private Enterprise', abbr: 'PVT' },
                { id: 'state', name: 'State Enterprise', abbr: 'GOV' },
                { id: 'excluded', name: 'Excluded', abbr: 'EXC' }
            ];

            types.forEach(type => {
                const count = stats.byType[type.id] || 0;
                html += `
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 6px 8px;
                        margin-bottom: 4px;
                        background: ${colors.bgAlt};
                        border-radius: 4px;
                        gap: 10px;
                    ">
                        <canvas id="key-${type.id}" width="50" height="30" style="
                            background: ${colors.canvasBg};
                            border-radius: 3px;
                            flex-shrink: 0;
                        "></canvas>
                        <span style="flex: 1; font-size: 11px; color: ${colors.text};">${type.name}</span>
                        ${count > 0 ? `<span style="
                            background: ${colors.primary};
                            color: white;
                            padding: 1px 6px;
                            border-radius: 10px;
                            font-size: 10px;
                            font-weight: 600;
                        ">${count}</span>` : ''}
                    </div>
                `;
            });
            html += '</div></div>';

            // Relationship Types - Compact List
            html += `
                <div class="key-section" style="
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    margin-bottom: 10px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Relationships</div>
                    <div style="padding: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            `;

            const relationships = [
                { id: 'G', name: 'Governance', color: '#e74c3c' },
                { id: 'I', name: 'Investment', color: '#f39c12' },
                { id: 'L', name: 'Asset Lock', color: '#f1c40f' },
                { id: 'M', name: 'Member', color: '#2ecc71' },
                { id: 'O', name: 'Owns', color: '#3498db' },
                { id: 'P', name: 'Partner', color: '#9b59b6' },
                { id: 'S', name: 'Supplies', color: '#e67e22' }
            ];

            relationships.forEach(rel => {
                const count = stats.byRelationship[rel.id] || 0;
                html += `
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 5px 8px;
                        background: ${colors.bgAlt};
                        border-radius: 4px;
                        gap: 6px;
                    ">
                        <div style="
                            width: 20px;
                            height: 20px;
                            background: ${rel.color};
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: ${rel.color === '#f1c40f' ? '#2c3e50' : 'white'};
                            font-weight: bold;
                            font-size: 10px;
                            flex-shrink: 0;
                        ">${rel.id}</div>
                        <span style="font-size: 10px; color: ${colors.text}; flex: 1;">${rel.name}</span>
                        ${count > 0 ? `<span style="font-size: 9px; color: ${colors.textMuted};">${count}</span>` : ''}
                    </div>
                `;
            });
            html += '</div></div>';

            // Participation Roles - Compact Bar
            html += `
                <div class="key-section" style="
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    margin-bottom: 10px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Member Roles</div>
                    <div style="padding: 8px;">
                        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                            <div style="flex: 1; text-align: center; padding: 6px; background: #e74c3c; color: white; border-radius: 4px; font-size: 10px; font-weight: 600;">
                                P - Producers
                            </div>
                            <div style="flex: 1; text-align: center; padding: 6px; background: #3498db; color: white; border-radius: 4px; font-size: 10px; font-weight: 600;">
                                U - Users
                            </div>
                            <div style="flex: 1; text-align: center; padding: 6px; background: #27ae60; color: white; border-radius: 4px; font-size: 10px; font-weight: 600;">
                                I - Investors
                            </div>
                        </div>
                        <canvas id="key-participation-demo" width="310" height="50" style="
                            width: 100%;
                            background: ${colors.canvasBg};
                            border: 1px solid ${colors.border};
                            border-radius: 4px;
                        "></canvas>
                    </div>
                </div>
            `;

            // Structural Tiers - Compact
            html += `
                <div class="key-section" style="
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    margin-bottom: 10px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Value Chain Tiers</div>
                    <div style="padding: 8px;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <div style="display: flex; flex-direction: column; gap: 1px;">
                                <div style="width: 24px; height: 18px; background: ${colors.bgAlt}; border: 1px solid #546e7a; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: #546e7a;">T</div>
                                <div style="width: 24px; height: 18px; background: ${colors.bgAlt}; border: 1px solid #546e7a; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: #546e7a;">S</div>
                                <div style="width: 24px; height: 18px; background: #546e7a; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: white;">P</div>
                            </div>
                            <div style="flex: 1; font-size: 10px; color: ${colors.textMuted}; line-height: 1.5;">
                                <div><strong style="color: ${colors.text};">T</strong> Tertiary (retail/services)</div>
                                <div><strong style="color: ${colors.text};">S</strong> Secondary (processing)</div>
                                <div><strong style="color: ${colors.text};">P</strong> Primary (production)</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Generic Set - Compact
            html += `
                <div class="key-section" style="
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    margin-bottom: 10px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Generic Set</div>
                    <div style="padding: 8px; display: flex; align-items: center; gap: 12px;">
                        <canvas id="key-generic-set" width="70" height="50" style="
                            background: ${colors.canvasBg};
                            border-radius: 4px;
                            flex-shrink: 0;
                        "></canvas>
                        <div style="font-size: 10px; color: ${colors.textMuted}; line-height: 1.4;">
                            Stack effect represents multiple similar enterprises.
                            ${stats.genericSets > 0 ? `<br><strong style="color: ${colors.text};">${stats.genericSets}</strong> in diagram.` : ''}
                        </div>
                    </div>
                </div>
            `;

            // Segmentation Markers - Compact
            html += `
                <div class="key-section" style="
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Segmentation</div>
                    <div style="padding: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px;">
                        <div>
                            <div style="color: ${colors.textMuted}; margin-bottom: 4px; font-weight: 600;">FROM:</div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: ${colors.bgAlt}; border-radius: 3px; margin-bottom: 3px;">
                                <canvas id="key-start-individual" width="40" height="16"></canvas>
                                <span style="color: ${colors.text};">Individual</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: ${colors.bgAlt}; border-radius: 3px; margin-bottom: 3px;">
                                <canvas id="key-start-entire" width="40" height="16"></canvas>
                                <span style="color: ${colors.text};">Entire set</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: ${colors.bgAlt}; border-radius: 3px;">
                                <canvas id="key-start-subset" width="40" height="16"></canvas>
                                <span style="color: ${colors.text};">Subset</span>
                            </div>
                        </div>
                        <div>
                            <div style="color: ${colors.textMuted}; margin-bottom: 4px; font-weight: 600;">TO:</div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: ${colors.bgAlt}; border-radius: 3px; margin-bottom: 3px;">
                                <canvas id="key-end-individual" width="40" height="16"></canvas>
                                <span style="color: ${colors.text};">Individual</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: ${colors.bgAlt}; border-radius: 3px; margin-bottom: 3px;">
                                <canvas id="key-end-entire" width="40" height="16"></canvas>
                                <span style="color: ${colors.text};">Entire set</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: ${colors.bgAlt}; border-radius: 3px;">
                                <canvas id="key-end-subset" width="40" height="16"></canvas>
                                <span style="color: ${colors.text};">Subset</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            content.innerHTML = html;

            // Draw all the symbols after DOM update
            setTimeout(() => {
                this.drawAllSymbols();
            }, 50);
        },

        renderMarkerItem(id, name, desc, colors = {}) {
            const bgColor = colors.bgAlt || '#f8f9fa';
            const textColor = colors.text || '#2c3e50';
            const mutedColor = colors.textMuted || '#7f8c8d';

            return `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    background: ${bgColor};
                    border-radius: 6px;
                    margin-bottom: 8px;
                ">
                    <canvas id="key-${id}" width="60" height="30"></canvas>
                    <div style="flex: 1;">
                        <strong style="font-size: 13px; color: ${textColor};">${name}</strong>
                        <span style="font-size: 12px; color: ${mutedColor}; margin-left: 8px;">${desc}</span>
                    </div>
                </div>
            `;
        },

        getUsageStatistics() {
            const enterprises = CoopMaps.state.data.enterprises;
            const relationships = CoopMaps.state.data.relationships;

            const stats = {
                enterprises: enterprises.length,
                relationships: relationships.length,
                byType: {},
                byRelationship: {},
                genericSets: 0
            };

            // Initialize counters
            ['cooperative', 'ncm', 'social', 'private', 'state', 'excluded'].forEach(type => {
                stats.byType[type] = 0;
            });

            // Count enterprises by type
            enterprises.forEach(e => {
                if (stats.byType.hasOwnProperty(e.type)) {
                    stats.byType[e.type]++;
                }
                if (e.isGenericSet) {
                    stats.genericSets++;
                }
            });

            // Count relationships by type
            relationships.forEach(r => {
                stats.byRelationship[r.type] = (stats.byRelationship[r.type] || 0) + 1;
            });

            return stats;
        },

        drawAllSymbols() {
            console.log('Drawing all symbol key visuals');

            // Draw enterprise types
            this.drawEnterpriseTypes();

            // Draw relationship badges
            this.drawRelationshipBadges();

            // Draw segmentation markers
            this.drawSegmentationMarkers();

            // Draw generic set example
            this.drawGenericSetExample();

            // Draw demo canvases
            this.drawParticipationDemo();
            this.drawTierDemo();
        },

        drawEnterpriseTypes() {
            const shapes = CoopMaps.modules.shapes;
            if (!shapes) return;

            const types = [
                { id: 'cooperative', fill: 'white' },
                { id: 'ncm', fill: 'white' },
                { id: 'social', fill: '#FFFF00' },
                { id: 'private', fill: '#f0f0f0' },
                { id: 'state', fill: '#f0f0f0' },
                { id: 'excluded', fill: 'white' }
            ];

            types.forEach(type => {
                const canvas = document.getElementById(`key-${type.id}`);
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Smaller dimensions for compact key
                const width = 36;
                const height = 20;
                const x = 7;
                const y = 5;

                const options = {
                    fill: type.fill,
                    stroke: '#2c3e50',
                    lineWidth: 1.5
                };

                switch (type.id) {
                    case 'cooperative':
                    case 'excluded':
                        shapes.drawRectangle(ctx, x, y, width, height, options);
                        break;
                    case 'ncm':
                        shapes.drawRoundedRectangle(ctx, x, y, width, height, 5, options);
                        break;
                    case 'social':
                        shapes.drawPill(ctx, x, y, width, height, options);
                        break;
                    case 'private':
                        shapes.drawEllipse(ctx, x, y, width, height, options);
                        break;
                    case 'state':
                        shapes.drawDiamond(ctx, x, y, width, height, options);
                        break;
                }
            });
        },

        drawRelationshipBadges() {
            const relationships = CoopMaps.modules.relationships.relationshipTypes.filter(r => r.id !== 'INNER');

            relationships.forEach(rel => {
                const canvas = document.getElementById(`key-rel-${rel.id}`);
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw line
                ctx.beginPath();
                ctx.moveTo(15, 20);
                ctx.lineTo(65, 20);
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Draw arrow
                ctx.beginPath();
                ctx.moveTo(65, 20);
                ctx.lineTo(60, 15);
                ctx.moveTo(65, 20);
                ctx.lineTo(60, 25);
                ctx.stroke();

                // Draw badge
                if (CoopMaps.modules.relationships.drawEnhancedBadge) {
                    CoopMaps.modules.relationships.drawEnhancedBadge(ctx, 40, 20, rel);
                }
            });
        },

        drawSegmentationMarkers() {
            const markers = [
                { id: 'start-individual', type: 'start', style: 'none' },
                { id: 'start-entire', type: 'start', style: 'filled' },
                { id: 'start-subset', type: 'start', style: 'hollow' },
                { id: 'end-individual', type: 'end', style: 'arrow' },
                { id: 'end-entire', type: 'end', style: 'filled-triangle' },
                { id: 'end-subset', type: 'end', style: 'hollow-triangle' }
            ];

            markers.forEach(marker => {
                const canvas = document.getElementById(`key-${marker.id}`);
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 40, 16);

                // Draw base line (smaller for compact)
                ctx.beginPath();
                ctx.moveTo(5, 8);
                ctx.lineTo(35, 8);
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw marker based on style
                switch (marker.style) {
                    case 'filled':
                        ctx.beginPath();
                        ctx.arc(5, 8, 3, 0, 2 * Math.PI);
                        ctx.fillStyle = '#34495e';
                        ctx.fill();
                        break;
                    case 'hollow':
                        ctx.beginPath();
                        ctx.arc(5, 8, 3, 0, 2 * Math.PI);
                        ctx.strokeStyle = '#34495e';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        break;
                    case 'arrow':
                        ctx.beginPath();
                        ctx.moveTo(35, 8);
                        ctx.lineTo(31, 4);
                        ctx.moveTo(35, 8);
                        ctx.lineTo(31, 12);
                        ctx.stroke();
                        break;
                    case 'filled-triangle':
                        ctx.beginPath();
                        ctx.moveTo(35, 8);
                        ctx.lineTo(29, 4);
                        ctx.lineTo(29, 12);
                        ctx.closePath();
                        ctx.fillStyle = '#34495e';
                        ctx.fill();
                        break;
                    case 'hollow-triangle':
                        ctx.beginPath();
                        ctx.moveTo(35, 8);
                        ctx.lineTo(29, 4);
                        ctx.lineTo(29, 12);
                        ctx.closePath();
                        ctx.strokeStyle = '#34495e';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        break;
                }
            });
        },

        drawGenericSetExample() {
            const canvas = document.getElementById('key-generic-set');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const shapes = CoopMaps.modules.shapes;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Smaller for compact key
            const width = 45;
            const height = 28;
            const x = 12;
            const y = 11;

            shapes.drawStackEffect(
                ctx,
                shapes.drawRectangle,
                x, y, width, height,
                { fill: 'white', stroke: '#2c3e50', lineWidth: 1.5 }
            );
        },

        drawParticipationDemo() {
            const canvas = document.getElementById('key-participation-demo');
            if (!canvas || !CoopMaps.modules.shapes) return;

            const ctx = canvas.getContext('2d');
            const shapes = CoopMaps.modules.shapes;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Smaller demo for compact key
            const x = 105;
            const y = 12;
            const width = 80;
            const height = 26;

            shapes.drawRectangle(ctx, x, y, width, height, {
                fill: 'white',
                stroke: '#2c3e50',
                lineWidth: 1.5
            });

            shapes.drawParticipationIndicators(ctx, x, y, width, height, ['producers', 'users', 'investors']);

            // Add label
            ctx.fillStyle = '#2c3e50';
            ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Example Co-op', x + width/2, y + height/2 + 3);
        },

        drawTierDemo() {
            // No longer needed in compact design - tiers shown inline
        },

        exportKeyAsPDF() {
            if (typeof window.jspdf === 'undefined') {
                alert('PDF export library is still loading. Please try again in a moment.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yOffset = 40;

            // Add title
            pdf.setFontSize(24);
            pdf.setTextColor(102, 126, 234);
            pdf.text('Co-op Maps Symbol Key', pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 35;

            // Add diagram info
            const metadata = CoopMaps.state.data.diagramProperties;
            pdf.setFontSize(14);
            pdf.setTextColor(44, 62, 80);
            pdf.text(`Diagram: ${metadata.title || 'Untitled'}`, 40, yOffset);
            yOffset += 20;

            pdf.setFontSize(12);
            pdf.setTextColor(127, 140, 141);
            pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 40, yOffset);
            yOffset += 40;

            // Enterprise Types section
            pdf.setFontSize(16);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Enterprise Types', 40, yOffset);
            yOffset += 25;

            const types = [
                { id: 'cooperative', name: 'Co-operative', desc: 'Member-owned, democratically controlled', shape: 'rectangle', fill: '#ffffff' },
                { id: 'ncm', name: 'Non-co-operative Mutual', desc: 'Mutual benefit organization', shape: 'roundedRect', fill: '#ffffff' },
                { id: 'social', name: 'Social Enterprise', desc: 'Business with social objectives', shape: 'pill', fill: '#FFFF00' },
                { id: 'private', name: 'Private Enterprise', desc: 'Privately owned for-profit', shape: 'ellipse', fill: '#f0f0f0' },
                { id: 'state', name: 'State Enterprise', desc: 'Government-owned', shape: 'diamond', fill: '#f0f0f0' },
                { id: 'excluded', name: 'Excluded from Analysis', desc: 'Not part of co-op analysis', shape: 'rectangle', fill: '#ffffff' }
            ];

            types.forEach(type => {
                // Draw shape
                const shapeX = 50;
                const shapeY = yOffset;
                const shapeW = 60;
                const shapeH = 30;

                pdf.setDrawColor(44, 62, 80);
                pdf.setLineWidth(1);

                // Parse fill color
                const fillColor = type.fill === '#ffffff' ? [255, 255, 255] :
                                  type.fill === '#FFFF00' ? [255, 255, 0] :
                                  type.fill === '#f0f0f0' ? [240, 240, 240] : [255, 255, 255];
                pdf.setFillColor(...fillColor);

                switch (type.shape) {
                    case 'rectangle':
                        pdf.rect(shapeX, shapeY, shapeW, shapeH, 'FD');
                        break;
                    case 'roundedRect':
                        pdf.roundedRect(shapeX, shapeY, shapeW, shapeH, 5, 5, 'FD');
                        break;
                    case 'pill':
                        pdf.roundedRect(shapeX, shapeY, shapeW, shapeH, shapeH/2, shapeH/2, 'FD');
                        break;
                    case 'ellipse':
                        pdf.ellipse(shapeX + shapeW/2, shapeY + shapeH/2, shapeW/2, shapeH/2, 'FD');
                        break;
                    case 'diamond':
                        const cx = shapeX + shapeW/2;
                        const cy = shapeY + shapeH/2;
                        pdf.setFillColor(...fillColor);
                        pdf.triangle(cx, shapeY, shapeX + shapeW, cy, cx, shapeY + shapeH, 'F');
                        pdf.triangle(cx, shapeY, shapeX, cy, cx, shapeY + shapeH, 'F');
                        pdf.setDrawColor(44, 62, 80);
                        pdf.line(cx, shapeY, shapeX + shapeW, cy);
                        pdf.line(shapeX + shapeW, cy, cx, shapeY + shapeH);
                        pdf.line(cx, shapeY + shapeH, shapeX, cy);
                        pdf.line(shapeX, cy, cx, shapeY);
                        break;
                }

                // Add text
                pdf.setFontSize(12);
                pdf.setTextColor(44, 62, 80);
                pdf.text(type.name, shapeX + shapeW + 15, shapeY + 12);

                pdf.setFontSize(10);
                pdf.setTextColor(127, 140, 141);
                pdf.text(type.desc, shapeX + shapeW + 15, shapeY + 25);

                yOffset += 45;

                // Check for page break
                if (yOffset > pageHeight - 100) {
                    pdf.addPage();
                    yOffset = 40;
                }
            });

            yOffset += 20;

            // Relationship Types section
            pdf.setFontSize(16);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Relationship Types', 40, yOffset);
            yOffset += 25;

            const relationships = [
                { letter: 'G', name: 'Governance', color: [231, 76, 60] },      // #e74c3c
                { letter: 'I', name: 'Investment', color: [243, 156, 18] },     // #f39c12
                { letter: 'L', name: 'Asset Lock', color: [241, 196, 15] },     // #f1c40f
                { letter: 'M', name: 'Member', color: [46, 204, 113] },         // #2ecc71
                { letter: 'O', name: 'Owns', color: [52, 152, 219] },           // #3498db
                { letter: 'P', name: 'Partner', color: [155, 89, 182] },        // #9b59b6
                { letter: 'S', name: 'Supplies', color: [230, 126, 34] }        // #e67e22
            ];

            relationships.forEach(rel => {
                // Draw colored circle with letter
                pdf.setFillColor(...rel.color);
                pdf.circle(60, yOffset + 8, 10, 'F');

                pdf.setFontSize(10);
                pdf.setTextColor(255, 255, 255);
                pdf.text(rel.letter, 60, yOffset + 12, { align: 'center' });

                // Add name
                pdf.setFontSize(12);
                pdf.setTextColor(44, 62, 80);
                pdf.text(rel.name, 80, yOffset + 12);

                yOffset += 28;

                if (yOffset > pageHeight - 60) {
                    pdf.addPage();
                    yOffset = 40;
                }
            });

            yOffset += 20;

            // Participation Roles
            pdf.setFontSize(16);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Participation Roles', 40, yOffset);
            yOffset += 25;

            const roles = [
                { letter: 'P', name: 'Producers', color: [231, 76, 60] },
                { letter: 'U', name: 'Users', color: [52, 152, 219] },
                { letter: 'I', name: 'Investors', color: [39, 174, 96] }
            ];

            roles.forEach(role => {
                pdf.setFillColor(...role.color);
                pdf.rect(50, yOffset, 40, 20, 'F');

                pdf.setFontSize(12);
                pdf.setTextColor(255, 255, 255);
                pdf.text(role.letter, 70, yOffset + 14, { align: 'center' });

                pdf.setTextColor(44, 62, 80);
                pdf.text(role.name, 100, yOffset + 14);

                yOffset += 28;
            });

            pdf.save('coopmaps-symbol-key.pdf');
        }
    });
})();
