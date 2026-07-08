// State Management
let appState = {
    title: "BigQuery Release Notes",
    entries: [],
    filteredEntries: [],
    activeFilter: "all",
    searchQuery: "",
    theme: "dark",
    lastFetched: ""
};

// Tweet Composer Config
const TWEET_LIMIT = 280;
const CIRCLE_RADIUS = 12;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// DOM Elements
const elements = {
    themeToggleBtn: document.getElementById("btn-theme-toggle"),
    sunIcon: document.querySelector(".icon-sun"),
    moonIcon: document.querySelector(".icon-moon"),
    refreshBtn: document.getElementById("btn-refresh"),
    refreshSpinner: document.getElementById("refresh-spinner"),
    lastUpdatedText: document.getElementById("last-updated-text"),
    searchInput: document.getElementById("search-input"),
    searchClearBtn: document.getElementById("search-clear"),
    filterChips: document.querySelectorAll(".filter-chip"),
    timelineFeed: document.getElementById("timeline-feed"),
    feedSkeletons: document.getElementById("feed-skeletons"),
    feedError: document.getElementById("feed-error"),
    errorMessage: document.getElementById("error-message"),
    feedEmpty: document.getElementById("feed-empty"),
    btnRetry: document.getElementById("btn-retry"),
    
    // Stats
    statTotalReleases: document.getElementById("stat-total-releases"),
    statFeatures: document.getElementById("stat-features"),
    statChanges: document.getElementById("stat-changes"),
    statOthers: document.getElementById("stat-others"),

    // Modal
    tweetModal: document.getElementById("tweet-modal"),
    tweetTextarea: document.getElementById("tweet-textarea"),
    progressCircle: document.getElementById("progress-circle"),
    charCountText: document.getElementById("char-count-text"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCancelTweet: document.getElementById("btn-cancel-tweet"),
    btnSubmitTweet: document.getElementById("btn-submit-tweet")
};

// -----------------------------------------
// Initialization
// -----------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    fetchReleaseNotes();
    setupEventListeners();
    initProgressRing();
});

function setupEventListeners() {
    // Theme Toggle
    elements.themeToggleBtn.addEventListener("click", toggleTheme);

    // Refresh Release Notes
    elements.refreshBtn.addEventListener("click", () => fetchReleaseNotes(true));
    elements.btnRetry.addEventListener("click", () => fetchReleaseNotes(true));

    // Search input
    elements.searchInput.addEventListener("input", (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        toggleSearchClearBtn();
        renderTimeline();
    });

    elements.searchClearBtn.addEventListener("click", () => {
        elements.searchInput.value = "";
        appState.searchQuery = "";
        toggleSearchClearBtn();
        renderTimeline();
        elements.searchInput.focus();
    });

    // Filter Chips
    elements.filterChips.forEach(chip => {
        chip.addEventListener("click", () => {
            elements.filterChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            appState.activeFilter = chip.getAttribute("data-type");
            renderTimeline();
        });
    });

    // Tweet Modal actions
    elements.btnCloseModal.addEventListener("click", hideTweetModal);
    elements.btnCancelTweet.addEventListener("click", hideTweetModal);
    elements.tweetTextarea.addEventListener("input", updateCharacterCount);
    
    // Close modal when clicking outside
    elements.tweetModal.addEventListener("click", (e) => {
        if (e.target === elements.tweetModal) {
            hideTweetModal();
        }
    });
}

// -----------------------------------------
// Theme management
// -----------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
}

function setTheme(theme) {
    appState.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    if (theme === "dark") {
        elements.sunIcon.style.display = "block";
        elements.moonIcon.style.display = "none";
    } else {
        elements.sunIcon.style.display = "none";
        elements.moonIcon.style.display = "block";
    }
}

function toggleTheme() {
    const nextTheme = appState.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
}

// -----------------------------------------
// Search Helper
// -----------------------------------------
function toggleSearchClearBtn() {
    if (appState.searchQuery.length > 0) {
        elements.searchClearBtn.style.display = "block";
    } else {
        elements.searchClearBtn.style.display = "none";
    }
}

// -----------------------------------------
// Fetch Release Notes
// -----------------------------------------
async function fetchReleaseNotes(force = false) {
    showLoadingState();
    
    try {
        const response = await fetch(`/api/releases?force=${force}`);
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const resData = await response.json();
        if (resData.status === "error") {
            throw new Error(resData.message);
        }
        
        // Save to state
        appState.title = resData.data.title;
        appState.entries = resData.data.entries;
        appState.lastFetched = resData.data.last_fetched;

        // Update stats
        updateStats();
        
        // Render timeline
        renderTimeline();
        
        // Update header status
        elements.lastUpdatedText.textContent = `Last checked: ${appState.lastFetched}`;
        showSuccessState();
    } catch (error) {
        console.error("Error fetching release notes:", error);
        elements.errorMessage.textContent = error.message || "Failed to load release notes. Please check the backend connection.";
        showErrorState();
    }
}

function showLoadingState() {
    elements.refreshSpinner.classList.add("spinning");
    elements.refreshBtn.disabled = true;
    elements.feedSkeletons.style.display = "block";
    elements.timelineFeed.style.display = "none";
    elements.feedError.style.display = "none";
    elements.feedEmpty.style.display = "none";
    
    const dot = document.querySelector(".status-dot");
    dot.classList.add("loading");
    elements.lastUpdatedText.textContent = "Fetching latest releases...";
}

function showSuccessState() {
    elements.refreshSpinner.classList.remove("spinning");
    elements.refreshBtn.disabled = false;
    elements.feedSkeletons.style.display = "none";
    elements.timelineFeed.style.display = "block";
    
    const dot = document.querySelector(".status-dot");
    dot.classList.remove("loading");
}

function showErrorState() {
    elements.refreshSpinner.classList.remove("spinning");
    elements.refreshBtn.disabled = false;
    elements.feedSkeletons.style.display = "none";
    elements.timelineFeed.style.display = "none";
    elements.feedError.style.display = "block";
    
    const dot = document.querySelector(".status-dot");
    dot.classList.remove("loading");
}

// -----------------------------------------
// Stats Calculation
// -----------------------------------------
function updateStats() {
    let totalDays = appState.entries.length;
    let featuresCount = 0;
    let changesCount = 0;
    let othersCount = 0;

    appState.entries.forEach(entry => {
        entry.updates.forEach(update => {
            const type = update.type.toLowerCase();
            if (type.includes("feature")) {
                featuresCount++;
            } else if (type.includes("change") || type.includes("fix")) {
                changesCount++;
            } else {
                othersCount++;
            }
        });
    });

    elements.statTotalReleases.textContent = totalDays;
    elements.statFeatures.textContent = featuresCount;
    elements.statChanges.textContent = changesCount;
    elements.statOthers.textContent = othersCount;
}

// -----------------------------------------
// Render Timeline & Filtering
// -----------------------------------------
function renderTimeline() {
    elements.timelineFeed.innerHTML = "";
    let visibleEntriesCount = 0;

    appState.entries.forEach((entry, entryIndex) => {
        // Filter the updates in this entry
        const filteredUpdates = entry.updates.filter(update => {
            // Category Filter
            let matchesCategory = true;
            if (appState.activeFilter !== "all") {
                matchesCategory = update.type.toLowerCase().includes(appState.activeFilter);
            }

            // Search Query Filter
            let matchesSearch = true;
            if (appState.searchQuery) {
                const typeText = update.type.toLowerCase();
                const contentText = update.content_text.toLowerCase();
                const dateText = entry.date.toLowerCase();
                matchesSearch = typeText.includes(appState.searchQuery) || 
                                contentText.includes(appState.searchQuery) ||
                                dateText.includes(appState.searchQuery);
            }

            return matchesCategory && matchesSearch;
        });

        // Only render the entry group if it has matching updates
        if (filteredUpdates.length > 0) {
            visibleEntriesCount++;
            
            const timelineGroup = document.createElement("div");
            timelineGroup.className = "timeline-group";
            timelineGroup.style.animationDelay = `${visibleEntriesCount * 0.05}s`;

            // Node on the timeline
            const node = document.createElement("div");
            node.className = "timeline-node";
            timelineGroup.appendChild(node);

            // Date Title
            const dateTitle = document.createElement("h2");
            dateTitle.className = "timeline-date";
            
            const dateText = document.createTextNode(entry.date);
            dateTitle.appendChild(dateText);

            if (entry.link) {
                const linkAnchor = document.createElement("a");
                linkAnchor.href = entry.link;
                linkAnchor.target = "_blank";
                linkAnchor.className = "entry-link";
                linkAnchor.title = "View Official Release Notes";
                linkAnchor.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                `;
                dateTitle.appendChild(linkAnchor);
            }
            timelineGroup.appendChild(dateTitle);

            // Cards container
            const cardsContainer = document.createElement("div");
            cardsContainer.className = "timeline-cards";

            // Render each filtered update as a card
            filteredUpdates.forEach((update, updateIndex) => {
                const card = document.createElement("article");
                
                // Determine CSS modifier class based on update type
                let typeClass = "card-update";
                const typeLower = update.type.toLowerCase();
                if (typeLower.includes("feature")) typeClass = "card-feature";
                else if (typeLower.includes("change")) typeClass = "card-change";
                else if (typeLower.includes("deprecation")) typeClass = "card-deprecation";
                else if (typeLower.includes("note")) typeClass = "card-note";

                card.className = `release-card ${typeClass}`;

                // Header with Badge
                const cardHeader = document.createElement("div");
                cardHeader.className = "release-card-header";
                
                let badgeClass = "badge-update";
                if (typeLower.includes("feature")) badgeClass = "badge-feature";
                else if (typeLower.includes("change")) badgeClass = "badge-change";
                else if (typeLower.includes("deprecation")) badgeClass = "badge-deprecation";
                else if (typeLower.includes("note")) badgeClass = "badge-note";

                cardHeader.innerHTML = `<span class="badge ${badgeClass}">${update.type}</span>`;
                card.appendChild(cardHeader);

                // Body
                const cardBody = document.createElement("div");
                cardBody.className = "release-card-body";
                cardBody.innerHTML = update.content_html;
                card.appendChild(cardBody);

                // Footer (Action)
                const cardFooter = document.createElement("div");
                cardFooter.className = "release-card-footer";
                
                const tweetBtn = document.createElement("button");
                tweetBtn.className = "btn btn-secondary btn-sm";
                tweetBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                    <span>Tweet Update</span>
                `;
                
                // Add event handler to open Tweet Modal
                tweetBtn.addEventListener("click", () => {
                    openTweetComposer(entry.date, update.type, update.content_text, entry.link);
                });

                cardFooter.appendChild(tweetBtn);
                card.appendChild(cardFooter);

                cardsContainer.appendChild(card);
            });

            timelineGroup.appendChild(cardsContainer);
            elements.timelineFeed.appendChild(timelineGroup);
        }
    });

    // Toggle Empty State UI
    if (visibleEntriesCount === 0) {
        elements.feedEmpty.style.display = "block";
        elements.timelineFeed.style.display = "none";
    } else {
        elements.feedEmpty.style.display = "none";
        elements.timelineFeed.style.display = "block";
    }
}

// -----------------------------------------
// Tweet Composer & Modal Logic
// -----------------------------------------
function initProgressRing() {
    elements.progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
    elements.progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

function openTweetComposer(date, type, text, link) {
    // Generate draft text
    // We want the text to summarize nicely. Clean formatting.
    // Length calculations:
    // "🚀 BigQuery Update - [Feature] (July 06, 2026):\n" -> ~48 chars
    // "\n\nDetails: [link]" -> ~35 chars
    // Total prefix/suffix is ~83 characters. This leaves ~197 characters for the description.
    
    const prefix = `🚀 BigQuery [${type}] (${date}):\n\n`;
    const suffix = link ? `\n\nDetails: ${link}` : "";
    
    // Clean text by shortening double newlines and trim
    let cleanText = text.replace(/\s+/g, " ").trim();
    
    // Simple summary truncator for default draft
    const availableLength = TWEET_LIMIT - prefix.length - suffix.length;
    if (cleanText.length > availableLength) {
        cleanText = cleanText.substring(0, availableLength - 3) + "...";
    }
    
    const fullDraft = `${prefix}${cleanText}${suffix}`;
    
    elements.tweetTextarea.value = fullDraft;
    elements.tweetModal.style.display = "flex";
    elements.tweetTextarea.focus();
    
    // Set cursor to start of details, or just at the end
    elements.tweetTextarea.setSelectionRange(fullDraft.length, fullDraft.length);
    
    updateCharacterCount();
}

function hideTweetModal() {
    elements.tweetModal.style.display = "none";
}

function updateCharacterCount() {
    const text = elements.tweetTextarea.value;
    const charCount = text.length;
    const remaining = TWEET_LIMIT - charCount;
    
    elements.charCountText.textContent = remaining;
    
    // Update SVG progress ring
    const percentage = Math.min(charCount / TWEET_LIMIT, 1);
    const offset = CIRCLE_CIRCUMFERENCE - (percentage * CIRCLE_CIRCUMFERENCE);
    elements.progressCircle.style.strokeDashoffset = offset;
    
    // Styling indicators based on character budget
    if (remaining < 0) {
        elements.progressCircle.classList.remove("warning");
        elements.progressCircle.classList.add("error");
        elements.charCountText.style.color = "var(--color-deprecation)";
        elements.btnSubmitTweet.disabled = true;
    } else if (remaining <= 20) {
        elements.progressCircle.classList.remove("error");
        elements.progressCircle.classList.add("warning");
        elements.charCountText.style.color = "var(--color-note)";
        elements.btnSubmitTweet.disabled = false;
    } else {
        elements.progressCircle.classList.remove("error");
        elements.progressCircle.classList.remove("warning");
        elements.charCountText.style.color = "var(--text-muted)";
        elements.btnSubmitTweet.disabled = false;
    }
    
    // Update actual submit button click handler with fresh text
    elements.btnSubmitTweet.onclick = () => {
        const tweetText = elements.tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, "_blank");
        hideTweetModal();
    };
}
