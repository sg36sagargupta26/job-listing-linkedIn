// Content script — runs on LinkedIn job pages
(function () {
  "use strict";

  if (window.__jobMatcherInjected) return;
  window.__jobMatcherInjected = true;

  let analysisResult = null;
  let isAnalyzing = false;
  let isSaving = false;

  // ── DOM Extraction (robust, many fallbacks) ────────────
  function extractJobDetails() {
    // Helper: try each selector until one matches
    const find = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) return el.textContent.trim();
      }
      return "";
    };

    // Also try finding by visible text patterns
    const findInPage = (patterns) => {
      const all = document.body.querySelectorAll("h1, h2, h3, span, div, a, p, section");
      for (const pat of patterns) {
        for (const el of all) {
          if (el.textContent.toLowerCase().includes(pat.toLowerCase()) && el.textContent.trim().length < 200) {
            return el.textContent.trim();
          }
        }
      }
      return "";
    };

    const title =
      find([
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
        ".job-details-jobs-unified-top-card__job-title",
        ".topcard__title",
        ".top-card-layout__title",
        "h1",
      ]) || findInPage(["engineer", "developer", "manager", "architect"]) || document.title.replace(" | LinkedIn", "").trim();

    const company =
      find([
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".topcard__org-name-link",
        ".top-card-layout__subtitle",
        '[class*="company-name"]',
      ]);

    const location =
      find([
        ".job-details-jobs-unified-top-card__bullet",
        ".jobs-unified-top-card__bullet",
        ".topcard__flavor--bullet",
        '[class*="location"]',
        ".job-details-jobs-unified-top-card__primary-description-container span",
      ]);

    // Clean location (remove posted date junk)
    const cleanLocation = location.replace(/\s*·\s*.*$/, "").trim();

    const postedDate =
      find([
        ".jobs-unified-top-card__posted-date",
        ".job-details-jobs-unified-top-card__primary-description-container span.t-black--light:last-of-type",
        ".topcard__flavor--status",
      ]);

    // Description: try specific selectors first, then grab the largest text block
    let description =
      find([
        ".jobs-description__content",
        ".jobs-description-content",
        ".jobs-description-content__text",
        "#job-details",
        ".jobs-box__html-content",
        "article.jobs-description",
        ".show-more-less-html__markup",
        ".description__text",
        '[class*="description"]',
      ]);

    // Fallback: get the main content area (largest text block on page)
    if (!description || description.length < 100) {
      let best = "";
      document.querySelectorAll("section, article, div").forEach((el) => {
        const text = el.textContent.trim();
        if (text.length > best.length && text.length < 20000 && !el.closest("nav, header, footer, script, style")) {
          best = text;
        }
      });
      description = best;
    }

    return {
      title: title || "(untitled)",
      company: company || "(unknown)",
      location: cleanLocation || "(unknown)",
      postedDate: postedDate || "",
      description: description || "",
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
    };
  }

  // ── CV Text ─────────────────────────────────────────
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

Summary: ${cv.summary}`.trim();
  }

  // ── UI ───────────────────────────────────────────────
  function createOverlay() {
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
            <button id="jm-save-btn" class="jm-btn jm-btn-success">📊 Save to Sheet</button>
            <div id="jm-matched-skills"></div>
            <div id="jm-missing-skills"></div>
            <div id="jm-strengths"></div>
            <div id="jm-gaps"></div>
            <div id="jm-summary"></div>
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

    // ── Prevent scroll propagation ────────────────────
    const panelBody = root.querySelector("#jm-panel-body");
    panelBody.addEventListener("wheel", (e) => {
      const { scrollTop, scrollHeight, clientHeight } = panelBody;
      const atTop = scrollTop === 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (e.deltaY < 0 && atTop) {
        e.preventDefault(); // at top, scrolling up — block
      } else if (e.deltaY > 0 && atBottom) {
        e.preventDefault(); // at bottom, scrolling down — block
      } else {
        e.stopPropagation(); // scrolling within panel — don't leak to page
      }
    }, { passive: false });

    const floatingBtn = root.querySelector("#jm-floating-btn");
    const panel = root.querySelector("#jm-panel");
    const closeBtn = root.querySelector("#jm-close-btn");

    floatingBtn.addEventListener("click", () => {
      panel.style.display = "block";
      floatingBtn.style.display = "none";
    });

    closeBtn.addEventListener("click", () => {
      panel.style.display = "none";
      floatingBtn.style.display = "flex";
    });

    root.querySelector("#jm-analyze-btn").addEventListener("click", runAnalysis);
    root.querySelector("#jm-retry-btn").addEventListener("click", runAnalysis);
    root.querySelector("#jm-save-btn").addEventListener("click", saveToSheet);

    // Store refs on root for later
    root._refs = {
      floatingBtn, panel,
      analyzeBtn: root.querySelector("#jm-analyze-btn"),
      saveBtn: root.querySelector("#jm-save-btn"),
      retryBtn: root.querySelector("#jm-retry-btn"),
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

    console.log("[JobMatcher] Overlay injected. Ready on:", window.location.href);
  }

  // ── Analysis ─────────────────────────────────────────
  async function runAnalysis() {
    const root = document.getElementById("jm-overlay-root");
    if (!root || isAnalyzing) return;
    const refs = root._refs;

    isAnalyzing = true;
    showView(refs, "loading");

    try {
      const job = extractJobDetails();
      console.log("[JobMatcher] Extracted job:", job.title, "@", job.company, "| desc length:", job.description.length);

      if (!job.description || job.description.length < 50) {
        throw new Error("Could not extract enough job description text. Try scrolling down to load the full job description first.");
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
      console.log("[JobMatcher] Analysis complete:", analysisResult.matchPercentage + "%");
    } catch (err) {
      console.error("[JobMatcher] Error:", err.message);
      refs.errorText.textContent = err.message;
      showView(refs, "error");
    } finally {
      isAnalyzing = false;
    }
  }

  // ── Render ───────────────────────────────────────────
  function renderResults(refs, result) {
    const { matchPercentage, matchedSkills, missingSkills, strengths, gaps, summary } = result;
    const scoreColor = matchPercentage >= 80 ? "#16a34a" : matchPercentage >= 60 ? "#ca8a04" : "#dc2626";

    refs.score.innerHTML = `
      <div class="jm-score-circle" style="border-color:${scoreColor};color:${scoreColor}">
        <span class="jm-score-num">${matchPercentage}%</span>
        <span class="jm-score-label">Match</span>
      </div>`;

    refs.matchedSkills.innerHTML = `
      <div class="jm-section-title jm-match">✅ Matched (${matchedSkills.length})</div>
      <div class="jm-tags">${matchedSkills.map((s) => `<span class="jm-tag jm-tag-match">${s}</span>`).join("")}</div>`;

    refs.missingSkills.innerHTML = missingSkills.length
      ? `<div class="jm-section-title jm-miss">⚠️ Missing (${missingSkills.length})</div>
         <div class="jm-tags">${missingSkills.map((s) => `<span class="jm-tag jm-tag-miss">${s}</span>`).join("")}</div>`
      : "";

    refs.strengths.innerHTML = strengths.length
      ? `<div class="jm-section-title">💪 Strengths</div>
         <ul class="jm-list">${strengths.map((s) => `<li>${s}</li>`).join("")}</ul>`
      : "";

    refs.gaps.innerHTML = gaps.length
      ? `<div class="jm-section-title">📋 Gaps</div>
         <ul class="jm-list">${gaps.map((g) => `<li>${g}</li>`).join("")}</ul>`
      : "";

    refs.summary.innerHTML = summary ? `<div class="jm-summary-box">${summary}</div>` : "";
  }

  // ── Save ─────────────────────────────────────────────
  async function saveToSheet() {
    const root = document.getElementById("jm-overlay-root");
    if (!root || isSaving) return;
    const refs = root._refs;

    isSaving = true;
    const btn = refs.saveBtn;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
      const job = extractJobDetails();
      const payload = {
        ...job,
        matchPercentage: analysisResult.matchPercentage,
        matchedSkills: (analysisResult.matchedSkills || []).join(", "),
        missingSkills: (analysisResult.missingSkills || []).join(", "),
        summary: analysisResult.summary,
      };

      const response = await chrome.runtime.sendMessage({
        type: "SAVE_TO_SHEET",
        jobData: payload,
      });

      if (!response.success) throw new Error(response.error);

      btn.textContent = "✅ Saved!";
      setTimeout(() => {
        btn.textContent = "📊 Save to Sheet";
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      btn.textContent = "❌ Failed — Retry";
      btn.disabled = false;
      setTimeout(() => { btn.textContent = "📊 Save to Sheet"; }, 2500);
    } finally {
      isSaving = false;
    }
  }

  // ── Helpers ──────────────────────────────────────────
  function showView(refs, view) {
    refs.initialView.style.display = view === "initial" ? "block" : "none";
    refs.resultsView.style.display = view === "results" ? "block" : "none";
    refs.loadingView.style.display = view === "loading" ? "block" : "none";
    refs.errorView.style.display = view === "error" ? "block" : "none";
  }

  // ── Init (aggressive — inject button immediately) ────
  let lastUrl = window.location.href;

  function init() {
    console.log("[JobMatcher] Initializing on:", window.location.href);
    lastUrl = window.location.href;
    createOverlay();
  }

  // ── SPA navigation detection (LinkedIn doesn't reload) ──
  // Monitor URL changes every second
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      console.log("[JobMatcher] SPA navigation detected:", window.location.href);
      lastUrl = window.location.href;
      // Reset all state
      analysisResult = null;
      isAnalyzing = false;
      isSaving = false;
      // Re-inject fresh overlay
      createOverlay();
    }
  }, 1000);

  // Also watch for overlay removal (LinkedIn might strip our DOM)
  const observer = new MutationObserver(() => {
    const existing = document.getElementById("jm-overlay-root");
    if (!existing) {
      console.log("[JobMatcher] Overlay removed by page, re-injecting");
      analysisResult = null;
      isAnalyzing = false;
      isSaving = false;
      createOverlay();
    }
  });
  observer.observe(document.body, { childList: true, subtree: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
