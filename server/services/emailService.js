const nodemailer = require('nodemailer');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

// Email transporter
let transporter = null;

/**
 * Initialize email transporter
 */
function initializeEmailService() {
    if (!process.env.SMTP_HOST) {
        logger.warn('SMTP not configured, email functionality disabled');
        return null;
    }

    transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    logger.info('Email service initialized');
    return transporter;
}

/**
 * Queue an email for sending
 */
async function queueEmail({
    to,
    toUserId = null,
    subject,
    bodyText,
    bodyHtml = null,
    templateName = null,
    templateData = null,
    priority = 5
}) {
    try {
        const result = await query(
            `INSERT INTO email_queue (
                to_email, to_user_id, subject, body_text, body_html,
                template_name, template_data, priority
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [to, toUserId, subject, bodyText, bodyHtml, templateName, JSON.stringify(templateData), priority]
        );

        logger.info(`Email queued: ${subject} to ${to}`);
        return result.rows[0].id;
    } catch (error) {
        logger.error('Failed to queue email:', error);
        throw error;
    }
}

/**
 * Process email queue
 */
async function processEmailQueue() {
    if (!transporter) {
        return;
    }

    try {
        // Get pending emails
        const result = await query(
            `SELECT * FROM email_queue
             WHERE status = 'pending'
               AND scheduled_for <= CURRENT_TIMESTAMP
               AND attempts < max_attempts
             ORDER BY priority ASC, created_at ASC
             LIMIT 10`
        );

        for (const email of result.rows) {
            await sendQueuedEmail(email);
        }
    } catch (error) {
        logger.error('Error processing email queue:', error);
    }
}

/**
 * Send a queued email
 */
async function sendQueuedEmail(emailRecord) {
    try {
        // Mark as sending
        await query(
            'UPDATE email_queue SET status = $1, attempts = attempts + 1 WHERE id = $2',
            ['sending', emailRecord.id]
        );

        // Render template if provided
        let htmlBody = emailRecord.body_html;
        let textBody = emailRecord.body_text;

        if (emailRecord.template_name && emailRecord.template_data) {
            const rendered = renderEmailTemplate(
                emailRecord.template_name,
                emailRecord.template_data
            );
            htmlBody = rendered.html;
            textBody = rendered.text;
        }

        // Send email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Co-opMaps <noreply@coopmaps.org>',
            to: emailRecord.to_email,
            subject: emailRecord.subject,
            text: textBody,
            html: htmlBody
        });

        // Mark as sent
        await query(
            'UPDATE email_queue SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sent', emailRecord.id]
        );

        logger.info(`Email sent: ${emailRecord.subject} to ${emailRecord.to_email}`);
        return info;
    } catch (error) {
        logger.error(`Failed to send email ${emailRecord.id}:`, error);

        // Mark as failed if max attempts reached
        const newStatus = emailRecord.attempts + 1 >= emailRecord.max_attempts ? 'failed' : 'pending';

        await query(
            `UPDATE email_queue
             SET status = $1, error_message = $2, failed_at = CASE WHEN $1 = 'failed' THEN CURRENT_TIMESTAMP ELSE NULL END
             WHERE id = $3`,
            [newStatus, error.message, emailRecord.id]
        );
    }
}

/**
 * Email templates
 */
function renderEmailTemplate(templateName, data) {
    const templates = {
        'password-reset': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Hello ${data.fullName || 'there'},</p>
                    <p>You requested to reset your password for Co-opMaps. Click the button below to reset it:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${data.resetLink}" style="background: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </p>
                    <p>This link will expire in ${data.expiryHours || 24} hours.</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">Co-opMaps - Cooperative Ecosystem Mapping</p>
                </div>
            `,
            text: `Password Reset Request

Hello ${data.fullName || 'there'},

You requested to reset your password for Co-opMaps. Visit this link to reset it:

${data.resetLink}

This link will expire in ${data.expiryHours || 24} hours.

If you didn't request this, you can safely ignore this email.

---
Co-opMaps - Cooperative Ecosystem Mapping`
        },

        'collaboration-invite': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>You've been invited to collaborate!</h2>
                    <p>Hello ${data.inviteeName},</p>
                    <p><strong>${data.inviterName}</strong> has invited you to collaborate on the diagram:</p>
                    <p style="font-size: 18px; margin: 20px 0;"><strong>"${data.diagramTitle}"</strong></p>
                    <p>Permission level: <strong>${data.permission}</strong></p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${data.diagramLink}" style="background: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Diagram
                        </a>
                    </p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">Co-opMaps - Cooperative Ecosystem Mapping</p>
                </div>
            `,
            text: `You've been invited to collaborate!

Hello ${data.inviteeName},

${data.inviterName} has invited you to collaborate on the diagram:

"${data.diagramTitle}"

Permission level: ${data.permission}

View it here: ${data.diagramLink}

---
Co-opMaps - Cooperative Ecosystem Mapping`
        },

        'comment-notification': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>New Comment on "${data.diagramTitle}"</h2>
                    <p>Hello ${data.recipientName},</p>
                    <p><strong>${data.commenterName}</strong> commented on your diagram:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0;">
                        ${data.commentContent}
                    </div>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${data.commentLink}" style="background: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Comment
                        </a>
                    </p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">Co-opMaps - Cooperative Ecosystem Mapping</p>
                </div>
            `,
            text: `New Comment on "${data.diagramTitle}"

Hello ${data.recipientName},

${data.commenterName} commented on your diagram:

"${data.commentContent}"

View it here: ${data.commentLink}

---
Co-opMaps - Cooperative Ecosystem Mapping`
        },

        'mention-notification': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>You were mentioned in a comment</h2>
                    <p>Hello ${data.mentionedName},</p>
                    <p><strong>${data.mentionerName}</strong> mentioned you in a comment on "${data.diagramTitle}":</p>
                    <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0;">
                        ${data.commentContent}
                    </div>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${data.commentLink}" style="background: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Comment
                        </a>
                    </p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">Co-opMaps - Cooperative Ecosystem Mapping</p>
                </div>
            `,
            text: `You were mentioned in a comment

Hello ${data.mentionedName},

${data.mentionerName} mentioned you in a comment on "${data.diagramTitle}":

"${data.commentContent}"

View it here: ${data.commentLink}

---
Co-opMaps - Cooperative Ecosystem Mapping`
        },

        'digest': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Your Co-opMaps Digest</h2>
                    <p>Hello ${data.userName},</p>
                    <p>Here's what happened since your last visit:</p>

                    ${data.newShares > 0 ? `<p>📊 <strong>${data.newShares}</strong> new diagrams shared with you</p>` : ''}
                    ${data.newComments > 0 ? `<p>💬 <strong>${data.newComments}</strong> new comments</p>` : ''}
                    ${data.newMentions > 0 ? `<p>@️ <strong>${data.newMentions}</strong> new mentions</p>` : ''}
                    ${data.newCollaborators > 0 ? `<p>👥 <strong>${data.newCollaborators}</strong> new collaborators</p>` : ''}

                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${data.dashboardLink}" style="background: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Dashboard
                        </a>
                    </p>
                    <p style="color: #666; font-size: 12px;">
                        To change email preferences, visit your <a href="${data.settingsLink}">account settings</a>.
                    </p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">Co-opMaps - Cooperative Ecosystem Mapping</p>
                </div>
            `,
            text: `Your Co-opMaps Digest

Hello ${data.userName},

Here's what happened since your last visit:

${data.newShares > 0 ? `📊 ${data.newShares} new diagrams shared with you\n` : ''}${data.newComments > 0 ? `💬 ${data.newComments} new comments\n` : ''}${data.newMentions > 0 ? `@ ${data.newMentions} new mentions\n` : ''}${data.newCollaborators > 0 ? `👥 ${data.newCollaborators} new collaborators\n` : ''}

View your dashboard: ${data.dashboardLink}

To change email preferences, visit: ${data.settingsLink}

---
Co-opMaps - Cooperative Ecosystem Mapping`
        },

        // Community Map Templates (password-based, no user accounts)
        'map-approved': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Map Approved!</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.author},</p>
                        <p>Great news! Your map <strong>"${data.title}"</strong> has been reviewed and approved.</p>
                        <p>Your map is now publicly visible in the Community Gallery and can be explored by anyone.</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${data.browseUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                View in Gallery
                            </a>
                        </p>
                        <p>You can still edit your map at any time using the password you set when submitting.</p>
                        <p>Thank you for contributing to the Co-op Maps community!</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Map Approved!

Hello ${data.author},

Great news! Your map "${data.title}" has been reviewed and approved.

Your map is now publicly visible in the Community Gallery and can be explored by anyone.

View in Gallery: ${data.browseUrl}

You can still edit your map at any time using the password you set when submitting.

Thank you for contributing to the Co-op Maps community!

---
Co-op Maps - Mapping cooperative ecosystems together`
        },

        'map-rejected': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Map Not Published</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.author},</p>
                        <p>We've reviewed your map <strong>"${data.title}"</strong> and unfortunately we're unable to publish it at this time.</p>
                        <div style="background: white; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
                            <strong>Reason:</strong> ${data.reason}<br><br>
                            <strong>Details:</strong> ${data.message}
                        </div>
                        <p>If you believe this was in error or have questions, please feel free to submit a new map with the suggested changes.</p>
                        <p>Thank you for your understanding.</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Map Not Published

Hello ${data.author},

We've reviewed your map "${data.title}" and unfortunately we're unable to publish it at this time.

Reason: ${data.reason}

Details: ${data.message}

If you believe this was in error or have questions, please feel free to submit a new map with the suggested changes.

Thank you for your understanding.

---
Co-op Maps - Mapping cooperative ecosystems together`
        },

        'map-changes-requested': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Changes Requested</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.author},</p>
                        <p>We've reviewed your map <strong>"${data.title}"</strong> and would like to request some changes before publishing.</p>
                        <div style="background: white; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0;">
                            <strong>Reviewer's Message:</strong><br>
                            ${data.message}
                        </div>
                        ${data.checklist && data.checklist.length > 0 ? `
                        <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 8px;">
                            <strong>Requested Changes:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                ${data.checklist.map(item => `<li style="margin: 8px 0;">${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        <p>Please edit your map using the password you set, then the map will be resubmitted for review.</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${data.editUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                Edit Your Map
                            </a>
                        </p>
                        <p>Thank you for contributing to the Co-op Maps community!</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Changes Requested

Hello ${data.author},

We've reviewed your map "${data.title}" and would like to request some changes before publishing.

Reviewer's Message:
${data.message}

${data.checklist && data.checklist.length > 0 ? `Requested Changes:\n${data.checklist.map(item => `- ${item}`).join('\n')}\n` : ''}
Please edit your map using the password you set, then the map will be resubmitted for review.

Edit your map: ${data.editUrl}

Thank you for contributing to the Co-op Maps community!

---
Co-op Maps - Mapping cooperative ecosystems together`
        },

        'map-unpublished': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Map Unpublished</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.author},</p>
                        <p>Your map <strong>"${data.title}"</strong> has been temporarily unpublished from the Community Gallery.</p>
                        <div style="background: white; border-left: 4px solid #95a5a6; padding: 15px; margin: 20px 0;">
                            <strong>Reason:</strong> ${data.reason}
                        </div>
                        <p>Your map data is still saved and you can still access it using your password. If you'd like to have it republished, please make any necessary updates.</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Map Unpublished

Hello ${data.author},

Your map "${data.title}" has been temporarily unpublished from the Community Gallery.

Reason: ${data.reason}

Your map data is still saved and you can still access it using your password.

---
Co-op Maps - Mapping cooperative ecosystems together`
        },

        'map-submission-received': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Submission Received!</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.author},</p>
                        <p>Thank you for submitting your map <strong>"${data.title}"</strong> to the Co-op Maps Community Gallery!</p>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #667eea;">What happens next?</h3>
                            <ul>
                                <li>Our team will review your submission</li>
                                <li>This usually takes 1-3 business days</li>
                                <li>You'll receive an email when your map is approved or if we need any changes</li>
                            </ul>
                        </div>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #667eea;">Your Map ID</h3>
                            <p style="font-family: monospace; font-size: 14px; background: #f1f1f1; padding: 10px; border-radius: 4px;">${data.mapId}</p>
                            <p style="font-size: 12px; color: #7f8c8d;">Keep this ID along with your password to edit your map.</p>
                        </div>
                        <p>Thank you for contributing to the cooperative mapping community!</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Submission Received!

Hello ${data.author},

Thank you for submitting your map "${data.title}" to the Co-op Maps Community Gallery!

What happens next?
- Our team will review your submission
- This usually takes 1-3 business days
- You'll receive an email when your map is approved or if we need any changes

Your Map ID: ${data.mapId}
Keep this ID along with your password to edit your map.

Thank you for contributing to the cooperative mapping community!

---
Co-op Maps - Mapping cooperative ecosystems together`
        },

        'password-reset-confirmation': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Password Reset Successful</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.fullName},</p>
                        <p>Your password has been successfully reset.</p>
                        <p>You can now log in to Co-opMaps using your new password.</p>
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                            <strong>Security Notice:</strong> If you didn't make this change, please contact us immediately at ${process.env.ADMIN_EMAIL || 'admin@principle5.coop'}.
                        </div>
                        <p>All your existing sessions have been logged out for security.</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Password Reset Successful

Hello ${data.fullName},

Your password has been successfully reset.

You can now log in to Co-opMaps using your new password.

SECURITY NOTICE: If you didn't make this change, please contact us immediately at ${process.env.ADMIN_EMAIL || 'admin@principle5.coop'}.

All your existing sessions have been logged out for security.

---
Co-op Maps - Mapping cooperative ecosystems together`
        },

        'admin-contact': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Contact Form Submission</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h3 style="margin-top: 0;">New message from Co-opMaps user</h3>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>From:</strong> ${data.name} (${data.email})</p>
                            <p><strong>Subject:</strong> ${data.subject}</p>
                            <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                        </div>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin-top: 0;">Message:</h4>
                            <p style="white-space: pre-wrap;">${data.message}</p>
                        </div>
                        <p style="font-size: 12px; color: #7f8c8d;">
                            To reply, send an email to: <a href="mailto:${data.email}">${data.email}</a>
                        </p>
                    </div>
                </div>
            `,
            text: `Contact Form Submission

New message from Co-opMaps user

From: ${data.name} (${data.email})
Subject: ${data.subject}
Time: ${new Date(data.timestamp).toLocaleString()}

Message:
${data.message}

---
To reply, send an email to: ${data.email}`
        },

        'contact-confirmation': {
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Message Received</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>Hello ${data.name},</p>
                        <p>Thank you for contacting us! We've received your message about:</p>
                        <div style="background: white; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
                            <strong>${data.subject}</strong>
                        </div>
                        <p>Our admin team will review your message and get back to you as soon as possible, typically within 1-2 business days.</p>
                        <p>If your issue is urgent, you can also reach us at ${process.env.ADMIN_EMAIL || 'admin@principle5.coop'}.</p>
                    </div>
                    <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                        Co-op Maps - Mapping cooperative ecosystems together
                    </p>
                </div>
            `,
            text: `Message Received

Hello ${data.name},

Thank you for contacting us! We've received your message about:

"${data.subject}"

Our admin team will review your message and get back to you as soon as possible, typically within 1-2 business days.

If your issue is urgent, you can also reach us at ${process.env.ADMIN_EMAIL || 'admin@principle5.coop'}.

---
Co-op Maps - Mapping cooperative ecosystems together`
        }
    };

    const template = templates[templateName];
    if (!template) {
        throw new Error(`Email template not found: ${templateName}`);
    }

    return {
        html: template.html,
        text: template.text
    };
}

/**
 * Send immediate email (bypass queue)
 */
async function sendImmediateEmail({ to, subject, bodyText, bodyHtml }) {
    if (!transporter) {
        logger.warn('Email service not configured, cannot send email');
        return false;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Co-opMaps <noreply@coopmaps.org>',
            to,
            subject,
            text: bodyText,
            html: bodyHtml
        });

        logger.info(`Immediate email sent: ${subject} to ${to}`);
        return true;
    } catch (error) {
        logger.error('Failed to send immediate email:', error);
        return false;
    }
}

// Start email queue processor (every minute)
setInterval(processEmailQueue, 60000);

/**
 * Helper functions for community map emails (no user accounts required)
 */
const APP_URL = process.env.APP_URL || 'https://co-op-maps-production.up.railway.app';

async function sendMapApprovedEmail(map) {
    if (!map.author_email) {
        logger.warn(`Cannot send approval email - no email for map ${map.id}`);
        return false;
    }

    const templateData = {
        author: map.author,
        title: map.title,
        browseUrl: `${APP_URL}/browse.html`
    };

    const rendered = renderEmailTemplate('map-approved', templateData);

    return queueEmail({
        to: map.author_email,
        subject: `Your map "${map.title}" has been approved!`,
        bodyText: rendered.text,
        bodyHtml: rendered.html,
        priority: 1
    });
}

async function sendMapRejectedEmail(map, reason, message) {
    if (!map.author_email) {
        logger.warn(`Cannot send rejection email - no email for map ${map.id}`);
        return false;
    }

    const templateData = {
        author: map.author,
        title: map.title,
        reason: reason,
        message: message
    };

    const rendered = renderEmailTemplate('map-rejected', templateData);

    return queueEmail({
        to: map.author_email,
        subject: `Update on your map "${map.title}"`,
        bodyText: rendered.text,
        bodyHtml: rendered.html,
        priority: 1
    });
}

async function sendMapChangesRequestedEmail(map, message, checklist) {
    if (!map.author_email) {
        logger.warn(`Cannot send changes requested email - no email for map ${map.id}`);
        return false;
    }

    const templateData = {
        author: map.author,
        title: map.title,
        message: message,
        checklist: checklist || [],
        editUrl: `${APP_URL}/deluxe.html?map=${map.id}`
    };

    const rendered = renderEmailTemplate('map-changes-requested', templateData);

    return queueEmail({
        to: map.author_email,
        subject: `Changes requested for your map "${map.title}"`,
        bodyText: rendered.text,
        bodyHtml: rendered.html,
        priority: 1
    });
}

async function sendMapUnpublishedEmail(map, reason) {
    if (!map.author_email) {
        logger.warn(`Cannot send unpublished email - no email for map ${map.id}`);
        return false;
    }

    const templateData = {
        author: map.author,
        title: map.title,
        reason: reason
    };

    const rendered = renderEmailTemplate('map-unpublished', templateData);

    return queueEmail({
        to: map.author_email,
        subject: `Your map "${map.title}" has been unpublished`,
        bodyText: rendered.text,
        bodyHtml: rendered.html,
        priority: 2
    });
}

async function sendMapSubmissionReceivedEmail(map) {
    if (!map.author_email) {
        logger.warn(`Cannot send submission received email - no email for map ${map.id}`);
        return false;
    }

    const templateData = {
        author: map.author,
        title: map.title,
        mapId: map.id
    };

    const rendered = renderEmailTemplate('map-submission-received', templateData);

    return queueEmail({
        to: map.author_email,
        subject: `Your map "${map.title}" has been submitted for review`,
        bodyText: rendered.text,
        bodyHtml: rendered.html,
        priority: 1
    });
}

module.exports = {
    initializeEmailService,
    queueEmail,
    sendImmediateEmail,
    processEmailQueue,
    renderEmailTemplate,
    // Community map email helpers
    sendMapApprovedEmail,
    sendMapRejectedEmail,
    sendMapChangesRequestedEmail,
    sendMapUnpublishedEmail,
    sendMapSubmissionReceivedEmail
};
