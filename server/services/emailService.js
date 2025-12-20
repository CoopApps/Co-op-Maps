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

module.exports = {
    initializeEmailService,
    queueEmail,
    sendImmediateEmail,
    processEmailQueue,
    renderEmailTemplate
};
