const db = require('./db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Notifies every app user (except the reporter) about a new incident:
 *  1. Socket.IO broadcast – instant, used while the app is open.
 *  2. Expo push notifications – reach devices while the app is closed
 *     (requires a development/production build; Expo Go on Android does not receive remote pushes).
 */
async function notifyNewIncident(io, incident) {
  io.emit('incident:new', incident);

  const rows = db
    .prepare('SELECT token FROM push_tokens WHERE user_id IS NULL OR user_id != ?')
    .all(incident.user.id);
  if (!rows.length) return;

  const messages = rows.map((r) => ({
    to: r.token,
    sound: 'default',
    title: `${incident.category.icon} New ${incident.category.name} reported`,
    body: incident.address ? `${incident.title} — ${incident.address}` : incident.title,
    data: { incidentId: incident.id },
    channelId: 'incidents',
  }));

  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
      const json = await res.json();
      // Drop tokens Expo reports as no longer registered.
      (json.data || []).forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          db.prepare('DELETE FROM push_tokens WHERE token = ?').run(messages[i + idx].to);
        }
      });
    } catch (err) {
      console.warn('[push] failed to send:', err.message);
    }
  }
}

module.exports = { notifyNewIncident };
