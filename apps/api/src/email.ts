import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from './logger.js';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'pulse@bevdamanus.in';
const SES_TO_EMAIL = process.env.SES_TO_EMAIL || 'abhaychavan346@gmail.com';

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
 * Sends a game score report to the target email address via AWS SES.
 */
export async function sendScoreEmail(options: SendScoreEmailOptions): Promise<EmailResult> {
  const recipient = options.recipientEmail || SES_TO_EMAIL;
  const sender = SES_FROM_EMAIL;
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
