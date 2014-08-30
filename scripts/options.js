$(function() {


	chrome.storage.local.get({ 
		rememberClosedTabs: 10, showFavicons: true 
	}, function(data) {
		$('select[id], input[type=number], input[type=range], input[type=range]').each(function(i, item) {
			$(item).val(data[item.id]);
			
			$(item).change(handleChange);
		});

		$('input[type=checkbox]').each(function(i, item) {
			$(item).get(0).checked = !!data[item.id];
			$(item).change(handleCheck);
		});
	});

	

});

function handleChange(e) {
	var t = e.target;
	var data = {};
	data[t.id] = t.value;
	chrome.storage.local.set(data, function() {});
}

function handleCheck(e) {
	var t = e.target;
	var data = {};
	data[t.id] =  t.checked;
	chrome.storage.local.set(data, function() {});
}

