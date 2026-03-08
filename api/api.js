// api/api.js
import https from "https";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing 'to' or 'message'" });

  // Format Pakistan number
  let phone = to.replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("0092"))                         phone = "+92" + phone.slice(4);
  else if (phone.startsWith("92") && !phone.startsWith("+")) phone = "+" + phone;
  else if (phone.startsWith("0"))                       phone = "+92" + phone.slice(1);
  else if (!phone.startsWith("+"))                      phone = "+92" + phone;

  const body = JSON.stringify({
    messages: [{
      from: "ServiceSMS",          // required on trial — do NOT use custom names
      destinations: [{ to: phone }],
      text: message,
    }],
  });

  const baseUrl = process.env.INFOBIP_BASE_URL;   // e.g. xxxxx.api.infobip.com
  const apiKey  = process.env.INFOBIP_API_KEY;

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
          try {
            resolve({ status: response.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: response.statusCode, body: data });
          }
        });
      });
      request.on("error", reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("Request timed out"));
      });
      request.write(body);
      request.end();
    });

    console.log("Infobip status:", result.status, JSON.stringify(result.body));

    if (result.status >= 400) {
      const errMsg = result.body?.requestError?.serviceException?.text || "SMS failed";
      return res.status(500).json({ error: errMsg, raw: result.body });
    }

    const msg = result.body?.messages?.[0];
    const statusName = msg?.status?.name;
    const success = ["MESSAGE_ACCEPTED", "PENDING_ENROUTE", "DELIVERED_TO_HANDSET", "DELIVERED_TO_OPERATOR"].includes(statusName);

    return res.status(200).json({ success, status: statusName, id: msg?.messageId });

  } catch (err) {
    console.error("HTTPS error:", err.message);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
