import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'node:path';
import _ from 'lodash';
import logger from './logger.js';
import dirname from '#root/dirname.js';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '465', 10),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    return _transporter;
}

function loadTemplate(templateName: string, variables: Record<string, unknown>): string {
    const emailsDir = path.resolve(dirname, 'emails');

    const stylesPath = path.join(emailsDir, '_styles.css');
    const styles = fs.existsSync(stylesPath)
        ? fs.readFileSync(stylesPath, 'utf-8')
        : '';

    const basePath = path.join(emailsDir, '_template.html');
    const baseTemplate = fs.existsSync(basePath)
        ? fs.readFileSync(basePath, 'utf-8')
        : '{{content}}';

    const templatePath = path.join(emailsDir, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templateName}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    const compiledContent = _.template(templateContent)(variables);
    const fullHtml = baseTemplate
        .replace('{{styles}}', styles)
        .replace('{{content}}', compiledContent);

    return fullHtml;
}

export function isEmailConfigured(): boolean {
    return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

export async function sendEmail(
    to: string,
    subject: string,
    templateName: string,
    variables: Record<string, unknown>
): Promise<void> {
    try {
        const html = loadTemplate(templateName, variables);

        await getTransporter().sendMail({
            from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_FROM}>`,
            replyTo: process.env.EMAIL_REPLY_TO,
            to,
            subject,
            html
        });

        logger.info('Email sent', { to, subject, template: templateName });
    } catch (error) {
        logger.error('Failed to send email', {
            error: error instanceof Error ? error.message : String(error),
            to,
            subject,
            template: templateName
        });
        throw error;
    }
}
