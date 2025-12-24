/**
 * Co-op Maps - Reports Generator Module
 * Generate detailed reports about the ecosystem
 */

(function() {
    'use strict';

    CoopMaps.registerModule('reports', {
        init() {
            console.log('Reports module initialized');
        },

        // Show report generation dialog
        showReportsDialog() {
            const isExpress = CoopMaps.isExpressMode;

            // Remove existing panel
            const existing = document.getElementById('reportsDialog');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'reportsDialog';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 500px;
                width: 90%;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '24px'};">
                        Generate Report
                    </h2>
                    <button onclick="document.getElementById('reportsDialog').remove(); document.getElementById('reportsBackdrop').remove();" style="
                        background: none;
                        border: ${isExpress ? '1px solid #7f8c8d' : 'none'};
                        font-size: 24px;
                        cursor: pointer;
                        color: #7f8c8d;
                        padding: 5px 10px;
                    ">&times;</button>
                </div>

                <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 14px;">
                    Generate a comprehensive report of your co-operative ecosystem map.
                </p>

                <!-- Report Type Selection -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 10px;">
                        Report Type
                    </label>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <label style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: ${isExpress ? '0' : '8px'};
                            cursor: pointer;
                            background: white;
                        ">
                            <input type="radio" name="reportType" value="summary" checked>
                            <div>
                                <div style="font-weight: 600; color: #2c3e50;">Summary Report</div>
                                <div style="font-size: 12px; color: #7f8c8d;">Overview of the ecosystem with key statistics</div>
                            </div>
                        </label>
                        <label style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: ${isExpress ? '0' : '8px'};
                            cursor: pointer;
                            background: white;
                        ">
                            <input type="radio" name="reportType" value="detailed">
                            <div>
                                <div style="font-weight: 600; color: #2c3e50;">Detailed Report</div>
                                <div style="font-size: 12px; color: #7f8c8d;">Full listing of all enterprises and relationships</div>
                            </div>
                        </label>
                        <label style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: ${isExpress ? '0' : '8px'};
                            cursor: pointer;
                            background: white;
                        ">
                            <input type="radio" name="reportType" value="governance">
                            <div>
                                <div style="font-weight: 600; color: #2c3e50;">Governance Report</div>
                                <div style="font-size: 12px; color: #7f8c8d;">Focus on governance and ownership relationships</div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Format Selection -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 10px;">
                        Format
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="CoopMaps.modules.reports.generateReport('text')" style="
                            flex: 1;
                            padding: 15px;
                            background: ${isExpress ? '#ecf0f1' : 'linear-gradient(135deg, #34495e, #2c3e50)'};
                            color: ${isExpress ? '#2c3e50' : 'white'};
                            border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                            border-radius: ${isExpress ? '0' : '8px'};
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            <div style="font-size: 20px; margin-bottom: 5px;">TXT</div>
                            <div style="font-size: 11px; opacity: 0.8;">Plain Text</div>
                        </button>
                        <button onclick="CoopMaps.modules.reports.generateReport('html')" style="
                            flex: 1;
                            padding: 15px;
                            background: ${isExpress ? '#ecf0f1' : 'linear-gradient(135deg, #e67e22, #d35400)'};
                            color: ${isExpress ? '#2c3e50' : 'white'};
                            border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                            border-radius: ${isExpress ? '0' : '8px'};
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            <div style="font-size: 20px; margin-bottom: 5px;">HTML</div>
                            <div style="font-size: 11px; opacity: 0.8;">Web Page</div>
                        </button>
                        <button onclick="CoopMaps.modules.reports.generateReport('csv')" style="
                            flex: 1;
                            padding: 15px;
                            background: ${isExpress ? '#ecf0f1' : 'linear-gradient(135deg, #27ae60, #229954)'};
                            color: ${isExpress ? '#2c3e50' : 'white'};
                            border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                            border-radius: ${isExpress ? '0' : '8px'};
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            <div style="font-size: 20px; margin-bottom: 5px;">CSV</div>
                            <div style="font-size: 11px; opacity: 0.8;">Spreadsheet</div>
                        </button>
                    </div>
                </div>

                <div style="text-align: center;">
                    <button onclick="document.getElementById('reportsDialog').remove(); document.getElementById('reportsBackdrop').remove();" style="
                        padding: 10px 30px;
                        background: #ecf0f1;
                        color: #7f8c8d;
                        border: none;
                        border-radius: ${isExpress ? '0' : '6px'};
                        cursor: pointer;
                        font-weight: 600;
                    ">Cancel</button>
                </div>
            `;

            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.id = 'reportsBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;
            backdrop.onclick = () => {
                backdrop.remove();
                panel.remove();
            };

            document.body.appendChild(backdrop);
            document.body.appendChild(panel);
        },

        generateReport(format) {
            const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'summary';

            let content;
            let filename;
            let mimeType;

            switch (format) {
                case 'text':
                    content = this.generateTextReport(reportType);
                    filename = `coop-maps-report-${reportType}.txt`;
                    mimeType = 'text/plain';
                    break;
                case 'html':
                    content = this.generateHtmlReport(reportType);
                    filename = `coop-maps-report-${reportType}.html`;
                    mimeType = 'text/html';
                    break;
                case 'csv':
                    content = this.generateCsvReport(reportType);
                    filename = `coop-maps-report-${reportType}.csv`;
                    mimeType = 'text/csv';
                    break;
            }

            // Download the file
            this.downloadFile(content, filename, mimeType);

            // Close dialog
            document.getElementById('reportsDialog')?.remove();
            document.getElementById('reportsBackdrop')?.remove();

            if (CoopMaps.showNotification) {
                CoopMaps.showNotification(`Report generated: ${filename}`, 'success');
            }
        },

        generateTextReport(type) {
            const props = CoopMaps.state.data.diagramProperties || {};
            const enterprises = CoopMaps.state.data.enterprises || [];
            const relationships = CoopMaps.state.data.relationships || [];

            const lines = [];
            const separator = '='.repeat(60);
            const subSeparator = '-'.repeat(40);

            lines.push(separator);
            lines.push('CO-OP MAPS ECOSYSTEM REPORT');
            lines.push(separator);
            lines.push('');
            lines.push(`Title: ${props.title || 'Untitled Diagram'}`);
            lines.push(`Author: ${props.author || 'Unknown'}`);
            lines.push(`Date: ${props.date || new Date().toISOString().split('T')[0]}`);
            lines.push(`Generated: ${new Date().toLocaleString()}`);
            lines.push('');

            // Statistics
            lines.push(subSeparator);
            lines.push('SUMMARY STATISTICS');
            lines.push(subSeparator);
            lines.push(`Total Enterprises: ${enterprises.length}`);
            lines.push(`Total Relationships: ${relationships.length}`);

            // Enterprise type breakdown
            const typeCount = {};
            enterprises.forEach(e => {
                typeCount[e.type] = (typeCount[e.type] || 0) + 1;
            });
            lines.push('');
            lines.push('Enterprise Types:');
            Object.entries(typeCount).forEach(([t, c]) => {
                lines.push(`  - ${this.formatType(t)}: ${c}`);
            });

            // Relationship type breakdown
            const relCount = {};
            relationships.forEach(r => {
                relCount[r.type] = (relCount[r.type] || 0) + 1;
            });
            lines.push('');
            lines.push('Relationship Types:');
            Object.entries(relCount).forEach(([t, c]) => {
                lines.push(`  - ${this.formatRelType(t)}: ${c}`);
            });

            if (type === 'detailed' || type === 'governance') {
                lines.push('');
                lines.push(subSeparator);
                lines.push('ENTERPRISES');
                lines.push(subSeparator);

                enterprises.forEach((ent, i) => {
                    lines.push(`${i + 1}. ${ent.name || 'Unnamed'}`);
                    lines.push(`   Type: ${this.formatType(ent.type)}`);
                    if (ent.businessInfo?.description) {
                        lines.push(`   Description: ${ent.businessInfo.description}`);
                    }
                    if (ent.businessInfo?.website) {
                        lines.push(`   Website: ${ent.businessInfo.website}`);
                    }
                    lines.push('');
                });

                lines.push(subSeparator);
                lines.push('RELATIONSHIPS');
                lines.push(subSeparator);

                const filteredRels = type === 'governance'
                    ? relationships.filter(r => ['G', 'O', 'M'].includes(r.type))
                    : relationships;

                filteredRels.forEach((rel, i) => {
                    const start = enterprises.find(e => e.id === rel.startEnterpriseId);
                    const end = enterprises.find(e => e.id === rel.endEnterpriseId);
                    lines.push(`${i + 1}. ${start?.name || 'Unknown'} -> ${end?.name || 'Unknown'}`);
                    lines.push(`   Type: ${this.formatRelType(rel.type)}`);
                    lines.push('');
                });
            }

            lines.push(separator);
            lines.push('End of Report');
            lines.push(separator);

            return lines.join('\n');
        },

        generateHtmlReport(type) {
            const props = CoopMaps.state.data.diagramProperties || {};
            const enterprises = CoopMaps.state.data.enterprises || [];
            const relationships = CoopMaps.state.data.relationships || [];

            const typeCount = {};
            enterprises.forEach(e => {
                typeCount[e.type] = (typeCount[e.type] || 0) + 1;
            });

            const relCount = {};
            relationships.forEach(r => {
                relCount[r.type] = (relCount[r.type] || 0) + 1;
            });

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Co-op Maps Report - ${props.title || 'Ecosystem'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 40px; }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        .meta { color: #7f8c8d; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 25px; border-radius: 12px; text-align: center; }
        .stat-card.green { background: linear-gradient(135deg, #27ae60, #229954); }
        .stat-card.purple { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
        .stat-value { font-size: 36px; font-weight: bold; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        h2 { color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
        th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
        .type-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; font-size: 12px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${props.title || 'Co-operative Ecosystem Report'}</h1>
        <div class="meta">
            Author: ${props.author || 'Unknown'} | Date: ${props.date || 'N/A'} | Generated: ${new Date().toLocaleString()}
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${enterprises.length}</div>
                <div class="stat-label">Enterprises</div>
            </div>
            <div class="stat-card green">
                <div class="stat-value">${relationships.length}</div>
                <div class="stat-label">Relationships</div>
            </div>
            <div class="stat-card purple">
                <div class="stat-value">${typeCount['cooperative'] || 0}</div>
                <div class="stat-label">Co-operatives</div>
            </div>
        </div>

        <h2>Enterprise Types</h2>
        <table>
            <tr><th>Type</th><th>Count</th><th>Percentage</th></tr>
            ${Object.entries(typeCount).map(([t, c]) => `
                <tr>
                    <td>${this.formatType(t)}</td>
                    <td>${c}</td>
                    <td>${Math.round(c / enterprises.length * 100)}%</td>
                </tr>
            `).join('')}
        </table>

        <h2>Relationship Types</h2>
        <table>
            <tr><th>Type</th><th>Count</th></tr>
            ${Object.entries(relCount).map(([t, c]) => `
                <tr>
                    <td>${this.formatRelType(t)}</td>
                    <td>${c}</td>
                </tr>
            `).join('')}
        </table>

        ${type !== 'summary' ? `
            <h2>All Enterprises</h2>
            <table>
                <tr><th>#</th><th>Name</th><th>Type</th><th>Description</th></tr>
                ${enterprises.map((e, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><strong>${e.name || 'Unnamed'}</strong></td>
                        <td>${this.formatType(e.type)}</td>
                        <td>${e.businessInfo?.description || '-'}</td>
                    </tr>
                `).join('')}
            </table>
        ` : ''}

        <div class="footer">
            Generated by Co-op Maps v1.0 - Co-operative Ecosystem Mapping Tool
        </div>
    </div>
</body>
</html>`;
        },

        generateCsvReport(type) {
            const enterprises = CoopMaps.state.data.enterprises || [];
            const relationships = CoopMaps.state.data.relationships || [];

            const lines = [];

            // Enterprises CSV
            lines.push('ENTERPRISES');
            lines.push('ID,Name,Type,Description,Website,Location');
            enterprises.forEach(e => {
                lines.push([
                    e.id,
                    `"${(e.name || '').replace(/"/g, '""')}"`,
                    e.type,
                    `"${(e.businessInfo?.description || '').replace(/"/g, '""')}"`,
                    e.businessInfo?.website || '',
                    e.businessInfo?.location || ''
                ].join(','));
            });

            lines.push('');
            lines.push('RELATIONSHIPS');
            lines.push('ID,From Enterprise,To Enterprise,Type');
            relationships.forEach(r => {
                const start = enterprises.find(e => e.id === r.startEnterpriseId);
                const end = enterprises.find(e => e.id === r.endEnterpriseId);
                lines.push([
                    r.id,
                    `"${(start?.name || 'Unknown').replace(/"/g, '""')}"`,
                    `"${(end?.name || 'Unknown').replace(/"/g, '""')}"`,
                    this.formatRelType(r.type)
                ].join(','));
            });

            return lines.join('\n');
        },

        formatType(type) {
            const labels = {
                cooperative: 'Co-operative',
                ncm: 'NCM',
                social: 'Social Enterprise',
                private: 'Private Enterprise',
                state: 'State Enterprise',
                excluded: 'Excluded',
                partnership: 'Partnership',
                public: 'Public Enterprise',
                charity: 'Charity',
                community: 'Community Org'
            };
            return labels[type] || type;
        },

        formatRelType(type) {
            const labels = {
                G: 'Governance',
                I: 'Investment',
                L: 'Asset Lock',
                M: 'Membership',
                O: 'Ownership',
                P: 'Partnership',
                S: 'Supply',
                INNER: 'Inner Segment'
            };
            return labels[type] || type;
        },

        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });
})();
