/**
 * Co-op Maps - Import Module
 * CSV/Excel import with template mapping
 */

(function() {
    'use strict';

    // Import templates define how CSV columns map to enterprise properties
    const importTemplates = {
        simple: {
            name: 'Simple (Name only)',
            description: 'Just enterprise names, one per line',
            columns: [
                { csvHeader: 'name', property: 'name', required: true }
            ],
            example: 'name\nLocal Co-op\nCommunity Store\nWorkers United'
        },
        basic: {
            name: 'Basic (Name + Type)',
            description: 'Enterprise name and type',
            columns: [
                { csvHeader: 'name', property: 'name', required: true },
                { csvHeader: 'type', property: 'type', required: false, default: 'cooperative' }
            ],
            example: 'name,type\nLocal Co-op,cooperative\nCommunity Store,social\nAcme Corp,private'
        },
        standard: {
            name: 'Standard',
            description: 'Name, type, and tier information',
            columns: [
                { csvHeader: 'name', property: 'name', required: true },
                { csvHeader: 'type', property: 'type', required: false, default: 'cooperative' },
                { csvHeader: 'tier', property: 'tier', required: false, default: 'primary' },
                { csvHeader: 'roles', property: 'roles', required: false, default: '' }
            ],
            example: 'name,type,tier,roles\nLocal Co-op,cooperative,primary,producer\nSupplier Ltd,private,secondary,supplier'
        },
        full: {
            name: 'Full Details',
            description: 'All enterprise properties including position',
            columns: [
                { csvHeader: 'name', property: 'name', required: true },
                { csvHeader: 'type', property: 'type', required: false, default: 'cooperative' },
                { csvHeader: 'tier', property: 'tier', required: false, default: 'primary' },
                { csvHeader: 'roles', property: 'roles', required: false, default: '' },
                { csvHeader: 'x', property: 'x', required: false, default: 'auto' },
                { csvHeader: 'y', property: 'y', required: false, default: 'auto' },
                { csvHeader: 'color', property: 'color', required: false, default: '' },
                { csvHeader: 'generic', property: 'isGenericSet', required: false, default: 'false' }
            ],
            example: 'name,type,tier,roles,x,y,color,generic\nLocal Co-op,cooperative,primary,producer;buyer,100,100,#3498db,false'
        }
    };

    // Valid enterprise types for validation
    const validTypes = [
        'cooperative', 'ncm', 'social', 'private', 'public',
        'state', 'partnership', 'charity', 'community', 'excluded'
    ];

    // Type aliases for flexibility
    const typeAliases = {
        'coop': 'cooperative',
        'co-op': 'cooperative',
        'mutual': 'ncm',
        'non-cooperative mutual': 'ncm',
        'social enterprise': 'social',
        'private enterprise': 'private',
        'public enterprise': 'public',
        'state enterprise': 'state',
        'community org': 'community',
        'community organization': 'community',
        'community organisation': 'community'
    };

    CoopMaps.registerModule('import', {
        currentTemplate: 'basic',
        parsedData: [],
        fileContent: '',

        init() {
            console.log('[OK] Import module initialized');
        },

        showImportDialog() {
            const self = this;

            // Remove existing dialog
            const existing = document.getElementById('importModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'importModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                    <h2 style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Import Enterprises from CSV
                    </h2>

                    <!-- Step 1: Choose Template -->
                    <div id="importStep1">
                        <h3 style="margin-bottom: 15px; color: #2c3e50;">Step 1: Choose Import Template</h3>
                        <div style="display: grid; gap: 10px; margin-bottom: 20px;">
                            ${Object.entries(importTemplates).map(([key, template]) => `
                                <label style="
                                    display: flex;
                                    align-items: flex-start;
                                    gap: 12px;
                                    padding: 12px;
                                    border: 2px solid ${self.currentTemplate === key ? '#3498db' : '#e0e0e0'};
                                    border-radius: 8px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                " onmouseover="this.style.borderColor='#3498db'"
                                   onmouseout="this.style.borderColor='${self.currentTemplate === key ? '#3498db' : '#e0e0e0'}'">
                                    <input type="radio" name="importTemplate" value="${key}"
                                        ${self.currentTemplate === key ? 'checked' : ''}
                                        onchange="CoopMaps.modules.import.selectTemplate('${key}')"
                                        style="margin-top: 3px;">
                                    <div>
                                        <strong style="color: #2c3e50;">${template.name}</strong>
                                        <div style="font-size: 12px; color: #666; margin-top: 2px;">${template.description}</div>
                                        <div style="font-size: 11px; color: #999; margin-top: 4px;">
                                            Columns: ${template.columns.map(c => c.csvHeader).join(', ')}
                                        </div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>

                        <h3 style="margin-bottom: 15px; color: #2c3e50;">Step 2: Upload CSV File or Paste Data</h3>

                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <input type="file" id="csvFileInput" accept=".csv,.txt" style="display: none;"
                                onchange="CoopMaps.modules.import.handleFileSelect(event)">
                            <button type="button" onclick="document.getElementById('csvFileInput').click()" style="
                                padding: 10px 20px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Choose File
                            </button>
                            <span id="selectedFileName" style="color: #666; align-self: center;">No file selected</span>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Or paste CSV data:</label>
                            <textarea id="csvPasteArea" rows="6" placeholder="${importTemplates[self.currentTemplate].example}" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid #ddd;
                                border-radius: 6px;
                                font-family: monospace;
                                font-size: 12px;
                                resize: vertical;
                            "></textarea>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" onclick="document.getElementById('importModal').remove()" style="
                                padding: 10px 20px;
                                background: #f5f5f5;
                                border: 1px solid #ddd;
                                border-radius: 6px;
                                cursor: pointer;
                            ">Cancel</button>
                            <button type="button" onclick="CoopMaps.modules.import.parseAndPreview()" style="
                                padding: 10px 20px;
                                background: #27ae60;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                            ">Preview Import</button>
                        </div>
                    </div>

                    <!-- Step 2: Preview (hidden initially) -->
                    <div id="importStep2" style="display: none;">
                        <h3 style="margin-bottom: 15px; color: #2c3e50;">Preview Import</h3>
                        <div id="importPreview" style="
                            max-height: 300px;
                            overflow-y: auto;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            margin-bottom: 15px;
                        "></div>
                        <div id="importSummary" style="
                            padding: 10px;
                            background: #f8f9fa;
                            border-radius: 6px;
                            margin-bottom: 15px;
                            font-size: 14px;
                        "></div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" onclick="CoopMaps.modules.import.backToStep1()" style="
                                padding: 10px 20px;
                                background: #f5f5f5;
                                border: 1px solid #ddd;
                                border-radius: 6px;
                                cursor: pointer;
                            ">Back</button>
                            <button type="button" onclick="CoopMaps.modules.import.executeImport()" style="
                                padding: 10px 20px;
                                background: #27ae60;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                            ">Import Enterprises</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        },

        selectTemplate(templateKey) {
            this.currentTemplate = templateKey;
            const placeholder = importTemplates[templateKey].example;
            const textarea = document.getElementById('csvPasteArea');
            if (textarea) {
                textarea.placeholder = placeholder;
            }
        },

        handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            document.getElementById('selectedFileName').textContent = file.name;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.fileContent = e.target.result;
                document.getElementById('csvPasteArea').value = this.fileContent;
            };
            reader.readAsText(file);
        },

        parseAndPreview() {
            const textarea = document.getElementById('csvPasteArea');
            const csvData = textarea.value.trim() || this.fileContent.trim();

            if (!csvData) {
                CoopMaps.showNotification('Please provide CSV data or upload a file', 'error');
                return;
            }

            try {
                this.parsedData = this.parseCSV(csvData);

                if (this.parsedData.length === 0) {
                    CoopMaps.showNotification('No valid data found in CSV', 'error');
                    return;
                }

                this.showPreview();
            } catch (error) {
                CoopMaps.showNotification('Error parsing CSV: ' + error.message, 'error');
            }
        },

        parseCSV(csvData) {
            const lines = csvData.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length === 0) return [];

            const template = importTemplates[this.currentTemplate];
            const delimiter = csvData.includes('\t') ? '\t' : ',';

            // Parse header
            const headerLine = lines[0].toLowerCase();
            const headers = this.parseCSVLine(headerLine, delimiter);

            // Check if first line is a header or data
            const hasHeader = template.columns.some(col =>
                headers.includes(col.csvHeader.toLowerCase())
            );

            const dataStartIndex = hasHeader ? 1 : 0;
            const parsedEntries = [];

            for (let i = dataStartIndex; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i], delimiter);
                if (values.length === 0 || (values.length === 1 && !values[0])) continue;

                const enterprise = this.mapToEnterprise(
                    hasHeader ? headers : null,
                    values,
                    template
                );

                if (enterprise) {
                    enterprise._rowNum = i + 1;
                    parsedEntries.push(enterprise);
                }
            }

            return parsedEntries;
        },

        parseCSVLine(line, delimiter) {
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            return values;
        },

        mapToEnterprise(headers, values, template) {
            const enterprise = {
                id: this.generateId(),
                name: '',
                type: 'cooperative',
                tier: 'primary',
                roles: [],
                x: 0,
                y: 0,
                width: 140,
                height: 84,
                color: '',
                isGenericSet: false
            };

            template.columns.forEach((colDef, index) => {
                let value;

                if (headers) {
                    // Find column by header name
                    const headerIndex = headers.indexOf(colDef.csvHeader.toLowerCase());
                    value = headerIndex >= 0 ? values[headerIndex] : undefined;
                } else {
                    // Use positional mapping
                    value = values[index];
                }

                if (value === undefined || value === '') {
                    value = colDef.default;
                }

                // Apply value to enterprise
                switch (colDef.property) {
                    case 'name':
                        enterprise.name = value || 'Unnamed';
                        break;
                    case 'type':
                        enterprise.type = this.normalizeType(value);
                        break;
                    case 'tier':
                        enterprise.tier = ['primary', 'secondary', 'tertiary'].includes(value?.toLowerCase())
                            ? value.toLowerCase()
                            : 'primary';
                        break;
                    case 'roles':
                        if (value && typeof value === 'string') {
                            enterprise.roles = value.split(/[;,]/).map(r => r.trim()).filter(r => r);
                        }
                        break;
                    case 'x':
                        enterprise.x = value === 'auto' ? 0 : parseInt(value) || 0;
                        enterprise._autoPosition = value === 'auto' || !value;
                        break;
                    case 'y':
                        enterprise.y = value === 'auto' ? 0 : parseInt(value) || 0;
                        break;
                    case 'color':
                        if (value && value.match(/^#[0-9a-fA-F]{6}$/)) {
                            enterprise.color = value;
                        }
                        break;
                    case 'isGenericSet':
                        enterprise.isGenericSet = value === 'true' || value === '1' || value === 'yes';
                        break;
                }
            });

            // Skip if no name
            if (!enterprise.name || enterprise.name === 'Unnamed') {
                return null;
            }

            return enterprise;
        },

        normalizeType(value) {
            if (!value) return 'cooperative';
            const lower = value.toLowerCase().trim();

            // Check aliases first
            if (typeAliases[lower]) {
                return typeAliases[lower];
            }

            // Check valid types
            if (validTypes.includes(lower)) {
                return lower;
            }

            // Default to cooperative
            return 'cooperative';
        },

        generateId() {
            return 'ent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        showPreview() {
            document.getElementById('importStep1').style.display = 'none';
            document.getElementById('importStep2').style.display = 'block';

            const previewDiv = document.getElementById('importPreview');
            const summaryDiv = document.getElementById('importSummary');

            // Count by type
            const typeCounts = {};
            this.parsedData.forEach(e => {
                typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
            });

            previewDiv.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Row</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Name</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Type</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Tier</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Roles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.parsedData.slice(0, 50).map(e => `
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${e._rowNum}</td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${this.escapeHtml(e.name)}</td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${e.type}</td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${e.tier}</td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${e.roles.join(', ') || '-'}</td>
                            </tr>
                        `).join('')}
                        ${this.parsedData.length > 50 ? `
                            <tr>
                                <td colspan="5" style="padding: 8px; text-align: center; color: #666;">
                                    ... and ${this.parsedData.length - 50} more entries
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            `;

            summaryDiv.innerHTML = `
                <strong>Import Summary:</strong> ${this.parsedData.length} enterprises will be added<br>
                <span style="color: #666;">
                    ${Object.entries(typeCounts).map(([type, count]) => `${type}: ${count}`).join(' | ')}
                </span>
            `;
        },

        backToStep1() {
            document.getElementById('importStep1').style.display = 'block';
            document.getElementById('importStep2').style.display = 'none';
        },

        executeImport() {
            if (this.parsedData.length === 0) {
                CoopMaps.showNotification('No data to import', 'error');
                return;
            }

            // Save state for undo
            CoopMaps.saveState();

            // Calculate auto-positioning
            const canvas = CoopMaps.modules.canvas;
            const canvasSize = canvas.canvasSizes[canvas.currentCanvasSize];
            const existingCount = CoopMaps.state.data.enterprises.length;

            // Grid-based auto-positioning
            const cols = Math.ceil(Math.sqrt(this.parsedData.length));
            const spacing = { x: 180, y: 120 };
            const startX = 50;
            const startY = 50 + (existingCount > 0 ?
                Math.max(...CoopMaps.state.data.enterprises.map(e => e.y + e.height)) + 50 : 0);

            this.parsedData.forEach((enterprise, index) => {
                // Remove internal properties
                delete enterprise._rowNum;

                // Auto-position if needed
                if (enterprise._autoPosition || (enterprise.x === 0 && enterprise.y === 0)) {
                    enterprise.x = startX + (index % cols) * spacing.x;
                    enterprise.y = startY + Math.floor(index / cols) * spacing.y;
                }
                delete enterprise._autoPosition;

                // Add to enterprises
                CoopMaps.state.data.enterprises.push(enterprise);
            });

            // Close modal and refresh
            document.getElementById('importModal').remove();
            canvas.render();

            CoopMaps.showNotification(`Successfully imported ${this.parsedData.length} enterprises`, 'success');
            this.parsedData = [];
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // Export template examples for users
        downloadTemplate(templateKey) {
            const template = importTemplates[templateKey];
            if (!template) return;

            const content = template.example;
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `coopmaps-import-template-${templateKey}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    });
})();
