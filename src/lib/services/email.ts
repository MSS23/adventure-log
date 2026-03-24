import { Resend } from 'resend'
import { log } from '@/lib/utils/logger'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'Adventure Log <noreply@adventurelog.app>'
const APP_NAME = 'Adventure Log'

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (url) return url
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  if (process.env.NODE_ENV === 'production') {
    log.warn('NEXT_PUBLIC_APP_URL not set in production — email links may be broken', { component: 'EmailService' })
  }
  return 'http://localhost:3000'
}

/** HTML-encode user-controlled strings to prevent injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5F7F0; margin: 0; padding: 20px; color: #1c1917; }
  .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #4A5D23, #5a7028); padding: 32px 24px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px 24px; }
  .body p { line-height: 1.6; margin: 0 0 16px; color: #44403c; font-size: 15px; }
  .btn { display: inline-block; background: #4A5D23; color: #fff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
  .btn:hover { background: #3d4e1d; }
  .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e7e5e4; }
  .footer p { color: #a8a29e; font-size: 12px; margin: 0; line-height: 1.5; }
  .footer a { color: #78716c; }
  .muted { color: #78716c; font-size: 13px; }
`

function wrapHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>
<style>${baseStyles}</style></head>
<body><div class="container">${content}</div></body></html>`
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function welcomeEmail(username: string): { subject: string; html: string } {
  const safeUsername = escapeHtml(username)
  return {
    subject: `Welcome to ${APP_NAME}!`,
    html: wrapHtml(`Welcome to ${APP_NAME}`, `
      <div class="header">
        <h1>Welcome to ${APP_NAME}</h1>
        <p>Your travel story starts here</p>
      </div>
      <div class="body">
        <p>Hey <strong>${safeUsername}</strong>,</p>
        <p>We're excited to have you on board! ${APP_NAME} is where your travels come to life on an interactive 3D globe.</p>
        <p>Here's how to get started:</p>
        <p>
          <strong>1.</strong> Create your first album with photos and a location<br>
          <strong>2.</strong> Watch it appear on your personal globe<br>
          <strong>3.</strong> Share your journey with friends
        </p>
        <p style="text-align:center; margin-top:24px;">
          <a href="${getAppUrl()}/albums/new" class="btn">Create Your First Album</a>
        </p>
      </div>
      <div class="footer">
        <p>${APP_NAME} &mdash; Your travels, beautifully mapped</p>
      </div>
    `)
  }
}

function newFollowerEmail(username: string, followerName: string, followerUsername: string): { subject: string; html: string } {
  const safeName = escapeHtml(username)
  const safeFollower = escapeHtml(followerName)
  const safeFollowerUser = escapeHtml(followerUsername)
  return {
    subject: `${safeFollower} started following you`,
    html: wrapHtml('New Follower', `
      <div class="header">
        <h1>New Follower</h1>
      </div>
      <div class="body">
        <p>Hey <strong>${safeName}</strong>,</p>
        <p><strong>${safeFollower}</strong> (@${safeFollowerUser}) just started following you on ${APP_NAME}.</p>
        <p style="text-align:center; margin-top:24px;">
          <a href="${getAppUrl()}/u/${encodeURIComponent(followerUsername)}" class="btn">View Profile</a>
        </p>
      </div>
      <div class="footer">
        <p>You received this because you have email notifications enabled.<br>
        <a href="${getAppUrl()}/settings/notifications">Manage preferences</a></p>
      </div>
    `)
  }
}

function albumCommentEmail(
  username: string,
  commenterName: string,
  albumTitle: string,
  albumId: string,
  commentPreview: string
): { subject: string; html: string } {
  const safeName = escapeHtml(username)
  const safeCommenter = escapeHtml(commenterName)
  const safeTitle = escapeHtml(albumTitle)
  const safePreview = escapeHtml(commentPreview)
  return {
    subject: `${safeCommenter} commented on "${safeTitle}"`,
    html: wrapHtml('New Comment', `
      <div class="header">
        <h1>New Comment</h1>
      </div>
      <div class="body">
        <p>Hey <strong>${safeName}</strong>,</p>
        <p><strong>${safeCommenter}</strong> commented on your album <strong>"${safeTitle}"</strong>:</p>
        <blockquote style="border-left: 3px solid #4A5D23; padding: 8px 16px; margin: 16px 0; background: #f5f5f4; border-radius: 0 8px 8px 0;">
          <p style="margin:0; color: #44403c; font-style: italic;">"${safePreview}"</p>
        </blockquote>
        <p style="text-align:center; margin-top:24px;">
          <a href="${getAppUrl()}/albums/${albumId}" class="btn">View Album</a>
        </p>
      </div>
      <div class="footer">
        <p><a href="${getAppUrl()}/settings/notifications">Manage email preferences</a></p>
      </div>
    `)
  }
}

function albumLikeEmail(
  username: string,
  likerName: string,
  albumTitle: string,
  albumId: string
): { subject: string; html: string } {
  const safeName = escapeHtml(username)
  const safeLiker = escapeHtml(likerName)
  const safeTitle = escapeHtml(albumTitle)
  return {
    subject: `${safeLiker} liked your album "${safeTitle}"`,
    html: wrapHtml('New Like', `
      <div class="header">
        <h1>Someone likes your work!</h1>
      </div>
      <div class="body">
        <p>Hey <strong>${safeName}</strong>,</p>
        <p><strong>${safeLiker}</strong> liked your album <strong>"${safeTitle}"</strong>.</p>
        <p style="text-align:center; margin-top:24px;">
          <a href="${getAppUrl()}/albums/${albumId}" class="btn">View Album</a>
        </p>
      </div>
      <div class="footer">
        <p><a href="${getAppUrl()}/settings/notifications">Manage email preferences</a></p>
      </div>
    `)
  }
}

// ─── Send Functions ───────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    log.warn('Email not sent - RESEND_API_KEY not configured', {
      component: 'EmailService',
      action: 'send',
      to,
      subject
    })
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      log.error('Failed to send email', { component: 'EmailService', action: 'send', to, subject }, error as Error)
      return false
    }

    log.info('Email sent', { component: 'EmailService', action: 'send', to, subject })
    return true
  } catch (err) {
    log.error('Email send error', { component: 'EmailService', action: 'send', to }, err as Error)
    return false
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const emailService = {
  async sendWelcome(to: string, username: string) {
    const { subject, html } = welcomeEmail(username)
    return send(to, subject, html)
  },

  async sendNewFollower(to: string, username: string, followerName: string, followerUsername: string) {
    const { subject, html } = newFollowerEmail(username, followerName, followerUsername)
    return send(to, subject, html)
  },

  async sendAlbumComment(
    to: string,
    username: string,
    commenterName: string,
    albumTitle: string,
    albumId: string,
    commentPreview: string
  ) {
    const { subject, html } = albumCommentEmail(username, commenterName, albumTitle, albumId, commentPreview)
    return send(to, subject, html)
  },

  async sendAlbumLike(
    to: string,
    username: string,
    likerName: string,
    albumTitle: string,
    albumId: string
  ) {
    const { subject, html } = albumLikeEmail(username, likerName, albumTitle, albumId)
    return send(to, subject, html)
  },

  /** Check if email service is configured */
  isConfigured(): boolean {
    return !!resend
  }
}
