// Content script — runs on LinkedIn job pages
(function () {
  "use strict";

  // Prevent double injection
  if (window.__jobMatcherInjected) return;
  window.__jobMatcherInjected = true;

  // ── State ──────────────────────────────────────────────
  let analysisResult = null;
  let isAnalyzing = false;
  let isSaving = false;

  // ── DOM Extraction ─────────────────────────────────────
  function extractJobDetails() {
    const selectors = {
      title: [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
        ".job-details-jobs-unified-top-card__job-title",
      ],
      company: [
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
      ],
      location: [
        ".job-details-jobs-unified-top-card__bullet",
        ".jobs-unified-top-card__bullet",
        ".job-details-jobs-unified-top-card__primary-description-container .t-black--light",
      ],
      postedDate: [
        ".job-details-jobs-unified-top-card__primary-description-container .t-black--light:last-child",
        ".jobs-unified-top-card__posted-date",
      ],
      description: [
        ".jobs-description__content",
        ".jobs-description-content__text",
        "#job-details",
        ".jobs-box__html-content",
        "article.jobs-description",
      ],
    };

    function find(selectorList) {
      for (const sel of selectorList) {
        const el = document.querySelector(sel);
        if (el) return el.textContent.trim();
      }
      return "";
    }

    const title = find(selectors.title);
    const company = find(selectors.company);
    const location = find(selectors.location);
    const postedDate = find(selectors.postedDate);
    const description = find(selectors.description);
    const url = window.location.href;

    // Clean up location (remove extra text like "· 3 weeks ago" etc)
    const cleanLocation = location
      .replace(/\s*·\s*.*$/, "")
      .replace(/^\s*\d+\s*\w+\s*ago\s*/i, "")
      .trim();

    return {
      title,
      company,
      location: cleanLocation,
      postedDate,
      description,
      url,
      scrapedAt: new Date().toISOString(),
    };
  }

  // ── CV as Text ─────────────────────────────────────────
  function buildCvText() {
    const cv = CV_DATA;
    const expText = cv.experience
      .map(
        (e) =>
          `${e.role} at ${e.company} (${e.duration})\n${e.highlights
            .map((h) => `  • ${h}`)
            .join("\n")}`
      )
      .join("\n\n");

    return `
Name: ${cv.name}
Title: ${cv.title}
Education: ${cv.education}
Skills: ${cv.allSkillsFlat.join(", ")}

Experience:
${expText}

Summary: ${cv.summary}
    `.trim();
  }

  // ── UI Creation ────────────────────────────────────────
  function createOverlay() {
    // Remove existing overlay if any
    const existing = document.getElementById("jm-overlay-root");
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = "jm-overlay-root";
    root.innerHTML = `
      <div id="jm-floating-btn">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
        </svg>
      </div>
      <div id="jm-panel" style="display:none;">
        <div id="jm-panel-header">
          <span>🎯 Job Matcher</span>
          <button id="jm-close-btn">&times;</button>
        </div>
        <div id="jm-panel-body">
          <div id="jm-initial-view">
            <p class="jm-desc">Compare this job against your CV using DeepSeek AI.</p>
            <button id="jm-analyze-btn" class="jm-btn jm-btn-primary">Analyze Match</button>
          </div>
          <div id="jm-results-view" style="display:none;">
            <div id="jm-score"></div>
            <div id="jm-matched-skills"></div>
            <div id="jm-missing-skills"></div>
            <div id="jm-strengths"></div>
            <div id="jm-gaps"></div>
            <div id="jm-summary"></div>
            <button id="jm-save-btn" class="jm-btn jm-btn-success">📊 Save to Sheet</button>
          </div>
          <div id="jm-loading-view" style="display:none;">
            <div class="jm-spinner"></div>
            <p id="jm-loading-text">Analyzing with DeepSeek...</p>
          </div>
          <div id="jm-error-view" style="display:none;">
            <p class="jm-error-text"></p>
            <button id="jm-retry-btn" class="jm-btn jm-btn-primary">Retry</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // ── Event Listeners ──────────────────────────────────
    const floatingBtn = root.querySelector("#jm-floating-btn");
    const panel = root.querySelector("#jm-panel");
    const closeBtn = root.querySelector("#jm-close-btn");
    const analyzeBtn = root.querySelector("#jm-analyze-btn");
    const saveBtn = root.querySelector("#jm-save-btn");
    const retryBtn = root.querySelector("#jm-retry-btn");

    floatingBtn.addEventListener("click", () => {
      panel.style.display = "block";
      floatingBtn.style.display = "none";
    });

    closeBtn.addEventListener("click", () => {
      panel.style.display = "none";
      floatingBtn.style.display = "flex";
    });

    analyzeBtn.addEventListener("click", runAnalysis);
    retryBtn.addEventListener("click", runAnalysis);
    saveBtn.addEventListener("click", saveToSheet);

    // Store refs
    root._refs = {
      floatingBtn,
      panel,
      analyzeBtn,
      saveBtn,
      retryBtn,
      initialView: root.querySelector("#jm-initial-view"),
      resultsView: root.querySelector("#jm-results-view"),
      loadingView: root.querySelector("#jm-loading-view"),
      errorView: root.querySelector("#jm-error-view"),
      loadingText: root.querySelector("#jm-loading-text"),
      errorText: root.querySelector(".jm-error-text"),
      score: root.querySelector("#jm-score"),
      matchedSkills: root.querySelector("#jm-matched-skills"),
      missingSkills: root.querySelector("#jm-missing-skills"),
      strengths: root.querySelector("#jm-strengths"),
      gaps: root.querySelector("#jm-gaps"),
      summary: root.querySelector("#jm-summary"),
    };

    return root._refs;
  }

  // ── Analysis Flow ──────────────────────────────────────
  async function runAnalysis() {
    const refs = document.getElementById("jm-overlay-root")._refs;
    if (isAnalyzing) return;

    isAnalyzing = true;
    showView(refs, "loading");

    try {
      const job = extractJobDetails();
      if (!job.description || job.description.length < 50) {
        throw new Error("Could not extract job description. Make sure you're on a LinkedIn job page.");
      }

      refs.loadingText.textContent = "Analyzing with DeepSeek AI...";
      const cvText = buildCvText();

      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_JOB",
        jobDescription: job.description,
        cvText: cvText,
      });

      if (!response.success) throw new Error(response.error);

      analysisResult = response.data;
      renderResults(refs, analysisResult);
      showView(refs, "results");
    } catch (err) {
      refs.errorText.textContent = err.message;
      showView(refs, "error");
    } finally {
      isAnalyzing = false;
    }
  }

  // ── Render Results ─────────────────────────────────────
  function renderResults(refs, result) {
    const { matchPercentage, matchedSkills, missingSkills, strengths, gaps, summary } = result;

    // Score with color
    const scoreColor =
      matchPercentage >= 80 ? "#16a34a" : matchPercentage >= 60 ? "#ca8a04" : "#dc2626";
    refs.score.innerHTML = `
      <div class="jm-score-circle" style="border-color:${scoreColor};color:${scoreColor}">
        <span class="jm-score-num">${matchPercentage}%</span>
        <span class="jm-score-label">Match</span>
      </div>
    `;

    refs.matchedSkills.innerHTML = `
      <div class="jm-section-title jm-match">✅ Matched Skills (${matchedSkills.length})</div>
      <div class="jm-tags">${matchedSkills.map((s) => `<span class="jm-tag jm-tag-match">${s}</span>`).join("")}</div>
    `;

    refs.missingSkills.innerHTML = missingSkills.length
      ? `
      <div class="jm-section-title jm-miss">⚠️ Missing Skills (${missingSkills.length})</div>
      <div class="jm-tags">${missingSkills.map((s) => `<span class="jm-tag jm-tag-miss">${s}</span>`).join("")}</div>`
      : "";

    refs.strengths.innerHTML = strengths.length
      ? `
      <div class="jm-section-title">💪 Strengths</div>
      <ul class="jm-list">${strengths.map((s) => `<li>${s}</li>`).join("")}</ul>`
      : "";

    refs.gaps.innerHTML = gaps.length
      ? `
      <div class="jm-section-title">📋 Gaps</div>
      <ul class="jm-list">${gaps.map((g) => `<li>${g}</li>`).join("")}</ul>`
      : "";

    refs.summary.innerHTML = summary
      ? `<div class="jm-summary-box">${summary}</div>`
      : "";
  }

  // ── Save to Sheet ──────────────────────────────────────
  async function saveToSheet() {
    const refs = document.getElementById("jm-overlay-root")._refs;
    if (isSaving) return;

    isSaving = true;
    const saveBtn = refs.saveBtn;
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try {
      const job = extractJobDetails();
      const payload = {
        ...job,
        matchPercentage: analysisResult.matchPercentage,
        matchedSkills: analysisResult.matchedSkills.join(", "),
        missingSkills: analysisResult.missingSkills.join(", "),
        summary: analysisResult.summary,
      };

      const response = await chrome.runtime.sendMessage({
        type: "SAVE_TO_SHEET",
        jobData: payload,
      });

      if (!response.success) throw new Error(response.error);

      saveBtn.textContent = "✅ Saved!";
      saveBtn.classList.add("jm-btn-saved");
      setTimeout(() => {
        saveBtn.textContent = "📊 Save to Sheet";
        saveBtn.classList.remove("jm-btn-saved");
        saveBtn.disabled = false;
      }, 2000);
    } catch (err) {
      saveBtn.textContent = "❌ Failed — Retry";
      saveBtn.disabled = false;
      setTimeout(() => {
        saveBtn.textContent = "📊 Save to Sheet";
      }, 2500);
    } finally {
      isSaving = false;
    }
  }

  // ── View Helpers ───────────────────────────────────────
  function showView(refs, view) {
    refs.initialView.style.display = view === "initial" ? "block" : "none";
    refs.resultsView.style.display = view === "results" ? "block" : "none";
    refs.loadingView.style.display = view === "loading" ? "block" : "none";
    refs.errorView.style.display = view === "error" ? "block" : "none";
  }

  // ── Init ───────────────────────────────────────────────
  function init() {
    // Wait for job content to load
    const checkInterval = setInterval(() => {
      const desc = document.querySelector(
        ".jobs-description__content, .jobs-description-content__text, #job-details, .jobs-box__html-content"
      );
      if (desc && desc.textContent.trim().length > 50) {
        clearInterval(checkInterval);
        createOverlay();
      }
    }, 800);

    // Timeout after 15 seconds
    setTimeout(() => clearInterval(checkInterval), 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
