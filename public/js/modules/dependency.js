/**
 * Co-op Maps - Dependency Analysis Module
 * Analyze critical paths and dependencies in the ecosystem
 */

(function() {
    'use strict';

    CoopMaps.registerModule('dependency', {
        init() {
            console.log('Dependency Analysis module initialized');
        },

        // Build adjacency list for graph analysis
        buildGraph() {
            const enterprises = CoopMaps.state.data.enterprises || [];
            const relationships = CoopMaps.state.data.relationships || [];

            const graph = {
                nodes: new Map(),
                edges: [],
                inDegree: new Map(),
                outDegree: new Map()
            };

            // Initialize nodes
            enterprises.forEach(ent => {
                graph.nodes.set(ent.id, ent);
                graph.inDegree.set(ent.id, 0);
                graph.outDegree.set(ent.id, 0);
            });

            // Add edges
            relationships.forEach(rel => {
                if (graph.nodes.has(rel.startEnterpriseId) && graph.nodes.has(rel.endEnterpriseId)) {
                    graph.edges.push(rel);
                    graph.outDegree.set(rel.startEnterpriseId, (graph.outDegree.get(rel.startEnterpriseId) || 0) + 1);
                    graph.inDegree.set(rel.endEnterpriseId, (graph.inDegree.get(rel.endEnterpriseId) || 0) + 1);
                }
            });

            return graph;
        },

        // Find critical nodes (high dependency impact)
        findCriticalNodes(graph) {
            const criticalNodes = [];

            graph.nodes.forEach((node, id) => {
                const inDeg = graph.inDegree.get(id) || 0;
                const outDeg = graph.outDegree.get(id) || 0;
                const totalConnections = inDeg + outDeg;

                // Calculate betweenness approximation
                const dependents = this.findDependents(graph, id);
                const dependencies = this.findDependencies(graph, id);

                criticalNodes.push({
                    id,
                    name: node.name || 'Unnamed',
                    type: node.type,
                    inDegree: inDeg,
                    outDegree: outDeg,
                    totalConnections,
                    dependents: dependents.length,
                    dependencies: dependencies.length,
                    impactScore: this.calculateImpactScore(inDeg, outDeg, dependents.length)
                });
            });

            return criticalNodes.sort((a, b) => b.impactScore - a.impactScore);
        },

        // Find all nodes that depend on a given node
        findDependents(graph, nodeId) {
            const dependents = [];
            const visited = new Set();
            const queue = [nodeId];

            while (queue.length > 0) {
                const current = queue.shift();
                graph.edges.forEach(edge => {
                    if (edge.startEnterpriseId === current && !visited.has(edge.endEnterpriseId)) {
                        visited.add(edge.endEnterpriseId);
                        dependents.push(edge.endEnterpriseId);
                        queue.push(edge.endEnterpriseId);
                    }
                });
            }

            return dependents;
        },

        // Find all nodes that a given node depends on
        findDependencies(graph, nodeId) {
            const dependencies = [];
            const visited = new Set();
            const queue = [nodeId];

            while (queue.length > 0) {
                const current = queue.shift();
                graph.edges.forEach(edge => {
                    if (edge.endEnterpriseId === current && !visited.has(edge.startEnterpriseId)) {
                        visited.add(edge.startEnterpriseId);
                        dependencies.push(edge.startEnterpriseId);
                        queue.push(edge.startEnterpriseId);
                    }
                });
            }

            return dependencies;
        },

        calculateImpactScore(inDeg, outDeg, dependentsCount) {
            // Weight outgoing connections and dependents more heavily
            return (inDeg * 1) + (outDeg * 2) + (dependentsCount * 3);
        },

        // Find dependency chains
        findDependencyChains(graph) {
            const chains = [];
            const visited = new Set();

            // Find root nodes (no incoming edges)
            const rootNodes = [];
            graph.nodes.forEach((node, id) => {
                if ((graph.inDegree.get(id) || 0) === 0) {
                    rootNodes.push(id);
                }
            });

            // DFS from each root
            rootNodes.forEach(rootId => {
                const chain = this.traceChain(graph, rootId, visited, []);
                if (chain.length > 1) {
                    chains.push(chain);
                }
            });

            return chains.sort((a, b) => b.length - a.length);
        },

        traceChain(graph, nodeId, visited, currentChain) {
            if (visited.has(nodeId)) return currentChain;
            visited.add(nodeId);

            const node = graph.nodes.get(nodeId);
            currentChain.push({
                id: nodeId,
                name: node?.name || 'Unknown',
                type: node?.type
            });

            // Find outgoing edges
            const outEdges = graph.edges.filter(e => e.startEnterpriseId === nodeId);

            if (outEdges.length === 0) {
                return currentChain;
            }

            // Follow first path for longest chain
            return this.traceChain(graph, outEdges[0].endEnterpriseId, visited, currentChain);
        },

        // Find circular dependencies
        findCircularDependencies(graph) {
            const circular = [];
            const visited = new Set();
            const recursionStack = new Set();

            const dfs = (nodeId, path) => {
                visited.add(nodeId);
                recursionStack.add(nodeId);
                path.push(nodeId);

                const outEdges = graph.edges.filter(e => e.startEnterpriseId === nodeId);

                for (const edge of outEdges) {
                    const nextId = edge.endEnterpriseId;

                    if (!visited.has(nextId)) {
                        const result = dfs(nextId, [...path]);
                        if (result) return result;
                    } else if (recursionStack.has(nextId)) {
                        // Found cycle
                        const cycleStart = path.indexOf(nextId);
                        const cycle = path.slice(cycleStart);
                        cycle.push(nextId);
                        return cycle;
                    }
                }

                recursionStack.delete(nodeId);
                return null;
            };

            graph.nodes.forEach((node, id) => {
                if (!visited.has(id)) {
                    const cycle = dfs(id, []);
                    if (cycle) {
                        circular.push(cycle.map(nodeId => ({
                            id: nodeId,
                            name: graph.nodes.get(nodeId)?.name || 'Unknown'
                        })));
                    }
                }
            });

            return circular;
        },

        // Show dependency analysis panel
        showDependencyPanel() {
            const isExpress = CoopMaps.isExpressMode;
            const graph = this.buildGraph();
            const criticalNodes = this.findCriticalNodes(graph);
            const chains = this.findDependencyChains(graph);
            const circular = this.findCircularDependencies(graph);

            // Remove existing panel
            const existing = document.getElementById('dependencyPanel');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'dependencyPanel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 800px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            const typeColors = {
                cooperative: '#3498db',
                ncm: '#9b59b6',
                social: '#f1c40f',
                private: '#e74c3c',
                state: '#27ae60',
                excluded: '#95a5a6'
            };

            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '24px'};">
                        Dependency Analysis
                    </h2>
                    <button onclick="document.getElementById('dependencyPanel').remove(); document.getElementById('dependencyBackdrop').remove();" style="
                        background: none;
                        border: ${isExpress ? '1px solid #7f8c8d' : 'none'};
                        font-size: 24px;
                        cursor: pointer;
                        color: #7f8c8d;
                        padding: 5px 10px;
                    ">&times;</button>
                </div>

                <!-- Circular Dependencies Warning -->
                ${circular.length > 0 ? `
                    <div style="
                        background: #f8d7da;
                        border: 1px solid #f5c6cb;
                        padding: 15px 20px;
                        border-radius: ${isExpress ? '0' : '8px'};
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 20px;">&#9888;</span>
                            <strong style="color: #721c24;">Circular Dependencies Detected</strong>
                        </div>
                        ${circular.map(cycle => `
                            <div style="
                                background: white;
                                padding: 10px;
                                border-radius: 4px;
                                margin-top: 10px;
                                font-size: 13px;
                            ">
                                ${cycle.map(n => n.name).join(' &#8594; ')}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="
                        background: #d4edda;
                        border: 1px solid #c3e6cb;
                        padding: 15px;
                        border-radius: ${isExpress ? '0' : '8px'};
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <span style="font-size: 20px;">&#10003;</span>
                        <span style="color: #155724; font-weight: 600;">No circular dependencies detected</span>
                    </div>
                `}

                <!-- Critical Nodes -->
                <div style="
                    background: ${isExpress ? '#fff' : '#f8f9fa'};
                    padding: 20px;
                    border-radius: ${isExpress ? '0' : '12px'};
                    border: ${isExpress ? '1px solid #bdc3c7' : 'none'};
                    margin-bottom: 20px;
                ">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #2c3e50;">
                        Critical Enterprises
                        <span style="font-weight: normal; color: #7f8c8d; font-size: 13px;">
                            (Highest dependency impact)
                        </span>
                    </h3>
                    ${criticalNodes.length === 0 ? '<p style="color: #95a5a6;">No enterprises to analyze</p>' :
                        criticalNodes.slice(0, 5).map((node, i) => `
                            <div style="
                                display: flex;
                                align-items: center;
                                padding: 12px;
                                background: ${i === 0 ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : 'white'};
                                color: ${i === 0 ? 'white' : '#2c3e50'};
                                border-radius: ${isExpress ? '0' : '8px'};
                                margin-bottom: 10px;
                                border: ${i !== 0 ? '1px solid #ecf0f1' : 'none'};
                            ">
                                <div style="
                                    width: 30px;
                                    height: 30px;
                                    border-radius: 50%;
                                    background: ${i === 0 ? 'rgba(255,255,255,0.2)' : typeColors[node.type] || '#95a5a6'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: bold;
                                    font-size: 14px;
                                    margin-right: 12px;
                                    color: ${i === 0 ? 'white' : 'white'};
                                ">${i + 1}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">${node.name}</div>
                                    <div style="font-size: 11px; opacity: 0.8;">
                                        ${node.inDegree} in / ${node.outDegree} out / ${node.dependents} downstream
                                    </div>
                                </div>
                                <div style="
                                    background: ${i === 0 ? 'rgba(255,255,255,0.2)' : '#e74c3c20'};
                                    color: ${i === 0 ? 'white' : '#e74c3c'};
                                    padding: 6px 12px;
                                    border-radius: 12px;
                                    font-size: 12px;
                                    font-weight: 600;
                                ">Impact: ${node.impactScore}</div>
                            </div>
                        `).join('')
                    }
                </div>

                <!-- Longest Dependency Chains -->
                <div style="
                    background: ${isExpress ? '#fff' : '#f8f9fa'};
                    padding: 20px;
                    border-radius: ${isExpress ? '0' : '12px'};
                    border: ${isExpress ? '1px solid #bdc3c7' : 'none'};
                    margin-bottom: 20px;
                ">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #2c3e50;">
                        Longest Dependency Chains
                    </h3>
                    ${chains.length === 0 ? '<p style="color: #95a5a6;">No dependency chains found</p>' :
                        chains.slice(0, 3).map((chain, i) => `
                            <div style="
                                background: white;
                                padding: 15px;
                                border-radius: ${isExpress ? '0' : '8px'};
                                margin-bottom: 10px;
                                border: 1px solid #ecf0f1;
                            ">
                                <div style="font-weight: 600; color: #2c3e50; margin-bottom: 10px;">
                                    Chain ${i + 1} (${chain.length} nodes)
                                </div>
                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                                    ${chain.map((node, j) => `
                                        <div style="
                                            background: ${typeColors[node.type] || '#95a5a6'}20;
                                            color: ${typeColors[node.type] || '#95a5a6'};
                                            padding: 6px 12px;
                                            border-radius: 16px;
                                            font-size: 12px;
                                            font-weight: 500;
                                            border: 1px solid ${typeColors[node.type] || '#95a5a6'}40;
                                        ">${node.name}</div>
                                        ${j < chain.length - 1 ? '<span style="color: #7f8c8d;">&#8594;</span>' : ''}
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')
                    }
                </div>

                <!-- Graph Statistics -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                ">
                    <div style="
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 28px; font-weight: bold;">${graph.nodes.size}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Total Nodes</div>
                    </div>
                    <div style="
                        background: linear-gradient(135deg, #27ae60, #229954);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 28px; font-weight: bold;">${graph.edges.length}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Total Edges</div>
                    </div>
                    <div style="
                        background: linear-gradient(135deg, #9b59b6, #8e44ad);
                        padding: 20px;
                        border-radius: ${isExpress ? '0' : '12px'};
                        color: white;
                        text-align: center;
                    ">
                        <div style="font-size: 28px; font-weight: bold;">${chains.length > 0 ? chains[0].length : 0}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Max Chain Length</div>
                    </div>
                </div>

                <!-- Close Button -->
                <div style="text-align: right;">
                    <button onclick="document.getElementById('dependencyPanel').remove(); document.getElementById('dependencyBackdrop').remove();" style="
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
            backdrop.id = 'dependencyBackdrop';
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
