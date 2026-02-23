const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface BaseVars {
  recipientName: string
  projectName: string
  actionUrl: string
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:18px;font-weight:700;color:#e4e7ec;letter-spacing:0.5px;">Helix Foundry</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#1a1d27;border-radius:12px;border:1px solid #252830;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#5a5f73;line-height:1.5;">
                You received this because of your notification settings.
                <br>
                <a href="${APP_URL}/settings/notifications" style="color:#00d4ff;text-decoration:none;">Update preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background-color:#00d4ff;color:#0f1117;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">${text}</a>`
}

// --- Mention ---

interface MentionVars extends BaseVars {
  mentionerName: string
  commentPreview: string
}

export function mentionEmailHtml(vars: MentionVars): string {
  return layout('You were mentioned', `
    <td style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#e4e7ec;">You were mentioned</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8fa3;">
        <strong style="color:#e4e7ec;">${vars.mentionerName}</strong> mentioned you in
        <strong style="color:#e4e7ec;">${vars.projectName}</strong>
      </p>
      <div style="border-left:3px solid #8b5cf6;padding-left:16px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;color:#8b8fa3;line-height:1.5;">${vars.commentPreview}</p>
      </div>
      <p>${button('View Comment', vars.actionUrl)}</p>
    </td>
  `)
}

export function mentionEmailText(vars: MentionVars): string {
  return `You were mentioned

${vars.mentionerName} mentioned you in ${vars.projectName}:

"${vars.commentPreview}"

View it here: ${vars.actionUrl}

---
Update notification preferences: ${APP_URL}/settings/notifications`
}

// --- Comment ---

interface CommentVars extends BaseVars {
  commenterName: string
  entityName: string
  entityType: string
  commentPreview: string
}

export function commentEmailHtml(vars: CommentVars): string {
  return layout(`New comment on ${vars.entityName}`, `
    <td style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#e4e7ec;">New comment on ${vars.entityName}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8fa3;">
        <strong style="color:#e4e7ec;">${vars.commenterName}</strong> commented on your
        ${vars.entityType.replace('_', ' ')} in <strong style="color:#e4e7ec;">${vars.projectName}</strong>
      </p>
      <div style="border-left:3px solid #00d4ff;padding-left:16px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;color:#8b8fa3;line-height:1.5;">${vars.commentPreview}</p>
      </div>
      <p>${button('View Comment', vars.actionUrl)}</p>
    </td>
  `)
}

export function commentEmailText(vars: CommentVars): string {
  return `New comment on ${vars.entityName}

${vars.commenterName} commented on your ${vars.entityType.replace('_', ' ')} in ${vars.projectName}:

"${vars.commentPreview}"

View it here: ${vars.actionUrl}

---
Update notification preferences: ${APP_URL}/settings/notifications`
}

// --- Assignment ---

interface AssignmentVars extends BaseVars {
  assignerName: string
  workOrderTitle: string
  priority: string
}

export function assignmentEmailHtml(vars: AssignmentVars): string {
  return layout(`Assigned: ${vars.workOrderTitle}`, `
    <td style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#e4e7ec;">You were assigned a work order</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8fa3;">
        <strong style="color:#e4e7ec;">${vars.assignerName}</strong> assigned you to a work order
        in <strong style="color:#e4e7ec;">${vars.projectName}</strong>
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
        <tr>
          <td style="background-color:#252830;border-radius:8px;padding:16px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#e4e7ec;">${vars.workOrderTitle}</p>
            <p style="margin:0;font-size:13px;color:#8b8fa3;">Priority: ${vars.priority}</p>
          </td>
        </tr>
      </table>
      <p>${button('View Work Order', vars.actionUrl)}</p>
    </td>
  `)
}

export function assignmentEmailText(vars: AssignmentVars): string {
  return `You were assigned a work order

${vars.assignerName} assigned you to "${vars.workOrderTitle}" in ${vars.projectName}.
Priority: ${vars.priority}

View it here: ${vars.actionUrl}

---
Update notification preferences: ${APP_URL}/settings/notifications`
}

// --- Feedback ---

interface FeedbackVars extends BaseVars {
  feedbackPreview: string
  category: string
}

export function feedbackEmailHtml(vars: FeedbackVars): string {
  return layout('New feedback received', `
    <td style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#e4e7ec;">New feedback received</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8fa3;">
        New <strong style="color:#e4e7ec;">${vars.category}</strong> feedback
        in <strong style="color:#e4e7ec;">${vars.projectName}</strong>
      </p>
      <div style="border-left:3px solid #ef4444;padding-left:16px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;color:#8b8fa3;line-height:1.5;">${vars.feedbackPreview}</p>
      </div>
      <p>${button('View Feedback', vars.actionUrl)}</p>
    </td>
  `)
}

export function feedbackEmailText(vars: FeedbackVars): string {
  return `New feedback received

New ${vars.category} feedback in ${vars.projectName}:

"${vars.feedbackPreview}"

View it here: ${vars.actionUrl}

---
Update notification preferences: ${APP_URL}/settings/notifications`
}

// --- Invitation ---

interface InvitationVars {
  inviterName: string
  organizationName: string
  role: string
  acceptUrl: string
  expiresDate: string
}

function invitationLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:18px;font-weight:700;color:#e4e7ec;letter-spacing:0.5px;">Helix Foundry</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#1a1d27;border-radius:12px;border:1px solid #252830;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#5a5f73;line-height:1.5;">
                If you don't recognize this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function invitationEmailHtml(vars: InvitationVars): string {
  return invitationLayout(`You're invited to ${vars.organizationName}`, `
    <td style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#e4e7ec;">You're invited to join ${vars.organizationName}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8fa3;">
        <strong style="color:#e4e7ec;">${vars.inviterName}</strong> invited you to join
        <strong style="color:#e4e7ec;">${vars.organizationName}</strong> on Helix Foundry as a
        <strong style="color:#8b5cf6;">${vars.role}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:13px;color:#5a5f73;">
        This invitation expires on ${vars.expiresDate}.
      </p>
      <p>${button('Accept Invitation', vars.acceptUrl)}</p>
    </td>
  `)
}

export function invitationEmailText(vars: InvitationVars): string {
  return `You're invited to join ${vars.organizationName}

${vars.inviterName} invited you to join ${vars.organizationName} on Helix Foundry as a ${vars.role}.

Accept the invitation here: ${vars.acceptUrl}

This invitation expires on ${vars.expiresDate}.

---
If you don't recognize this invitation, you can safely ignore this email.`
}
