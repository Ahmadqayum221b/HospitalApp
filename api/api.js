export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: "Missing 'to' or 'message'" });
    }

    // Format Pakistan number → international format
    // 03001234567 → +923001234567
    let formatted = to.replace(/\s|-/g, "");
    if (formatted.startsWith("0")) {
        formatted = "+92" + formatted.slice(1);
    } else if (!formatted.startsWith("+")) {
        formatted = "+" + formatted;
    }

    try {
        const response = await fetch("https://api.telnyx.com/v2/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.TELNYX_API_KEY}`
            },
            body: JSON.stringify({
                from: process.env.TELNYX_PHONE_NUMBER,
                to: formatted,
                text: message,
                messaging_profile_id: process.env.TELNYX_PROFILE_ID
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Telnyx error:", data);
            return res.status(500).json({ error: data?.errors?.[0]?.detail || "SMS failed" });
        }

        return res.status(200).json({ success: true, id: data?.data?.id });
    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: "Server error" });
    }
}