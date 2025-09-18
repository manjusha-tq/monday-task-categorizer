import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const MONDAY_API_URL = "https://api.monday.com/v2";
const API_TOKEN = process.env.MONDAY_API_TOKEN; // keep it in .env file

app.get("/", (req, res) => {
  res.send("✅ Server is running. Webhook endpoint is /webhook");
});


// Webhook endpoint - listens for new item creation
app.post("/webhook", async (req, res) => {
  if (req.body && req.body.challenge) {
    return res.status(200).send(req.body);
  }

  if (process.env.WEBHOOK_TOKEN && req.query.token !== process.env.WEBHOOK_TOKEN) {
    return res.status(403).send({ error: "Invalid token" });
  }

  try {
    const { event } = req.body;
    if (!event) return res.status(400).send({ error: "Invalid webhook payload" });

    const itemId = event.pulseId;
    const boardId = event.boardId;
    const itemName = event.pulseName || "";

    // Default
    let taskType = "Uncategorized";

    // Simple categorization rules
    if (/bug/i.test(itemName)) taskType = "Bug";
    else if (/feature/i.test(itemName)) taskType = "Feature Request";
    else if (/urgent|priority/i.test(itemName)) taskType = "High Priority";
    else if (/enhancement|repair|not Working/i.test(itemName)) taskType = "Maintainance";

    // GraphQL mutation to update Task Type column
    const query = `
      mutation {
        change_simple_column_value (
          board_id: ${boardId},
          item_id: ${itemId},
          column_id: "status",
          value: "${taskType}"
        ) {
          id
        }
      }
    `;

    await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    // after await fetch(...)
    const result = await response.json();
    console.log("Webhook event:", JSON.stringify(event));
    console.log("Monday response:", JSON.stringify(result));


    res.send({ success: true, taskType });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).send({ error: "Server error" });
  }
});

// // Start server
// app.listen(3000, () => console.log("🚀 App running on port 3000"));

// replace app.listen(3000, ...)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 App running on port ${PORT}`));
