/**
 * Co-opMaps - Export Module
 * Handles exporting diagrams to PNG, PDF, and SVG formats
 */

(function() {
    'use strict';

    const exportModule = {
        init() {
            console.log('Export module initialized');
        },

        showExportDialog() {
            const html = `
                <div class="modal" id="exportModal" style="display: flex;">
                    <div class="modal-content" style="max-width: 500px;">
                        <h2 style="margin-bottom: 20px;">Export Diagram</h2>
                        <p style="margin-bottom: 24px; color: var(--gray);">
                            Choose a format to export your diagram.
                        </p>

                        <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                            <button class="export-format-btn" onclick="CoopMaps.modules.export.exportPNG()">
                                <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                                <div style="font-weight: 600; margin-bottom: 4px;">PNG Image</div>
                                <div style="font-size: 12px; color: var(--gray);">
                                    High-quality raster image for presentations and documents
                                </div>
                            </button>

                            <button class="export-format-btn" onclick="CoopMaps.modules.export.exportPDF()">
                                <div style="font-size: 32px; margin-bottom: 8px;">📄</div>
                                <div style="font-weight: 600; margin-bottom: 4px;">PDF Document</div>
                                <div style="font-size: 12px; color: var(--gray);">
                                    Professional document format with metadata
                                </div>
                            </button>

                            <button class="export-format-btn" onclick="CoopMaps.modules.export.exportSVG()">
                                <div style="font-size: 32px; margin-bottom: 8px;">🎨</div>
                                <div style="font-weight: 600; margin-bottom: 4px;">SVG Vector</div>
                                <div style="font-size: 12px; color: var(--gray);">
                                    Scalable vector graphics for editing in design tools
                                </div>
                            </button>

                            <button class="export-format-btn" onclick="CoopMaps.modules.export.exportJSON()">
                                <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
                                <div style="font-weight: 600; margin-bottom: 4px;">JSON Data</div>
                                <div style="font-size: 12px; color: var(--gray);">
                                    Raw data format for backup and sharing
                                </div>
                            </button>
                        </div>

                        <button
                            class="btn-secondary"
                            onclick="document.getElementById('exportModal').remove()"
                            style="width: 100%; padding: 12px; background: var(--light-gray); border: none; border-radius: 8px; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>

                <style>
                    .export-format-btn {
                        padding: 20px;
                        text-align: center;
                        background: white;
                        border: 2px solid var(--light-gray);
                        border-radius: 12px;
                        cursor: pointer;
                        transition: var(--transition-fast);
                    }

                    .export-format-btn:hover {
                        border-color: var(--primary);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                    }
                </style>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
        },

        exportPNG() {
            document.getElementById('exportModal').remove();

            const canvas = document.getElementById('canvas');
            if (!canvas) {
                window.CoopMaps.showNotification('Canvas not found', 'error');
                return;
            }

            try {
                // Create a temporary canvas with white background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');

                // Fill with white background
                tempCtx.fillStyle = '#ffffff';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Draw the original canvas content
                tempCtx.drawImage(canvas, 0, 0);

                // Convert to blob and download
                tempCanvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    const filename = this.getFilename('png');
                    link.download = filename;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);

                    window.CoopMaps.showNotification('PNG exported successfully', 'success');
                }, 'image/png');

            } catch (error) {
                console.error('PNG export error:', error);
                window.CoopMaps.showNotification('PNG export failed', 'error');
            }
        },

        exportPDF() {
            document.getElementById('exportModal').remove();

            if (typeof jspdf === 'undefined') {
                window.CoopMaps.showNotification('PDF library not loaded', 'error');
                return;
            }

            try {
                const canvas = document.getElementById('canvas');
                const state = window.CoopMaps.state.data;

                // Create PDF
                const { jsPDF } = jspdf;
                const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
                const pdf = new jsPDF(orientation, 'pt', [canvas.width, canvas.height]);

                // Add title if available
                const title = state.diagramMetadata.title || 'Co-op Map';
                pdf.setFontSize(10);
                pdf.text(title, 10, 15);

                // Add canvas as image
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 20, canvas.width, canvas.height - 20);

                // Add metadata
                pdf.setProperties({
                    title: title,
                    subject: 'Cooperative Ecosystem Map',
                    author: state.diagramMetadata.author || 'Co-opMaps',
                    creator: 'Co-opMaps v0.92'
                });

                // Save
                const filename = this.getFilename('pdf');
                pdf.save(filename);

                window.CoopMaps.showNotification('PDF exported successfully', 'success');

            } catch (error) {
                console.error('PDF export error:', error);
                window.CoopMaps.showNotification('PDF export failed', 'error');
            }
        },

        exportSVG() {
            document.getElementById('exportModal').remove();

            try {
                const canvas = document.getElementById('canvas');
                const state = window.CoopMaps.state.data;
                const connectorStyle = window.CoopMaps.state.ui.connectorStyle || 'orthogonal';

                // Create SVG
                let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
    <title>${this.escapeXml(state.diagramMetadata.title || 'Co-op Map')}</title>
    <desc>Created with Co-opMaps v0.92</desc>

    <!-- Background -->
    <rect width="100%" height="100%" fill="#ffffff"/>

    <!-- Relationships -->
    <g id="relationships">
`;

                // Add relationships
                const shapes = window.CoopMaps.modules.shapes;
                if (shapes && state.relationships) {
                    state.relationships.forEach(rel => {
                        const startEnt = state.enterprises.find(e => e.id === rel.startEnterpriseId);
                        const endEnt = state.enterprises.find(e => e.id === rel.endEnterpriseId);

                        if (startEnt && endEnt) {
                            const relType = shapes.relationshipTypes[rel.type] || shapes.relationshipTypes['G'];
                            const color = rel.color || relType.color;

                            const startX = startEnt.x + startEnt.width / 2;
                            const startY = startEnt.y + startEnt.height / 2;
                            const endX = endEnt.x + endEnt.width / 2;
                            const endY = endEnt.y + endEnt.height / 2;

                            let path;
                            if (connectorStyle === 'orthogonal') {
                                const midX = (startX + endX) / 2;
                                path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
                            } else {
                                path = `M ${startX} ${startY} L ${endX} ${endY}`;
                            }

                            const strokeDasharray = relType.style === 'dashed' ? '10,5' : (relType.style === 'dotted' ? '3,3' : '');

                            svg += `        <path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-dasharray="${strokeDasharray}"/>\n`;
                            svg += `        <text x="${(startX + endX) / 2}" y="${(startY + endY) / 2}" text-anchor="middle" fill="${color}" font-weight="bold" font-size="12">${rel.type}</text>\n`;
                        }
                    });
                }

                svg += `    </g>

    <!-- Enterprises -->
    <g id="enterprises">
`;

                // Add enterprises
                if (state.enterprises) {
                    state.enterprises.forEach(ent => {
                        const typeInfo = shapes ? shapes.enterpriseTypes[ent.type] : null;

                        svg += `        <g id="${ent.id}">
            <rect x="${ent.x}" y="${ent.y}" width="${ent.width}" height="${ent.height}"
                  fill="${ent.fill || '#3498db'}" stroke="${ent.stroke || '#2c3e50'}"
                  stroke-width="2" rx="8"/>
            <text x="${ent.x + ent.width / 2}" y="${ent.y + ent.height / 2}"
                  text-anchor="middle" dominant-baseline="middle"
                  font-weight="bold" font-size="14" fill="#2c3e50">
                ${this.escapeXml(ent.name || 'Unnamed')}
            </text>
        </g>
`;
                    });
                }

                svg += `    </g>
</svg>`;

                // Download SVG
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = this.getFilename('svg');
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                window.CoopMaps.showNotification('SVG exported successfully', 'success');

            } catch (error) {
                console.error('SVG export error:', error);
                window.CoopMaps.showNotification('SVG export failed', 'error');
            }
        },

        exportJSON() {
            document.getElementById('exportModal').remove();

            try {
                const state = window.CoopMaps.state.data;

                const exportData = {
                    version: window.CoopMaps.version,
                    metadata: state.diagramMetadata,
                    enterprises: state.enterprises,
                    relationships: state.relationships,
                    exportDate: new Date().toISOString()
                };

                const json = JSON.stringify(exportData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = this.getFilename('json');
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                window.CoopMaps.showNotification('JSON exported successfully', 'success');

            } catch (error) {
                console.error('JSON export error:', error);
                window.CoopMaps.showNotification('JSON export failed', 'error');
            }
        },

        getFilename(extension) {
            const state = window.CoopMaps.state.data;
            const title = (state.diagramMetadata.title || 'coopmaps-diagram')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            const timestamp = new Date().toISOString().slice(0, 10);
            return `${title}-${timestamp}.${extension}`;
        },

        escapeXml(text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('export', exportModule);
    }
})();
