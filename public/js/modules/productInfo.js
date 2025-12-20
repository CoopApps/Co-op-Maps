/**
 * Co-opMaps - Product Info Module
 * Displays product information, terms, and conditions
 */

(function() {
    'use strict';

    const productInfo = {
        init() {
            console.log('Product Info module initialized');
        },

        showInfoDialog() {
            const html = `
                <div class="modal" id="productInfoModal" style="display: flex;">
                    <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                        <h2 style="margin-bottom: 20px;">Co-opMaps v0.92</h2>

                        <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">🗺️</div>
                            <h3 style="font-size: 24px; margin-bottom: 8px;">Cooperative Ecosystem Mapping Tool</h3>
                            <p style="opacity: 0.9;">By Principle 5 - Cooperation Among Cooperatives</p>
                        </div>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">About Co-opMaps</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            Co-opMaps is a specialized tool designed to help cooperatives, solidarity economy
                            organizations, and community groups visualize and understand their economic ecosystems.
                            It enables users to map relationships between different types of enterprises and
                            identify opportunities for collaboration and mutual support.
                        </p>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Key Features</h3>
                        <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                            <li>Map six types of enterprises: Cooperatives, Mutual Aid, Public Sector, Private Sector, Civil Society, and Households</li>
                            <li>Create relationships showing flows of Goods/Services (G), Finance (F), Knowledge (K), or Mixed (M)</li>
                            <li>Customize appearance with colors, shapes, and layouts</li>
                            <li>Export to PNG, PDF, SVG, or JSON formats</li>
                            <li>Save and load diagrams locally in your browser</li>
                            <li>Generate symbol keys for presentations</li>
                            <li>Works offline - no server required for basic functionality</li>
                        </ul>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Version Information</h3>
                        <table style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid var(--light-gray);">
                                <td style="padding: 8px; font-weight: 600;">Version:</td>
                                <td style="padding: 8px;">0.92 (Deluxe)</td>
                            </tr>
                            <tr style="border-bottom: 1px solid var(--light-gray);">
                                <td style="padding: 8px; font-weight: 600;">Release Date:</td>
                                <td style="padding: 8px;">January 2025</td>
                            </tr>
                            <tr style="border-bottom: 1px solid var(--light-gray);">
                                <td style="padding: 8px; font-weight: 600;">License:</td>
                                <td style="padding: 8px;">Open Source (MIT)</td>
                            </tr>
                            <tr style="border-bottom: 1px solid var(--light-gray);">
                                <td style="padding: 8px; font-weight: 600;">Browser Support:</td>
                                <td style="padding: 8px;">Chrome 80+, Firefox 75+, Safari 13+, Edge 80+</td>
                            </tr>
                        </table>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Privacy & Data</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            Co-opMaps respects your privacy:
                        </p>
                        <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Local Storage:</strong> All diagrams are stored in your browser's local storage by default</li>
                            <li><strong>No Tracking:</strong> We do not track your usage or collect analytics</li>
                            <li><strong>No Account Required:</strong> Use the tool anonymously without creating an account</li>
                            <li><strong>Your Data is Yours:</strong> Export your work at any time in open formats</li>
                        </ul>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Terms of Use</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            By using Co-opMaps, you agree to the following terms:
                        </p>
                        <ol style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Free Use:</strong> This tool is provided free of charge for personal, educational, and commercial use</li>
                            <li><strong>No Warranty:</strong> The software is provided "as is" without warranty of any kind</li>
                            <li><strong>No Liability:</strong> The developers are not responsible for any loss of data or damages</li>
                            <li><strong>Attribution:</strong> Please credit "Co-opMaps by Principle 5" when sharing diagrams publicly</li>
                            <li><strong>Modifications:</strong> You may modify the software under the terms of the MIT license</li>
                        </ol>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Credits & Acknowledgments</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            Co-opMaps is developed by <strong>Principle 5</strong>, a cooperative dedicated to
                            promoting cooperation among cooperatives. Special thanks to:
                        </p>
                        <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                            <li>The solidarity economy movement for inspiration</li>
                            <li>Beta testers from cooperative organizations worldwide</li>
                            <li>Open source libraries: jsPDF for PDF generation</li>
                            <li>All contributors to the Co-opMaps project</li>
                        </ul>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Support & Feedback</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            We welcome your feedback and suggestions!
                        </p>
                        <ul style="margin-bottom: 16px; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Email:</strong> support@principle5.coop</li>
                            <li><strong>Website:</strong> https://www.principle5.coop/coopmaps</li>
                            <li><strong>GitHub:</strong> https://github.com/principle5/coopmaps</li>
                            <li><strong>Issues:</strong> Report bugs on our GitHub issue tracker</li>
                        </ul>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Cooperative Principles</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            This tool embodies the <strong>Fifth Cooperative Principle</strong>:
                        </p>
                        <div style="background: var(--light-gray); padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                            <p style="font-style: italic; line-height: 1.6;">
                                "Cooperatives serve their members most effectively and strengthen the cooperative
                                movement by working together through local, national, regional and international
                                structures."
                            </p>
                        </div>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            By mapping cooperative ecosystems, we can identify opportunities for collaboration,
                            mutual support, and collective impact.
                        </p>

                        <h3 style="margin: 24px 0 12px; color: var(--dark);">Future Development</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">
                            Planned features for future releases:
                        </p>
                        <ul style="margin-bottom: 24px; line-height: 1.8; padding-left: 20px;">
                            <li>Cloud storage and real-time collaboration</li>
                            <li>Advanced analytics and metrics</li>
                            <li>Integration with mapping APIs for geographic visualization</li>
                            <li>Template library for common cooperative structures</li>
                            <li>Multi-language support</li>
                            <li>Mobile app versions</li>
                        </ul>

                        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-dark) 100%); color: white; border-radius: 12px; margin-bottom: 24px;">
                            <p style="font-size: 18px; margin-bottom: 8px;">✊ Solidarity Economy</p>
                            <p style="opacity: 0.9;">Building a more cooperative future, one map at a time</p>
                        </div>

                        <button class="btn-primary" onclick="document.getElementById('productInfoModal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('productInfo', productInfo);
    }
})();
