var openedTabs = [];
var closedTabs = [];

chrome.windows.getAll({ populate: true }, function(wins) {
	wins.forEach(function(win) {
		win.tabs.forEach(function(tab) {
			if (tab.active) {
				openedTabs.push({ id: tab.id, title: tab.title, url: tab.url, actTime: Date.now() + 100, isClosed: false });
			} else {
				openedTabs.push({ id: tab.id, title: tab.title, url: tab.url, actTime: Date.now(), isClosed: false });	
			}
			
		});
	});
});

chrome.tabs.onCreated.addListener(function(tab){
	openedTabs.push({ id: tab.id, title: tab.title, url: tab.url, actTime: Date.now(), isClosed: false });
});

chrome.tabs.onRemoved.addListener(function(tabId){
	if (closedTabs.length > 10) {
		closedTabs.pop();
	}

	for (var i=0, j=openedTabs.length; i<j; i++) {
		if (openedTabs[i].id == tabId) {
			closedTabs.push({ title: openedTabs[i].title, url: openedTabs[i].url, actTime: Date.now(), isClosed: true, id: tabId + '-closed' });
			openedTabs.splice(i, 1);
			break;	
		}
	}
});

chrome.tabs.onUpdated.addListener(function(tabId, changeINfo, tab){
	var tabView = getById(openedTabs, tabId);
	tabView.url = tab.url;
	tabView.title = tab.title;
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

function getTabList() {
	var rt = [];

	for (var i=0, j=openedTabs.length; i<j; i++) {
		rt.push(openedTabs[i]);
	}

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