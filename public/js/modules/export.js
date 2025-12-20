/**
 * Co-opMaps - Export Module
 * Enhanced export with jsPDF integration and orthogonal connector support
 */

(function() {
    'use strict';

    // Enhanced Export Module with jsPDF integration
    CoopMaps.registerModule('export', {
        init() {
            console.log('Enhanced Export module initialized');
            this.loadJsPDF();
        },

        loadJsPDF() {
            // Check if jsPDF is already loaded
            if (typeof window.jspdf !== 'undefined') {
                console.log('jsPDF already loaded');
                return;
            }

            // jsPDF should be loaded in the main HTML head
            console.log('Checking for jsPDF...');
        },

        showExportDialog() {
            // Create enhanced export modal
            const existingModal = document.getElementById('exportModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'exportModal';
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
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s ease;
            `;

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 600px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease;
                ">
                    <div class="modal-header" style="margin-bottom: 30px;">
                        <h2 style="
                            font-size: 28px;
                            color: #2c3e50;
                            margin: 0;
                            font-weight: 600;
                        ">Export Diagram</h2>
                        <span class="modal-close" onclick="this.closest('.modal').remove()" style="
                            float: right;
                            font-size: 32px;
                            cursor: pointer;
                            color: #95a5a6;
                            margin-top: -40px;
                            transition: color 0.2s ease;
                        ">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="export-options" style="display: grid; gap: 20px;">
                            <div class="export-format" onclick="CoopMaps.modules.export.exportPNG()" style="
                                padding: 25px;
                                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                                border: 2px solid transparent;
                                border-radius: 12px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                position: relative;
                                overflow: hidden;
                            " onmouseover="this.style.borderColor='#3498db'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(52, 152, 219, 0.1)'"
                               onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <div style="display: flex; align-items: center; gap: 20px;">
                                    <div style="
                                        width: 60px;
                                        height: 60px;
                                        background: #3498db;
                                        border-radius: 12px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: white;
                                        font-size: 24px;
                                        font-weight: bold;
                                    ">PNG</div>
                                    <div>
                                        <strong style="font-size: 18px; color: #2c3e50; display: block; margin-bottom: 5px;">PNG Image</strong>
                                        <p style="margin: 0; color: #7f8c8d; font-size: 14px;">High-quality raster image perfect for presentations and documents</p>
                                    </div>
                                </div>
                            </div>

                            <div class="export-format" onclick="CoopMaps.modules.export.exportSVG()" style="
                                padding: 25px;
                                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                                border: 2px solid transparent;
                                border-radius: 12px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.borderColor='#27ae60'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(39, 174, 96, 0.1)'"
                               onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <div style="display: flex; align-items: center; gap: 20px;">
                                    <div style="
                                        width: 60px;
                                        height: 60px;
                                        background: #27ae60;
                                        border-radius: 12px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: white;
                                        font-size: 24px;
                                        font-weight: bold;
                                    ">SVG</div>
                                    <div>
                                        <strong style="font-size: 18px; color: #2c3e50; display: block; margin-bottom: 5px;">SVG Vector</strong>
                                        <p style="margin: 0; color: #7f8c8d; font-size: 14px;">Scalable vector format ideal for editing and high-resolution printing</p>
                                    </div>
                                </div>
                            </div>

                            <div class="export-format" onclick="CoopMaps.modules.export.exportPDF()" style="
                                padding: 25px;
                                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                                border: 2px solid transparent;
                                border-radius: 12px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.borderColor='#e74c3c'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(231, 76, 60, 0.1)'"
                               onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <div style="display: flex; align-items: center; gap: 20px;">
                                    <div style="
                                        width: 60px;
                                        height: 60px;
                                        background: #e74c3c;
                                        border-radius: 12px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: white;
                                        font-size: 24px;
                                        font-weight: bold;
                                    ">PDF</div>
                                    <div>
                                        <strong style="font-size: 18px; color: #2c3e50; display: block; margin-bottom: 5px;">PDF Document</strong>
                                        <p style="margin: 0; color: #7f8c8d; font-size: 14px;">Professional document format with metadata and high compatibility</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="
                            margin-top: 30px;
                            padding: 20px;
                            background: #ecf0f1;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            gap: 15px;
                        ">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: #3498db;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 20px;
                            ">ℹ</div>
                            <div>
                                <strong style="color: #2c3e50;">Export Information</strong>
                                <p style="margin: 5px 0 0 0; font-size: 13px; color: #7f8c8d;">
                                    All exports will match your current canvas size (${CoopMaps.state.ui.canvasSize || 'A4'}) in landscape orientation.
                                    Diagrams are exported without grid lines for a clean, professional appearance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add animations
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            // Close on clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        exportPNG() {
            console.log('Starting PNG export...');

            // Show progress indicator
            this.showProgress('Generating PNG image...');

            // Re-render without grid
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render(true); // true = exclude grid
            }

            setTimeout(() => {
                const canvas = document.getElementById('canvas');
                const metadata = CoopMaps.state.data.diagramMetadata;

                // Export at exact canvas size
                const link = document.createElement('a');
                const filename = this.generateFilename(metadata.title, 'png');
                link.download = filename;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();

                // Re-render with grid for normal view
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render(false);
                }

                this.hideProgress();
                this.showSuccess('PNG exported successfully!');

                // Close modal
                const modal = document.getElementById('exportModal');
                if (modal) {
                    setTimeout(() => modal.remove(), 1500);
                }
            }, 100);
        },

        exportSVG() {
            console.log('Starting SVG export...');

            this.showProgress('Generating SVG vector graphic...');

            // Re-render without grid
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render(true);
            }

            setTimeout(() => {
                const canvas = document.getElementById('canvas');
                const metadata = CoopMaps.state.data.diagramMetadata;

                // Create SVG container matching canvas size
                let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvas.width}" height="${canvas.height}"
     viewBox="0 0 ${canvas.width} ${canvas.height}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">

    <!-- Background -->
    <rect width="${canvas.width}" height="${canvas.height}" fill="white"/>

    <!-- Title -->
    <text x="${canvas.width/2}" y="50"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          font-size="28" font-weight="bold" text-anchor="middle" fill="#2c3e50">
        ${this.escapeXml(metadata.title || 'Co-op Diagram')}
    </text>`;

                // Add date if present
                if (metadata.date) {
                    svg += `
    <text x="${canvas.width/2}" y="80"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          font-size="14" text-anchor="middle" fill="#7f8c8d">
        ${this.escapeXml(metadata.date)}
    </text>`;
                }

                // Add author if present
                if (metadata.author) {
                    svg += `
    <text x="${canvas.width/2}" y="95"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          font-size="12" text-anchor="middle" fill="#95a5a6">
        by ${this.escapeXml(metadata.author)}
    </text>`;
                }

                svg += `

    <g transform="translate(0, 0)">`;

                // Convert enterprises to SVG
                CoopMaps.state.data.enterprises.forEach(enterprise => {
                    svg += this.enterpriseToSVG(enterprise);
                });

                // Convert relationships to SVG
                CoopMaps.state.data.relationships.forEach(relationship => {
                    svg += this.relationshipToSVG(relationship);
                });

                svg += `
    </g>

    <!-- Watermark -->
    <text x="${canvas.width - 20}" y="${canvas.height - 20}"
          font-family="Arial" font-size="12" text-anchor="end" fill="rgba(0,0,0,0.3)">
        Created with Co-opMaps v${CoopMaps.version}
    </text>
</svg>`;

                // Download SVG
                const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const filename = this.generateFilename(metadata.title, 'svg');
                link.download = filename;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                // Re-render with grid
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render(false);
                }

                this.hideProgress();
                this.showSuccess('SVG exported successfully!');

                // Close modal
                const modal = document.getElementById('exportModal');
                if (modal) {
                    setTimeout(() => modal.remove(), 1500);
                }
            }, 100);
        },

        exportPDF() {
            console.log('Starting PDF export...');

            // Check if jsPDF is loaded
            if (typeof window.jspdf === 'undefined') {
                alert('PDF export library is still loading. Please try again in a moment.');
                return;
            }

            this.showProgress('Generating PDF document...');

            // Re-render without grid
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render(true);
            }

            setTimeout(() => {
                const { jsPDF } = window.jspdf;
                const canvas = document.getElementById('canvas');
                const metadata = CoopMaps.state.data.diagramMetadata;
                const canvasSize = CoopMaps.state.ui.canvasSize || 'A4';

                // Create PDF in landscape orientation matching canvas size
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: canvasSize.toLowerCase(),
                    compress: true
                });

                // Add metadata
                pdf.setProperties({
                    title: metadata.title || 'Co-op Diagram',
                    subject: 'Co-operative Enterprise Diagram',
                    author: metadata.author || 'Co-opMaps User',
                    keywords: 'cooperative, diagram, enterprise, relationship',
                    creator: 'Co-opMaps v' + CoopMaps.version
                });

                // Get page dimensions in mm
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                // Convert canvas to image data
                const imgData = canvas.toDataURL('image/png', 1.0);

                // Calculate scaling to fit the PDF page with margins
                const margin = 10; // 10mm margins
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);

                // Canvas dimensions in mm (assuming 96 DPI)
                const canvasWidthMM = canvas.width * 0.264583; // pixels to mm at 96 DPI
                const canvasHeightMM = canvas.height * 0.264583;

                // Calculate scale to fit
                const scaleX = availableWidth / canvasWidthMM;
                const scaleY = availableHeight / canvasHeightMM;
                const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down if needed

                // Calculate final dimensions
                const finalWidth = canvasWidthMM * scale;
                const finalHeight = canvasHeightMM * scale;

                // Center on page
                const x = (pageWidth - finalWidth) / 2;
                const y = (pageHeight - finalHeight) / 2;

                // Add the image to PDF
                pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');

                // Add page footer
                pdf.setFontSize(9);
                pdf.setTextColor(150, 150, 150);

                // Left footer - page number
                pdf.text('Page 1 of 1', margin, pageHeight - 5);

                // Center footer - WDR if present
                if (metadata.wdr) {
                    pdf.text(`WDR: ${metadata.wdr}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
                }

                // Right footer - created with
                pdf.text('Created with Co-opMaps v' + CoopMaps.version, pageWidth - margin, pageHeight - 5, { align: 'right' });

                // Save the PDF
                const filename = this.generateFilename(metadata.title, 'pdf');
                pdf.save(filename);

                // Re-render with grid
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render(false);
                }

                this.hideProgress();
                this.showSuccess('PDF exported successfully!');

                // Close modal
                const modal = document.getElementById('exportModal');
                if (modal) {
                    setTimeout(() => modal.remove(), 1500);
                }
            }, 100);
        },

        // Helper methods
        generateFilename(title, extension) {
            const safeTitle = (title || 'coopmaps-diagram')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const date = new Date().toISOString().split('T')[0];
            return `${safeTitle}-${date}.${extension}`;
        },

        escapeXml(str) {
            if (!str) return '';
            return str.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                }
            });
        },

        enterpriseToSVG(enterprise) {
            // Simplified SVG generation for enterprises
            let svg = `<g transform="translate(${enterprise.x}, ${enterprise.y})">`;

            switch (enterprise.type) {
                case 'cooperative':
                case 'excluded':
                    svg += `<rect width="${enterprise.width}" height="${enterprise.height}"
                            fill="${enterprise.fill || 'white'}" stroke="${enterprise.stroke || '#2c3e50'}"
                            stroke-width="2"/>`;
                    break;
                case 'ncm':
                    // Rounded rectangle with left extension
                    const leftExtension = enterprise.height * 0.2;
                    svg += `<path d="M 0 0 L ${enterprise.width} 0 L ${enterprise.width} ${enterprise.height}
                            Q ${enterprise.width/2} ${enterprise.height + leftExtension/2} 0 ${enterprise.height + leftExtension} L 0 0 Z"
                            fill="${enterprise.fill || 'white'}" stroke="${enterprise.stroke || '#2c3e50'}"
                            stroke-width="2"/>`;
                    break;
                case 'social':
                    svg += `<rect rx="${enterprise.height/2}" ry="${enterprise.height/2}"
                            width="${enterprise.width}" height="${enterprise.height}"
                            fill="${enterprise.fill || '#FFFF00'}" stroke="${enterprise.stroke || '#f9a825'}"
                            stroke-width="2"/>`;
                    break;
                case 'private':
                    svg += `<ellipse cx="${enterprise.width/2}" cy="${enterprise.height/2}"
                            rx="${enterprise.width/2}" ry="${enterprise.height/2}"
                            fill="${enterprise.fill || '#f0f0f0'}" stroke="${enterprise.stroke || '#546e7a'}"
                            stroke-width="2"/>`;
                    break;
                case 'state':
                    const hw = enterprise.width / 2;
                    const hh = enterprise.height / 2;
                    svg += `<path d="M ${hw} 0 L ${enterprise.width} ${hh} L ${hw} ${enterprise.height} L 0 ${hh} Z"
                            fill="${enterprise.fill || '#f0f0f0'}" stroke="${enterprise.stroke || '#37474f'}"
                            stroke-width="2"/>`;
                    break;
            }

            // Add participation indicators for cooperatives and NCMs (but not excluded)
            if ((enterprise.type === 'cooperative' || enterprise.type === 'ncm') &&
                enterprise.type !== 'excluded' && enterprise.roles && enterprise.roles.length > 0) {
                const indicatorHeight = 10;
                const indicatorY = -indicatorHeight - 3;
                const sectionWidth = enterprise.width / 3;

                const roleColors = {
                    producers: '#e74c3c',
                    users: '#3498db',
                    investors: '#27ae60'
                };

                ['producers', 'users', 'investors'].forEach((role, index) => {
                    const indicatorX = index * sectionWidth;
                    svg += `<rect x="${indicatorX}" y="${indicatorY}" width="${sectionWidth}" height="${indicatorHeight}"
                            fill="${enterprise.roles.includes(role) ? roleColors[role] : '#ecf0f1'}"
                            stroke="#34495e" stroke-width="1.5"/>`;
                });
            }

            // Add text
            svg += `<text x="${enterprise.width/2}" y="${enterprise.height/2}"
                    text-anchor="middle" dominant-baseline="middle"
                    font-family="Arial" font-size="13" fill="#2c3e50">
                    ${this.escapeXml(enterprise.name || 'Enterprise')}
                    </text>`;

            svg += '</g>';
            return svg;
        },

        relationshipToSVG(relationship) {
            const startEnt = CoopMaps.state.data.enterprises.find(e => e.id === relationship.startId);
            const endEnt = CoopMaps.state.data.enterprises.find(e => e.id === relationship.endId);

            if (!startEnt || !endEnt) return '';

            const connectorStyle = CoopMaps.state.ui.connectorStyle || 'direct';

            if (connectorStyle === 'orthogonal') {
                return this.orthogonalRelationshipToSVG(relationship, startEnt, endEnt);
            } else {
                return this.directRelationshipToSVG(relationship, startEnt, endEnt);
            }
        },

        // New method for orthogonal relationships
        orthogonalRelationshipToSVG(relationship, startEnt, endEnt) {
            // Use the relationships module to calculate the path
            const relationshipsModule = CoopMaps.modules.relationships;
            if (!relationshipsModule) return '';

            // Get connection points
            const points = relationshipsModule.getOptimalConnectionPoints(startEnt, endEnt);
            const start = points.start;
            const end = points.end;

            // Calculate the orthogonal path
            const path = relationshipsModule.calculateSmartOrthogonalPath(start, end, startEnt, endEnt);

            let svg = '';

            // Build path string
            let pathData = `M ${path[0].x} ${path[0].y}`;
            for (let i = 1; i < path.length; i++) {
                pathData += ` L ${path[i].x} ${path[i].y}`;
            }

            // Draw the path
            svg += `<path d="${pathData}" stroke="#34495e" stroke-width="2.5" fill="none"`;

            if (relationship.startSegmentation === 'subset' || relationship.endSegmentation === 'subset') {
                svg += ' stroke-dasharray="8,4"';
            }

            svg += '/>';

            // Add start marker
            if (relationship.startSegmentation === 'entire') {
                svg += `<circle cx="${start.x}" cy="${start.y}" r="8" fill="#34495e"/>`;
            } else if (relationship.startSegmentation === 'subset') {
                svg += `<circle cx="${start.x}" cy="${start.y}" r="8" fill="none" stroke="#34495e" stroke-width="2.5"/>`;
            }

            // Add end marker (arrow)
            const lastSegment = path[path.length - 2];
            const endPoint = path[path.length - 1];
            const angle = Math.atan2(endPoint.y - lastSegment.y, endPoint.x - lastSegment.x);
            const arrowSize = 16;

            if (relationship.endSegmentation === 'individual') {
                svg += `<path d="M ${endPoint.x} ${endPoint.y}
                L ${endPoint.x - arrowSize * Math.cos(angle - Math.PI/6)} ${endPoint.y - arrowSize * Math.sin(angle - Math.PI/6)}
                L ${endPoint.x - arrowSize * Math.cos(angle + Math.PI/6)} ${endPoint.y - arrowSize * Math.sin(angle + Math.PI/6)} Z"
                fill="#34495e"/>`;
            } else if (relationship.endSegmentation === 'entire') {
                svg += `<path d="M ${endPoint.x} ${endPoint.y}
                L ${endPoint.x - arrowSize * Math.cos(angle - Math.PI/6)} ${endPoint.y - arrowSize * Math.sin(angle - Math.PI/6)}
                L ${endPoint.x - arrowSize * Math.cos(angle + Math.PI/6)} ${endPoint.y - arrowSize * Math.sin(angle + Math.PI/6)} Z"
                fill="#34495e" stroke="#2c3e50" stroke-width="1.5"/>`;
            } else if (relationship.endSegmentation === 'subset') {
                svg += `<path d="M ${endPoint.x} ${endPoint.y}
                L ${endPoint.x - arrowSize * Math.cos(angle - Math.PI/6)} ${endPoint.y - arrowSize * Math.sin(angle - Math.PI/6)}
                M ${endPoint.x} ${endPoint.y}
                L ${endPoint.x - arrowSize * Math.cos(angle + Math.PI/6)} ${endPoint.y - arrowSize * Math.sin(angle + Math.PI/6)}"
                stroke="#34495e" stroke-width="2.5" fill="none"/>`;
            }

            // Add relationship badge
            const badgePos = relationshipsModule.getSmartBadgePosition(path);
            const relType = relationshipsModule.relationshipTypes.find(t => t.id === relationship.type);

            if (relType) {
                svg += `<circle cx="${badgePos.x}" cy="${badgePos.y}" r="18" fill="white" stroke="${relType.color}" stroke-width="3"/>`;
                svg += `<circle cx="${badgePos.x}" cy="${badgePos.y}" r="15" fill="${relType.color}"/>`;
                svg += `<text x="${badgePos.x}" y="${badgePos.y}" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial" font-size="12" font-weight="bold"
                fill="${relType.color === '#f1c40f' ? '#333' : 'white'}">${this.escapeXml(relType.id)}</text>`;
            }

            return svg;
        },

        // Renamed existing method for direct relationships
        directRelationshipToSVG(relationship, startEnt, endEnt) {
            const startX = startEnt.x + startEnt.width / 2;
            const startY = startEnt.y + startEnt.height / 2;
            const endX = endEnt.x + endEnt.width / 2;
            const endY = endEnt.y + endEnt.height / 2;

            let svg = `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}"
               stroke="#34495e" stroke-width="2.5"`;

            if (relationship.startSegmentation === 'subset' || relationship.endSegmentation === 'subset') {
                svg += ' stroke-dasharray="8,4"';
            }

            svg += '/>';

            // Add start marker
            if (relationship.startSegmentation === 'entire') {
                svg += `<circle cx="${startX}" cy="${startY}" r="8" fill="#34495e"/>`;
            } else if (relationship.startSegmentation === 'subset') {
                svg += `<circle cx="${startX}" cy="${startY}" r="8" fill="none" stroke="#34495e" stroke-width="2.5"/>`;
            }

            // Add arrow marker
            const angle = Math.atan2(endY - startY, endX - startX);
            const arrowSize = 16;

            // Calculate proper end point on enterprise edge
            const relationshipsModule = CoopMaps.modules.relationships;
            let actualEndX = endX;
            let actualEndY = endY;

            if (relationshipsModule) {
                const endPoint = relationshipsModule.getConnectionPoint(endEnt, startEnt, 'end');
                actualEndX = endPoint.x;
                actualEndY = endPoint.y;
            }

            if (relationship.endSegmentation === 'individual') {
                svg += `<path d="M ${actualEndX} ${actualEndY}
                L ${actualEndX - arrowSize * Math.cos(angle - Math.PI/6)} ${actualEndY - arrowSize * Math.sin(angle - Math.PI/6)}
                L ${actualEndX - arrowSize * Math.cos(angle + Math.PI/6)} ${actualEndY - arrowSize * Math.sin(angle + Math.PI/6)} Z"
                fill="#34495e"/>`;
            } else if (relationship.endSegmentation === 'entire') {
                svg += `<path d="M ${actualEndX} ${actualEndY}
                L ${actualEndX - arrowSize * Math.cos(angle - Math.PI/6)} ${actualEndY - arrowSize * Math.sin(angle - Math.PI/6)}
                L ${actualEndX - arrowSize * Math.cos(angle + Math.PI/6)} ${actualEndY - arrowSize * Math.sin(angle + Math.PI/6)} Z"
                fill="#34495e" stroke="#2c3e50" stroke-width="1.5"/>`;
            } else if (relationship.endSegmentation === 'subset') {
                svg += `<path d="M ${actualEndX} ${actualEndY}
                L ${actualEndX - arrowSize * Math.cos(angle - Math.PI/6)} ${actualEndY - arrowSize * Math.sin(angle - Math.PI/6)}
                M ${actualEndX} ${actualEndY}
                L ${actualEndX - arrowSize * Math.cos(angle + Math.PI/6)} ${actualEndY - arrowSize * Math.sin(angle + Math.PI/6)}"
                stroke="#34495e" stroke-width="2.5" fill="none"/>`;
            }

            // Add relationship badge
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const relType = CoopMaps.modules.relationships ?
                CoopMaps.modules.relationships.relationshipTypes.find(t => t.id === relationship.type) : null;

            if (relType) {
                svg += `<circle cx="${midX}" cy="${midY}" r="18" fill="white" stroke="${relType.color}" stroke-width="3"/>`;
                svg += `<circle cx="${midX}" cy="${midY}" r="15" fill="${relType.color}"/>`;
                svg += `<text x="${midX}" y="${midY}" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial" font-size="12" font-weight="bold"
                fill="${relType.color === '#f1c40f' ? '#333' : 'white'}">${this.escapeXml(relType.id)}</text>`;
            }

            return svg;
        },

        showProgress(message) {
            const existingProgress = document.getElementById('exportProgress');
            if (existingProgress) {
                existingProgress.remove();
            }

            const progress = document.createElement('div');
            progress.id = 'exportProgress';
            progress.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px 50px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                z-index: 3000;
                text-align: center;
            `;

            progress.innerHTML = `
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <p style="margin: 0; font-size: 16px; color: #2c3e50;">${message}</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;

            document.body.appendChild(progress);
        },

        hideProgress() {
            const progress = document.getElementById('exportProgress');
            if (progress) {
                progress.remove();
            }
        },

        showSuccess(message) {
            const success = document.createElement('div');
            success.style.cssText = `
                position: fixed;
                top: 30px;
                right: 30px;
                background: #27ae60;
                color: white;
                padding: 20px 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                z-index: 3000;
                animation: slideInRight 0.3s ease;
            `;

            success.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 24px;">✓</div>
                    <div>${message}</div>
                </div>
                <style>
                    @keyframes slideInRight {
                        from { transform: translateX(100px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
            `;

            document.body.appendChild(success);

            setTimeout(() => {
                success.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => success.remove(), 300);
            }, 3000);
        }
    });

    console.log('export.module.js loaded successfully');
})();
