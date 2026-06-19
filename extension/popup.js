// Popup — settings management
document.addEventListener("DOMContentLoaded", async () => {
  const deepseekInput = document.getElementById("deepseek-key");
  const sheetsInput = document.getElementById("sheets-url");
  const saveBtn = document.getElementById("save-btn");
  const status = document.getElementById("status");

  // Load saved values
  const stored = await chrome.storage.sync.get(["deepseekApiKey", "sheetsWebAppUrl"]);
  if (stored.deepseekApiKey) deepseekInput.value = stored.deepseekApiKey;
  if (stored.sheetsWebAppUrl) sheetsInput.value = stored.sheetsWebAppUrl;

  // Save
  saveBtn.addEventListener("click", async () => {
    const deepseekApiKey = deepseekInput.value.trim();
    const sheetsWebAppUrl = sheetsInput.value.trim();

    if (!deepseekApiKey && !sheetsWebAppUrl) {
      showStatus("Please enter at least one value", "error");
      return;
    }

    try {
      await chrome.storage.sync.set({ deepseekApiKey, sheetsWebAppUrl });
      showStatus("✅ Settings saved", "success");
    } catch (err) {
      showStatus("❌ Failed to save", "error");
    }
  });

  // Test Sheet
  const testSheetBtn = document.getElementById("test-sheet-btn");
  testSheetBtn.addEventListener("click", async () => {
    const url = sheetsInput.value.trim();
    if (!url) {
      showStatus("Enter a Web App URL first", "error");
      return;
    }
    testSheetBtn.textContent = "Testing...";
    testSheetBtn.disabled = true;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          title: "TEST JOB — Connection Works!",
          company: "Test Company",
          location: "Remote",
          url: "https://example.com",
          postedDate: new Date().toISOString(),
          description: "This is a test entry from Job Matcher.",
          matchPercentage: 99,
          matchedSkills: "Test",
          missingSkills: "None",
          summary: "Connection successful!"
        })
      });
      const text = await response.text();
      if (response.ok) {
        showStatus("✅ Test data sent! Check your sheet.", "success");
      } else {
        showStatus(`❌ Error ${response.status}: ${text.substring(0, 60)}`, "error");
      }
    } catch (err) {
      showStatus(`❌ ${err.message.substring(0, 80)}`, "error");
    } finally {
      testSheetBtn.textContent = "Test Sheet";
      testSheetBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = "status " + type;
    setTimeout(() => {
      status.textContent = "";
      status.className = "status";
    }, 5000);
  }
});
