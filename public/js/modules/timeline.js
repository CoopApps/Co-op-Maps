/**
 * Co-op Maps - Timeline Module
 * Manages timeline snapshots for showing ecosystem evolution over time
 */

(function() {
    'use strict';

    CoopMaps.registerModule('timeline', {
        isPlaying: false,
        playInterval: null,
        currentSnapshotIndex: -1, // -1 means showing current/live state
        playbackSpeed: 2000, // ms between snapshots

        init() {
            console.log('Timeline module initialized');
            // Initialize timeline array if not present
            if (!CoopMaps.state.data.timeline) {
                CoopMaps.state.data.timeline = [];
            }
        },

        // Show dialog to add a new timeline snapshot
        showAddSnapshotDialog() {
            // Remove existing modal if any
            const existing = document.getElementById('timelineModal');
            if (existing) existing.remove();

            const today = new Date().toISOString().split('T')[0];
            const snapshotCount = CoopMaps.state.data.timeline?.length || 0;

            const useAnimation = !CoopMaps.isExpressMode;

            const modal = document.createElement('div');
            modal.id = 'timelineModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, ${CoopMaps.isExpressMode ? '0.7' : '0.8'});
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);'}
                    padding: ${CoopMaps.isExpressMode ? '20px' : '30px'};
                    max-width: 450px;
                    width: 90%;
                    ${useAnimation ? 'animation: slideIn 0.3s ease;' : ''}
                ">
                    <h2 style="
                        margin: 0 0 20px 0;
                        color: #2c3e50;
                        font-size: ${CoopMaps.isExpressMode ? '16px' : '20px'};
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Add Timeline Snapshot
                    </h2>

                    <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 14px;">
                        Save the current state of your map as a point in time.
                        You have ${snapshotCount} snapshot${snapshotCount !== 1 ? 's' : ''} so far.
                    </p>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Date *
                        </label>
                        <input type="date" id="snapshotDate" value="${today}" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Label *
                        </label>
                        <input type="text" id="snapshotLabel" placeholder="e.g., Founding Year, First Expansion, Current State" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Notes (optional)
                        </label>
                        <textarea id="snapshotNotes" placeholder="Describe what changed at this point..." style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                            min-height: 80px;
                            resize: vertical;
                            font-family: inherit;
                        "></textarea>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="CoopMaps.modules.timeline.closeDialog()" style="
                            flex: 1;
                            padding: 12px;
                            border: ${CoopMaps.isExpressMode ? '2px outset #bdc3c7' : '1px solid #ddd'};
                            background: ${CoopMaps.isExpressMode ? '#ecf0f1' : '#f8f9fa'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            color: #2c3e50;
                        ">
                            Cancel
                        </button>
                        <button onclick="CoopMaps.modules.timeline.saveSnapshot()" style="
                            flex: 1;
                            padding: 12px;
                            border: none;
                            background: ${CoopMaps.isExpressMode ? '#3498db' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'};
                            color: white;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">
                            Save Snapshot
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeDialog();
            });

            // Close on Escape
            this.escapeHandler = (e) => {
                if (e.key === 'Escape') this.closeDialog();
            };
            document.addEventListener('keydown', this.escapeHandler);

            // Focus the label input
            setTimeout(() => document.getElementById('snapshotLabel')?.focus(), 100);
        },

        closeDialog() {
            const modal = document.getElementById('timelineModal');
            if (modal) modal.remove();
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
            }
        },

        saveSnapshot() {
            const dateInput = document.getElementById('snapshotDate');
            const labelInput = document.getElementById('snapshotLabel');
            const notesInput = document.getElementById('snapshotNotes');

            const date = dateInput?.value;
            const label = labelInput?.value?.trim();
            const notes = notesInput?.value?.trim() || '';

            if (!date) {
                alert('Please select a date');
                return;
            }
            if (!label) {
                alert('Please enter a label');
                return;
            }

            // Initialize timeline if needed
            if (!CoopMaps.state.data.timeline) {
                CoopMaps.state.data.timeline = [];
            }

            // Create snapshot of current state
            const snapshot = {
                id: CoopMaps.generateId(),
                date: date,
                label: label,
                notes: notes,
                createdAt: new Date().toISOString(),
                data: {
                    enterprises: JSON.parse(JSON.stringify(CoopMaps.state.data.enterprises)),
                    relationships: JSON.parse(JSON.stringify(CoopMaps.state.data.relationships)),
                    groups: CoopMaps.state.data.groups ? JSON.parse(JSON.stringify(CoopMaps.state.data.groups)) : []
                }
            };

            // Add to timeline and sort by date
            CoopMaps.state.data.timeline.push(snapshot);
            CoopMaps.state.data.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Save state
            CoopMaps.saveState();
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            this.closeDialog();

            // Show success message
            if (CoopMaps.isExpressMode) {
                alert('Timeline snapshot saved: ' + label);
            } else if (CoopMaps.showNotification) {
                CoopMaps.showNotification('Timeline snapshot saved: ' + label, 'success');
            }

            // Update timeline bar if visible
            this.updateTimelineBar();
        },

        // Show the timeline management panel
        showTimelinePanel() {
            const timeline = CoopMaps.state.data.timeline || [];

            if (timeline.length === 0) {
                if (CoopMaps.isExpressMode) {
                    alert('No timeline snapshots yet. Use "Add Snapshot" to save points in time.');
                } else {
                    CoopMaps.showNotification('No timeline snapshots yet. Add your first snapshot!', 'info');
                }
                return;
            }

            // Remove existing modal
            const existing = document.getElementById('timelinePanelModal');
            if (existing) existing.remove();

            const useAnimation = !CoopMaps.isExpressMode;

            const modal = document.createElement('div');
            modal.id = 'timelinePanelModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            const snapshotList = timeline.map((snap, idx) => `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: ${this.currentSnapshotIndex === idx ? '#e8f4fc' : '#f8f9fa'};
                    ${CoopMaps.isExpressMode ? 'border: 1px solid #bdc3c7;' : 'border-radius: 8px;'}
                    margin-bottom: 10px;
                    ${this.currentSnapshotIndex === idx ? 'border-left: 4px solid #3498db;' : ''}
                ">
                    <div style="
                        width: 50px;
                        text-align: center;
                        color: #3498db;
                        font-weight: bold;
                    ">
                        ${new Date(snap.date).getFullYear()}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #2c3e50;">${this.escapeHtml(snap.label)}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">${snap.date}</div>
                        ${snap.notes ? `<div style="font-size: 12px; color: #95a5a6; margin-top: 4px;">${this.escapeHtml(snap.notes)}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="CoopMaps.modules.timeline.viewSnapshot(${idx})" style="
                            padding: 8px 12px;
                            background: #3498db;
                            color: white;
                            border: none;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                            cursor: pointer;
                            font-size: 12px;
                        ">View</button>
                        <button onclick="CoopMaps.modules.timeline.deleteSnapshot(${idx})" style="
                            padding: 8px 12px;
                            background: #e74c3c;
                            color: white;
                            border: none;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                            cursor: pointer;
                            font-size: 12px;
                        ">Delete</button>
                    </div>
                </div>
            `).join('');

            modal.innerHTML = `
                <div style="
                    background: white;
                    ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);'}
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Timeline (${timeline.length} snapshots)
                        </h2>
                        <button onclick="CoopMaps.modules.timeline.closePanelDialog()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>

                    ${this.currentSnapshotIndex >= 0 ? `
                        <div style="
                            background: #fff3cd;
                            padding: 10px 15px;
                            ${CoopMaps.isExpressMode ? 'border: 1px solid #ffc107;' : 'border-radius: 8px;'}
                            margin-bottom: 20px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <span>Viewing snapshot: <strong>${this.escapeHtml(timeline[this.currentSnapshotIndex].label)}</strong></span>
                            <button onclick="CoopMaps.modules.timeline.returnToCurrentState()" style="
                                padding: 6px 12px;
                                background: #2c3e50;
                                color: white;
                                border: none;
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                cursor: pointer;
                                font-size: 12px;
                            ">Return to Current</button>
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 20px;">
                        ${snapshotList}
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="CoopMaps.modules.timeline.closePanelDialog(); CoopMaps.modules.timeline.showAddSnapshotDialog();" style="
                            flex: 1;
                            padding: 12px;
                            background: ${CoopMaps.isExpressMode ? '#27ae60' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'};
                            color: white;
                            border: none;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-weight: 600;
                        ">+ Add Snapshot</button>
                        ${timeline.length > 1 ? `
                            <button onclick="CoopMaps.modules.timeline.closePanelDialog(); CoopMaps.modules.timeline.togglePlayback();" style="
                                flex: 1;
                                padding: 12px;
                                background: ${CoopMaps.isExpressMode ? '#9b59b6' : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'};
                                color: white;
                                border: none;
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                                cursor: pointer;
                                font-weight: 600;
                            ">${this.isPlaying ? '⏸ Pause' : '▶ Play Timeline'}</button>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closePanelDialog();
            });
        },

        closePanelDialog() {
            const modal = document.getElementById('timelinePanelModal');
            if (modal) modal.remove();
        },

        viewSnapshot(index) {
            const timeline = CoopMaps.state.data.timeline || [];
            if (index < 0 || index >= timeline.length) return;

            this.currentSnapshotIndex = index;
            const snapshot = timeline[index];

            // Store current state temporarily if this is first snapshot view
            if (!this._savedCurrentState) {
                this._savedCurrentState = {
                    enterprises: JSON.parse(JSON.stringify(CoopMaps.state.data.enterprises)),
                    relationships: JSON.parse(JSON.stringify(CoopMaps.state.data.relationships)),
                    groups: CoopMaps.state.data.groups ? JSON.parse(JSON.stringify(CoopMaps.state.data.groups)) : []
                };
            }

            // Load snapshot data
            CoopMaps.state.data.enterprises = JSON.parse(JSON.stringify(snapshot.data.enterprises));
            CoopMaps.state.data.relationships = JSON.parse(JSON.stringify(snapshot.data.relationships));
            if (snapshot.data.groups) {
                CoopMaps.state.data.groups = JSON.parse(JSON.stringify(snapshot.data.groups));
            }

            // Re-render
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }

            // Update UI
            this.updateTimelineBar();
            this.showTimelinePanel(); // Refresh panel

            if (CoopMaps.isExpressMode) {
                alert('Viewing: ' + snapshot.label + ' (' + snapshot.date + ')');
            }
        },

        returnToCurrentState() {
            if (this._savedCurrentState) {
                CoopMaps.state.data.enterprises = this._savedCurrentState.enterprises;
                CoopMaps.state.data.relationships = this._savedCurrentState.relationships;
                if (this._savedCurrentState.groups) {
                    CoopMaps.state.data.groups = this._savedCurrentState.groups;
                }
                this._savedCurrentState = null;
            }

            this.currentSnapshotIndex = -1;

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }

            this.updateTimelineBar();
            this.closePanelDialog();

            if (!CoopMaps.isExpressMode && CoopMaps.showNotification) {
                CoopMaps.showNotification('Returned to current state', 'info');
            }
        },

        deleteSnapshot(index) {
            const timeline = CoopMaps.state.data.timeline || [];
            if (index < 0 || index >= timeline.length) return;

            const snapshot = timeline[index];
            if (!confirm(`Delete snapshot "${snapshot.label}" (${snapshot.date})?`)) {
                return;
            }

            // If viewing this snapshot, return to current first
            if (this.currentSnapshotIndex === index) {
                this.returnToCurrentState();
            } else if (this.currentSnapshotIndex > index) {
                this.currentSnapshotIndex--;
            }

            timeline.splice(index, 1);
            CoopMaps.saveState();
            document.dispatchEvent(new CustomEvent('diagram-changed'));

            this.showTimelinePanel(); // Refresh
        },

        togglePlayback() {
            const timeline = CoopMaps.state.data.timeline || [];
            if (timeline.length < 2) {
                alert('Need at least 2 snapshots to play timeline');
                return;
            }

            if (this.isPlaying) {
                this.stopPlayback();
            } else {
                this.startPlayback();
            }
        },

        startPlayback() {
            const timeline = CoopMaps.state.data.timeline || [];
            if (timeline.length < 2) return;

            this.isPlaying = true;

            // Store current state before playback
            if (!this._savedCurrentState) {
                this._savedCurrentState = {
                    enterprises: JSON.parse(JSON.stringify(CoopMaps.state.data.enterprises)),
                    relationships: JSON.parse(JSON.stringify(CoopMaps.state.data.relationships)),
                    groups: CoopMaps.state.data.groups ? JSON.parse(JSON.stringify(CoopMaps.state.data.groups)) : []
                };
            }

            // Start from first snapshot
            this.currentSnapshotIndex = 0;
            this.viewSnapshot(0);

            // Show timeline bar
            this.showTimelineBar();

            // Play through snapshots
            this.playInterval = setInterval(() => {
                this.currentSnapshotIndex++;
                if (this.currentSnapshotIndex >= timeline.length) {
                    this.stopPlayback();
                    return;
                }
                this.viewSnapshot(this.currentSnapshotIndex);
            }, this.playbackSpeed);
        },

        stopPlayback() {
            this.isPlaying = false;
            if (this.playInterval) {
                clearInterval(this.playInterval);
                this.playInterval = null;
            }
            this.updateTimelineBar();
        },

        // Timeline bar UI at bottom of canvas
        showTimelineBar() {
            let bar = document.getElementById('timelineBar');
            if (bar) return; // Already exists

            const timeline = CoopMaps.state.data.timeline || [];
            if (timeline.length === 0) return;

            bar = document.createElement('div');
            bar.id = 'timelineBar';
            bar.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${CoopMaps.isExpressMode ? '#ecf0f1' : 'rgba(255, 255, 255, 0.95)'};
                ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);'}
                padding: 15px 25px;
                display: flex;
                align-items: center;
                gap: 15px;
                z-index: 1000;
                min-width: 400px;
            `;

            this.updateTimelineBarContent(bar);
            document.body.appendChild(bar);
        },

        updateTimelineBar() {
            const bar = document.getElementById('timelineBar');
            if (bar) {
                this.updateTimelineBarContent(bar);
            }
        },

        updateTimelineBarContent(bar) {
            const timeline = CoopMaps.state.data.timeline || [];
            if (timeline.length === 0) {
                bar.remove();
                return;
            }

            const currentLabel = this.currentSnapshotIndex >= 0
                ? timeline[this.currentSnapshotIndex].label
                : 'Current State';

            const dots = timeline.map((snap, idx) => `
                <div
                    onclick="CoopMaps.modules.timeline.viewSnapshot(${idx})"
                    style="
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: ${idx === this.currentSnapshotIndex ? '#3498db' : '#bdc3c7'};
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                    title="${snap.label} (${snap.date})"
                ></div>
            `).join('');

            bar.innerHTML = `
                <button onclick="CoopMaps.modules.timeline.prevSnapshot()" style="
                    padding: 8px 12px;
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                    cursor: pointer;
                    font-size: 16px;
                " ${this.currentSnapshotIndex <= 0 ? 'disabled' : ''}>◀</button>

                <button onclick="CoopMaps.modules.timeline.togglePlayback()" style="
                    padding: 8px 12px;
                    background: ${this.isPlaying ? '#e74c3c' : '#27ae60'};
                    color: white;
                    border: none;
                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                ">${this.isPlaying ? '⏸' : '▶'}</button>

                <button onclick="CoopMaps.modules.timeline.nextSnapshot()" style="
                    padding: 8px 12px;
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                    cursor: pointer;
                    font-size: 16px;
                " ${this.currentSnapshotIndex >= timeline.length - 1 ? 'disabled' : ''}>▶</button>

                <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center;">
                    ${dots}
                </div>

                <div style="min-width: 120px; text-align: center; font-weight: 600; color: #2c3e50;">
                    ${this.escapeHtml(currentLabel)}
                </div>

                <button onclick="CoopMaps.modules.timeline.returnToCurrentState(); CoopMaps.modules.timeline.hideTimelineBar();" style="
                    padding: 8px 12px;
                    background: #2c3e50;
                    color: white;
                    border: none;
                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                    cursor: pointer;
                    font-size: 12px;
                ">✕ Close</button>
            `;
        },

        hideTimelineBar() {
            const bar = document.getElementById('timelineBar');
            if (bar) bar.remove();
        },

        prevSnapshot() {
            if (this.currentSnapshotIndex > 0) {
                this.viewSnapshot(this.currentSnapshotIndex - 1);
            }
        },

        nextSnapshot() {
            const timeline = CoopMaps.state.data.timeline || [];
            if (this.currentSnapshotIndex < timeline.length - 1) {
                this.viewSnapshot(this.currentSnapshotIndex + 1);
            }
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        // Get timeline data for export/save
        getTimelineData() {
            return CoopMaps.state.data.timeline || [];
        },

        // Check if timeline has snapshots
        hasSnapshots() {
            return (CoopMaps.state.data.timeline || []).length > 0;
        }
    });
})();
