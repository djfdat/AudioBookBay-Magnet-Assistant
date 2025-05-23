const magnetPrefix = "magnet:?xt=urn:btih:"
const magnetTrackerPrefix = "&tr="

// SVG Icon definitions
const linkSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
const clipboardSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>';
const plusCircleSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';

const title = document.querySelector(".postTitle")
const magnetLink = document.querySelector("#magnetLink")
const torrent_info = document.querySelector(".torrent_info")

let trackers = []
let hash = null

// Iterate over table rows to gather list of trackers
// Info hash is always listed afterwards, conveniently, so break when we find it
for (let i = 0; i < torrent_info.children[0].children.length; i++) {
	const element = torrent_info.children[0].children[i];

	rowName = element.children[0].innerHTML
	if (rowName == "Tracker:" || rowName == "Announce URL:") {
		trackers.push(element.children[1].innerHTML)
	}
	else if (rowName == "Info Hash:") {
		// Found info hash
		hash = element.children[1].innerHTML
		break
	}
}

let link = magnetPrefix + hash + "&dn=" + title.children[0].innerHTML

if (trackers.length > 0) {
	link += `&tr=${trackers.join("&tr=")}`
}

// Create button group container
const buttonGroup = document.createElement('div');
buttonGroup.style.backgroundColor = '#f0f0f0';
buttonGroup.style.borderRadius = '20px';
buttonGroup.style.display = 'inline-flex';
buttonGroup.style.padding = '3px';
buttonGroup.style.alignItems = 'center';
buttonGroup.style.marginBottom = '5px'; // Add some left margin to the group itself

// Create new magnet link at top of page
const a = document.createElement("a")
a.href = link
// title.parentNode.insertBefore(a, title) // Will be appended to buttonGroup
a.innerHTML = linkSVG;
a.title = "Magnet Download";
a.style.textDecoration = "none";
// a.style.color = "#007bff"; // Removed, SVG stroke handles color
// a.style.marginLeft = "5px";  // Removed, group handles spacing
a.style.padding = "5px";
// a.style.borderRadius = "4px"; // Removed, specific corners applied
a.style.border = "none";
a.style.background = "transparent";
a.style.borderTopLeftRadius = '17px';
a.style.borderBottomLeftRadius = '17px';
a.style.lineHeight = "1"; // Ensure icon vertical alignment is good
a.onmouseover = function () { this.style.backgroundColor = '#e0e0e0'; };
a.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

const aSvg = a.querySelector('svg');
if (aSvg) {
	aSvg.style.width = "16px";
	aSvg.style.height = "16px";
	aSvg.style.verticalAlign = "middle"; // Keep for SVGs
	aSvg.style.stroke = "#217e78";
}

// Create "Copy to Clipboard" button
const copyButton = document.createElement("button");
copyButton.id = "copyToClipboardButton";
copyButton.innerHTML = clipboardSVG;
copyButton.title = "Copy to Clipboard";
copyButton.style.background = "transparent";
copyButton.style.border = "none";
copyButton.style.padding = "5px";
copyButton.style.cursor = "pointer";
// copyButton.style.marginLeft = "10px"; // Removed
// copyButton.style.color = "#007bff"; // Removed
copyButton.style.borderRadius = "0";
a.style.lineHeight = "1"; // Ensure icon vertical alignment is good
copyButton.onmouseover = function () { this.style.backgroundColor = '#e0e0e0'; };
copyButton.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

const copySvg = copyButton.querySelector('svg');
if (copySvg) {
	copySvg.style.width = "16px";
	copySvg.style.height = "16px";
	copySvg.style.verticalAlign = "middle"; // Keep for SVGs
	copySvg.style.stroke = "#217e78";
}

// Create "Append to Clipboard" button
const appendButton = document.createElement("button");
appendButton.id = "appendToClipboardButton";
appendButton.innerHTML = plusCircleSVG;
appendButton.title = "Append to Clipboard";
appendButton.style.background = "transparent";
appendButton.style.border = "none";
appendButton.style.padding = "5px";
appendButton.style.cursor = "pointer";
// appendButton.style.marginLeft = "10px"; // Removed
// appendButton.style.color = "#007bff"; // Removed
// appendButton.style.borderRadius = "4px"; // Removed
a.style.lineHeight = "1"; // Ensure icon vertical alignment is good
appendButton.style.borderTopRightRadius = '17px';
appendButton.style.borderBottomRightRadius = '17px';
appendButton.onmouseover = function () { this.style.backgroundColor = '#e0e0e0'; };
appendButton.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

const appendSvg = appendButton.querySelector('svg');
if (appendSvg) {
	appendSvg.style.width = "16px";
	appendSvg.style.height = "16px";
	appendSvg.style.verticalAlign = "middle"; // Keep for SVGs
	appendSvg.style.stroke = "#217e78";
}

// Append buttons to the group
buttonGroup.appendChild(a);
buttonGroup.appendChild(copyButton);
buttonGroup.appendChild(appendButton);

// Insert the group into the DOM
title.parentNode.insertBefore(buttonGroup, title);

// Create and insert feedback message element
const feedbackSpan = document.createElement('span');
feedbackSpan.id = 'magnetFeedbackMessage';
feedbackSpan.style.marginLeft = '10px';
feedbackSpan.style.fontSize = '0.9em';
feedbackSpan.style.color = '#217e78'; // Updated color
feedbackSpan.textContent = '';
feedbackSpan.style.opacity = '0'; // Start invisible for fade-in
// feedbackSpan.style.transition = 'opacity 1s ease-out'; // Removed, will be set dynamically
buttonGroup.parentNode.insertBefore(feedbackSpan, buttonGroup.nextSibling);

let feedbackTimeoutId1 = null; // For visible duration and start of fade-out
let feedbackTimeoutId2 = null; // For clearing text after fade-out

function showFeedbackMessage(message) {
	// Clear any existing feedback timeouts
	if (feedbackTimeoutId1) clearTimeout(feedbackTimeoutId1);
	if (feedbackTimeoutId2) clearTimeout(feedbackTimeoutId2);

	feedbackSpan.textContent = message;

	// --- Fade-in phase (0.2 seconds) ---
	feedbackSpan.style.transition = 'opacity 0.2s ease-in';
	feedbackSpan.style.opacity = '1'; // Start fade-in

	// --- Visible phase (4 seconds) ---
	// Set timeout to start fade-out after fade-in completes + visible duration
	// The 4 seconds of full visibility start AFTER the 0.2s fade-in.
	feedbackTimeoutId1 = setTimeout(() => {
		// --- Fade-out phase (0.65 seconds) ---
		feedbackSpan.style.transition = 'opacity 0.65s ease-out';
		feedbackSpan.style.opacity = '0'; // Start fade-out

		// --- Clear text after fade-out completes ---
		feedbackTimeoutId2 = setTimeout(() => {
			feedbackSpan.textContent = '';
			// feedbackSpan.style.opacity = '0'; // Ensure it's still 0 for the next message's fade-in
		}, 650); // 0.65 seconds for fade-out
	}, 4000 + 200); // 4 seconds visible + 0.2s for initial fade-in
}


// Event listener for "Copy to Clipboard" button
copyButton.addEventListener('click', () => {
	navigator.clipboard.writeText(link).then(() => {
		showFeedbackMessage("Copied!");
	}).catch(err => {
		console.error('Failed to copy text: ', err);
		showFeedbackMessage("Error copying!");
	});
});

// Event listener for "Append to Clipboard" button
appendButton.addEventListener('click', () => {
	navigator.clipboard.readText()
		.then(existingText => {
			let newClipboardContent = '';
			if (existingText && existingText.trim() !== '') {
				newClipboardContent = existingText + '\n' + link;
			} else {
				newClipboardContent = link;
			}
			return newClipboardContent;
		})
		.catch(err => { // Handle error reading clipboard (e.g. permission denied, or just empty)
			console.warn('Could not read clipboard, treating as empty:', err);
			return link; // Proceed as if clipboard was empty
		})
		.then(newClipboardContent => {
			// Now write the new content and then count
			return navigator.clipboard.writeText(newClipboardContent)
				.then(() => newClipboardContent); // Pass content for counting
		})
		.then(finalClipboardContent => {
			// Count magnet links
			const magnetLinks = finalClipboardContent.split('\n').filter(line => line.startsWith('magnet:?xt=urn:btih:'));
			const count = magnetLinks.length;
			let msg = ''; // Renamed from 'message' to avoid conflict if 'message' is ever a global
			if (finalClipboardContent === link) { // It was effectively a copy
				msg = `Copied. Clipboard now contains 1 magnet link.`;
			} else {
				msg = `Appended. Clipboard now contains ${count} magnet link${count === 1 ? '' : 's'}.`;
			}
			showFeedbackMessage(msg);
		})
		.catch(err => {
			showFeedbackMessage("Error appending!");
			console.error('Error appending to clipboard:', err);
		});
});

// Update the existing magnet link to work without login
magnetLink.href = link