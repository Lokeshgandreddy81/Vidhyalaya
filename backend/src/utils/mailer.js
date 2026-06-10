import nodemailer from 'nodemailer';
import logger from './logger.js';

// ── Priority: Resend → Custom SMTP → Ethereal dev sandbox ──
const RESEND_API_KEY   = process.env.RESEND_API_KEY?.trim() || '';
const SMTP_HOST        = process.env.SMTP_HOST?.trim() || '';
const SMTP_PORT        = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER        = process.env.SMTP_USER?.trim() || '';
const SMTP_PASSWORD    = process.env.SMTP_PASSWORD?.trim() || '';
const EMAIL_FROM       = process.env.EMAIL_FROM || '"Cortex" <onboarding@resend.dev>';

let transporter = null;
let isEthereal  = false;

async function getTransporter() {
  if (transporter) return transporter;

  // ── 1. Resend SMTP bridge (recommended for production) ──
  if (RESEND_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',          // always literally "resend"
        pass: RESEND_API_KEY,    // your Resend API key
      },
    });
    logger.info('📧 Mailer initialized: Resend SMTP bridge (smtp.resend.com:465)');
    return transporter;
  }

  // ── 2. Custom SMTP (Gmail App Password, SendGrid, etc.) ──
  if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      tls: { rejectUnauthorized: true },
    });
    logger.info(`📧 Mailer initialized: Custom SMTP ${SMTP_HOST}:${SMTP_PORT}`);
    return transporter;
  }

  // ── 3. Ethereal sandbox — dev only ──
  if (process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: No email provider configured in production! Email delivery will fail.');
    return null;
  }

  try {
    logger.info('📧 No email provider configured. Creating Ethereal sandbox for dev preview...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    isEthereal = true;
    logger.info(`📧 Ethereal Mailer ready: ${testAccount.user}`);
    return transporter;
  } catch (error) {
    logger.error({ err: error }, '📧 Ethereal init failed. Terminal log fallback active.');
    return null;
  }
}

/**
 * Send verification code email to student
 * 
 * @param {string} toEmail 
 * @param {string} code 
 * @returns {Promise<boolean>}
 */
export async function sendVerificationEmail(toEmail, verifyUrl) {
  const subject = `🚀 Welcome to Cortex! Verify your email address`;
  const textContent = `Welcome to Cortex!\n\nClick the link below to complete your registration and start your onboarding:\n${verifyUrl}\n\nThis link will expire in 15 minutes.\nIf you did not request this, please ignore this email.`;
  const htmlContent = `
    <div style="font-family: 'Inter', -apple-system, system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
      
      <!-- Brand Logo Header -->
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; color: #0f0b6b; letter-spacing: -0.025em; font-family: system-ui, sans-serif;">Cortex</span>
        <p style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; tracking-wider; margin: 4px 0 0 0;">Adaptive Learning Engine</p>
      </div>

      <!-- Welcome Message -->
      <h2 style="font-size: 20px; font-weight: 850; color: #0f172a; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.02em;">Welcome to Cortex! 🚀</h2>
      <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-top: 0; margin-bottom: 24px; text-align: justify;">
        We're thrilled to have you join our adaptive learning environment. Cortex transforms unstructured cognitive payloads (PDFs, YouTube videos, raw notes) into high-fidelity academic schemas and interactive roadmaps.
      </p>

      <!-- Magic Link Button -->
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #0f0b6b 0%, #1e1a8f 100%); color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 700; padding: 14px 32px; border-radius: 12px; letter-spacing: -0.01em; box-shadow: 0 4px 12px rgba(15, 11, 107, 0.15);">Verify Email Address</a>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 12px; margin-bottom: 0;">Valid for 15 minutes. Click the button to continue your onboarding.</p>
      </div>

      <!-- Onboarding Steps -->
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.05em;">Your Onboarding Checklist</h3>
        
        <div style="display: flex; align-items: start; margin-bottom: 10px;">
          <div style="font-size: 14px; color: #0f0b6b; font-weight: bold; margin-right: 8px;">✓</div>
          <div style="font-size: 13px; color: #475569; line-height: 1.4;"><strong>Verify Account:</strong> Confirm your email with the link above.</div>
        </div>
        
        <div style="display: flex; align-items: start; margin-bottom: 10px;">
          <div style="font-size: 14px; color: #94a3b8; font-weight: bold; margin-right: 8px;">☐</div>
          <div style="font-size: 13px; color: #475569; line-height: 1.4;"><strong>Setup Profile:</strong> Choose your scholastic role (Scholar, Architect, CEO) and cognitive pace.</div>
        </div>
        
        <div style="display: flex; align-items: start;">
          <div style="font-size: 14px; color: #94a3b8; font-weight: bold; margin-right: 8px;">☐</div>
          <div style="font-size: 13px; color: #475569; line-height: 1.4;"><strong>Start Learning:</strong> Let SARA build your first adaptive study path.</div>
        </div>
      </div>

      <!-- Footer Info -->
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        If you did not create a Cortex account, you can safely ignore this email.
      </p>
    </div>
  `;

  const activeTransporter = await getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: EMAIL_FROM,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      if (isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('\n' + '='.repeat(60));
        console.log('📧  CORTEX DEV MODE: ETHEREAL MAIL PREVIEW');
        console.log(`To:      ${toEmail}`);
        console.log(`Subject: Verify your email address`);
        console.log(`Link:    \x1b[4m\x1b[36m${verifyUrl}\x1b[0m`);
        console.log(`Preview: \x1b[4m\x1b[36m${previewUrl}\x1b[0m`);
        console.log('='.repeat(60) + '\n');
        logger.info(`📧 Ethereal mail sent. Preview URL: ${previewUrl}`);
      } else {
        logger.info(`📧 Verification email successfully sent via SMTP to: ${toEmail}`);
      }
      return true;
    } catch (error) {
      logger.error({ err: error }, `📧 Failed to send verification email via SMTP to ${toEmail}`);
      // Fallback in development so developers don't get stuck
      if (process.env.NODE_ENV !== 'production') {
        logToTerminalFallback(toEmail, verifyUrl);
        return true;
      }
      throw error;
    }
  } else {
    // Development console fallback
    logToTerminalFallback(toEmail, verifyUrl);
    return true;
  }
}

function logToTerminalFallback(toEmail, verifyUrl) {
  console.log('\n' + '='.repeat(60));
  console.log('📧  CORTEX DEV MODE EMAIL FALLBACK');
  console.log(`To:      ${toEmail}`);
  console.log(`Subject: Verify your email address`);
  console.log(`Link:    \x1b[4m\x1b[36m${verifyUrl}\x1b[0m`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Send password reset link email
 * 
 * @param {string} toEmail 
 * @param {string} resetUrl
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail(toEmail, resetUrl) {
  const subject = 'Reset your Cortex password';
  const textContent = `You requested a password reset for your Cortex account.\n\nClick the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email. Your password will remain unchanged.`;
  const htmlContent = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 800; color: #09054a; letter-spacing: -0.02em;">Cortex</span>
      </div>
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Reset your password</h2>
      <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
        We received a request to reset the password for your Cortex account. Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #09054a 0%, #1e1a8f 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; letter-spacing: -0.01em;">Reset Password</a>
      </div>
      <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.5; margin-bottom: 8px;">
        This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.
      </p>
      <p style="font-size: 11px; color: #cbd5e1; word-break: break-all;">Or copy and paste this URL: ${resetUrl}</p>
    </div>
  `;

  const activeTransporter = await getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: EMAIL_FROM,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      if (isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('\n' + '='.repeat(60));
        console.log('📧  CORTEX DEV MODE: PASSWORD RESET EMAIL');
        console.log(`To:      ${toEmail}`);
        console.log(`Reset:   \x1b[4m\x1b[36m${resetUrl}\x1b[0m`);
        console.log(`Preview: \x1b[4m\x1b[36m${previewUrl}\x1b[0m`);
        console.log('='.repeat(60) + '\n');
      } else {
        logger.info(`📧 Password reset email sent via SMTP to: ${toEmail}`);
      }
      return true;
    } catch (error) {
      logger.error({ err: error }, `📧 Failed to send reset email to ${toEmail}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n' + '='.repeat(60));
        console.log('📧  CORTEX DEV MODE: PASSWORD RESET FALLBACK');
        console.log(`To:      ${toEmail}`);
        console.log(`Reset:   \x1b[4m\x1b[36m${resetUrl}\x1b[0m`);
        console.log('='.repeat(60) + '\n');
        return true;
      }
      throw error;
    }
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('📧  CORTEX DEV MODE: PASSWORD RESET FALLBACK');
    console.log(`To:      ${toEmail}`);
    console.log(`Reset:   \x1b[4m\x1b[36m${resetUrl}\x1b[0m`);
    console.log('='.repeat(60) + '\n');
    return true;
  }
}
