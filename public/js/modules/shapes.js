// Module 1: Shapes Module
(function() {
    'use strict';

    CoopMaps.registerModule('shapes', {
        init() {
            console.log('Shapes module initialized');
        },

        // Basic rectangle for cooperatives and excluded businesses
        drawRectangle(ctx, x, y, width, height, options = {}) {
            ctx.save();

            // Shadow for depth
            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }

            ctx.beginPath();
            ctx.rect(x, y, width, height);

            // Fill with gradient
            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x, y + height);
                const baseColor = options.fill === 'white' ? '#ffffff' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 10));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Stroke
            ctx.strokeStyle = options.stroke || '#2c3e50';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            // Inner highlight
            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.rect(x + 2, y + 2, width - 4, 3);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Rounded rectangle for NCM with left extension
        drawRoundedRectangle(ctx, x, y, width, height, radius = 10, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 3;
            }

            const leftExtension = height * 0.2;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y);
            ctx.lineTo(x + width, y + height);
            ctx.quadraticCurveTo(x + width/2, y + height + leftExtension/2, x, y + height + leftExtension);
            ctx.lineTo(x, y);
            ctx.closePath();

            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x, y + height + leftExtension);
                const baseColor = options.fill === 'white' ? '#ffffff' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 15));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#34495e';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            // Highlight
            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.moveTo(x + 3, y + 3);
                ctx.lineTo(x + width - 3, y + 3);
                ctx.lineTo(x + width - 3, y + 6);
                ctx.lineTo(x + 3, y + 6);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Pill shape for Social Enterprise
        drawPill(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;
            }

            const radius = height / 2;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.arc(x + width - radius, y + radius, radius, -Math.PI/2, Math.PI/2);
            ctx.lineTo(x + radius, y + height);
            ctx.arc(x + radius, y + radius, radius, Math.PI/2, -Math.PI/2);
            ctx.closePath();

            // Yellow gradient
            const gradient = ctx.createRadialGradient(x + width/2, y + height/2, 0, x + width/2, y + height/2, Math.max(width, height)/2);
            gradient.addColorStop(0, '#fff59d');
            gradient.addColorStop(0.7, '#ffeb3b');
            gradient.addColorStop(1, '#fdd835');
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.strokeStyle = options.stroke || '#f9a825';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            // Glossy highlight
            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.arc(x + radius, y + radius * 0.7, radius * 0.4, 0, Math.PI * 2);
                const highlightGradient = ctx.createRadialGradient(x + radius, y + radius * 0.7, 0, x + radius, y + radius * 0.7, radius * 0.4);
                highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = highlightGradient;
                ctx.fill();
            }

            ctx.restore();
        },

        // Ellipse for Private Enterprise
        drawEllipse(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 3;
            }

            ctx.beginPath();
            ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, 2 * Math.PI);

            if (options.fill) {
                const gradient = ctx.createRadialGradient(x + width/2, y + height/3, 0, x + width/2, y + height/2, Math.max(width, height)/2);
                const baseColor = options.fill === '#f0f0f0' ? '#f5f5f5' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 20));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#546e7a';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            // Elliptical highlight
            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/3, width/3, height/5, 0, 0, 2 * Math.PI);
                const highlightGradient = ctx.createRadialGradient(x + width/2, y + height/3, 0, x + width/2, y + height/3, Math.max(width/3, height/5));
                highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
                highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = highlightGradient;
                ctx.fill();
            }

            ctx.restore();
        },

        // Diamond for State Enterprise
        drawDiamond(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;
            }

            ctx.beginPath();
            ctx.moveTo(x + width/2, y);
            ctx.lineTo(x + width, y + height/2);
            ctx.lineTo(x + width/2, y + height);
            ctx.lineTo(x, y + height/2);
            ctx.closePath();

            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
                const baseColor = options.fill === '#f0f0f0' ? '#f8f8f8' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 25));
                gradient.addColorStop(0.5, baseColor);
                gradient.addColorStop(1, this.darkenColor(baseColor, 10));
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#37474f';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            // Diamond facet highlight
            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.moveTo(x + width/2, y + 5);
                ctx.lineTo(x + width - 5, y + height/2);
                ctx.lineTo(x + width/2, y + height/3);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Hexagon for Public Enterprise (distinct from State's diamond)
        drawHexagon(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 3;
            }

            const inset = width * 0.25;
            ctx.beginPath();
            ctx.moveTo(x + inset, y);
            ctx.lineTo(x + width - inset, y);
            ctx.lineTo(x + width, y + height/2);
            ctx.lineTo(x + width - inset, y + height);
            ctx.lineTo(x + inset, y + height);
            ctx.lineTo(x, y + height/2);
            ctx.closePath();

            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x, y + height);
                const baseColor = options.fill === '#f0f0f0' ? '#e8f5e9' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 15));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#2e7d32';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.moveTo(x + inset + 3, y + 3);
                ctx.lineTo(x + width - inset - 3, y + 3);
                ctx.lineTo(x + width - inset - 3, y + 8);
                ctx.lineTo(x + inset + 3, y + 8);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Parallelogram for Partnership (distinct from Private's ellipse)
        drawParallelogram(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 3;
            }

            const skew = width * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + skew, y);
            ctx.lineTo(x + width, y);
            ctx.lineTo(x + width - skew, y + height);
            ctx.lineTo(x, y + height);
            ctx.closePath();

            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
                const baseColor = options.fill === '#f0f0f0' ? '#fff3e0' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 15));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#e65100';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.moveTo(x + skew + 3, y + 3);
                ctx.lineTo(x + width - 3, y + 3);
                ctx.lineTo(x + width - 5, y + 8);
                ctx.lineTo(x + skew + 1, y + 8);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Trapezoid for Charity (distinct from Social's pill)
        drawTrapezoid(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 3;
            }

            const inset = width * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + inset, y);
            ctx.lineTo(x + width - inset, y);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.closePath();

            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x, y + height);
                const baseColor = options.fill === '#f0f0f0' ? '#fce4ec' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 15));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#ad1457';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.moveTo(x + inset + 3, y + 3);
                ctx.lineTo(x + width - inset - 3, y + 3);
                ctx.lineTo(x + width - inset - 1, y + 7);
                ctx.lineTo(x + inset + 1, y + 7);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Octagon for Community Organization (distinct from NCM's rounded rectangle)
        drawOctagon(ctx, x, y, width, height, options = {}) {
            ctx.save();

            if (!options.noShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 3;
            }

            const cut = Math.min(width, height) * 0.2;
            ctx.beginPath();
            ctx.moveTo(x + cut, y);
            ctx.lineTo(x + width - cut, y);
            ctx.lineTo(x + width, y + cut);
            ctx.lineTo(x + width, y + height - cut);
            ctx.lineTo(x + width - cut, y + height);
            ctx.lineTo(x + cut, y + height);
            ctx.lineTo(x, y + height - cut);
            ctx.lineTo(x, y + cut);
            ctx.closePath();

            if (options.fill) {
                const gradient = ctx.createLinearGradient(x, y, x, y + height);
                const baseColor = options.fill === '#f0f0f0' ? '#e3f2fd' : options.fill;
                gradient.addColorStop(0, this.lightenColor(baseColor, 15));
                gradient.addColorStop(1, baseColor);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.strokeStyle = options.stroke || '#1565c0';
            ctx.lineWidth = options.lineWidth || 2;
            ctx.stroke();

            if (!options.noHighlight) {
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.moveTo(x + cut + 2, y + 3);
                ctx.lineTo(x + width - cut - 2, y + 3);
                ctx.lineTo(x + width - cut - 2, y + 7);
                ctx.lineTo(x + cut + 2, y + 7);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }

            ctx.restore();
        },

        // Participation role indicators (top edge)
        drawParticipationIndicators(ctx, x, y, width, height, roles) {
            const indicatorHeight = 10;
            const indicatorY = y - indicatorHeight - 3;
            const sectionWidth = width / 3;

            const roleColors = {
                producers: '#e74c3c',    // Red
                users: '#3498db',        // Blue
                investors: '#27ae60'     // Green
            };

            ctx.save();

            const positions = ['producers', 'users', 'investors'];
            positions.forEach((role, index) => {
                const indicatorX = x + (index * sectionWidth);

                // Border
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(indicatorX, indicatorY, sectionWidth, indicatorHeight);

                if (roles.includes(role)) {
                    // Gradient fill for active roles
                    const gradient = ctx.createLinearGradient(indicatorX, indicatorY, indicatorX, indicatorY + indicatorHeight);
                    gradient.addColorStop(0, this.lightenColor(roleColors[role], 20));
                    gradient.addColorStop(1, roleColors[role]);
                    ctx.fillStyle = gradient;
                    ctx.fillRect(indicatorX + 1, indicatorY + 1, sectionWidth - 2, indicatorHeight - 2);

                    // Letter indicator
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 7px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(role[0].toUpperCase(), indicatorX + sectionWidth/2, indicatorY + indicatorHeight/2);
                } else {
                    // Empty section gradient
                    const emptyGradient = ctx.createLinearGradient(indicatorX, indicatorY, indicatorX, indicatorY + indicatorHeight);
                    emptyGradient.addColorStop(0, '#ecf0f1');
                    emptyGradient.addColorStop(1, '#bdc3c7');
                    ctx.fillStyle = emptyGradient;
                    ctx.fillRect(indicatorX + 1, indicatorY + 1, sectionWidth - 2, indicatorHeight - 2);
                }
            });

            ctx.restore();
        },

        // Tier indicators (left edge)
        drawTierIndicators(ctx, x, y, width, height, tier, enterpriseType) {
            const indicatorWidth = 10;
            const indicatorX = x - indicatorWidth - 3;

            let totalHeight = height;
            if (enterpriseType === 'ncm') {
                totalHeight = height * 1.2;
            }

            const sectionHeight = totalHeight / 3;

            ctx.save();

            const tiers = ['tertiary', 'secondary', 'primary'];
            tiers.forEach((tierName, index) => {
                const indicatorY = y + (index * sectionHeight);

                // Border
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, sectionHeight);

                let isActive = false;
                if (tier === tierName) {
                    isActive = true;
                } else if (tier === 'hybrid-primary-secondary' && (tierName === 'primary' || tierName === 'secondary')) {
                    isActive = true;
                } else if (tier === 'hybrid-secondary-tertiary' && (tierName === 'secondary' || tierName === 'tertiary')) {
                    isActive = true;
                } else if (tier === 'hybrid-primary-tertiary' && (tierName === 'primary' || tierName === 'tertiary')) {
                    isActive = true;
                } else if (tier === 'hybrid-all') {
                    isActive = true;
                }

                if (isActive) {
                    // Gradient fill
                    const gradient = ctx.createLinearGradient(indicatorX, indicatorY, indicatorX + indicatorWidth, indicatorY);
                    gradient.addColorStop(0, '#7f8c8d');
                    gradient.addColorStop(1, '#34495e');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(indicatorX + 1, indicatorY + 1, indicatorWidth - 2, sectionHeight - 2);

                    // Tier letter
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 7px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tierName[0].toUpperCase(), indicatorX + indicatorWidth/2, indicatorY + sectionHeight/2);
                } else {
                    // Empty gradient
                    const emptyGradient = ctx.createLinearGradient(indicatorX, indicatorY, indicatorX + indicatorWidth, indicatorY);
                    emptyGradient.addColorStop(0, '#ecf0f1');
                    emptyGradient.addColorStop(1, '#bdc3c7');
                    ctx.fillStyle = emptyGradient;
                    ctx.fillRect(indicatorX + 1, indicatorY + 1, indicatorWidth - 2, sectionHeight - 2);
                }
            });

            ctx.restore();
        },

        // Stack effect for generic sets
        drawStackEffect(ctx, drawFunction, x, y, width, height, options = {}) {
            ctx.save();

            // Multiple shadow layers
            ctx.globalAlpha = 0.15;
            drawFunction.call(this, ctx, x + 12, y + 12, width, height, {...options, noShadow: true, noHighlight: true});
            ctx.globalAlpha = 0.25;
            drawFunction.call(this, ctx, x + 8, y + 8, width, height, {...options, noShadow: true, noHighlight: true});
            ctx.globalAlpha = 0.4;
            drawFunction.call(this, ctx, x + 4, y + 4, width, height, {...options, noShadow: true, noHighlight: true});

            ctx.restore();

            // Front layer
            drawFunction.call(this, ctx, x, y, width, height, options);
        },

        // Utility functions
        lightenColor(color, percent) {
            if (color === 'white' || color === '#ffffff') return color;

            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;

            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255))
                .toString(16).slice(1);
        },

        darkenColor(color, percent) {
            if (color === 'black' || color === '#000000') return color;

            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;

            return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
                (G > 0 ? G : 0) * 0x100 +
                (B > 0 ? B : 0))
                .toString(16).slice(1);
        }
    });
})();
