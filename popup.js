document.addEventListener("DOMContentLoaded", async () => {
	const jobList = document.getElementById("jobList");
	jobList.innerHTML = "Loading...";

	// Load all jobs from storage
	const storedJobs = await chrome.storage.local.get(null);
	const jobKeys = Object.keys(storedJobs);

	if (jobKeys.length === 0) {
		jobList.innerHTML = "<p>No jobs tracked yet.</p>";
		return;
	}

	jobList.innerHTML = ""; // clear loading

	jobKeys.forEach((key) => {
		const jobObj = storedJobs[key].job;
		const div = document.createElement("div");
		div.className = "job";

		div.innerHTML = `
      <div class="job-title">${jobObj.title}</div>
      <div class="company">${jobObj.company}</div>
      <div class="location">${jobObj.location}</div>
      <div class="occurrences">
        ${
					jobObj.occurrences.linkedin
						? '<span class="linkedin">LinkedIn</span>'
						: ""
				}
        ${jobObj.occurrences.xing ? '<span class="xing">Xing</span>' : ""}
      </div>
    `;

		jobList.appendChild(div);
	});

	const resetBtn = document.getElementById("resetBtn");
	resetBtn.addEventListener("click", async () => {
		await chrome.storage.local.clear(); // Clear storage

		// Update popup
		const jobList = document.getElementById("jobList");
		jobList.innerHTML = "<p>All jobs reset.</p>";

		// Notify all tabs to reset highlights
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			tabs.forEach((tab) => {
				chrome.tabs.sendMessage(tab.id, { action: "resetHighlights" });
			});
		});
	});
});
