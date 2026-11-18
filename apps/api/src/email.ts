import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from './logger.js';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SES_TO_EMAIL = process.env.SES_TO_EMAIL || 'abhaychavan346@gmail.com';

export function getSenderEmail(): string {
  const raw = process.env.SES_FROM_EMAIL || 'noreply@bevdamanus.in';
  if (raw.includes('<') && raw.includes('>')) {
    return raw;
  }
  return `Pulse ⚡ <${raw}>`;
}

const sesClient = new SESClient({ region: AWS_REGION });

export interface SendScoreEmailOptions {
  score: number;
  level: number;
  playerName?: string | undefined;
  recipientEmail?: string | undefined;
}

export interface EmailResult {
  sent: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}

/**
 * Builds a styled cyberpunk neon HTML email template for Pulse score reports.
 */
function buildHtmlTemplate(options: SendScoreEmailOptions): string {
  const { score, level, playerName } = options;
  const name = playerName || 'Player';
  const timestamp = new Date().toUTCString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pulse Score Report</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080a10;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .container {
      max-width: 560px;
      margin: 30px auto;
      background: #0f1422;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 240, 255, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #0d1326 0%, #1e1233 100%);
      padding: 30px 24px;
      text-align: center;
      border-bottom: 2px solid #00f0ff;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #00f0ff;
      text-transform: uppercase;
      margin: 0;
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
    }
    .tagline {
      color: #94a3b8;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .content {
      padding: 36px 28px;
    }
    .score-card {
      background: #090d16;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 20px 0;
    }
    .score-label {
      color: #ff007f;
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .score-value {
      font-size: 54px;
      font-weight: 900;
      color: #00f0ff;
      margin: 8px 0;
      letter-spacing: 2px;
      text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
    }
    .stats-grid {
      display: table;
      width: 100%;
      margin: 20px 0;
    }
    .stat-cell {
      display: table-cell;
      width: 50%;
      padding: 12px;
      text-align: center;
      background: #0d121f;
      border: 1px solid #1e293b;
      border-radius: 8px;
    }
    .stat-title {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .stat-num {
      font-size: 22px;
      font-weight: 700;
      color: #10b981;
      margin-top: 4px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px;
    }
    .cta-button {
      background: linear-gradient(90deg, #00f0ff 0%, #ff007f 100%);
      color: #080a10 !important;
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      display: inline-block;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding: 20px 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      background: #080c14;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">⚡ PULSE</h1>
      <div class="tagline">Neon Reflex & Sequence Verification</div>
    </div>
    <div class="content">
      <p style="margin: 0; color: #cbd5e1; font-size: 15px;">
        Session completed by <strong style="color: #ffffff;">${name}</strong>:
      </p>
      
      <div class="score-card">
        <div class="score-label">Final Score Achieved</div>
        <div class="score-value">${score.toLocaleString()}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-cell" style="margin-right: 6px;">
          <div class="stat-title">Level Reached</div>
          <div class="stat-num" style="color: #f59e0b;">Level ${level}</div>
        </div>
        <div class="stat-cell" style="margin-left: 6px;">
          <div class="stat-title">Status</div>
          <div class="stat-num" style="color: #10b981;">VERIFIED</div>
        </div>
      </div>

      <div class="cta-container">
        <a href="https://bevdamanus.in" class="cta-button" target="_blank">⚡ Play Again at bevdamanus.in</a>
      </div>
    </div>
    <div class="footer">
      <div>Dispatched via Amazon SES • Cloudflare Worker &amp; AWS Lambda arm64</div>
      <div style="margin-top: 4px;">Timestamp: ${timestamp}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Plain text fallback for email clients without HTML support.
 */
function buildTextBody(options: SendScoreEmailOptions): string {
  const { score, level, playerName } = options;
  return `⚡ PULSE - GAME SCORE REPORT
========================================
Player: ${playerName || 'Player'}
Final Score: ${score.toLocaleString()}
Level Reached: Level ${level}
Timestamp: ${new Date().toUTCString()}

Play again at: https://bevdamanus.in
========================================
Dispatched via Amazon SES on AWS Lambda`;
}

/**
 * Builds a styled cyberpunk neon HTML email template for Pulse OTP access codes.
 */
function buildOtpHtmlTemplate(email: string, otp: string): string {
  const timestamp = new Date().toUTCString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pulse Security Access Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080a10;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .container {
      max-width: 560px;
      margin: 30px auto;
      background: #0f1422;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 240, 255, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #0d1326 0%, #1e1233 100%);
      padding: 30px 24px;
      text-align: center;
      border-bottom: 2px solid #00f0ff;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #00f0ff;
      text-transform: uppercase;
      margin: 0;
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
    }
    .tagline {
      color: #94a3b8;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .content {
      padding: 36px 28px;
      text-align: center;
    }
    .otp-card {
      background: #090d16;
      border: 2px solid #00f0ff;
      border-radius: 12px;
      padding: 24px 16px;
      margin: 26px auto;
      display: inline-block;
      min-width: 260px;
      box-shadow: 0 0 24px rgba(0, 240, 255, 0.25);
    }
    .otp-value {
      font-size: 44px;
      font-weight: 900;
      color: #00f0ff;
      letter-spacing: 12px;
      font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
      margin: 0;
      text-indent: 12px;
      text-shadow: 0 0 16px rgba(0, 240, 255, 0.5);
    }
    .info-box {
      background: #131b2e;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 14px 18px;
      text-align: left;
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 20px 0 10px;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding: 20px 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      background: #080c14;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">⚡ PULSE</h1>
      <div class="tagline">Access Verification Code</div>
    </div>
    <div class="content">
      <p style="margin: 0 0 12px; color: #cbd5e1; font-size: 15px;">
        A single-use security access code was requested for:
      </p>
      <div style="font-weight: 700; color: #ffffff; font-size: 16px; margin-bottom: 20px;">
        ${email}
      </div>

      <div class="otp-card">
        <div class="otp-value">${otp}</div>
      </div>

      <p style="color: #94a3b8; font-size: 13px; margin: 12px 0 0;">
        Enter this code in Pulse to verify your profile and start recording your high scores.
      </p>

      <div class="info-box">
        <strong style="color: #f59e0b;">⏳ Note:</strong> This code is valid for <strong>10 minutes</strong>. Never share this code with anyone. Pulse personnel will never ask for your verification code.
      </div>
    </div>
    <div class="footer">
      <div>Dispatched via Amazon SES • noreply@bevdamanus.in</div>
      <div style="margin-top: 4px;">Timestamp: ${timestamp}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Plain text fallback for OTP email.
 */
function buildOtpTextBody(email: string, otp: string): string {
  return `⚡ PULSE - ACCESS VERIFICATION CODE
========================================
Player Account: ${email}
Your Single-Use Code: ${otp}

This code is valid for 10 minutes.
Enter this code in Pulse to verify your profile and start recording your scores.

If you did not request this code, you can safely ignore this email.
========================================
Dispatched via Amazon SES • noreply@bevdamanus.in`;
}

/**
 * Sends a 6-digit OTP verification email via AWS SES.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<EmailResult> {
  const sender = getSenderEmail();
  const subject = `⚡ Your Pulse Verification Code: ${otp}`;

  if (process.env.NODE_ENV === 'test') {
    logger.info('[Email Mock] Test mode OTP email dispatch', {
      to: email,
      subject,
      otp,
    });
    return { sent: true, messageId: 'test-mock-otp-id' };
  }

  try {
    const command = new SendEmailCommand({
      Source: sender,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: buildOtpHtmlTemplate(email, otp),
          },
          Text: {
            Charset: 'UTF-8',
            Data: buildOtpTextBody(email, otp),
          },
        },
      },
    });

    const result = await sesClient.send(command);
    logger.info('SES OTP email sent successfully', {
      messageId: result.MessageId,
      recipient: email,
    });

    return { sent: true, messageId: result.MessageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('Failed to send SES OTP email', {
      error: errorMessage,
      sender,
      recipient: email,
    });
    return { sent: false, error: errorMessage };
  }
}

/**
 * Sends a game score report to the target email address via AWS SES.
 */
export async function sendScoreEmail(options: SendScoreEmailOptions): Promise<EmailResult> {
  const recipient = options.recipientEmail || SES_TO_EMAIL;
  const sender = getSenderEmail();
  const subject = `⚡ Pulse Game Score: Level ${options.level} (${options.score.toLocaleString()} pts)`;

  // In local development or testing without credentials, mock gracefully
  if (process.env.NODE_ENV === 'test') {
    logger.info('[Email Mock] Test mode email dispatch', {
      to: recipient,
      subject,
      score: options.score,
    });
    return { sent: true, messageId: 'test-mock-message-id' };
  }

  try {
    const command = new SendEmailCommand({
      Source: sender,
      Destination: {
        ToAddresses: [recipient],
      },
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: buildHtmlTemplate(options),
          },
          Text: {
            Charset: 'UTF-8',
            Data: buildTextBody(options),
          },
        },
      },
    });

    const result = await sesClient.send(command);
    logger.info('SES email sent successfully', {
      messageId: result.MessageId,
      recipient,
      score: options.score,
      level: options.level,
    });

    return { sent: true, messageId: result.MessageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('Failed to send SES score email', {
      error: errorMessage,
      sender,
      recipient,
    });
    return { sent: false, error: errorMessage };
  }
}

export interface SendBroadcastOptions {
  score: number;
  level: number;
  senderEmail: string;
  playerName?: string | undefined;
  recipients: string[];
}

export interface BroadcastRecipientDelivery {
  email: string;
  sent: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}

/**
 * Builds a styled cyberpunk neon HTML email template for 1-to-1 score broadcast delivery.
 * Each recipient's template references ONLY their own address to preserve total privacy.
 */
function buildBroadcastHtmlTemplate(options: {
  score: number;
  level: number;
  playerName?: string | undefined;
  senderEmail: string;
  recipient: string;
}): string {
  const { score, level, playerName, senderEmail, recipient } = options;
  const name = playerName || senderEmail.split('@')[0] || 'A player';
  const timestamp = new Date().toUTCString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pulse Score Broadcast</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080a10;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .container {
      max-width: 560px;
      margin: 30px auto;
      background: #0f1422;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 240, 255, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #0d1326 0%, #1e1233 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 2px solid #00f0ff;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #00f0ff;
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
      margin: 0;
    }
    .broadcast-tag {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      background: rgba(255, 0, 127, 0.15);
      border: 1px solid #ff007f;
      border-radius: 20px;
      color: #ff007f;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .content {
      padding: 36px 28px;
    }
    .challenge-banner {
      background: #090d16;
      border-left: 3px solid #00f0ff;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .score-card {
      background: #090d16;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 20px 0;
    }
    .score-label {
      color: #ff007f;
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .score-value {
      font-size: 54px;
      font-weight: 900;
      color: #00f0ff;
      margin: 8px 0;
      letter-spacing: 2px;
      text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
    }
    .stat-badge {
      display: inline-block;
      background: #0d121f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 8px 20px;
      font-size: 13px;
      color: #10b981;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px;
    }
    .cta-button {
      background: linear-gradient(90deg, #00f0ff 0%, #ff007f 100%);
      color: #080a10 !important;
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      display: inline-block;
    }
    .footer {
      background: #07090f;
      padding: 20px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #1e293b;
      line-height: 1.6;
    }
    .privacy-note {
      color: #94a3b8;
      font-size: 11px;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ PULSE</div>
      <div class="broadcast-tag">PLAYER SCORE CHALLENGE</div>
    </div>
    <div class="content">
      <div class="challenge-banner">
        <strong>${name}</strong> (${senderEmail}) just finished an intense session of <strong>Pulse</strong> and broadcasted their score to challenge you!
      </div>
      <div class="score-card">
        <div class="score-label">FINAL SCORE BROADCAST</div>
        <div class="score-value">${score.toLocaleString()}</div>
        <div class="stat-badge">REACHED LEVEL ${level}</div>
      </div>
      <p style="text-align: center; font-size: 14px; color: #94a3b8; margin: 24px 0 8px;">
        Think you have sharper reaction times and memory? Test your reflexes now:
      </p>
      <div class="cta-container">
        <a href="https://bevdamanus.in" class="cta-button" target="_blank">PLAY &amp; BEAT THIS SCORE</a>
      </div>
    </div>
    <div class="footer">
      <div>Dispatched via Amazon SES • Cloudflare Worker &amp; AWS Lambda</div>
      <div class="privacy-note">🔒 Private 1-to-1 dispatch to ${recipient}. None of your data is shared with other recipients.</div>
      <div style="margin-top: 4px;">Timestamp: ${timestamp}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Plain text fallback for score broadcast.
 */
function buildBroadcastTextBody(options: {
  score: number;
  level: number;
  playerName?: string | undefined;
  senderEmail: string;
  recipient: string;
}): string {
  const { score, level, playerName, senderEmail, recipient } = options;
  const name = playerName || senderEmail.split('@')[0] || 'A player';
  return `⚡ PULSE - SCORE CHALLENGE BROADCAST
========================================
${name} (${senderEmail}) just scored ${score.toLocaleString()} points at Level ${level} in Pulse!

Think you can beat it? Play now at:
https://bevdamanus.in

========================================
🔒 Private 1-to-1 dispatch to ${recipient}.
Dispatched via Amazon SES on AWS Lambda`;
}

/**
 * Sends score broadcasts to multiple recipients via Amazon SES.
 * GUARANTEES 1-TO-1 PRIVACY: Every recipient receives their own distinct email where
 * ToAddresses contains ONLY their address. No recipient can see any other recipient's address.
 */
export async function sendBroadcastScoreEmails(
  options: SendBroadcastOptions,
): Promise<BroadcastRecipientDelivery[]> {
  const { score, level, senderEmail, playerName, recipients } = options;
  const fromAddress = getSenderEmail();
  const name = playerName || senderEmail.split('@')[0] || 'Player';
  const subject = `⚡ ${name} challenged you! Pulse Score: Level ${level} (${score.toLocaleString()} pts)`;

  // In test mode, return mocked deliveries
  if (process.env.NODE_ENV === 'test') {
    logger.info('[Email Mock] Test mode broadcast email dispatch', {
      from: fromAddress,
      senderEmail,
      recipientCount: recipients.length,
      recipients,
      score,
    });
    return recipients.map((email) => ({
      email,
      sent: true,
      messageId: `test-mock-broadcast-${email}`,
    }));
  }

  // Strictly individual 1-to-1 transmissions so each recipient sees ONLY their own address in To:
  const deliveries = await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        const command = new SendEmailCommand({
          Source: fromAddress,
          Destination: {
            ToAddresses: [recipient], // Strictly 1 address per email!
          },
          Message: {
            Subject: {
              Charset: 'UTF-8',
              Data: subject,
            },
            Body: {
              Html: {
                Charset: 'UTF-8',
                Data: buildBroadcastHtmlTemplate({
                  score,
                  level,
                  playerName,
                  senderEmail,
                  recipient,
                }),
              },
              Text: {
                Charset: 'UTF-8',
                Data: buildBroadcastTextBody({
                  score,
                  level,
                  playerName,
                  senderEmail,
                  recipient,
                }),
              },
            },
          },
        });

        const result = await sesClient.send(command);
        logger.info('SES broadcast email sent to recipient', {
          messageId: result.MessageId,
          recipient,
          senderEmail,
        });
        return {
          email: recipient,
          sent: true,
          messageId: result.MessageId,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.warn('Failed to send SES broadcast email to recipient', {
          recipient,
          error: errorMessage,
        });
        return {
          email: recipient,
          sent: false,
          error: errorMessage,
        };
      }
    }),
  );

  return deliveries.map((d, index) => {
    if (d.status === 'fulfilled') {
      return d.value;
    }
    return {
      email: recipients[index] || 'unknown',
      sent: false,
      error: d.reason instanceof Error ? d.reason.message : String(d.reason),
    };
  });
}
