/**
 * Audiobookbay Magnet Link Enhancer
 *
 * This script enhances audiobookbay.com pages by:
 * 1. Extracting torrent information (info hash and trackers) directly from the page.
 * 2. Constructing a complete magnet link.
 * 3. Adding a "Magnet Download" link and "Copy to Clipboard" / "Append to Clipboard" buttons
 *    near the post title for easy access.
 * 4. Providing user feedback for clipboard actions.
 * 5. Overriding the existing magnet link on the page to use the fully constructed one,
 *    ensuring it works even if the user is not logged in.
 */

// Base prefix for all magnet links.
const magnetPrefix = "magnet:?xt=urn:btih:";
// Prefix for adding tracker parameters to the magnet link.
const magnetTrackerPrefix = "&tr=";

// SVG Icon definitions used for the buttons.
// Using innerHTML with SVG strings is a common way to embed SVGs directly in JavaScript.
const linkSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'; // SVG icon for the 'link' button, representing magnet download.
const clipboardSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>'; // SVG icon for the 'copy' button.
const plusCircleSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'; // SVG icon for the 'append' (plus circle) button.

// Main DOM element selections from the audiobookbay page.
const title = document.querySelector(".postTitle"); // The main title of the audiobook post.
const magnetLink = document.querySelector("#magnetLink"); // The existing magnet link element on the page.
const torrent_info = document.querySelector(".torrent_info"); // The table containing torrent details like trackers and info hash.

// Variables for tracker and hash extraction. These will be populated by parsing the torrent_info table.
let trackers = []; // Stores an array of tracker URLs.
let hash = null;   // Stores the torrent info hash.

// Iterate over table rows within the .torrent_info element to find trackers and the info hash.
// The script assumes a specific structure for this table.
for (let i = 0; i < torrent_info.children[0].children.length; i++) {
	const element = torrent_info.children[0].children[i]; // Each row in the table.
	const rowName = element.children[0].innerHTML; // The first cell (header) of the row.

	// Check if the row is a tracker row.
	if (rowName == "Tracker:" || rowName == "Announce URL:") {
		trackers.push(element.children[1].innerHTML); // Add the tracker URL from the second cell.
	} else if (rowName == "Info Hash:") {
		// If it's the info hash row, store the hash.
		hash = element.children[1].innerHTML;
		break; // Info hash is usually the last relevant piece of info, so we can stop parsing.
	}
}

// Construct the full magnet link using the extracted hash and title for the 'dn' (display name) parameter.
let link = magnetPrefix + hash + "&dn=" + title.children[0].innerHTML;

// Append all found trackers to the magnet link.
if (trackers.length > 0) {
	link += `&tr=${trackers.join("&tr=")}`; // Each tracker is prefixed with '&tr='.
}

// --- UI Element Creation and Setup ---
// This section dynamically creates the new UI elements (buttons and feedback span).

// Create a container (div) to group the new buttons for a "pill" shape look.
const buttonGroup = document.createElement('div');
buttonGroup.style.backgroundColor = '#f0f0f0'; // Light gray background for the group.
buttonGroup.style.borderRadius = '20px'; // Rounded corners for the pill shape.
buttonGroup.style.display = 'inline-flex'; // Allows buttons to sit side-by-side.
buttonGroup.style.padding = '3px'; // Small padding inside the group.
buttonGroup.style.alignItems = 'center'; // Vertically align items within the group.
buttonGroup.style.marginBottom = '5px'; // Space between the title and the button group.

// Create the "Magnet Download" link element (<a> tag).
const a = document.createElement("a");
a.href = link; // Set the constructed magnet link as the href.
// title.parentNode.insertBefore(a, title) // Comment: Will be appended to buttonGroup later.
a.innerHTML = linkSVG; // Set the SVG icon as the content.
a.title = "Magnet Download"; // Tooltip text on hover.
a.style.textDecoration = "none"; // Remove default link underline.
a.style.padding = "5px"; // Padding around the icon.
a.style.border = "none"; // No border for a cleaner look.
a.style.background = "transparent"; // Transparent background.
a.style.borderTopLeftRadius = '17px'; // Rounded top-left corner for the first button in group.
a.style.borderBottomLeftRadius = '17px'; // Rounded bottom-left corner.
a.style.lineHeight = "1"; // Helps with vertical alignment of the icon.

// Hover effect for visual feedback.
a.onmouseover = function () { this.style.backgroundColor = '#e0e0e0'; };
a.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

// Style the SVG icon within the "Magnet Download" link.
const aSvg = a.querySelector('svg');
if (aSvg) {
	aSvg.style.width = "16px"; // Set icon width.
	aSvg.style.height = "16px"; // Set icon height.
	aSvg.style.verticalAlign = "middle"; // Align icon nicely with text (if any).
	aSvg.style.stroke = "#217e78"; // Set icon color.
}

// Create the "Copy to Clipboard" button element.
const copyButton = document.createElement("button");
copyButton.id = "copyToClipboardButton"; // ID for potential future use.
copyButton.innerHTML = clipboardSVG; // Set the SVG icon.
copyButton.title = "Copy to Clipboard"; // Tooltip text.
copyButton.style.background = "transparent"; // Transparent background.
copyButton.style.border = "none"; // No border.
copyButton.style.padding = "5px"; // Padding around the icon.
copyButton.style.cursor = "pointer"; // Change cursor to indicate it's clickable.
copyButton.style.borderRadius = "0"; // No border radius for middle button in group.
copyButton.style.lineHeight = "1"; // Helps with icon alignment.

// Hover effect.
copyButton.onmouseover = function () { this.style.backgroundColor = '#e0e0e0'; };
copyButton.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

// Style the SVG icon within the "Copy to Clipboard" button.
const copySvg = copyButton.querySelector('svg');
if (copySvg) {
	copySvg.style.width = "16px";
	copySvg.style.height = "16px";
	copySvg.style.verticalAlign = "middle";
	copySvg.style.stroke = "#217e78"; // Icon color.
}

// Create the "Append to Clipboard" button element.
const appendButton = document.createElement("button");
appendButton.id = "appendToClipboardButton"; // ID for potential future use.
appendButton.innerHTML = plusCircleSVG; // Set the SVG icon.
appendButton.title = "Append to Clipboard"; // Tooltip text.
appendButton.style.background = "transparent";
appendButton.style.border = "none";
appendButton.style.padding = "5px";
appendButton.style.cursor = "pointer";
appendButton.style.lineHeight = "1"; // Icon alignment.
appendButton.style.borderTopRightRadius = '17px'; // Rounded top-right corner for last button.
appendButton.style.borderBottomRightRadius = '17px'; // Rounded bottom-right corner.

// Hover effect.
appendButton.onmouseover = function () { this.style.backgroundColor = '#e0e0e0'; };
appendButton.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

// Style the SVG icon within the "Append to Clipboard" button.
const appendSvg = appendButton.querySelector('svg');
if (appendSvg) {
	appendSvg.style.width = "16px";
	appendSvg.style.height = "16px";
	appendSvg.style.verticalAlign = "middle";
	appendSvg.style.stroke = "#217e78"; // Icon color.
}

// Add the created buttons to the buttonGroup container.
buttonGroup.appendChild(a);
buttonGroup.appendChild(copyButton);
buttonGroup.appendChild(appendButton);

// Insert the entire buttonGroup into the DOM, before the post title.
title.parentNode.insertBefore(buttonGroup, title);

// Create a <span> element to display feedback messages (e.g., "Copied!").
const feedbackSpan = document.createElement('span');
feedbackSpan.id = 'magnetFeedbackMessage'; // ID for potential styling/selection.
feedbackSpan.style.marginLeft = '10px'; // Space between button group and feedback message.
feedbackSpan.style.fontSize = '0.9em'; // Slightly smaller font size.
feedbackSpan.style.color = '#217e78'; // Text color matching the icon stroke.
feedbackSpan.textContent = ''; // Initially empty.
feedbackSpan.style.opacity = '0'; // Start invisible for fade-in effect.
// feedbackSpan.style.transition = 'opacity 1s ease-out'; // Comment: Transition is now set dynamically by showFeedbackMessage.
// Insert the feedbackSpan into the DOM, after the buttonGroup.
buttonGroup.parentNode.insertBefore(feedbackSpan, buttonGroup.nextSibling);

// --- Helper Functions ---

// Utility function to create a delay using a Promise. Useful for async/await sequences.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Variable to store the timeout ID for the feedback message sequence.
// This allows interrupting an ongoing feedback message if a new one needs to be shown.
let feedbackTimeoutId = null;

/**
 * Displays a message to the user with a timed fade-in and fade-out effect.
 * Manages its own timeouts to ensure messages don't overlap incorrectly.
 * @param {string} message - The message to display.
 */
async function showFeedbackMessage(message) {
	// If there's an existing feedback message sequence, clear its timeout
	// to prevent it from completing (e.g., clearing text too early).
	if (feedbackTimeoutId) {
		clearTimeout(feedbackTimeoutId);
	}

	feedbackSpan.textContent = message; // Set the message text.
	// Set transition for fade-in (0.2 seconds).
	feedbackSpan.style.transition = 'opacity 0.2s ease-in';
	feedbackSpan.style.opacity = '1'; // Make the message visible (triggers fade-in).

	// This timeout controls how long the message is fully visible and when to start fading out.
	// Total duration: 0.2s (fade-in) + 4s (visible) = 4.2s.
	feedbackTimeoutId = setTimeout(async () => {
		// Set transition for fade-out (0.65 seconds).
		feedbackSpan.style.transition = 'opacity 0.65s ease-out';
		feedbackSpan.style.opacity = '0'; // Start fading out.

		// Wait for the fade-out animation (0.65s) to complete.
		await delay(650);

		// After fade-out, if this timeout wasn't cleared by another call to showFeedbackMessage,
		// clear the text content.
		feedbackSpan.textContent = '';
		// feedbackTimeoutId = null; // Optional: Reset the ID after full completion.
	}, 4000 + 200); // 4 seconds visible + 0.2s for initial fade-in to complete.
}

// --- Event Listeners ---
// Assign actions to the buttons when they are clicked.

// Event listener for the "Copy to Clipboard" button.
// Uses async/await for handling the asynchronous clipboard operation.
copyButton.addEventListener('click', async () => {
	try {
		// Attempt to write the magnet link to the clipboard.
		// `await` pauses execution until the promise from writeText resolves or rejects.
		await navigator.clipboard.writeText(link);
		// If successful, show a "Copied!" message.
		showFeedbackMessage("Copied!");
	} catch (err) {
		// If there's an error (e.g., permission denied, API not supported), log it and show an error message.
		console.error('Error copying to clipboard:', err);
		showFeedbackMessage("Error copying!");
	}
});

// Event listener for the "Append to Clipboard" button.
// Uses async/await for more complex asynchronous clipboard read and write operations.
appendButton.addEventListener('click', async () => {
	let existingText = ''; // Variable to store current clipboard content.
	try {
		// Attempt to read the current text from the clipboard.
		existingText = await navigator.clipboard.readText();
	} catch (err) {
		// If reading fails (e.g., no permission, or clipboard is not text),
		// log a warning and proceed as if the clipboard was empty.
		console.warn('Could not read clipboard, treating as empty:', err);
		// existingText remains '', so the new link will be copied directly (not appended).
	}

	// Prepare the new content for the clipboard.
	let newClipboardContent = '';
	if (existingText && existingText.trim() !== '') {
		// If clipboard had content, append the new link with a newline separator.
		newClipboardContent = existingText + '\n' + link;
	} else {
		// If clipboard was empty (or treated as such), just use the new link.
		newClipboardContent = link;
	}

	try {
		// Attempt to write the new (potentially appended) content to the clipboard.
		await navigator.clipboard.writeText(newClipboardContent);

		// After successful write, count the number of magnet links in the clipboard.
		const magnetLinks = newClipboardContent.split('\n').filter(line => line.startsWith('magnet:?xt=urn:btih:'));
		const count = magnetLinks.length;

		// Construct the appropriate feedback message.
		let message = '';
		if (newClipboardContent === link) { // Check if it was effectively a copy operation.
			message = `Copied. Clipboard now contains 1 magnet link.`;
		} else {
			message = `Appended. Clipboard now contains ${count} magnet link${count === 1 ? '' : 's'}.`;
		}
		// Display the feedback message.
		showFeedbackMessage(message);
	} catch (err) {
		// If writing to clipboard fails, log the error and show an error message.
		console.error('Error appending to clipboard:', err);
		showFeedbackMessage("Error appending!");
	}
});

// Finally, update the original magnet link on the page (if it exists)
// to use the fully constructed link with all trackers.
// This ensures the main magnet link also works correctly, especially if login is required for the site's default link.
magnetLink.href = link;