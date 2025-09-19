// content.js

// ====== Utility functions ======

// Highlight job card with a color
function highlightJobCard(card, color = "yellow") {
  card.style.backgroundColor = color;
  card.style.transition = "background-color 0.2s ease";
}

function removeSeenJobCardParent(card) {
  card.parentElement.style.display = "none";
}

function removeSeenJobCard(card) {
  card.style.display = "none";
}

// Remove highlight
function removeHighlight(card) {
  card.style.backgroundColor = "";
}

// ====== StepStone job extraction ======
function extractStepStoneJobData(card) {
  try {
    // Extract job title
    const titleEl = card.querySelector('[data-testid="job-item-title"]');
    const title = titleEl ? titleEl.innerText.trim() : "";
    
    // Extract company
    const companyEl = card.querySelector('[data-at="job-item-company-name"]');
    const company = companyEl ? companyEl.innerText.trim() : "";
    
    // Extract location
    const locationEl = card.querySelector('[data-at="job-item-location"]');
    const location = locationEl ? locationEl.innerText.trim() : "";
    
    // Extract job ID from URL or data attributes
    const linkEl = card.querySelector('a[data-testid="job-item-title"]');
    let jobId = null;
    if (linkEl && linkEl.href) {
      // Extract ID from URL like /stellenangebote--Softwaretester-...-12969503-inline.html
      const urlMatch = linkEl.href.match(/(\d+)(?=-inline\.html)/);
      if (urlMatch) {
        jobId = urlMatch[1];
      } else {
        // Fallback: use the article ID
        jobId = card.id.replace('job-item-', '');
      }
    }

    return {
      jobId: jobId,
      title: title,
      company: company,
      location: location
    };
  } catch (err) {
    console.warn("Failed to extract StepStone job data:", err);
    return null;
  }
}

// ====== Arbeitsagentur job extraction ======
function extractArbeitsagenturJobData(card) {
  try {
    // Extract job title
    const titleEl = card.querySelector('.titel-lane .ba-icon-linkout');
    const title = titleEl ? titleEl.innerText.trim() : "";
    
    // Extract company
    const companyEl = card.querySelector('.firma-lane');
    let company = companyEl ? companyEl.innerText.trim() : "";
    // Remove "Arbeitgeber: " prefix if present
    company = company.replace('Arbeitgeber: ', '');
    
    // Extract location
    const locationEl = card.querySelector('[id*="arbeitsort"] span:last-child');
    const location = locationEl ? locationEl.innerText.trim() : "";
    
    // Extract job ID from URL
    const linkEl = card.querySelector('a.ergebnisliste-item');
    let jobId = null;
    if (linkEl && linkEl.href) {
      const urlParts = linkEl.href.split('/');
      jobId = urlParts[urlParts.length - 1]; // Last part of URL
    }

    return {
      jobId: jobId,
      title: title,
      company: company,
      location: location
    };
  } catch (err) {
    console.warn("Failed to extract Arbeitsagentur job data:", err);
    return null;
  }
}

// ====== LinkedIn job extraction ======
function extractLinkedInJobData(card) {
  try {
    const linkEl = card.querySelector("a.job-card-container__link");
    let title = "";
    if (linkEl) {
      const visibleSpan = linkEl.querySelector('span[aria-hidden="true"]');
      if (visibleSpan) title = visibleSpan.innerText.trim();
      if (!title) title = linkEl.innerText.trim();
    }

    const companyEl = card.querySelector("div.artdeco-entity-lockup__subtitle span");
    const locationEl = card.querySelector("div.artdeco-entity-lockup__caption ul li span");

    const jobId = card.dataset.jobId;

    return {
      jobId: jobId || null,
      title: title,
      company: companyEl ? companyEl.innerText.trim() : "",
      location: locationEl ? locationEl.innerText.trim() : ""
    };
  } catch (err) {
    console.warn("Failed to extract LinkedIn job data:", err);
    return null;
  }
}

// ====== Xing job extraction ======
function extractXingJobData(card) {
  try {
    const titleEl = card.querySelector('h2[data-xds="Headline"]');
    const companyEl = card.querySelector('p.job-teaser-list-item-styles__Company-sc-6d7d457f-8');
    const locationEl = card.querySelector('p.job-teaser-list-item-styles__City-sc-6d7d457f-9');
    const hrefEl = card.querySelector('a.card-styles__CardLink-sc-cdebccb7-2');

    return {
      jobId: hrefEl ? hrefEl.getAttribute("href") : null,
      title: titleEl ? titleEl.innerText.trim() : "",
      company: companyEl ? companyEl.innerText.trim() : "",
      location: locationEl ? locationEl.innerText.trim() : ""
    };
  } catch (err) {
    console.warn("Failed to extract Xing job data:", err);
    return null;
  }
}

// ====== Hover logic ======
function attachHoverToAddOccurrence(card, storageKey, site, jobData) {
  const hoverHandler = async () => {
    try {
      const stored = await chrome.storage.local.get(storageKey);
      let entry = stored[storageKey] || { job: { ...jobData, occurrences: {}, savedAt: Date.now() } };

      entry.job.occurrences[site] = jobData.jobId;
      entry.job.savedAt = Date.now();

      await chrome.storage.local.set({ [storageKey]: entry });

      highlightJobCard(card, "yellow");
      console.log(`[${site}] Hover triggered + saved:`, jobData);

      card.removeEventListener("mouseenter", hoverHandler);
    } catch (err) {
      console.error(`Error saving ${site} job on hover:`, err);
    }
  };

  card.addEventListener("mouseenter", hoverHandler);
  console.log(`[${site}] Hover listener applied for card:`, jobData.title);
}

// ====== StepStone processing ======
async function processStepStoneCard(card) {
  if (card.dataset.highlighterProcessed) return;

  const jobData = extractStepStoneJobData(card);
  if (!jobData || !jobData.jobId) return;

  const storageKey = `job_${jobData.jobId}`;

  const stored = await chrome.storage.local.get(storageKey);
  const jobEntry = stored[storageKey];

  if (jobEntry && jobEntry.job) {
    // Job already saved, remove it
    removeSeenJobCard(card);
    console.log("StepStone card already saved -> removed:", jobData.title);
  } else {
    // New job, attach hover handler
    attachHoverToAddOccurrence(card, storageKey, "stepstone", jobData);
    console.log("StepStone hover handler attached for new card:", jobData.title);
  }

  card.dataset.highlighterProcessed = "true";
}

function processAllStepStoneCards() {
  const cards = document.querySelectorAll('article[data-testid="job-item"]');
  console.log("StepStone cards found:", cards.length);
  cards.forEach(card => processStepStoneCard(card));
}

function createStepStoneObserver() {
  const observer = new MutationObserver(mutations => {
    let shouldProcess = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && 
             (node.matches('article[data-testid="job-item"]') || node.querySelector('article[data-testid="job-item"]'))) {
            shouldProcess = true;
            break;
          }
        }
      }
      if (shouldProcess) break;
    }
    if (shouldProcess) {
      clearTimeout(window.stepstoneProcessingTimeout);
      window.stepstoneProcessingTimeout = setTimeout(processAllStepStoneCards, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("StepStone observer initialized");
}

// ====== Arbeitsagentur processing ======
async function processArbeitsagenturCard(card) {
  if (card.dataset.highlighterProcessed) return;

  const jobData = extractArbeitsagenturJobData(card);
  if (!jobData || !jobData.jobId) return;

  const storageKey = `job_${jobData.jobId}`;

  const stored = await chrome.storage.local.get(storageKey);
  const jobEntry = stored[storageKey];

  if (jobEntry && jobEntry.job) {
    // Job already saved, remove it
    removeSeenJobCardParent(card);
    console.log("Arbeitsagentur card already saved -> removed:", jobData.title);
  } else {
    // New job, attach hover handler
    attachHoverToAddOccurrence(card, storageKey, "arbeitsagentur", jobData);
    console.log("Arbeitsagentur hover handler attached for new card:", jobData.title);
  }

  card.dataset.highlighterProcessed = "true";
}

function processAllArbeitsagenturCards() {
  const cards = document.querySelectorAll("jb-job-listen-eintrag");
  console.log("Arbeitsagentur cards found:", cards.length);
  cards.forEach(card => processArbeitsagenturCard(card));
}

function createArbeitsagenturObserver() {
  const observer = new MutationObserver(() => {
    clearTimeout(window.arbeitsagenturProcessingTimeout);
    window.arbeitsagenturProcessingTimeout = setTimeout(processAllArbeitsagenturCards, 100);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("Arbeitsagentur observer initialized");
}

// ====== LinkedIn processing ======
async function processLinkedInCard(card) {
  if (card.dataset.highlighterProcessed) return;

  const jobData = extractLinkedInJobData(card);
  if (!jobData || !jobData.jobId) return;

  const storageKey = `job_${jobData.jobId}`;

  const stored = await chrome.storage.local.get(storageKey);
  const jobEntry = stored[storageKey];

  if (jobEntry && jobEntry.job) {
    // Job already saved, remove it
    removeSeenJobCardParent(card);
    console.log("LinkedIn card already saved -> removed:", jobData.title);
  } else {
    // New job, attach hover handler
    attachHoverToAddOccurrence(card, storageKey, "linkedin", jobData);
    console.log("LinkedIn hover handler attached for new card:", jobData.title);
  }

  card.dataset.highlighterProcessed = "true";
}

function processAllLinkedInCards() {
  const cards = document.querySelectorAll("div.job-card-container");
  console.log("LinkedIn cards found:", cards.length);
  cards.forEach(card => processLinkedInCard(card));
}

function createLinkedInObserver() {
  const observer = new MutationObserver(() => {
    clearTimeout(window.linkedinProcessingTimeout);
    window.linkedinProcessingTimeout = setTimeout(processAllLinkedInCards, 100);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("LinkedIn observer initialized");
}

// ====== Xing processing ======
async function processXingJobCard(card) {
  if (card.dataset.highlighterProcessed) return;

  const jobData = extractXingJobData(card);
  if (!jobData || !jobData.jobId) return;

  const storageKey = `job_${jobData.jobId}`;

  const stored = await chrome.storage.local.get(storageKey);
  const jobEntry = stored[storageKey];

  if (jobEntry && jobEntry.job) {
    // Job already saved, remove it
    removeSeenJobCardParent(card);
    console.log("Xing card already saved -> removed:", jobData.title);
  } else {
    // New job, attach hover handler
    attachHoverToAddOccurrence(card, storageKey, "xing", jobData);
    console.log("Xing hover handler attached for new card:", jobData.title);
  }

  card.dataset.highlighterProcessed = "true";
}

function processAllXingCards() {
  const xingCards = document.querySelectorAll('article[data-xds="Card"]');
  console.log("Xing cards found:", xingCards.length);
  xingCards.forEach(card => processXingJobCard(card));
}

function createXingObserver() {
  const observer = new MutationObserver(mutations => {
    let shouldProcess = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && 
             (node.matches('article[data-xds="Card"]') || node.querySelector('article[data-xds="Card"]'))) {
            shouldProcess = true;
            break;
          }
        }
      }
      if (shouldProcess) break;
    }
    if (shouldProcess) {
      clearTimeout(window.xingProcessingTimeout);
      window.xingProcessingTimeout = setTimeout(processAllXingCards, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("Xing observer initialized");
}

// ====== Init ======
function init() {
  if (location.hostname.includes("linkedin.com")) {
    console.log("🔵 Initializing for LinkedIn");
    processAllLinkedInCards();
    createLinkedInObserver();
  }

  if (location.hostname.includes("xing.com")) {
    console.log("🔴 Initializing for Xing");
    processAllXingCards();
    createXingObserver();
  }

  if (location.hostname.includes("arbeitsagentur.de")) {
    console.log("🟡 Initializing for Arbeitsagentur");
    processAllArbeitsagenturCards();
    createArbeitsagenturObserver();
  }

  if (location.hostname.includes("stepstone.de")) {
    console.log("🔶 Initializing for StepStone");
    processAllStepStoneCards();
    createStepStoneObserver();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}