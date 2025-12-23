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
            const panel = document.createElement('div');
            panel.id = 'symbolKeyPanel';
            panel.className = 'symbol-key-panel';
            panel.style.cssText = `
                position: fixed;
                top: 60px;
                right: -500px;
                width: 500px;
                height: calc(100vh - 60px);
                background: white;
                box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 999;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;

            panel.innerHTML = `
                <div class="right-panel-header" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 25px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.2);
                ">
                    <div>
                        <h2 style="
                            font-size: 24px;
                            margin: 0 0 8px 0;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        ">
                            Symbol Key
                        </h2>
                        <p style="
                            margin: 0;
                            opacity: 0.9;
                            font-size: 14px;
                        ">Complete reference guide for all diagram symbols</p>
                    </div>
                    <button class="close-button no-print" onclick="CoopMaps.modules.symbolKey.hidePanel()" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        color: white;
                        font-size: 24px;
                    "
                    onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'; this.style.transform='scale(1.1)';"
                    onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.transform='scale(1)';">
                        ×
                    </button>
                </div>

                <div class="symbol-key-actions no-print" style="
                    padding: 20px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    display: flex;
                    gap: 12px;
                    flex-shrink: 0;
                ">
                    <button onclick="CoopMaps.modules.symbolKey.exportKeyAsPDF()" style="
                        flex: 1;
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 4px 12px rgba(231, 76, 60, 0.2);
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(231, 76, 60, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.2)';">
                        Export as PDF
                    </button>
                    <button onclick="window.print()" style="
                        flex: 1;
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(52, 152, 219, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.2)';">
                        Print
                    </button>
                </div>

                <div class="right-panel-content" id="symbolKeyContent" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 30px;
                    background: #fafafa;
                ">
                    <div class="loading" style="
                        text-align: center;
                        padding: 40px;
                        color: #7f8c8d;
                    ">
                        <div style="
                            width: 50px;
                            height: 50px;
                            border: 3px solid #e9ecef;
                            border-top: 3px solid #667eea;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 20px;
                        "></div>
                        Loading symbol key...
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
            `;
            document.head.appendChild(style);

            return panel;
        },

        populateSymbolKey() {
            const content = document.getElementById('symbolKeyContent');
            if (!content) return;

            const diagramTitle = CoopMaps.state.data.diagramProperties.title || 'Co-operative Diagram';
            const stats = this.getUsageStatistics();

            let html = `
                <!-- Diagram Context -->
                <div class="key-section" style="
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e9ecef;
                ">
                    <h3 style="
                        font-size: 16px;
                        font-weight: 600;
                        margin: 0 0 12px 0;
                        color: #2c3e50;
                    ">Current Diagram</h3>
                    <p style="
                        margin: 0 0 8px 0;
                        font-size: 14px;
                        color: #546e7a;
                    "><strong>${diagramTitle}</strong></p>
                    <div style="
                        display: flex;
                        gap: 20px;
                        font-size: 13px;
                        color: #7f8c8d;
                    ">
                        <span>${stats.enterprises} enterprises</span>
                        <span>${stats.relationships} relationships</span>
                    </div>
                </div>
            `;

            // Enterprise types section
            html += `
                <div class="key-section" style="margin-bottom: 30px;">
                    <h3 style="
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        padding-bottom: 12px;
                        border-bottom: 2px solid #667eea;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        Enterprise Types
                    </h3>
            `;

            const types = [
                { id: 'cooperative', name: 'Co-operative', desc: 'Member-owned, democratically controlled enterprise' },
                { id: 'ncm', name: 'Non-co-operative Mutual', desc: 'Mutual benefit organization without democratic member control' },
                { id: 'social', name: 'Social Enterprise', desc: 'Business with social or environmental objectives' },
                { id: 'private', name: 'Private Enterprise', desc: 'Privately owned for-profit business' },
                { id: 'state', name: 'State Enterprise', desc: 'Government-owned and operated enterprise' },
                { id: 'excluded', name: 'Business Excluded from Analysis', desc: 'Not part of the co-operative ecosystem analysis' }
            ];

            types.forEach(type => {
                const isUsed = stats.byType[type.id] > 0;
                html += `
                    <div class="key-item" style="
                        display: flex;
                        align-items: center;
                        margin-bottom: 16px;
                        padding: 16px;
                        background: ${isUsed ? 'white' : '#f8f9fa'};
                        border: 2px solid ${isUsed ? '#e9ecef' : '#f8f9fa'};
                        border-radius: 12px;
                        transition: all 0.2s ease;
                        opacity: ${isUsed ? '1' : '0.7'};
                    "
                    onmouseover="this.style.borderColor='#667eea'; this.style.transform='translateX(4px)';"
                    onmouseout="this.style.borderColor='${isUsed ? '#e9ecef' : '#f8f9fa'}'; this.style.transform='translateX(0)';">
                        <canvas id="key-${type.id}" width="100" height="60" style="
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                            margin-right: 20px;
                        "></canvas>
                        <div class="key-item-label" style="flex: 1;">
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                margin-bottom: 6px;
                            ">
                                <strong style="
                                    font-size: 15px;
                                    color: #2c3e50;
                                ">${type.name}</strong>
                                ${isUsed ? `<span style="
                                    background: #667eea;
                                    color: white;
                                    padding: 2px 8px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                    font-weight: 600;
                                ">${stats.byType[type.id]} used</span>` : ''}
                            </div>
                            <small style="
                                font-size: 13px;
                                color: #7f8c8d;
                                line-height: 1.4;
                            ">${type.desc}</small>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            // Participation Roles section
            html += `
                <div class="key-section" style="
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e9ecef;
                ">
                    <h3 style="
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        Participation Roles
                    </h3>
                    <p style="
                        font-size: 13px;
                        color: #7f8c8d;
                        margin-bottom: 16px;
                        line-height: 1.5;
                    ">Colored indicators appear across the top edge of co-operative and NCM enterprises</p>

                    <div style="
                        display: flex;
                        gap: 12px;
                        margin-bottom: 20px;
                        padding: 16px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    ">
                        <div style="
                            flex: 1;
                            text-align: center;
                            padding: 12px;
                            background: #e74c3c;
                            color: white;
                            border-radius: 6px;
                            font-weight: 600;
                        ">
                            <div style="font-size: 18px;">P</div>
                            <div style="font-size: 11px; margin-top: 4px;">Producers</div>
                        </div>
                        <div style="
                            flex: 1;
                            text-align: center;
                            padding: 12px;
                            background: #3498db;
                            color: white;
                            border-radius: 6px;
                            font-weight: 600;
                        ">
                            <div style="font-size: 18px;">U</div>
                            <div style="font-size: 11px; margin-top: 4px;">Users</div>
                        </div>
                        <div style="
                            flex: 1;
                            text-align: center;
                            padding: 12px;
                            background: #27ae60;
                            color: white;
                            border-radius: 6px;
                            font-weight: 600;
                        ">
                            <div style="font-size: 18px;">I</div>
                            <div style="font-size: 11px; margin-top: 4px;">Investors</div>
                        </div>
                    </div>

                    <canvas id="key-participation-demo" width="400" height="80" style="
                        width: 100%;
                        background: white;
                        border: 1px solid #e9ecef;
                        border-radius: 8px;
                    "></canvas>
                </div>
            `;

            // Structural Tiers section
            html += `
                <div class="key-section" style="
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e9ecef;
                ">
                    <h3 style="
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        Structural Tiers
                    </h3>
                    <p style="
                        font-size: 13px;
                        color: #7f8c8d;
                        margin-bottom: 16px;
                        line-height: 1.5;
                    ">Indicators on the left edge show the enterprise's position in the value chain</p>

                    <div style="display: flex; align-items: center; gap: 30px;">
                        <div style="
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                        ">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: #f8f9fa;
                                border: 2px solid #546e7a;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                font-size: 14px;
                                color: #546e7a;
                            ">T</div>
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: #f8f9fa;
                                border: 2px solid #546e7a;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                font-size: 14px;
                                color: #546e7a;
                            ">S</div>
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: #546e7a;
                                border: 2px solid #546e7a;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                font-size: 14px;
                                color: white;
                            ">P</div>
                        </div>
                        <div style="flex: 1;">
                            <div style="margin-bottom: 12px;">
                                <strong style="color: #2c3e50;">T - Tertiary</strong>
                                <span style="color: #7f8c8d; font-size: 13px;"> (Top): Retail, distribution, services</span>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <strong style="color: #2c3e50;">S - Secondary</strong>
                                <span style="color: #7f8c8d; font-size: 13px;"> (Middle): Processing, manufacturing</span>
                            </div>
                            <div>
                                <strong style="color: #2c3e50;">P - Primary</strong>
                                <span style="color: #7f8c8d; font-size: 13px;"> (Bottom): Raw materials, production</span>
                            </div>
                        </div>
                    </div>

                    <canvas id="key-tier-demo" width="400" height="100" style="
                        width: 100%;
                        margin-top: 20px;
                        background: white;
                        border: 1px solid #e9ecef;
                        border-radius: 8px;
                    "></canvas>
                </div>
            `;

            // Relationship types section
            html += `
                <div class="key-section" style="margin-bottom: 30px;">
                    <h3 style="
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        padding-bottom: 12px;
                        border-bottom: 2px solid #667eea;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        Relationship Types
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            `;

            const relationships = [
                { id: 'G', name: 'has a reserved governance role in', color: '#e74c3c' },
                { id: 'I', name: 'holds an investment in', color: '#f39c12' },
                { id: 'L', name: 'has an asset lock to', color: '#f1c40f' },
                { id: 'M', name: 'is a member of', color: '#2ecc71' },
                { id: 'O', name: 'owns', color: '#3498db' },
                { id: 'P', name: 'is a partner member of', color: '#9b59b6' },
                { id: 'S', name: 'supplies', color: '#e67e22' }
            ];

            relationships.forEach(rel => {
                const usageCount = stats.byRelationship[rel.id] || 0;
                const isUsed = usageCount > 0;

                html += `
                    <div class="key-item" style="
                        padding: 12px;
                        background: ${isUsed ? 'white' : '#f8f9fa'};
                        border: 2px solid ${isUsed ? '#e9ecef' : '#f8f9fa'};
                        border-radius: 8px;
                        transition: all 0.2s ease;
                        opacity: ${isUsed ? '1' : '0.7'};
                    "
                    onmouseover="this.style.borderColor='${rel.color}'; this.style.background='${rel.color}10';"
                    onmouseout="this.style.borderColor='${isUsed ? '#e9ecef' : '#f8f9fa'}'; this.style.background='${isUsed ? 'white' : '#f8f9fa'}';">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <canvas id="key-rel-${rel.id}" width="80" height="40"></canvas>
                            <div style="flex: 1;">
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    margin-bottom: 4px;
                                ">
                                    <div style="
                                        width: 28px;
                                        height: 28px;
                                        background: ${rel.color};
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: ${rel.color === '#f1c40f' ? '#2c3e50' : 'white'};
                                        font-weight: bold;
                                        font-size: 12px;
                                        box-shadow: 0 2px 4px ${rel.color}40;
                                    ">${rel.id}</div>
                                    ${isUsed ? `<span style="
                                        background: ${rel.color};
                                        color: ${rel.color === '#f1c40f' ? '#2c3e50' : 'white'};
                                        padding: 2px 6px;
                                        border-radius: 10px;
                                        font-size: 10px;
                                        font-weight: 600;
                                    ">${usageCount}</span>` : ''}
                                </div>
                                <div style="
                                    font-size: 11px;
                                    color: #7f8c8d;
                                    line-height: 1.3;
                                ">${rel.name}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';

            // Segmentation markers section
            html += `
                <div class="key-section" style="
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e9ecef;
                ">
                    <h3 style="
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        Segmentation Markers
                    </h3>
                    <p style="
                        font-size: 13px;
                        color: #7f8c8d;
                        margin-bottom: 20px;
                        line-height: 1.5;
                    ">Used when relationships connect to generic sets to indicate scope</p>

                    <h4 style="
                        font-size: 14px;
                        color: #34495e;
                        margin-bottom: 12px;
                        font-weight: 600;
                    ">Start Markers (FROM)</h4>
                    <div style="margin-bottom: 20px;">
                        ${this.renderMarkerItem('start-individual', 'Individual', 'No marker')}
                        ${this.renderMarkerItem('start-entire', 'Entire set', 'Filled circle')}
                        ${this.renderMarkerItem('start-subset', 'Subset', 'Hollow circle')}
                    </div>

                    <h4 style="
                        font-size: 14px;
                        color: #34495e;
                        margin-bottom: 12px;
                        font-weight: 600;
                    ">End Markers (TO)</h4>
                    <div>
                        ${this.renderMarkerItem('end-individual', 'Individual', 'Normal arrow')}
                        ${this.renderMarkerItem('end-entire', 'Entire set', 'Filled triangle')}
                        ${this.renderMarkerItem('end-subset', 'Subset', 'Hollow triangle')}
                    </div>
                </div>
            `;

            // Generic Set section
            html += `
                <div class="key-section" style="
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    border: 1px solid #e9ecef;
                ">
                    <h3 style="
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        Generic Set
                    </h3>
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 20px;
                    ">
                        <canvas id="key-generic-set" width="120" height="80" style="
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        "></canvas>
                        <div>
                            <strong style="
                                font-size: 15px;
                                color: #2c3e50;
                                display: block;
                                margin-bottom: 8px;
                            ">Multiple Enterprises</strong>
                            <p style="
                                font-size: 13px;
                                color: #7f8c8d;
                                margin: 0;
                                line-height: 1.5;
                            ">
                                Shown with a 3D stack effect to represent a collection of similar enterprises.
                                ${stats.genericSets > 0 ? `<br><strong>${stats.genericSets}</strong> generic set${stats.genericSets !== 1 ? 's' : ''} in current diagram.` : ''}
                            </p>
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

        renderMarkerItem(id, name, desc) {
            return `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    margin-bottom: 8px;
                ">
                    <canvas id="key-${id}" width="60" height="30"></canvas>
                    <div style="flex: 1;">
                        <strong style="font-size: 13px; color: #2c3e50;">${name}</strong>
                        <span style="font-size: 12px; color: #7f8c8d; margin-left: 8px;">${desc}</span>
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

                const width = 70;
                const height = 42;
                const x = 15;
                const y = 9;

                const options = {
                    fill: type.fill,
                    stroke: '#2c3e50',
                    lineWidth: 2
                };

                switch (type.id) {
                    case 'cooperative':
                    case 'excluded':
                        shapes.drawRectangle(ctx, x, y, width, height, options);
                        break;
                    case 'ncm':
                        shapes.drawRoundedRectangle(ctx, x, y, width, height, 10, options);
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

                // Show indicators for cooperative and ncm (but not excluded)
                if ((type.id === 'cooperative' || type.id === 'ncm') && type.id !== 'excluded') {
                    shapes.drawParticipationIndicators(ctx, x, y, width, height, ['producers', 'investors']);
                    shapes.drawTierIndicators(ctx, x, y, width, height, 'primary', type.id);
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
                ctx.clearRect(0, 0, 60, 30);

                // Draw base line
                ctx.beginPath();
                ctx.moveTo(10, 15);
                ctx.lineTo(50, 15);
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw marker based on style
                switch (marker.style) {
                    case 'filled':
                        ctx.beginPath();
                        ctx.arc(10, 15, 5, 0, 2 * Math.PI);
                        ctx.fillStyle = '#34495e';
                        ctx.fill();
                        break;
                    case 'hollow':
                        ctx.beginPath();
                        ctx.arc(10, 15, 5, 0, 2 * Math.PI);
                        ctx.strokeStyle = '#34495e';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        break;
                    case 'arrow':
                        ctx.beginPath();
                        ctx.moveTo(50, 15);
                        ctx.lineTo(45, 10);
                        ctx.moveTo(50, 15);
                        ctx.lineTo(45, 20);
                        ctx.stroke();
                        break;
                    case 'filled-triangle':
                        ctx.beginPath();
                        ctx.moveTo(50, 15);
                        ctx.lineTo(42, 10);
                        ctx.lineTo(42, 20);
                        ctx.closePath();
                        ctx.fillStyle = '#34495e';
                        ctx.fill();
                        break;
                    case 'hollow-triangle':
                        ctx.beginPath();
                        ctx.moveTo(50, 15);
                        ctx.lineTo(42, 10);
                        ctx.lineTo(42, 20);
                        ctx.closePath();
                        ctx.strokeStyle = '#34495e';
                        ctx.lineWidth = 2;
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

            const width = 80;
            const height = 50;
            const x = 20;
            const y = 15;

            shapes.drawStackEffect(
                ctx,
                shapes.drawRectangle,
                x, y, width, height,
                { fill: 'white', stroke: '#2c3e50', lineWidth: 2 }
            );
        },

        drawParticipationDemo() {
            const canvas = document.getElementById('key-participation-demo');
            if (!canvas || !CoopMaps.modules.shapes) return;

            const ctx = canvas.getContext('2d');
            const shapes = CoopMaps.modules.shapes;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw example cooperative with all roles
            const x = 150;
            const y = 25;
            const width = 100;
            const height = 40;

            shapes.drawRectangle(ctx, x, y, width, height, {
                fill: 'white',
                stroke: '#2c3e50',
                lineWidth: 2
            });

            shapes.drawParticipationIndicators(ctx, x, y, width, height, ['producers', 'users', 'investors']);

            // Add label
            ctx.fillStyle = '#2c3e50';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Example Co-op', x + width/2, y + height/2 + 4);
        },

        drawTierDemo() {
            const canvas = document.getElementById('key-tier-demo');
            if (!canvas || !CoopMaps.modules.shapes) return;

            const ctx = canvas.getContext('2d');
            const shapes = CoopMaps.modules.shapes;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw example NCM with hybrid tiers
            const x = 150;
            const y = 30;
            const width = 100;
            const height = 40;

            shapes.drawRoundedRectangle(ctx, x, y, width, height, 10, {
                fill: 'white',
                stroke: '#2c3e50',
                lineWidth: 2
            });

            shapes.drawTierIndicators(ctx, x, y, width, height, 'hybrid-primary-secondary', 'ncm');

            // Add label
            ctx.fillStyle = '#2c3e50';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Example NCM', x + width/2, y + height/2 + 4);
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
            pdf.text('Co-opMaps Symbol Key', pageWidth / 2, yOffset, { align: 'center' });
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
                { letter: 'G', name: 'Governance', color: [231, 76, 60] },
                { letter: 'I', name: 'Investment', color: [39, 174, 96] },
                { letter: 'L', name: 'Asset Lock', color: [243, 156, 18] },
                { letter: 'M', name: 'Member', color: [155, 89, 182] },
                { letter: 'O', name: 'Owns', color: [52, 73, 94] },
                { letter: 'P', name: 'Partner', color: [52, 152, 219] },
                { letter: 'S', name: 'Supplies', color: [22, 160, 133] }
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
