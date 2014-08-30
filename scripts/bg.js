/**
 * Tab lists
 */

var openedTabs = [];
var closedTabs = [];

chrome.windows.getAll({ populate: true }, function(wins) {
	wins.forEach(function(win) {
		win.tabs.forEach(function(tab) {
			var addTime = tab.active ? 100 : 0;
			openedTabs.push({ id: tab.id, title: tab.title, url: tab.url, actTime: Date.now() + addTime, isClosed: false, favIconUrl: tab.favIconUrl });
		});
	});
});

chrome.tabs.onCreated.addListener(function(tab){
	openedTabs.push({ id: tab.id, title: tab.title, url: tab.url, actTime: Date.now(), isClosed: false, favIconUrl: tab.favIconUrl });
});

chrome.tabs.onRemoved.addListener(function(tabId){
	chrome.storage.local.get({ rememberClosedTabs: 10 }, function(data) {
		if (closedTabs.length && closedTabs.length >= data.rememberClosedTabs) {
			closedTabs.pop();
		}

		for (var i=0, j=openedTabs.length; i<j; i++) {
			if (openedTabs[i].id == tabId) {
				closedTabs.push({ title: openedTabs[i].title, url: openedTabs[i].url, actTime: Date.now(), isClosed: true, id: tabId + '-closed', favIconUrl: openedTabs[i].favIconUrl });
				openedTabs.splice(i, 1);
				break;	
			}
		}
	});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	var tabView = getById(openedTabs, tabId);
	tabView.url = tab.url;
	tabView.title = tab.title;
	tabView.favIconUrl = tab.favIconUrl
});

chrome.tabs.onActivated.addListener(function(activeInfo){
	var tabView = getById(openedTabs, activeInfo.tabId);
	tabView.actTime = Date.now();
});

function getById(arr, id) {
	for (var i=0, j=arr.length; i<j; i++) {
		if (arr[i].id == id) {
			return arr[i];
		}
	}

	return false;
}

function getMostRecent() {
	var mr = -1;
	var index = -1;
	for (var i=0, j=openedTabs.length; i<j; i++) {
		if (mr == -1 || openedTabs[i].actTime > mr.actTime) {
			mr = openedTabs[i];
			index = i;
		}
	}
	return index;
}

function getTabList() {
	var rt = [];

	for (var i=0, j=openedTabs.length; i<j; i++) {
		rt.push(openedTabs[i]);
	}
	var mr = getMostRecent();
	rt.splice(mr, 1);

	for (var i=0, j=closedTabs.length; i<j; i++) {
		rt.push(closedTabs[i]);
	}

	return rt;
}

chrome.runtime.onMessage.addListener(function (request, sender){
	if (request.action == 'get-tabs-request') {
		chrome.runtime.sendMessage({ action: 'get-tabs-response', value: getTabList() });		
	} else if (request.action == 'remove-closed-tab') {
		for (var i=0, j=closedTabs.length; i<j; i++) {
			if (closedTabs[i].id == request.value) {
				closedTabs.splice(i, 1);
				break;	
			}
		}
	}
});

chrome.storage.onChanged.addListener(function(changes, ns) {
	if (ns != 'local') return;
	if ('rememberClosedTabs' in changes) {
		while (closedTabs.length > changes.rememberClosedTabs.newValue) {
			closedTabs.pop();
		}
	}
});