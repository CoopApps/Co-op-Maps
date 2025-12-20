/**
 * Co-opMaps - Shapes Module
 * Defines enterprise shapes and rendering logic
 */

(function() {
    'use strict';

    const shapes = {
        // Enterprise type definitions with their visual properties
        enterpriseTypes: {
            cooperative: {
                label: 'Cooperative',
                color: '#3498db',
                icon: '🏢',
                description: 'Member-owned and democratically controlled enterprise'
            },
            mutualAid: {
                label: 'Mutual Aid',
                color: '#2ecc71',
                icon: '🤝',
                description: 'Voluntary reciprocal exchange of resources and services'
            },
            publicSector: {
                label: 'Public Sector',
                color: '#9b59b6',
                icon: '🏛️',
                description: 'Government or public institution'
            },
            privateSector: {
                label: 'Private Sector',
                color: '#e67e22',
                icon: '🏪',
                description: 'Privately owned business'
            },
            civilSociety: {
                label: 'Civil Society',
                color: '#e74c3c',
                icon: '🌍',
                description: 'Non-profit or community organization'
            },
            household: {
                label: 'Household',
                color: '#f39c12',
                icon: '🏠',
                description: 'Family or household unit'
            }
        },

        // Relationship types for connectors
        relationshipTypes: {
            'G': { label: 'Goods/Services (G)', color: '#2c3e50', style: 'solid' },
            'F': { label: 'Finance (F)', color: '#27ae60', style: 'dashed' },
            'K': { label: 'Knowledge (K)', color: '#2980b9', style: 'dotted' },
            'M': { label: 'Mixed (M)', color: '#8e44ad', style: 'solid' }
        },

        // Draw enterprise shape on canvas
        drawEnterprise(ctx, enterprise, isSelected = false) {
            const { x, y, width, height, type } = enterprise;
            const typeInfo = this.enterpriseTypes[type] || this.enterpriseTypes.cooperative;

            ctx.save();

            // Shadow for depth
            if (isSelected) {
                ctx.shadowColor = 'rgba(52, 152, 219, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }

            // Background fill
            const fillColor = enterprise.fill || typeInfo.color;
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = enterprise.stroke || this.darkenColor(fillColor, 20);
            ctx.lineWidth = isSelected ? 3 : 2;

            // Draw based on shape type
            const shape = enterprise.shape || 'rectangle';

            if (shape === 'rectangle') {
                // Rounded rectangle
                const radius = 8;
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
            } else if (shape === 'circle') {
                const centerX = x + width / 2;
                const centerY = y + height / 2;
                const radius = Math.min(width, height) / 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.closePath();
            } else if (shape === 'diamond') {
                ctx.beginPath();
                ctx.moveTo(x + width / 2, y);
                ctx.lineTo(x + width, y + height / 2);
                ctx.lineTo(x + width / 2, y + height);
                ctx.lineTo(x, y + height / 2);
                ctx.closePath();
            }

            ctx.fill();
            ctx.stroke();

            // Draw icon if enabled
            if (enterprise.showIcon !== false) {
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                const iconX = x + width / 2;
                const iconY = y + 20;
                ctx.fillText(typeInfo.icon, iconX, iconY);
            }

            // Draw enterprise name
            ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#2c3e50';

            const name = enterprise.name || 'Unnamed';
            const textY = enterprise.showIcon !== false ? y + height / 2 + 5 : y + height / 2;

            // Word wrap for long names
            this.drawWrappedText(ctx, name, x + width / 2, textY, width - 20, 16);

            // Draw roles if any
            if (enterprise.roles && enterprise.roles.length > 0) {
                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillStyle = '#7f8c8d';
                const rolesText = enterprise.roles.join(', ');
                const rolesY = y + height - 15;
                this.drawWrappedText(ctx, rolesText, x + width / 2, rolesY, width - 20, 14);
            }

            // Draw tier indicator if primary or secondary
            if (enterprise.tier && enterprise.tier !== 'other') {
                const tierColor = enterprise.tier === 'primary' ? '#f39c12' : '#95a5a6';
                ctx.fillStyle = tierColor;
                ctx.beginPath();
                ctx.arc(x + width - 10, y + 10, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw generic set indicator
            if (enterprise.isGenericSet) {
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
                ctx.setLineDash([]);
            }

            // Selection handles
            if (isSelected) {
                this.drawSelectionHandles(ctx, enterprise);
            }

            ctx.restore();
        },

        // Draw relationship connector
        drawRelationship(ctx, relationship, enterprises, connectorStyle = 'orthogonal', isSelected = false) {
            const startEnt = enterprises.find(e => e.id === relationship.startEnterpriseId);
            const endEnt = enterprises.find(e => e.id === relationship.endEnterpriseId);

            if (!startEnt || !endEnt) return;

            ctx.save();

            const relType = this.relationshipTypes[relationship.type] || this.relationshipTypes['G'];
            ctx.strokeStyle = relationship.color || relType.color;
            ctx.lineWidth = isSelected ? 3 : 2;

            // Set line style based on relationship type
            if (relType.style === 'dashed') {
                ctx.setLineDash([10, 5]);
            } else if (relType.style === 'dotted') {
                ctx.setLineDash([3, 3]);
            }

            // Calculate connection points (center of each enterprise)
            const startX = startEnt.x + startEnt.width / 2;
            const startY = startEnt.y + startEnt.height / 2;
            const endX = endEnt.x + endEnt.width / 2;
            const endY = endEnt.y + endEnt.height / 2;

            // Draw based on connector style
            if (connectorStyle === 'orthogonal') {
                this.drawOrthogonalConnector(ctx, startX, startY, endX, endY);
            } else {
                this.drawDirectConnector(ctx, startX, startY, endX, endY);
            }

            // Draw arrowhead at end
            this.drawArrowhead(ctx, endX, endY, startX, startY, connectorStyle);

            // Draw relationship label
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 3;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const label = relationship.type;
            const metrics = ctx.measureText(label);
            const padding = 6;

            // Background for label
            ctx.fillStyle = '#fff';
            ctx.fillRect(
                midX - metrics.width / 2 - padding,
                midY - 8,
                metrics.width + padding * 2,
                16
            );

            // Label text
            ctx.fillStyle = relType.color;
            ctx.fillText(label, midX, midY);

            ctx.restore();
        },

        // Draw orthogonal (right-angle) connector
        drawOrthogonalConnector(ctx, startX, startY, endX, endY) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);

            const midX = (startX + endX) / 2;

            ctx.lineTo(midX, startY);
            ctx.lineTo(midX, endY);
            ctx.lineTo(endX, endY);

            ctx.stroke();
        },

        // Draw direct (straight) connector
        drawDirectConnector(ctx, startX, startY, endX, endY) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        },

        // Draw arrowhead
        drawArrowhead(ctx, x, y, fromX, fromY, connectorStyle) {
            const angle = Math.atan2(y - fromY, x - fromX);
            const arrowLength = 12;
            const arrowWidth = 8;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowLength, -arrowWidth / 2);
            ctx.lineTo(-arrowLength, arrowWidth / 2);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        },

        // Draw selection handles
        drawSelectionHandles(ctx, enterprise) {
            const { x, y, width, height } = enterprise;
            const handleSize = 8;

            ctx.fillStyle = '#3498db';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;

            const handles = [
                { x: x, y: y },                           // Top-left
                { x: x + width / 2, y: y },               // Top-center
                { x: x + width, y: y },                   // Top-right
                { x: x + width, y: y + height / 2 },      // Right-center
                { x: x + width, y: y + height },          // Bottom-right
                { x: x + width / 2, y: y + height },      // Bottom-center
                { x: x, y: y + height },                  // Bottom-left
                { x: x, y: y + height / 2 }               // Left-center
            ];

            handles.forEach(handle => {
                ctx.fillRect(
                    handle.x - handleSize / 2,
                    handle.y - handleSize / 2,
                    handleSize,
                    handleSize
                );
                ctx.strokeRect(
                    handle.x - handleSize / 2,
                    handle.y - handleSize / 2,
                    handleSize,
                    handleSize
                );
            });
        },

        // Draw wrapped text
        drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            let yPos = y;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line.trim(), x, yPos);
                    line = words[i] + ' ';
                    yPos += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line.trim(), x, yPos);
        },

        // Utility: Darken a color
        darkenColor(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255))
                .toString(16).slice(1);
        },

        init() {
            console.log('Shapes module initialized');
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('shapes', shapes);
    }
})();
