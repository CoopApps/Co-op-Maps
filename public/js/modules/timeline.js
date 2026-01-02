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

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="CoopMaps.modules.timeline.closePanelDialog(); CoopMaps.modules.timeline.showAddSnapshotDialog();" style="
                            flex: 1;
                            padding: 12px;
                            background: ${CoopMaps.isExpressMode ? '#27ae60' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'};
                            color: white;
                            border: none;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-weight: 600;
                            min-width: 120px;
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
                                min-width: 120px;
                            ">${this.isPlaying ? '⏸ Pause' : '▶ Play Timeline'}</button>
                        ` : ''}
                        <button onclick="CoopMaps.modules.timeline.exportTimelineAsHTML();" style="
                            flex: 1;
                            padding: 12px;
                            background: ${CoopMaps.isExpressMode ? '#e67e22' : 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)'};
                            color: white;
                            border: none;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-weight: 600;
                            min-width: 120px;
                        ">📤 Export Timeline</button>
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
        },

        // Export timeline as standalone HTML viewer
        exportTimelineAsHTML() {
            const timeline = CoopMaps.state.data.timeline || [];
            if (timeline.length === 0) {
                alert('No snapshots to export. Add at least one snapshot first.');
                return;
            }

            const diagramName = CoopMaps.state.data.diagramProperties?.name || 'Co-op Map Timeline';
            const diagramDesc = CoopMaps.state.data.diagramProperties?.description || '';

            // Build standalone HTML with embedded data and viewer
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(diagramName)} - Timeline Viewer</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            color: #fff;
        }
        .header {
            background: rgba(255,255,255,0.1);
            padding: 20px 30px;
            text-align: center;
            backdrop-filter: blur(10px);
        }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { color: rgba(255,255,255,0.7); font-size: 14px; }
        .main-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 80px);
        }
        .canvas-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
        }
        #mapCanvas {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 100%;
            max-height: 100%;
        }
        .timeline-controls {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            backdrop-filter: blur(10px);
        }
        .control-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: transform 0.2s, background 0.2s;
        }
        .control-btn:hover { transform: scale(1.05); }
        .control-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .nav-btn { background: #3498db; color: white; }
        .play-btn { background: #27ae60; color: white; min-width: 100px; }
        .play-btn.playing { background: #e74c3c; }
        .timeline-dots {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            cursor: pointer;
            transition: all 0.3s;
        }
        .dot:hover { background: rgba(255,255,255,0.6); }
        .dot.active { background: #3498db; transform: scale(1.3); }
        .snapshot-info {
            text-align: center;
            min-width: 200px;
        }
        .snapshot-label { font-weight: 600; font-size: 18px; }
        .snapshot-date { color: rgba(255,255,255,0.6); font-size: 14px; }
        .snapshot-notes { color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 5px; }
        .info-panel {
            position: absolute;
            top: 30px;
            right: 30px;
            background: rgba(0,0,0,0.7);
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 14px;
        }
        .info-panel strong { color: #3498db; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.escapeHtml(diagramName)}</h1>
        ${diagramDesc ? `<p>${this.escapeHtml(diagramDesc)}</p>` : ''}
    </div>

    <div class="main-container">
        <div class="canvas-container">
            <canvas id="mapCanvas" width="1200" height="800"></canvas>
            <div class="info-panel">
                <strong>${timeline.length}</strong> snapshots |
                <strong id="currentIndex">1</strong> of ${timeline.length}
            </div>
        </div>

        <div class="timeline-controls">
            <button class="control-btn nav-btn" id="prevBtn" onclick="viewer.prev()">◀ Previous</button>
            <button class="control-btn play-btn" id="playBtn" onclick="viewer.togglePlay()">▶ Play</button>
            <button class="control-btn nav-btn" id="nextBtn" onclick="viewer.next()">Next ▶</button>

            <div class="timeline-dots" id="dotsContainer"></div>

            <div class="snapshot-info">
                <div class="snapshot-label" id="snapshotLabel"></div>
                <div class="snapshot-date" id="snapshotDate"></div>
                <div class="snapshot-notes" id="snapshotNotes"></div>
            </div>
        </div>
    </div>

    <script>
        // Embedded timeline data
        const timelineData = ${JSON.stringify(timeline)};

        const viewer = {
            currentIndex: 0,
            isPlaying: false,
            playInterval: null,
            playSpeed: 3000,
            canvas: null,
            ctx: null,

            init() {
                this.canvas = document.getElementById('mapCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.createDots();
                this.showSnapshot(0);
            },

            createDots() {
                const container = document.getElementById('dotsContainer');
                container.innerHTML = timelineData.map((_, i) =>
                    '<div class="dot" onclick="viewer.showSnapshot(' + i + ')" title="' +
                    timelineData[i].label + '"></div>'
                ).join('');
            },

            showSnapshot(index) {
                if (index < 0 || index >= timelineData.length) return;
                this.currentIndex = index;
                const snapshot = timelineData[index];

                // Update UI
                document.getElementById('currentIndex').textContent = index + 1;
                document.getElementById('snapshotLabel').textContent = snapshot.label;
                document.getElementById('snapshotDate').textContent = snapshot.date;
                document.getElementById('snapshotNotes').textContent = snapshot.notes || '';

                // Update dots
                document.querySelectorAll('.dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });

                // Update buttons
                document.getElementById('prevBtn').disabled = index === 0;
                document.getElementById('nextBtn').disabled = index === timelineData.length - 1;

                // Render map
                this.renderMap(snapshot.data);
            },

            renderMap(data) {
                const ctx = this.ctx;
                const canvas = this.canvas;

                // Clear canvas
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw grid
                ctx.strokeStyle = '#e9ecef';
                ctx.lineWidth = 1;
                for (let x = 0; x < canvas.width; x += 50) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                }
                for (let y = 0; y < canvas.height; y += 50) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                }

                // Draw relationships first
                if (data.relationships) {
                    data.relationships.forEach(rel => {
                        const from = data.enterprises.find(e => e.id === rel.from);
                        const to = data.enterprises.find(e => e.id === rel.to);
                        if (from && to) {
                            ctx.beginPath();
                            ctx.strokeStyle = rel.color || '#95a5a6';
                            ctx.lineWidth = rel.strength === 'strong' ? 3 : rel.strength === 'weak' ? 1 : 2;
                            ctx.moveTo(from.x, from.y);
                            ctx.lineTo(to.x, to.y);
                            ctx.stroke();
                        }
                    });
                }

                // Draw enterprises
                if (data.enterprises) {
                    data.enterprises.forEach(ent => {
                        const size = ent.size || 60;
                        const x = ent.x;
                        const y = ent.y;

                        // Shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.1)';
                        ctx.beginPath();
                        ctx.arc(x + 3, y + 3, size/2, 0, Math.PI * 2);
                        ctx.fill();

                        // Circle
                        ctx.fillStyle = ent.color || '#3498db';
                        ctx.beginPath();
                        ctx.arc(x, y, size/2, 0, Math.PI * 2);
                        ctx.fill();

                        // Border
                        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        // Label
                        ctx.fillStyle = '#2c3e50';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillText(ent.name || 'Enterprise', x, y + size/2 + 8);
                    });
                }
            },

            prev() {
                if (this.currentIndex > 0) {
                    this.showSnapshot(this.currentIndex - 1);
                }
            },

            next() {
                if (this.currentIndex < timelineData.length - 1) {
                    this.showSnapshot(this.currentIndex + 1);
                }
            },

            togglePlay() {
                if (this.isPlaying) {
                    this.stop();
                } else {
                    this.play();
                }
            },

            play() {
                this.isPlaying = true;
                document.getElementById('playBtn').textContent = '⏸ Pause';
                document.getElementById('playBtn').classList.add('playing');

                this.playInterval = setInterval(() => {
                    if (this.currentIndex < timelineData.length - 1) {
                        this.showSnapshot(this.currentIndex + 1);
                    } else {
                        this.stop();
                        this.showSnapshot(0); // Loop back
                    }
                }, this.playSpeed);
            },

            stop() {
                this.isPlaying = false;
                document.getElementById('playBtn').textContent = '▶ Play';
                document.getElementById('playBtn').classList.remove('playing');
                if (this.playInterval) {
                    clearInterval(this.playInterval);
                    this.playInterval = null;
                }
            }
        };

        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => viewer.init());
    </script>
</body>
</html>`;

            // Download the file
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (diagramName.replace(/[^a-z0-9]/gi, '_') || 'timeline') + '_viewer.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (CoopMaps.isExpressMode) {
                alert('Timeline exported! Open the downloaded HTML file in any browser to view your map timeline.');
            } else if (CoopMaps.showNotification) {
                CoopMaps.showNotification('Timeline exported as standalone HTML viewer!', 'success');
            }
        }
    });
})();
