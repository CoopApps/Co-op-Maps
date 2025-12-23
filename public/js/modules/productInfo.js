// Module 10: Product Information Module
(function() {
    'use strict';

    CoopMaps.registerModule('productInfo', {
        isDialogOpen: false,
        currentSection: 'terms',

        init() {
            console.log('Product Information module initialized');
        },

        showInfoDialog() {
            if (this.isDialogOpen) return;

            this.isDialogOpen = true;

            const modal = document.createElement('div');
            modal.id = 'productInfoModal';
            modal.className = 'modal';
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
                    padding: 0;
                    max-width: 900px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease;
                    display: flex;
                    flex-direction: column;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        padding: 30px;
                        color: white;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                    ">
                        <div>
                            <h2 style="
                                font-size: 28px;
                                margin: 0 0 8px 0;
                                font-weight: 600;
                            ">Product Information</h2>
                            <p style="
                                margin: 0;
                                opacity: 0.9;
                                font-size: 15px;
                            ">Terms & Conditions and About Principle 5</p>
                        </div>
                        <button onclick="CoopMaps.modules.productInfo.closeInfoDialog()" style="
                            background: rgba(255, 255, 255, 0.2);
                            border: none;
                            width: 44px;
                            height: 44px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            color: white;
                            font-size: 28px;
                        "
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'; this.style.transform='scale(1.1)';"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.transform='scale(1)';">
                            ×
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div style="
                        flex: 1;
                        display: flex;
                        overflow: hidden;
                    ">
                        <!-- Sidebar Navigation -->
                        <div style="
                            width: 240px;
                            background: #f8f9fa;
                            padding: 20px 0;
                            overflow-y: auto;
                            flex-shrink: 0;
                            border-right: 1px solid #e9ecef;
                        ">
                            ${this.renderInfoNavigation()}
                        </div>

                        <!-- Content -->
                        <div id="infoContent" style="
                            flex: 1;
                            padding: 40px;
                            overflow-y: auto;
                            background: white;
                        ">
                            ${this.renderSectionContent(this.currentSection)}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="
                        padding: 20px 30px;
                        background: #f8f9fa;
                        border-top: 1px solid #e9ecef;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                    ">
                        <div style="
                            font-size: 13px;
                            color: #7f8c8d;
                        ">
                            Co-opMaps v${CoopMaps.version} - © Principle 5 Yorkshire Co-operative Resource Centre
                        </div>
                        <a href="https://www.principle5.coop" target="_blank" style="
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.2);
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(231, 76, 60, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.2)';">
                            Visit principle5.coop
                        </a>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle escape key
            this.escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeInfoDialog();
                }
            };
            document.addEventListener('keydown', this.escapeHandler);

            // Handle click outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeInfoDialog();
                }
            });
        },

        closeInfoDialog() {
            const modal = document.getElementById('productInfoModal');
            if (modal) {
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modal.remove();
                    this.isDialogOpen = false;
                }, 300);
            }

            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
                this.escapeHandler = null;
            }
        },

        renderInfoNavigation() {
            const sections = [
                { id: 'terms', label: 'Terms & Conditions', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
                { id: 'about', label: 'About Principle 5', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-8h6v8"/></svg>' },
                { id: 'membership', label: 'Membership', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
                { id: 'contact', label: 'Contact', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' }
            ];

            return sections.map(section => `
                <div class="info-nav-item ${this.currentSection === section.id ? 'active' : ''}"
                     onclick="CoopMaps.modules.productInfo.switchSection('${section.id}')"
                     style="
                        padding: 12px 24px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: ${this.currentSection === section.id ? '#e74c3c' : '#7f8c8d'};
                        background: ${this.currentSection === section.id ? 'white' : 'transparent'};
                        border-left: 4px solid ${this.currentSection === section.id ? '#e74c3c' : 'transparent'};
                        font-weight: ${this.currentSection === section.id ? '600' : '500'};
                     "
                     onmouseover="if('${this.currentSection}' !== '${section.id}') { this.style.background='#ecf0f1'; this.style.color='#2c3e50'; }"
                     onmouseout="if('${this.currentSection}' !== '${section.id}') { this.style.background='transparent'; this.style.color='#7f8c8d'; }">
                    <span style="display: flex; align-items: center;">${section.icon}</span>
                    <span>${section.label}</span>
                </div>
            `).join('');
        },

        switchSection(section) {
            this.currentSection = section;

            const infoContent = document.getElementById('infoContent');
            if (infoContent) {
                infoContent.innerHTML = this.renderSectionContent(section);

                // Update navigation
                document.querySelectorAll('.info-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                const activeItem = document.querySelector(`.info-nav-item[onclick*="${section}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }
            }
        },

        renderSectionContent(section) {
            const content = {
                'terms': this.getTermsContent(),
                'about': this.getAboutContent(),
                'membership': this.getMembershipContent(),
                'contact': this.getContactContent()
            };

            return `<div class="info-content">${content[section] || 'Content not found'}</div>`;
        },

        getTermsContent() {
            return `
                <h3 style="color: #2c3e50; margin-bottom: 20px;">All Co-opMaps Products: Terms & Conditions of Use</h3>

                <ol style="line-height: 1.8; color: #546e7a;">
                    <li>These Terms & Conditions are derived directly from the Secondary Rules of the co-operative society Principle 5 Co-operative Resource Centre, which is the exclusive supplier of the Co-opMaps suite of products. The Secondary Rules are democratically determined by the members of the society.</li>

                    <li>In these Terms & Conditions, "Principle 5" means "Principle 5 Co-operative Resource Centre".</li>

                    <li>These Terms & Conditions apply to all Co-opMaps software modules, all sections of the Co-opMaps User Guide, and any associated documents or facilities specifically for use in conjunction with the Co-opMaps suite or with a Co-opMaps product.</li>

                    <li>Co-opMaps products cannot be purchased by anyone. Instead, they may be licensed for use by members of Principle 5, in the following way.</li>

                    <li>Some Co-opMaps products are available for viewing by any person, whether or not she/he is a member. Such products are accessed via links in the public area of www.principle5.coop.</li>

                    <li>Principle 5 has a range of member service levels: service level 1, service level 2, service level 3, and so on. Each level provides the services which are provided at all lower levels, plus a further range of products and/or services for that level.</li>

                    <li>Each service level has an ordinary subscription amount, which is the amount of money payable annually in order to remain a member and to access the products and/or services which are available at that service level. Each service level also has a solidarity subscription amount, which is higher than the ordinary amount, but is an entirely voluntary option.</li>

                    <li>A Principle 5 member who pays at least the ordinary subscription for a given service level (or more) is licensed to access and use the products and/or services provided at that level, and all of the products and/or services provided at all lower levels.</li>

                    <li>As long as such person or organisation continues to be paid-up at the required subscription level, they continue to be licensed to use the products and/or services for that level. Where applicable, this license includes the right to retain a copy of the product, in electronic form, for her/his own use, or potential use, and the right to retain one separately stored electronic back-up copy.</li>

                    <li>Member service levels and subscription amounts are specified in Schedule 1 of the Secondary Rules. Where the member is an organisation, Schedule 2 specifies a tariff for the maximum number of instances of Co-opMaps products which may be stored and/or used by persons working within that organisation.</li>

                    <li>Principle 5 may, from time to time, re-arrange and/or re-define its service levels, or change annual subscription amounts, which may result in changes in the right to use a Co-opMaps product. However, a member who is paid-up in advance at the product's service level remains entitled to use the product until the member ceases to be paid-up.</li>

                    <li>Co-opMaps products are upgraded from time to time, to provide enhancements and/or error corrections, through the issue of new versions. A member who is licensed to use a product and whose subscription remains paid-up at the product's service level will be able to access all upgrades at no further charge, except to cover any costs of supply (medium and/or delivery).</li>

                    <li>Each upgrade (ie. a change to a new version) of any Co-opMaps product will be made available on (or via) www.principle5.coop.</li>

                    <li>Where an upgrade of a Co-opMaps product becomes available less than 1 month before the member's paid-up period is due to end, Principle 5 may withhold the upgrade from that member pending renewal of the paid-up period.</li>

                    <li>A member who ceases to be paid-up at the service level of a Co-opMaps product immediately loses the right to use the product and loses the right to retain any copy of the product.</li>

                    <li>The right to use a Co-opMaps product is not transferable to any other person or organisation. It is against the Secondary Rules for any member of Principle 5 to transfer, pass, lend or sell any copy of a Co-opMaps product or component of a Co-opMaps product to any other person or organisation, whether or not that person or organisation is a member of Principle 5.</li>

                    <li>Principle 5 accepts no liability for any consequence of using a Co-opMaps product.</li>

                    <li>Like all software, Co-opMaps products may contain errors and/or inconsistencies. No form of compensation will be due from Principle 5 for any result of such error or inconsistency. Principle 5 will apply its best endeavours to include corrections in subsequent versions.</li>

                    <li>Principle 5 retains the right to temporarily or permanently withdraw any Co-opMaps product from availability, at any time.</li>

                    <li>These Terms & Conditions of Use are part of Principle 5's Secondary Rules. As such, they may be amended by Principle 5's Board of Directors at any time, but the amendment must be ratified at a General Meeting of Principle 5. In the event of a contradiction between the Secondary Rules and Principle 5's constitution, the constitution prevails.</li>

                    <li>If you do not agree to abide by these Terms & Conditions of Use, you are not entitled to use any Co-opMaps product, regardless of your member services level (if any).</li>
                </ol>
            `;
        },

        getAboutContent() {
            return `
                <h3 style="color: #2c3e50; margin-bottom: 20px;">About Principle 5 Yorkshire Co-operative Resource Centre</h3>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="font-size: 16px; line-height: 1.8; color: #546e7a; margin: 0;">
                        Principle 5 Yorkshire Co-operative Resource Centre is a co-operative society dedicated to supporting and promoting co-operative enterprises and the co-operative movement.
                    </p>
                </div>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">Our Mission</h4>
                <p style="line-height: 1.8; color: #546e7a;">
                    We provide resources, tools, and support to help co-operatives thrive. The Co-opMaps suite is one of our key offerings, designed to help visualize and understand co-operative ecosystems and relationships.
                </p>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">Co-operative Principles</h4>
                <p style="line-height: 1.8; color: #546e7a; margin-bottom: 15px;">
                    Our name reflects the 5th Co-operative Principle: Education, Training and Information. We believe in:
                </p>
                <ul style="line-height: 1.8; color: #546e7a;">
                    <li>Providing education and training for members</li>
                    <li>Informing the general public about the nature and benefits of co-operation</li>
                    <li>Supporting co-operative development through knowledge sharing</li>
                    <li>Building tools that help co-operatives work together more effectively</li>
                </ul>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">The Co-opMaps Project</h4>
                <p style="line-height: 1.8; color: #546e7a;">
                    Co-opMaps was developed to address the need for better visualization tools in the co-operative sector. It allows users to:
                </p>
                <ul style="line-height: 1.8; color: #546e7a;">
                    <li>Map relationships between different types of enterprises</li>
                    <li>Visualize co-operative ecosystems</li>
                    <li>Understand governance and ownership structures</li>
                    <li>Document and share co-operative networks</li>
                </ul>
            `;
        },

        getMembershipContent() {
            return `
                <h3 style="color: #2c3e50; margin-bottom: 20px;">Membership Information</h3>

                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="font-size: 16px; color: #1565c0; margin: 0; font-weight: 600;">
                        Join Principle 5 to access the full Co-opMaps suite and support co-operative development!
                    </p>
                </div>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">Service Levels</h4>
                <p style="line-height: 1.8; color: #546e7a;">
                    Principle 5 offers different membership service levels, each providing access to various products and services:
                </p>

                <div style="display: grid; gap: 15px; margin-top: 20px;">
                    <div style="padding: 20px; background: white; border: 2px solid #e9ecef; border-radius: 8px;">
                        <h5 style="color: #2c3e50; margin: 0 0 10px 0;">Service Level 1</h5>
                        <p style="color: #7f8c8d; margin: 0;">Basic membership with access to essential resources</p>
                    </div>

                    <div style="padding: 20px; background: white; border: 2px solid #e9ecef; border-radius: 8px;">
                        <h5 style="color: #2c3e50; margin: 0 0 10px 0;">Service Level 2</h5>
                        <p style="color: #7f8c8d; margin: 0;">Enhanced access including Co-opMaps basic features</p>
                    </div>

                    <div style="padding: 20px; background: white; border: 2px solid #e9ecef; border-radius: 8px;">
                        <h5 style="color: #2c3e50; margin: 0 0 10px 0;">Service Level 3+</h5>
                        <p style="color: #7f8c8d; margin: 0;">Full access to all Co-opMaps features and priority support</p>
                    </div>
                </div>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">Subscription Options</h4>
                <ul style="line-height: 1.8; color: #546e7a;">
                    <li><strong>Ordinary Subscription:</strong> Standard annual membership fee for your chosen service level</li>
                    <li><strong>Solidarity Subscription:</strong> Optional higher contribution to support our work</li>
                </ul>

                <p style="line-height: 1.8; color: #546e7a; margin-top: 20px;">
                    For current subscription rates and to join, please visit <a href="https://www.principle5.coop" target="_blank" style="color: #3498db;">www.principle5.coop</a>
                </p>
            `;
        },

        getContactContent() {
            return `
                <h3 style="color: #2c3e50; margin-bottom: 20px;">Contact Information</h3>

                <div style="background: white; padding: 30px; border: 2px solid #e9ecef; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="color: #34495e; margin: 0 0 20px 0;">Principle 5 Yorkshire Co-operative Resource Centre</h4>

                    <div style="display: grid; gap: 20px;">
                        <div>
                            <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Website</strong>
                            <a href="https://www.principle5.coop" target="_blank" style="color: #3498db; text-decoration: none;">www.principle5.coop</a>
                        </div>

                        <div>
                            <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Location</strong>
                            <span style="color: #7f8c8d;">Yorkshire, United Kingdom</span>
                        </div>
                    </div>
                </div>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">Get Support</h4>
                <p style="line-height: 1.8; color: #546e7a;">
                    For technical support with Co-opMaps or membership enquiries, please visit our website or contact us through the member portal.
                </p>

                <h4 style="color: #34495e; margin-top: 30px; margin-bottom: 15px;">Report Issues</h4>
                <p style="line-height: 1.8; color: #546e7a;">
                    If you encounter any bugs or have suggestions for improving Co-opMaps, please report them through the member area on our website. We value your feedback and use it to improve our products.
                </p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                    <p style="color: #546e7a; margin: 0; text-align: center; font-style: italic;">
                        "Co-operation among co-operatives" - Working together to strengthen the co-operative movement
                    </p>
                </div>
            `;
        },

        // Render method for sidebar view (optional)
        render() {
            return `
                <div style="animation: fadeIn 0.3s ease;">
                    <div style="
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        padding: 20px;
                        margin: -25px -25px 25px -25px;
                        border-radius: 0 0 16px 16px;
                        color: white;
                        box-shadow: 0 4px 12px rgba(231, 76, 60, 0.2);
                    ">
                        <h3 style="
                            font-size: 20px;
                            margin: 0 0 8px 0;
                            font-weight: 600;
                        ">Product Information</h3>
                        <p style="
                            margin: 0;
                            opacity: 0.9;
                            font-size: 14px;
                        ">Terms, conditions and about Principle 5</p>
                    </div>

                    <div style="
                        background: white;
                        padding: 25px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                        margin-bottom: 20px;
                    ">
                        <p style="color: #546e7a; line-height: 1.6; margin-bottom: 20px;">
                            Co-opMaps is exclusively provided by Principle 5 Yorkshire Co-operative Resource Centre.
                            Access and usage are subject to membership and terms of use.
                        </p>

                        <button onclick="CoopMaps.modules.productInfo.showInfoDialog()" style="
                            width: 100%;
                            padding: 16px;
                            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.2);
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(231, 76, 60, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.2)';">
                            View Full Terms & Information
                        </button>
                    </div>

                    <div style="
                        text-align: center;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    ">
                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='18' fill='%23e74c3c' /%3E%3Ctext x='20' y='26' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3E5%3C/text%3E%3C/svg%3E"
                             alt="Principle 5 Logo"
                             style="width: 60px; height: 60px; margin-bottom: 15px;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0;">Principle 5</h4>
                        <p style="color: #7f8c8d; font-size: 13px; margin: 0;">
                            Yorkshire Co-operative Resource Centre
                        </p>
                    </div>
                </div>
            `;
        }
    });

    console.log('productInfo.module.js loaded successfully');
})();
