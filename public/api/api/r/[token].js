import { tokenStore } from "../verify";

export default function handler(req, res) {
  const { token } = req.query;

  const record = tokenStore.get(token);

  if (!record || Date.now() - record.createdAt > 60000) { // Expire after 60 seconds
    return res.status(404).send("Invalid or expired link.");
  }

  // IP Binding
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (userIp !== record.ip) {
    return res.status(403).send("Invalid IP address.");
  }

  // Delete token after use (single-use)
  tokenStore.delete(token);

  return res.redirect(302, record.url);
}
