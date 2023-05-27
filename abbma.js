const magnetPrefix = "magnet:?xt=urn:btih:"
const magnetTrackerPrefix = "&tr="

const title = document.querySelector(".postTitle")
const magnetLink = document.querySelector("#magnetLink")
const torrent_info = document.querySelector(".torrent_info")

let trackers = []
let hash = null

for (let i = 0; i < torrent_info.children[0].children.length; i++) {
	const element = torrent_info.children[0].children[i];

	rowName = element.children[0].innerHTML
	if (rowName == "Tracker:") {
		trackers.push(element.children[1].innerHTML)
	}
	else if (rowName == "Info Hash:") {
		hash = element.children[1].innerHTML
		break
	}
}

link = magnetPrefix + hash + "&dn=" + title.children[0].innerHTML

for (let i = 0; i < trackers.length; i++) {
	link += "&tr=" + trackers[i]
}

const a = document.createElement("a")
a.href = link
title.parentNode.insertBefore(a, title)
a.innerHTML = "Magnet Download"

magnetLink.href = link