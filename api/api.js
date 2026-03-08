export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Missing 'to' or 'message'" });
  }

  // Format Pakistan number → +923001234567
  let phone = to.replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("0092"))      phone = "+92" + phone.slice(4);
  else if (phone.startsWith("92") && !phone.startsWith("+")) phone = "+" + phone;
  else if (phone.startsWith("0"))    phone = "+92" + phone.slice(1);
  else if (!phone.startsWith("+"))   phone = "+92" + phone;

  console.log("Sending SMS via Infobip to:", phone);

  try {
    const response = await fetch(
      `https://${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `App ${process.env.INFOBIP_API_KEY}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              from: "MediTrack",
              destinations: [{ to: phone }],
              text: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log("Infobip response:", JSON.stringify(data));

    if (!response.ok) {
      const errMsg = data?.requestError?.serviceException?.text || "SMS failed";
      console.error("Infobip error:", errMsg);
      return res.status(500).json({ error: errMsg, raw: data });
    }

    const msgStatus = data?.messages?.[0]?.status?.name;
    console.log("Message status:", msgStatus);

    return res.status(200).json({
      success: true,
      status: msgStatus,
      id: data?.messages?.[0]?.messageId,
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
