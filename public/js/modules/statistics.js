/**
 * Co-op Maps - Statistics Module
 * Provides ecosystem statistics and analytics
 */

(function() {
    'use strict';

    CoopMaps.registerModule('statistics', {
        init() {
            console.log('Statistics module initialized');
        },

        // Calculate all statistics for the current diagram
        calculateStats() {
            const enterprises = CoopMaps.state.data.enterprises || [];
            const relationships = CoopMaps.state.data.relationships || [];
            const groups = CoopMaps.state.data.groups || [];

            // Enterprise type counts
            const enterpriseTypes = {};
            enterprises.forEach(ent => {
                const type = ent.type || 'unknown';
                enterpriseTypes[type] = (enterpriseTypes[type] || 0) + 1;
            });

            // Relationship type counts
            const relationshipTypes = {};
            relationships.forEach(rel => {
                const type = rel.type || 'unknown';
                relationshipTypes[type] = (relationshipTypes[type] || 0) + 1;
            });

            // Connection analysis
            const connectionCounts = {};
            relationships.forEach(rel => {
                connectionCounts[rel.startEnterpriseId] = (connectionCounts[rel.startEnterpriseId] || 0) + 1;
                connectionCounts[rel.endEnterpriseId] = (connectionCounts[rel.endEnterpriseId] || 0) + 1;
            });

            // Find most connected enterprises
            const sortedByConnections = enterprises
                .map(ent => ({
                    ...ent,
                    connections: connectionCounts[ent.id] || 0
                }))
                .sort((a, b) => b.connections - a.connections);

            // Find isolated enterprises (no connections)
            const isolated = enterprises.filter(ent => !connectionCounts[ent.id]);

            // Co-operative specific stats
            const coopCount = enterprises.filter(e => e.type === 'cooperative').length;
            const coopPercentage = enterprises.length > 0
                ? Math.round((coopCount / enterprises.length) * 100)
                : 0;

            // Relationship density (actual connections / possible connections)
            const possibleConnections = enterprises.length * (enterprises.length - 1) / 2;
            const density = possibleConnections > 0
                ? Math.round((relationships.length / possibleConnections) * 100)
                : 0;

            // Intercooperation Score - measures cooperation among cooperatives
            const coopIds = new Set(enterprises.filter(e => e.type === 'cooperative').map(e => e.id));
            const coopToCoopRelationships = relationships.filter(r =>
                coopIds.has(r.fromId) && coopIds.has(r.toId)
            ).length;
            const coopInvolvedRelationships = relationships.filter(r =>
                coopIds.has(r.fromId) || coopIds.has(r.toId)
            ).length;
            const intercooperationScore = coopInvolvedRelationships > 0
                ? Math.round((coopToCoopRelationships / coopInvolvedRelationships) * 100)
                : 0;

            // Sector breakdown
            const sectorCounts = {};
            enterprises.forEach(e => {
                if (e.sector) {
                    sectorCounts[e.sector] = (sectorCounts[e.sector] || 0) + 1;
                }
            });

            // Total members/employees
            const totalMembers = enterprises.reduce((sum, e) => sum + (e.memberCount || 0), 0);

            // Principles adherence (for cooperatives)
            const coops = enterprises.filter(e => e.type === 'cooperative');
            const principlesCounts = [0, 0, 0, 0, 0, 0, 0];
            coops.forEach(coop => {
                if (coop.principles) {
                    coop.principles.forEach(p => {
                        if (p >= 1 && p <= 7) principlesCounts[p - 1]++;
                    });
                }
            });
            const avgPrinciples = coops.length > 0
                ? (principlesCounts.reduce((a, b) => a + b, 0) / coops.length).toFixed(1)
                : 0;

            return {
                totals: {
                    enterprises: enterprises.length,
                    relationships: relationships.length,
                    groups: groups.length
                },
                enterpriseTypes,
                relationshipTypes,
                topConnected: sortedByConnections.slice(0, 5),
                isolated,
                coopPercentage,
                density,
                averageConnections: enterprises.length > 0
                    ? (relationships.length * 2 / enterprises.length).toFixed(1)
                    : 0,
                // New co-op specific stats
                intercooperationScore,
                coopToCoopRelationships,
                sectorCounts,
                totalMembers,
                avgPrinciples,
                principlesCounts,
                coopCount
            };
        },

        // Show statistics panel
        showStatisticsPanel() {
            const stats = this.calculateStats();
            const isExpress = CoopMaps.isExpressMode;

            // Remove existing panel
            const existing = document.getElementById('statisticsPanel');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'statisticsPanel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 700px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            // Type labels
            const enterpriseTypeLabels = {
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

            const relationshipTypeLabels = {
                G: 'Governance',
                I: 'Investment',
                L: 'Asset Lock',
                M: 'Membership',
                O: 'Ownership',
                P: 'Partnership',
                S: 'Supply',
                INNER: 'Inner Segment'
            };

            const relationshipColors = {
                G: '#e74c3c',
                I: '#27ae60',
                L: '#f39c12',
                M: '#9b59b6',
                O: '#34495e',
                P: '#3498db',
                S: '#16a085',
                INNER: '#95a5a6'
            };

            const enterpriseColors = {
                cooperative: '#3498db',
                ncm: '#9b59b6',
                social: '#f1c40f',
                private: '#e74c3c',
                state: '#27ae60',
                excluded: '#95a5a6',
                partnership: '#e67e22',
                public: '#1abc9c',
                charity: '#e91e63',
                community: '#00bcd4'
            };

            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '24px'};">
                        Ecosystem Statistics
                    </h2>
                    <button onclick="document.getElementById('statisticsPanel').remove()" style="
                        background: none;
                        border: ${isExpress ? '1px solid #7f8c8d' : 'none'};
                        font-size: 24px;
                        cursor: pointer;
                        color: #7f8c8d;
                        padding: 5px 10px;
                    ">&times;</button>
                </div>

                <!-- Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                    <div style="
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; font-weight: bold;">${stats.totals.enterprises}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Enterprises</div>
                    </div>
                    <div style="
                        background: linear-gradient(135deg, #27ae60, #229954);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; font-weight: bold;">${stats.totals.relationships}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Relationships</div>
                    </div>
                    <div style="
                        background: linear-gradient(135deg, #9b59b6, #8e44ad);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; font-weight: bold;">${stats.coopPercentage}%</div>
                        <div style="font-size: 12px; opacity: 0.9;">Co-operatives</div>
                    </div>
                    <div style="
                        background: linear-gradient(135deg, #e67e22, #d35400);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; font-weight: bold;">${stats.density}%</div>
                        <div style="font-size: 12px; opacity: 0.9;">Density</div>
                    </div>
                </div>

                <!-- Co-operative Specific Stats -->
                ${stats.coopCount > 0 ? `
                <div style="
                    background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
                    padding: 20px;
                    border-radius: ${isExpress ? '0' : '12px'};
                    margin-bottom: 25px;
                    color: white;
                ">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">&#9733;</span>
                        Intercooperation Analysis
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                        <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.15); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold;">${stats.intercooperationScore}%</div>
                            <div style="font-size: 11px; opacity: 0.9;">Intercooperation Score</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.15); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold;">${stats.coopToCoopRelationships}</div>
                            <div style="font-size: 11px; opacity: 0.9;">Co-op to Co-op Links</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.15); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold;">${stats.avgPrinciples}</div>
                            <div style="font-size: 11px; opacity: 0.9;">Avg Principles/Co-op</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.15); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold;">${stats.totalMembers > 0 ? stats.totalMembers.toLocaleString() : '-'}</div>
                            <div style="font-size: 11px; opacity: 0.9;">Total Members</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Sector Breakdown -->
                ${Object.keys(stats.sectorCounts).length > 0 ? `
                <div style="
                    background: ${isExpress ? '#fff' : '#f0f4f8'};
                    padding: 20px;
                    border-radius: ${isExpress ? '0' : '12px'};
                    margin-bottom: 25px;
                    border: ${isExpress ? '1px solid #bdc3c7' : 'none'};
                ">
                    <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #7f8c8d;">Sector Breakdown</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${Object.entries(stats.sectorCounts).map(([sector, count]) => `
                            <span style="
                                background: #3498db;
                                color: white;
                                padding: 6px 12px;
                                border-radius: 20px;
                                font-size: 12px;
                            ">${sector.charAt(0).toUpperCase() + sector.slice(1)}: ${count}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Two Column Layout -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <!-- Enterprise Types -->
                    <div style="
                        background: ${isExpress ? '#fff' : '#f8f9fa'};
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        border: ${isExpress ? '1px solid #bdc3c7' : 'none'};
                    ">
                        <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #7f8c8d;">Enterprise Types</h3>
                        ${Object.keys(stats.enterpriseTypes).length === 0
                            ? '<p style="color: #95a5a6; font-size: 13px;">No enterprises yet</p>'
                            : Object.entries(stats.enterpriseTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => `
                                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                        <div style="
                                            width: 12px;
                                            height: 12px;
                                            border-radius: 3px;
                                            background: ${enterpriseColors[type] || '#95a5a6'};
                                            margin-right: 10px;
                                        "></div>
                                        <span style="flex: 1; font-size: 13px; color: #2c3e50;">
                                            ${enterpriseTypeLabels[type] || type}
                                        </span>
                                        <span style="
                                            background: ${enterpriseColors[type] || '#95a5a6'}20;
                                            color: ${enterpriseColors[type] || '#95a5a6'};
                                            padding: 3px 10px;
                                            border-radius: 12px;
                                            font-size: 12px;
                                            font-weight: 600;
                                        ">${count}</span>
                                    </div>
                                `).join('')
                        }
                    </div>

                    <!-- Relationship Types -->
                    <div style="
                        background: ${isExpress ? '#fff' : '#f8f9fa'};
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        border: ${isExpress ? '1px solid #bdc3c7' : 'none'};
                    ">
                        <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #7f8c8d;">Relationship Types</h3>
                        ${Object.keys(stats.relationshipTypes).length === 0
                            ? '<p style="color: #95a5a6; font-size: 13px;">No relationships yet</p>'
                            : Object.entries(stats.relationshipTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => `
                                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                        <div style="
                                            width: 20px;
                                            height: 20px;
                                            border-radius: 50%;
                                            background: ${relationshipColors[type] || '#95a5a6'};
                                            margin-right: 10px;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            color: white;
                                            font-size: 10px;
                                            font-weight: bold;
                                        ">${type === 'INNER' ? '' : type}</div>
                                        <span style="flex: 1; font-size: 13px; color: #2c3e50;">
                                            ${relationshipTypeLabels[type] || type}
                                        </span>
                                        <span style="
                                            background: ${relationshipColors[type] || '#95a5a6'}20;
                                            color: ${relationshipColors[type] || '#95a5a6'};
                                            padding: 3px 10px;
                                            border-radius: 12px;
                                            font-size: 12px;
                                            font-weight: 600;
                                        ">${count}</span>
                                    </div>
                                `).join('')
                        }
                    </div>
                </div>

                <!-- Top Connected Enterprises -->
                <div style="
                    background: ${isExpress ? '#fff' : '#f8f9fa'};
                    padding: 20px;
                    border-radius: ${isExpress ? '0' : '12px'};
                    border: ${isExpress ? '1px solid #bdc3c7' : 'none'};
                    margin-bottom: 20px;
                ">
                    <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #7f8c8d;">
                        Most Connected Enterprises
                        <span style="font-weight: normal; margin-left: 10px;">
                            (Avg: ${stats.averageConnections} connections)
                        </span>
                    </h3>
                    ${stats.topConnected.length === 0
                        ? '<p style="color: #95a5a6; font-size: 13px;">No enterprises yet</p>'
                        : stats.topConnected.map((ent, i) => `
                            <div style="
                                display: flex;
                                align-items: center;
                                padding: 10px;
                                background: ${i === 0 ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 'white'};
                                color: ${i === 0 ? 'white' : '#2c3e50'};
                                border-radius: ${isExpress ? '0' : '8px'};
                                margin-bottom: 8px;
                                border: ${isExpress && i !== 0 ? '1px solid #ddd' : 'none'};
                            ">
                                <span style="
                                    width: 24px;
                                    height: 24px;
                                    border-radius: 50%;
                                    background: ${i === 0 ? 'rgba(255,255,255,0.3)' : '#ecf0f1'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: bold;
                                    font-size: 12px;
                                    margin-right: 12px;
                                ">${i + 1}</span>
                                <span style="flex: 1; font-weight: ${i === 0 ? '600' : '500'};">
                                    ${ent.name || 'Unnamed'}
                                </span>
                                <span style="
                                    background: ${i === 0 ? 'rgba(255,255,255,0.3)' : '#3498db20'};
                                    color: ${i === 0 ? 'white' : '#3498db'};
                                    padding: 4px 12px;
                                    border-radius: 12px;
                                    font-size: 12px;
                                    font-weight: 600;
                                ">${ent.connections} connections</span>
                            </div>
                        `).join('')
                    }
                </div>

                <!-- Isolated Enterprises Warning -->
                ${stats.isolated.length > 0 ? `
                    <div style="
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        padding: 15px 20px;
                        border-radius: ${isExpress ? '0' : '8px'};
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                    ">
                        <span style="font-size: 20px;">&#9888;</span>
                        <div>
                            <strong style="color: #856404;">
                                ${stats.isolated.length} Isolated Enterprise${stats.isolated.length > 1 ? 's' : ''}
                            </strong>
                            <p style="margin: 5px 0 0 0; font-size: 13px; color: #856404;">
                                ${stats.isolated.slice(0, 5).map(e => e.name || 'Unnamed').join(', ')}
                                ${stats.isolated.length > 5 ? ` and ${stats.isolated.length - 5} more...` : ''}
                            </p>
                        </div>
                    </div>
                ` : ''}

                <!-- Close Button -->
                <div style="margin-top: 25px; text-align: right;">
                    <button onclick="document.getElementById('statisticsPanel').remove()" style="
                        padding: 12px 30px;
                        background: ${isExpress ? '#3498db' : 'linear-gradient(135deg, #3498db, #2980b9)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 14px;
                    ">Close</button>
                </div>
            `;

            panel.innerHTML = html;

            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.id = 'statisticsBackdrop';
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
        }
    });
})();
