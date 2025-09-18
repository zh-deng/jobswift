// content.js

// ====== Utility functions ======

// Highlight job card with a color
function highlightJobCard(card, color = "yellow") {
  card.style.backgroundColor = color;
  card.style.transition = "background-color 0.2s ease";
}

// Remove highlight
function removeHighlight(card) {
  card.style.backgroundColor = "";
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

// ====== LinkedIn processing ======
async function processLinkedInCard(card) {
  if (card.dataset.highlighterProcessed) return;

  const jobData = extractLinkedInJobData(card);
  if (!jobData || !jobData.jobId) return;

  const storageKey = `job_${jobData.jobId}`;

  const stored = await chrome.storage.local.get(storageKey);
  const jobEntry = stored[storageKey];

  if (jobEntry && jobEntry.job && jobEntry.job.occurrences) {
    if (jobEntry.job.occurrences.linkedin && jobEntry.job.occurrences.xing) {
      highlightJobCard(card, "orange");
      console.log("LinkedIn card tracked on both sites -> orange:", jobData.title);
    } else if (jobEntry.job.occurrences.xing) {
      highlightJobCard(card, "green");
      console.log("LinkedIn card tracked on Xing -> green:", jobData.title);
      attachHoverToAddOccurrence(card, storageKey, "linkedin", jobData);
    } else {
      highlightJobCard(card, "yellow");
      console.log("LinkedIn card only on LinkedIn -> yellow:", jobData.title);
    }
  } else {
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

  if (jobEntry && jobEntry.job && jobEntry.job.occurrences) {
    if (jobEntry.job.occurrences.linkedin && jobEntry.job.occurrences.xing) {
      highlightJobCard(card, "orange");
      console.log("Xing card already tracked on both sites -> orange:", jobData.title);
    } else if (jobEntry.job.occurrences.linkedin) {
      highlightJobCard(card, "green");
      console.log("Xing card tracked on LinkedIn -> green:", jobData.title);
      attachHoverToAddOccurrence(card, storageKey, "xing", jobData);
    } else {
      highlightJobCard(card, "yellow");
      console.log("Xing card only on Xing -> yellow:", jobData.title);
    }
  } else {
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
