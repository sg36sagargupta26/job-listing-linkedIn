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

  function showStatus(message, type) {
    status.textContent = message;
    status.className = "status " + type;
    setTimeout(() => {
      status.textContent = "";
      status.className = "status";
    }, 2500);
  }
});
