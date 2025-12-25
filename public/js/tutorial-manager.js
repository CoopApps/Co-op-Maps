/**
 * Co-op Maps Interactive Tutorial System
 * Deluxe Version Only
 *
 * A comprehensive step-by-step tutorial that guides users through all features
 * with interactive prompts and progress monitoring.
 */

(function(global) {
    'use strict';

    // Tutorial configuration
    var STORAGE_KEY = 'coopmaps_tutorial_progress';
    var TUTORIAL_VERSION = '1.0.0';

    /**
     * Tutorial Step Definition
     * Each step has:
     * - id: Unique identifier
     * - title: Display title
     * - description: Detailed explanation
     * - target: CSS selector for the element to highlight (optional)
     * - position: Tooltip position (top, bottom, left, right, center)
     * - action: What the user needs to do
     * - validation: Function that returns true when step is complete
     * - onEnter: Function called when entering this step
     * - onComplete: Function called when step is completed
     * - skippable: Whether this step can be skipped
     */
    var TUTORIAL_STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to Co-op Maps!',
            description: 'This interactive tutorial will guide you through all the features of Co-op Maps. You\'ll learn how to create cooperative ecosystem diagrams, add enterprises, create relationships, collaborate with others, and export your work.',
            position: 'center',
            action: 'Click "Let\'s Begin" to start your journey!',
            validation: function() { return true; }, // Immediate continue
            requiresClick: true,
            skippable: false
        },
        {
            id: 'create-diagram',
            title: 'Step 1: Create Your First Diagram',
            description: 'Every map starts with a diagram. Click the "New Diagram" button to create a fresh canvas for your cooperative ecosystem.',
            target: '#btn-new-diagram, .btn-new-diagram, [data-action="new-diagram"]',
            position: 'bottom',
            action: 'Click the "New Diagram" button',
            validation: function() {
                return TutorialManager.state.diagramCreated === true;
            },
            onEnter: function() {
                TutorialManager.state.diagramCreated = false;
            },
            skippable: true
        },
        {
            id: 'name-diagram',
            title: 'Step 2: Name Your Diagram',
            description: 'Give your diagram a meaningful name that describes the cooperative ecosystem you\'re mapping. Good names help you find diagrams later.',
            target: '#diagram-name, .diagram-name-input, [data-field="diagram-name"]',
            position: 'bottom',
            action: 'Enter a name for your diagram (at least 3 characters)',
            validation: function() {
                var nameInput = document.querySelector('#diagram-name, .diagram-name-input, [data-field="diagram-name"]');
                return nameInput && nameInput.value && nameInput.value.trim().length >= 3;
            },
            skippable: true
        },
        {
            id: 'add-enterprise',
            title: 'Step 3: Add Your First Enterprise',
            description: 'Enterprises are the building blocks of your map. They can be cooperatives, social enterprises, producers, consumers, or service providers. Click "Add Enterprise" to place one on the canvas.',
            target: '#btn-add-enterprise, .btn-add-enterprise, [data-action="add-enterprise"]',
            position: 'right',
            action: 'Click "Add Enterprise" to add an organization to your map',
            validation: function() {
                return TutorialManager.state.enterpriseCount >= 1;
            },
            onEnter: function() {
                TutorialManager.state.enterpriseCount = TutorialManager.getEnterpriseCount();
            },
            skippable: true
        },
        {
            id: 'configure-enterprise',
            title: 'Step 4: Configure Your Enterprise',
            description: 'Now let\'s configure the enterprise. Set its name, type (cooperative, social enterprise, etc.), and optionally add a description. The type determines how it\'s displayed on the map.',
            target: '.enterprise-form, #enterprise-panel, .properties-panel',
            position: 'left',
            action: 'Fill in the enterprise details and click "Save"',
            validation: function() {
                return TutorialManager.state.enterpriseConfigured === true;
            },
            onEnter: function() {
                TutorialManager.state.enterpriseConfigured = false;
            },
            skippable: true
        },
        {
            id: 'move-enterprise',
            title: 'Step 5: Position Your Enterprise',
            description: 'You can drag enterprises anywhere on the canvas. Click and hold on the enterprise, then drag it to reposition. Try moving it to a different location!',
            target: '.enterprise, .enterprise-node, [data-type="enterprise"]',
            position: 'top',
            action: 'Drag the enterprise to a new position on the canvas',
            validation: function() {
                return TutorialManager.state.enterpriseMoved === true;
            },
            onEnter: function() {
                TutorialManager.state.enterpriseMoved = false;
            },
            skippable: true
        },
        {
            id: 'add-second-enterprise',
            title: 'Step 6: Add Another Enterprise',
            description: 'Cooperative ecosystems involve multiple organizations working together. Add a second enterprise so we can create a relationship between them.',
            target: '#btn-add-enterprise, .btn-add-enterprise, [data-action="add-enterprise"]',
            position: 'right',
            action: 'Add a second enterprise to your diagram',
            validation: function() {
                return TutorialManager.getEnterpriseCount() >= 2;
            },
            skippable: true
        },
        {
            id: 'create-relationship',
            title: 'Step 7: Create a Relationship',
            description: 'Relationships show how enterprises connect and collaborate. Click on the first enterprise, then on the second to create a connection. You can specify the type of relationship (supplier, partner, member, etc.).',
            target: '#btn-add-relationship, .btn-add-relationship, [data-action="add-relationship"]',
            position: 'right',
            action: 'Create a relationship between two enterprises',
            validation: function() {
                return TutorialManager.state.relationshipCreated === true;
            },
            onEnter: function() {
                TutorialManager.state.relationshipCreated = false;
            },
            skippable: true
        },
        {
            id: 'customize-appearance',
            title: 'Step 8: Customize Appearance',
            description: 'Make your map visually distinctive! Select an enterprise and use the styling options to change colors, borders, and shapes. The Deluxe version supports gradients and advanced styling.',
            target: '.style-panel, #style-options, [data-panel="style"]',
            position: 'left',
            action: 'Change the color or style of an enterprise',
            validation: function() {
                return TutorialManager.state.styleChanged === true;
            },
            onEnter: function() {
                TutorialManager.state.styleChanged = false;
            },
            skippable: true
        },
        {
            id: 'canvas-navigation',
            title: 'Step 9: Navigate the Canvas',
            description: 'For larger maps, you\'ll need to navigate. Use the mouse wheel to zoom in/out, and click-drag on empty canvas space to pan around. Try zooming and panning now!',
            target: '#canvas, .diagram-canvas, [data-element="canvas"]',
            position: 'center',
            action: 'Zoom with mouse wheel and pan by dragging empty space',
            validation: function() {
                return TutorialManager.state.canvasNavigated === true;
            },
            onEnter: function() {
                TutorialManager.state.canvasNavigated = false;
            },
            skippable: true
        },
        {
            id: 'save-diagram',
            title: 'Step 10: Save Your Work',
            description: 'Don\'t lose your progress! Click the Save button to store your diagram. If you\'re logged in, it saves to the cloud. Otherwise, it saves locally in your browser.',
            target: '#btn-save, .btn-save, [data-action="save"]',
            position: 'bottom',
            action: 'Click "Save" to save your diagram',
            validation: function() {
                return TutorialManager.state.diagramSaved === true;
            },
            onEnter: function() {
                TutorialManager.state.diagramSaved = false;
            },
            skippable: true
        },
        {
            id: 'explore-export',
            title: 'Step 11: Export Options',
            description: 'Share your maps with others! Export as PNG for images, PDF for documents, or SVG for scalable graphics. Find the export options in the File menu or toolbar.',
            target: '#menu-file, .export-menu, [data-menu="export"]',
            position: 'bottom',
            action: 'Open the export menu to see available formats',
            validation: function() {
                return TutorialManager.state.exportMenuOpened === true;
            },
            onEnter: function() {
                TutorialManager.state.exportMenuOpened = false;
            },
            skippable: true
        },
        {
            id: 'collaboration-intro',
            title: 'Step 12: Collaboration Features',
            description: 'Co-op Maps supports real-time collaboration! Share your diagrams with team members, add comments, and work together in real-time. Let\'s explore the sharing options.',
            target: '#btn-share, .btn-share, [data-action="share"]',
            position: 'bottom',
            action: 'Click "Share" to see collaboration options',
            validation: function() {
                return TutorialManager.state.shareDialogOpened === true;
            },
            onEnter: function() {
                TutorialManager.state.shareDialogOpened = false;
            },
            skippable: true
        },
        {
            id: 'comments-feature',
            title: 'Step 13: Comments & Discussion',
            description: 'Add comments to discuss diagram elements with collaborators. You can @mention team members and have threaded discussions. Comments appear in the sidebar.',
            target: '#btn-comments, .comments-panel, [data-action="comments"]',
            position: 'left',
            action: 'Open the comments panel',
            validation: function() {
                return TutorialManager.state.commentsPanelOpened === true;
            },
            onEnter: function() {
                TutorialManager.state.commentsPanelOpened = false;
            },
            skippable: true
        },
        {
            id: 'version-history',
            title: 'Step 14: Version History',
            description: 'Never lose previous versions! Co-op Maps automatically saves versions as you work. Access the version history to view, compare, or restore earlier versions of your diagram.',
            target: '#btn-versions, .versions-panel, [data-action="versions"]',
            position: 'left',
            action: 'Open the version history panel',
            validation: function() {
                return TutorialManager.state.versionsPanelOpened === true;
            },
            onEnter: function() {
                TutorialManager.state.versionsPanelOpened = false;
            },
            skippable: true
        },
        {
            id: 'tags-organization',
            title: 'Step 15: Tags & Organization',
            description: 'Keep your diagrams organized with tags! Add color-coded tags to categorize your maps and find them easily later.',
            target: '#btn-tags, .tags-panel, [data-action="tags"]',
            position: 'bottom',
            action: 'View the tagging options',
            validation: function() {
                return TutorialManager.state.tagsViewed === true;
            },
            onEnter: function() {
                TutorialManager.state.tagsViewed = false;
            },
            skippable: true
        },
        {
            id: 'completion',
            title: 'Congratulations! Tutorial Complete!',
            description: 'You\'ve learned all the essential features of Co-op Maps! You now know how to create diagrams, add enterprises and relationships, customize appearance, collaborate with others, and export your work. Start creating your own cooperative ecosystem maps!',
            position: 'center',
            action: 'Click "Finish" to start using Co-op Maps',
            validation: function() { return true; },
            requiresClick: true,
            skippable: false,
            isLast: true
        }
    ];

    /**
     * TutorialManager - Main controller for the interactive tutorial
     */
    var TutorialManager = {
        // Current state
        currentStep: 0,
        isActive: false,
        isPaused: false,
        state: {},

        // DOM elements
        overlay: null,
        spotlight: null,
        tooltip: null,
        progressBar: null,

        /**
         * Initialize the tutorial system
         */
        init: function() {
            this.createOverlayElements();
            this.loadProgress();
            this.setupEventListeners();
            console.log('[Tutorial] Initialized - Version ' + TUTORIAL_VERSION);
        },

        /**
         * Create overlay DOM elements
         */
        createOverlayElements: function() {
            // Main overlay container
            this.overlay = document.createElement('div');
            this.overlay.id = 'tutorial-overlay';
            this.overlay.className = 'tutorial-overlay';
            this.overlay.innerHTML = this.getOverlayHTML();
            document.body.appendChild(this.overlay);

            // Cache element references
            this.spotlight = this.overlay.querySelector('.tutorial-spotlight');
            this.tooltip = this.overlay.querySelector('.tutorial-tooltip');
            this.progressBar = this.overlay.querySelector('.tutorial-progress-fill');
        },

        /**
         * Get overlay HTML structure
         */
        getOverlayHTML: function() {
            return [
                '<div class="tutorial-backdrop"></div>',
                '<div class="tutorial-spotlight"></div>',
                '<div class="tutorial-tooltip">',
                '  <div class="tutorial-tooltip-header">',
                '    <span class="tutorial-step-indicator"></span>',
                '    <button class="tutorial-close" title="Exit Tutorial">&times;</button>',
                '  </div>',
                '  <h3 class="tutorial-title"></h3>',
                '  <p class="tutorial-description"></p>',
                '  <div class="tutorial-action">',
                '    <span class="tutorial-action-icon">&#10148;</span>',
                '    <span class="tutorial-action-text"></span>',
                '  </div>',
                '  <div class="tutorial-buttons">',
                '    <button class="tutorial-btn tutorial-btn-skip">Skip Step</button>',
                '    <button class="tutorial-btn tutorial-btn-back">Back</button>',
                '    <button class="tutorial-btn tutorial-btn-primary tutorial-btn-next">Next</button>',
                '  </div>',
                '  <div class="tutorial-progress">',
                '    <div class="tutorial-progress-bar">',
                '      <div class="tutorial-progress-fill"></div>',
                '    </div>',
                '    <span class="tutorial-progress-text"></span>',
                '  </div>',
                '</div>',
                '<div class="tutorial-hint-pulse"></div>'
            ].join('\n');
        },

        /**
         * Setup event listeners
         */
        setupEventListeners: function() {
            var self = this;

            // Close button
            this.overlay.querySelector('.tutorial-close').addEventListener('click', function() {
                self.showExitConfirmation();
            });

            // Navigation buttons
            this.overlay.querySelector('.tutorial-btn-next').addEventListener('click', function() {
                self.nextStep();
            });

            this.overlay.querySelector('.tutorial-btn-back').addEventListener('click', function() {
                self.previousStep();
            });

            this.overlay.querySelector('.tutorial-btn-skip').addEventListener('click', function() {
                self.skipStep();
            });

            // Listen for step completion events from the app
            document.addEventListener('coopmaps:diagram:created', function() {
                self.state.diagramCreated = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:enterprise:added', function() {
                self.state.enterpriseCount = self.getEnterpriseCount();
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:enterprise:configured', function() {
                self.state.enterpriseConfigured = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:enterprise:moved', function() {
                self.state.enterpriseMoved = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:relationship:created', function() {
                self.state.relationshipCreated = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:style:changed', function() {
                self.state.styleChanged = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:canvas:navigated', function() {
                self.state.canvasNavigated = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:diagram:saved', function() {
                self.state.diagramSaved = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:export:opened', function() {
                self.state.exportMenuOpened = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:share:opened', function() {
                self.state.shareDialogOpened = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:comments:opened', function() {
                self.state.commentsPanelOpened = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:versions:opened', function() {
                self.state.versionsPanelOpened = true;
                self.checkStepCompletion();
            });

            document.addEventListener('coopmaps:tags:viewed', function() {
                self.state.tagsViewed = true;
                self.checkStepCompletion();
            });

            // Keyboard navigation
            document.addEventListener('keydown', function(e) {
                if (!self.isActive) return;

                if (e.key === 'Escape') {
                    self.showExitConfirmation();
                } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                    self.nextStep();
                } else if (e.key === 'ArrowLeft') {
                    self.previousStep();
                }
            });

            // Handle window resize
            window.addEventListener('resize', function() {
                if (self.isActive) {
                    self.positionElements();
                }
            });
        },

        /**
         * Start the tutorial
         * @param {boolean} fromBeginning - Start from step 0 or resume
         */
        start: function(fromBeginning) {
            if (fromBeginning) {
                this.currentStep = 0;
                this.state = {};
            }

            this.isActive = true;
            this.overlay.classList.add('active');
            document.body.classList.add('tutorial-active');

            this.showStep(this.currentStep);
            this.saveProgress();

            console.log('[Tutorial] Started at step ' + this.currentStep);
        },

        /**
         * Show a specific step
         * @param {number} stepIndex - The step index to show
         */
        showStep: function(stepIndex) {
            var step = TUTORIAL_STEPS[stepIndex];
            if (!step) return;

            // Update tooltip content
            this.overlay.querySelector('.tutorial-step-indicator').textContent =
                'Step ' + (stepIndex + 1) + ' of ' + TUTORIAL_STEPS.length;
            this.overlay.querySelector('.tutorial-title').textContent = step.title;
            this.overlay.querySelector('.tutorial-description').textContent = step.description;
            this.overlay.querySelector('.tutorial-action-text').textContent = step.action;

            // Update progress
            var progress = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;
            this.progressBar.style.width = progress + '%';
            this.overlay.querySelector('.tutorial-progress-text').textContent =
                Math.round(progress) + '% Complete';

            // Update button states
            var backBtn = this.overlay.querySelector('.tutorial-btn-back');
            var skipBtn = this.overlay.querySelector('.tutorial-btn-skip');
            var nextBtn = this.overlay.querySelector('.tutorial-btn-next');

            backBtn.style.display = stepIndex > 0 ? 'inline-block' : 'none';
            skipBtn.style.display = step.skippable ? 'inline-block' : 'none';

            if (step.isLast) {
                nextBtn.textContent = 'Finish';
            } else if (step.requiresClick) {
                nextBtn.textContent = stepIndex === 0 ? "Let's Begin" : 'Continue';
            } else {
                nextBtn.textContent = 'Next';
                nextBtn.disabled = !step.validation();
            }

            // Call onEnter if defined
            if (step.onEnter) {
                step.onEnter();
            }

            // Position elements
            this.positionElements();

            // Start validation polling for non-click steps
            if (!step.requiresClick) {
                this.startValidationPolling();
            }
        },

        /**
         * Position spotlight and tooltip based on target element
         */
        positionElements: function() {
            var step = TUTORIAL_STEPS[this.currentStep];
            if (!step) return;

            var spotlight = this.spotlight;
            var tooltip = this.tooltip;
            var hintPulse = this.overlay.querySelector('.tutorial-hint-pulse');

            if (step.position === 'center' || !step.target) {
                // Center the tooltip, hide spotlight
                spotlight.style.display = 'none';
                hintPulse.style.display = 'none';
                tooltip.style.position = 'fixed';
                tooltip.style.left = '50%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                tooltip.className = 'tutorial-tooltip center';
            } else {
                // Find target element
                var target = document.querySelector(step.target);

                if (target) {
                    var rect = target.getBoundingClientRect();
                    var padding = 10;

                    // Position spotlight
                    spotlight.style.display = 'block';
                    spotlight.style.left = (rect.left - padding) + 'px';
                    spotlight.style.top = (rect.top - padding) + 'px';
                    spotlight.style.width = (rect.width + padding * 2) + 'px';
                    spotlight.style.height = (rect.height + padding * 2) + 'px';

                    // Position hint pulse
                    hintPulse.style.display = 'block';
                    hintPulse.style.left = (rect.left + rect.width / 2) + 'px';
                    hintPulse.style.top = (rect.top + rect.height / 2) + 'px';

                    // Position tooltip based on specified position
                    tooltip.style.transform = 'none';
                    tooltip.className = 'tutorial-tooltip ' + step.position;

                    switch (step.position) {
                        case 'top':
                            tooltip.style.left = (rect.left + rect.width / 2 - 200) + 'px';
                            tooltip.style.top = (rect.top - tooltip.offsetHeight - 20) + 'px';
                            break;
                        case 'bottom':
                            tooltip.style.left = (rect.left + rect.width / 2 - 200) + 'px';
                            tooltip.style.top = (rect.bottom + 20) + 'px';
                            break;
                        case 'left':
                            tooltip.style.left = (rect.left - tooltip.offsetWidth - 20) + 'px';
                            tooltip.style.top = (rect.top + rect.height / 2 - 100) + 'px';
                            break;
                        case 'right':
                            tooltip.style.left = (rect.right + 20) + 'px';
                            tooltip.style.top = (rect.top + rect.height / 2 - 100) + 'px';
                            break;
                    }

                    // Ensure tooltip stays in viewport
                    this.constrainToViewport(tooltip);
                } else {
                    // Target not found, center the tooltip
                    spotlight.style.display = 'none';
                    hintPulse.style.display = 'none';
                    tooltip.style.position = 'fixed';
                    tooltip.style.left = '50%';
                    tooltip.style.top = '50%';
                    tooltip.style.transform = 'translate(-50%, -50%)';
                    tooltip.className = 'tutorial-tooltip center';
                }
            }
        },

        /**
         * Keep tooltip within viewport bounds
         */
        constrainToViewport: function(tooltip) {
            var rect = tooltip.getBoundingClientRect();
            var margin = 20;

            if (rect.left < margin) {
                tooltip.style.left = margin + 'px';
            }
            if (rect.right > window.innerWidth - margin) {
                tooltip.style.left = (window.innerWidth - rect.width - margin) + 'px';
            }
            if (rect.top < margin) {
                tooltip.style.top = margin + 'px';
            }
            if (rect.bottom > window.innerHeight - margin) {
                tooltip.style.top = (window.innerHeight - rect.height - margin) + 'px';
            }
        },

        /**
         * Start polling for step validation
         */
        startValidationPolling: function() {
            var self = this;

            if (this.validationInterval) {
                clearInterval(this.validationInterval);
            }

            this.validationInterval = setInterval(function() {
                self.checkStepCompletion();
            }, 500);
        },

        /**
         * Check if current step is complete
         */
        checkStepCompletion: function() {
            if (!this.isActive) return;

            var step = TUTORIAL_STEPS[this.currentStep];
            if (!step || step.requiresClick) return;

            var nextBtn = this.overlay.querySelector('.tutorial-btn-next');
            var isValid = step.validation();

            nextBtn.disabled = !isValid;

            if (isValid) {
                nextBtn.classList.add('pulse');
                // Auto-advance after short delay for better UX
                setTimeout(function() {
                    nextBtn.classList.remove('pulse');
                }, 1000);
            }
        },

        /**
         * Move to next step
         */
        nextStep: function() {
            var step = TUTORIAL_STEPS[this.currentStep];

            // Check validation unless it requires just a click
            if (!step.requiresClick && !step.validation()) {
                this.showIncompleteNotice();
                return;
            }

            // Call onComplete if defined
            if (step.onComplete) {
                step.onComplete();
            }

            if (this.currentStep < TUTORIAL_STEPS.length - 1) {
                this.currentStep++;
                this.showStep(this.currentStep);
                this.saveProgress();
            } else {
                // Tutorial complete
                this.complete();
            }
        },

        /**
         * Move to previous step
         */
        previousStep: function() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.showStep(this.currentStep);
                this.saveProgress();
            }
        },

        /**
         * Skip current step
         */
        skipStep: function() {
            var step = TUTORIAL_STEPS[this.currentStep];
            if (step.skippable) {
                this.currentStep++;
                this.showStep(this.currentStep);
                this.saveProgress();
            }
        },

        /**
         * Show incomplete step notice
         */
        showIncompleteNotice: function() {
            var actionText = this.overlay.querySelector('.tutorial-action');
            actionText.classList.add('shake');
            setTimeout(function() {
                actionText.classList.remove('shake');
            }, 500);
        },

        /**
         * Show exit confirmation dialog
         */
        showExitConfirmation: function() {
            var self = this;

            if (confirm('Are you sure you want to exit the tutorial? Your progress will be saved and you can resume later.')) {
                this.pause();
            }
        },

        /**
         * Pause the tutorial
         */
        pause: function() {
            this.isPaused = true;
            this.isActive = false;
            this.overlay.classList.remove('active');
            document.body.classList.remove('tutorial-active');

            if (this.validationInterval) {
                clearInterval(this.validationInterval);
            }

            this.saveProgress();
            console.log('[Tutorial] Paused at step ' + this.currentStep);
        },

        /**
         * Resume the tutorial
         */
        resume: function() {
            this.isPaused = false;
            this.start(false);
        },

        /**
         * Complete the tutorial
         */
        complete: function() {
            this.isActive = false;
            this.overlay.classList.remove('active');
            document.body.classList.remove('tutorial-active');

            if (this.validationInterval) {
                clearInterval(this.validationInterval);
            }

            // Clear saved progress
            localStorage.removeItem(STORAGE_KEY);

            // Show completion celebration
            this.showCompletionCelebration();

            console.log('[Tutorial] Completed!');
        },

        /**
         * Show completion celebration
         */
        showCompletionCelebration: function() {
            var celebration = document.createElement('div');
            celebration.className = 'tutorial-celebration';
            celebration.innerHTML = [
                '<div class="tutorial-celebration-content">',
                '  <div class="tutorial-celebration-icon">&#127881;</div>',
                '  <h2>You\'re All Set!</h2>',
                '  <p>You\'ve mastered the basics of Co-op Maps. Start creating your cooperative ecosystem diagrams!</p>',
                '  <button class="tutorial-btn tutorial-btn-primary" onclick="this.parentElement.parentElement.remove()">Get Started</button>',
                '</div>'
            ].join('\n');
            document.body.appendChild(celebration);

            setTimeout(function() {
                celebration.classList.add('show');
            }, 100);
        },

        /**
         * Reset tutorial progress
         */
        reset: function() {
            this.currentStep = 0;
            this.state = {};
            localStorage.removeItem(STORAGE_KEY);
            console.log('[Tutorial] Progress reset');
        },

        /**
         * Save progress to localStorage
         */
        saveProgress: function() {
            var data = {
                version: TUTORIAL_VERSION,
                currentStep: this.currentStep,
                state: this.state,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        },

        /**
         * Load progress from localStorage
         */
        loadProgress: function() {
            try {
                var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
                if (data && data.version === TUTORIAL_VERSION) {
                    this.currentStep = data.currentStep || 0;
                    this.state = data.state || {};
                    return true;
                }
            } catch (e) {
                console.warn('[Tutorial] Could not load progress', e);
            }
            return false;
        },

        /**
         * Check if tutorial has been completed before
         */
        hasCompletedTutorial: function() {
            return localStorage.getItem('coopmaps_tutorial_completed') === 'true';
        },

        /**
         * Mark tutorial as completed
         */
        markCompleted: function() {
            localStorage.setItem('coopmaps_tutorial_completed', 'true');
        },

        /**
         * Check if there's saved progress
         */
        hasSavedProgress: function() {
            return localStorage.getItem(STORAGE_KEY) !== null;
        },

        /**
         * Get enterprise count from the diagram
         */
        getEnterpriseCount: function() {
            var enterprises = document.querySelectorAll('.enterprise, .enterprise-node, [data-type="enterprise"]');
            return enterprises.length;
        },

        /**
         * Get current step info
         */
        getCurrentStepInfo: function() {
            return TUTORIAL_STEPS[this.currentStep];
        },

        /**
         * Get all steps
         */
        getSteps: function() {
            return TUTORIAL_STEPS;
        }
    };

    // Expose to global scope
    global.TutorialManager = TutorialManager;
    global.TUTORIAL_STEPS = TUTORIAL_STEPS;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            TutorialManager.init();
        });
    } else {
        TutorialManager.init();
    }

})(typeof window !== 'undefined' ? window : this);
