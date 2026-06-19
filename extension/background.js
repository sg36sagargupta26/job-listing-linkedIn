// Background service worker — handles API calls
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_JOB") {
    analyzeJob(message.jobDescription, message.cvText)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async
  }

  if (message.type === "SAVE_TO_SHEET") {
    saveToSheet(message.jobData)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ── DeepSeek API ──────────────────────────────────────────
async function analyzeJob(jobDescription, cvText) {
  const { deepseekApiKey } = await chrome.storage.sync.get("deepseekApiKey");
  if (!deepseekApiKey) throw new Error("DeepSeek API key not set. Open extension popup to configure.");

  const prompt = `You are a job fit analyzer. Compare the candidate's CV against the job description.
Return a JSON object with this exact structure (no markdown, no extra text):
{
  "matchPercentage": <number 0-100>,
  "matchedSkills": ["<skill1>", "<skill2>", ...],
  "missingSkills": ["<skill1>", "<skill2>", ...],
  "strengths": ["<brief strength>", ...],
  "gaps": ["<brief gap>", ...],
  "summary": "<one-line overall fit assessment>"
}

─── CANDIDATE CV ───
${cvText}

─── JOB DESCRIPTION ───
${jobDescription}`;

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepseekApiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Parse JSON from response (handle possible markdown wrapping)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  
  return JSON.parse(jsonMatch[0]);
}

// ── Google Sheets via Apps Script ──────────────────────────
async function saveToSheet(jobData) {
  const { sheetsWebAppUrl } = await chrome.storage.sync.get("sheetsWebAppUrl");
  if (!sheetsWebAppUrl) throw new Error("Google Sheets URL not set. Open extension popup to configure.");

  const response = await fetch(sheetsWebAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobData)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sheet error: ${response.status} — ${err}`);
  }

  return await response.json();
}
