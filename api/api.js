import https from "https";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing fields" });

  let phone = to.replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("0092"))                              phone = "+92" + phone.slice(4);
  else if (phone.startsWith("92") && !phone.startsWith("+")) phone = "+" + phone;
  else if (phone.startsWith("0"))                            phone = "+92" + phone.slice(1);
  else if (!phone.startsWith("+"))                           phone = "+92" + phone;

  // ── HARDCODED FOR TESTING ──────────────────────────────
  const baseUrl = "55159d.api.infobip.com";  // e.g. k3xzqm.api.infobip.com
  const apiKey  = "1940725cdc127e2bd4704d28785e44c2-4939d319-de33-4f70-8783-68df3d802306";
  // ───────────────────────────────────────────────────────

  const body = JSON.stringify({
    messages: [{
      from: "ServiceSMS",
      destinations: [{ to: phone }],
      text: message,
    }],
  });

  const options = {
    hostname: baseUrl,
    path: "/sms/2/text/advanced",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `App ${apiKey}`,
      "Accept": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = "";
        response.on("data", chunk => data += chunk);
        response.on("end", () => {
          try { resolve({ status: response.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: response.statusCode, body: data }); }
        });
      });
      request.on("error", reject);
      request.setTimeout(10000, () => { request.destroy(); reject(new Error("Timeout")); });
      request.write(body);
      request.end();
    });

    const msg = result.body?.messages?.[0];
    const statusName = msg?.status?.name;
    const success = result.status < 400;

    return res.status(200).json({ success, status: statusName, id: msg?.messageId, raw: result.body });

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
