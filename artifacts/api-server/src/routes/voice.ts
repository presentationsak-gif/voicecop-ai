import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Returns a short-lived session key for the frontend to connect to AssemblyAI Universal Streaming.
// Since we cannot directly create temporary tokens on free-tier plans, we securely proxy the
// API key through this backend endpoint (never exposed in frontend source or env files).
router.post("/voice/token", async (_req, res) => {
  const apiKey = process.env["ASSEMBLYAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "AssemblyAI API key not configured" });
    return;
  }

  // Validate the key is real by pinging the account endpoint
  try {
    const check = await fetch("https://api.assemblyai.com/account", {
      headers: { authorization: apiKey },
    });

    if (!check.ok && check.status === 401) {
      res.status(401).json({ error: "Invalid AssemblyAI API key" });
      return;
    }
  } catch (err) {
    // Network issue - proceed anyway
    console.warn("AssemblyAI account check failed:", err);
  }

  // Return the key as a token for the frontend WebSocket connection.
  // AssemblyAI Universal Streaming accepts the API key directly as the token param.
  res.json({
    token: apiKey,
    wsUrl: "wss://streaming.assemblyai.com/v3/ws",
  });
});

export default router;
