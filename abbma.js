const magnetPrefix = "magnet:?xt=urn:btih:"
const magnetTrackerPrefix = "&tr="

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

// Create new magnet link at top of page
const a = document.createElement("a")
a.href = link
title.parentNode.insertBefore(a, title)
a.innerHTML = "Magnet Download"

// Update the existing magnet link to work without login
magnetLink.href = link