document.addEventListener("DOMContentLoaded", async () => {
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
