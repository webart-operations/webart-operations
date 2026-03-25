// GHL Webhook dispatcher
// All outbound events to GHL go through this function.
// VITE_GHL_WEBHOOK_URL will be filled in later.

export const triggerGHLWebhook = async (eventType, payload) => {
  const webhookUrl = import.meta.env.VITE_GHL_WEBHOOK_URL
  
  if (!webhookUrl) {
    console.log(`[GHL - ${eventType}]`, payload)
    return
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type:  eventType,
        source:      'webart-ops-platform',
        timestamp:   new Date().toISOString(),
        ...payload
      })
    })
  } catch (err) {
    console.error(`GHL webhook failed [${eventType}]:`, err)
  }
}