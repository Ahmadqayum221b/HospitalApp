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
    let formatted = to.replace(/[\s\-\(\)]/g, "");
    if (formatted.startsWith("0092"))   formatted = "+92" + formatted.slice(4);
    else if (formatted.startsWith("92") && !formatted.startsWith("+")) formatted = "+" + formatted;
    else if (formatted.startsWith("0")) formatted = "+92" + formatted.slice(1);
    else if (!formatted.startsWith("+")) formatted = "+92" + formatted;

    console.log("Sending SMS to:", formatted);

    try {
        const response = await fetch("https://api.telnyx.com/v2/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.TELNYX_API_KEY}`
            },
            body: JSON.stringify({
                from: "MediTrack",          // ← alphanumeric sender, no number needed
                to: formatted,
                text: message,
                messaging_profile_id: process.env.TELNYX_PROFILE_ID
            })
        });

        const data = await response.json();
        console.log("Telnyx response:", JSON.stringify(data));

        if (!response.ok) {
            const errMsg = data?.errors?.[0]?.detail || "SMS failed";
            console.error("Telnyx error:", errMsg);
            return res.status(500).json({ error: errMsg, raw: data });
        }

        return res.status(200).json({ success: true, id: data?.data?.id });

    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
}
