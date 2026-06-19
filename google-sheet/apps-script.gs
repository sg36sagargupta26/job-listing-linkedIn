// Google Apps Script — deploy as Web App
// 1. Open your Google Sheet
// 2. Extensions → Apps Script
// 3. Paste this code (replace SHEET_NAME if needed)
// 4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
// 5. Copy the Web App URL -> paste into extension popup

const SHEET_NAME = "Sheet1"; // Change if your sheet tab has a different name

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Title", "Company", "Location", "URL", "Posted", "Description",
        "Match %", "Matched Skills", "Missing Skills", "Summary", "Saved At"
      ]);
    }

    sheet.appendRow([
      data.title || "",
      data.company || "",
      data.location || "",
      data.url || "",
      data.postedDate || "",
      data.description ? data.description.substring(0, 500) : "",
      data.matchPercentage || "",
      data.matchedSkills || "",
      data.missingSkills || "",
      data.summary || "",
      new Date().toISOString()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput("Job Matcher — Google Sheets endpoint is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}
