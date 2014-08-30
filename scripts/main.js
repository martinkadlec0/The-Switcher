
window.onerror = function(e, file, line) {
	//$('output').html('Error (' + line + ')' + e);
};

RegExp.escape = function(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

var levDist = function(s, t) {
	var d = []; //2d matrix

	// Step 1
	var n = s.length;
	var m = t.length;

	if (n == 0) return m;
	if (m == 0) return n;

	//Create an array of arrays in javascript (a descending loop is quicker)
	for (var i = n; i >= 0; i--) d[i] = [];

	// Step 2
	for (var i = n; i >= 0; i--) d[i][0] = i;
	for (var j = m; j >= 0; j--) d[0][j] = j;

	// Step 3
	for (var i = 1; i <= n; i++) {
		var s_i = s.charAt(i - 1);

		// Step 4
		for (var j = 1; j <= m; j++) {

			//Check the jagged ld total so far
			if (i == j && d[i][j] > 4) return n;

			var t_j = t.charAt(j - 1);
			var cost = (s_i == t_j) ? 0 : 1; // Step 5

			//Calculate the minimum
			var mi = d[i - 1][j] + 1;
			var b = d[i][j - 1] + 1;
			var c = d[i - 1][j - 1] + cost;

			if (b < mi) mi = b;
			if (c < mi) mi = c;

			d[i][j] = mi; // Step 6

			//Damerau transposition
			if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
			}
		}
	}

	// Step 7
	return d[n][m];
}

function getScore(small, big) {
	small = small.toLowerCase();
	big = big.toLowerCase();
	var score = 0;
	var best = 0;
	var parts = small.split(' ');
	for (var j=0; j < parts.length; j++) {
		if (parts[j].length == 0) continue;
		best = 0;
		for (var i=0; i < big.length; i++) {

			val = levDist(parts[j], big.substr(i, parts[j].length));
			if (val == 0) {
				if (i - 1 > 0 && big[i - 1] == ' ') {
					best = Math.max(best, 30 + big.length / (i + 1));
				} else {
					best = Math.max(best, 15 + big.length / (i + 1));
				}
			} else if (best < 4 && parts[j].length > 2) {
				if (val == 1) best = Math.max(best, 3);
				if (val == 2) best = Math.max(best, 1);
			} else if (parts[j].length > 2) {
				if (val == 1) best = Math.max(best, 0.01);
				if (val == 2) best = Math.max(best, 0.001);
			} else {
				if (val == 1) best = Math.max(best, 0.0001);
				if (val == 2) best = Math.max(best, 0.00001);
			}
		}

		score += best;
	}
	return score;
}


$(function() {


	var Item = Backbone.Model.extend({
		defaults: {
			title: '<no title>',
			url: '<no url>',
			favIconUrl: '',
			id: -1,
			actTime: 0,
			isClosed: false,
			visible: 1,
			selected: 0,
			score: -1
		}
	});

	var items = new (Backbone.Collection.extend({
		model: Item,
		comparator: function(a, b) {
			if (a.get('score') == b.get('score')) {
				if (a.get('isClosed') == b.get('isClosed')) {
					return a.get('actTime') < b.get('actTime') ? 1 : -1;
				} 
				return a.get('isClosed') ? 1 : -1;
			}
			return a.get('score') < b.get('score') ? 1 : -1;
		}
	}));

	var ItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'item visible',
		template: _.template($('#template-item').html()),
		events: {
			'mouseup': 'handleMouseUp',
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			this.model.on('change:score', this.handleScore, this);
			this.model.on('change:isClosed', this.render, this);
			this.model.on('move', this.handleMove, this);
			this.model.on('scrollToView', this.scrollToView, this);
			this.model.on('change:selected', this.handleSelect, this);
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		handleScore: function() {
			if (this.model.get('score') == 0) {
				this.hideModel();
			} else {
				this.showModel();
			}
		},
		showModel: function() {
			this.model.set('visible', 1);
			this.$el.addClass('visible');
		},
		hideModel: function() {
			this.model.set('visible', 0);
			this.$el.removeClass('visible');
		},
		handleSelect: function() {
			if (this.model.get('selected') == 1) {
				this.$el.addClass('item-selected');
			} else {
				this.$el.removeClass('item-selected');
			}
		},
		handleMouseDown: function(e) {
			if (this.model.get('selected') == 1) {
				return;
			}

			var old = items.findWhere({ selected: 1 });
			if (old) {
				old.set('selected', 0);
			}
			this.model.set('selected', 1);

			var visItems = items.where({ visible: 1 });
			for (var i=0; i<visItems.length; i++) {
				if (visItems[i] == this.model) {
					app.si = i;
					break;
				}
			}
			
		},
		handleMouseUp: function(e) {
			if (this.model.get('selected') == 1) {
				if (this.model.get('isClosed')) {
					chrome.tabs.create({ url: this.model.get('url'), active: true });
					chrome.runtime.sendMessage({ action: 'remove-closed-tab', value: this.model.get('id') });
				} else {
					chrome.tabs.update(this.model.get('id'), { selected: true });
				}
				
				window.close();
			}
		},
		scrollToView: function() {
			this.el.scrollIntoView(false);
		},
		handleMove: function() {
			$('#items').append(this.render().el);
		}
	});

	var app = new (Backbone.View.extend({
		el: 'body',
		si: 0,
		events: {
			'input #search': 'handleSearch',
			'keydown': 'handleKeyDown'
		},
		initialize: function() {
			items.on('reset', this.addAll, this);
			items.on('sort', this.sortAll, this);
			items.on('add', this.addOne, this);
		},
		handleKeyDown: function(e) {
			var visItems = items.where({ visible: 1 });
			if (!visItems.length) {
				return;
			}

			if (e.keyCode == 13) {
				var s = items.findWhere({ selected: 1 });
				if (!s) {
					s = visItems[0];
				}
				var id = s.get('id');
				if (s.get('isClosed')) {
					chrome.tabs.create({ url: s.get('url'), active: true });
					chrome.runtime.sendMessage({ action: 'remove-closed-tab', value: this.model.get('id') });
				} else {
					chrome.tabs.update(id, { selected: true });	
				}
				
				window.close();
				return;
			} else if (e.keyCode == 40) {
				var s = $('.item-selected').get(0);
				if (!s) {
					visItems[0].set('selected', 1);
					this.si = 0;
				} else if (this.si != visItems.length - 1) {
					visItems[this.si].set('selected', 0);
					visItems[++this.si].set('selected', 1);
				} else {
					visItems[this.si].set('selected', 0);
					visItems[0].set('selected', 1);
					this.si = 0;
				}
			} else if (e.keyCode == 38) {
				var s = $('.item-selected').get(0);
				if (!s) {
					this.si = visItems.length - 1;
					visItems[this.si].set('selected', 1);
				} else if (this.si > 0) {
					visItems[this.si].set('selected', 0);
					visItems[--this.si].set('selected', 1);
				} else {
					visItems[this.si].set('selected', 0);
					this.si = visItems.length - 1;
					visItems[this.si].set('selected', 1);
				}
			} else if (e.keyCode == 27) {
				window.close();
				e.preventDefault();	
			} else if (e.keyCode == 46) {
				var s = items.findWhere({ selected: 1 });
				if (!s || s.get('isClosed') || s.get('id') < 0) return;
				chrome.tabs.remove(s.get('id'));
				s.set('isClosed', true);
				
				e.preventDefault();	
			}

			if (e.keyCode == 13 || e.keyCode == 38 || e.keyCode == 40) {
				visItems[this.si].trigger('scrollToView');
				e.preventDefault();	
			}
		},
		handleSearch: function(e) {
			items.forEach(function(item) {
				item.set('selected', 0);
			}, this);

			var v = e.currentTarget.value;
			

			/**
			 * Show all
			 */

			if (!v) {
				items.forEach(function(item) {
					item.set('score', -1);
				}, this);
				items.sort();
				return;
			}

			/**
			 * Filter
			 */

			rg = new RegExp('^' + RegExp.escape(v), 'i');
			items.forEach(function(item) {
				addScore = rg.test(item.get('title')) ? 100 : 0;
				//if (v.test(item.get('title'))) {
				item.set('score', addScore + getScore(v, item.get('title')) + getScore(v, item.get('url')) / 4); //  
			}, this);

			items.sort();

			var first = items.findWhere({ visible: 1 });
			if (first) {
				first.set('selected', 1);
				this.si = 0;
			}
			
			
			//$('output').html(e.currentTarget.value);;
		},
		addAll: function(models) {
			//$('output').html(Math.random());
			$('#items').html('');
			this._fragment = document.createDocumentFragment();
			models.forEach(this.addOne, this);
			$('#items').append(this._fragment);
			this._fragment = null;
		},
		addOne: function(model) {
			var view = new ItemView({ model: model });
			if (this._fragment) {
				this._fragment.appendChild(view.render().el);
			} else {
				$('#items').append(view.render().el);	
			}
		},
		sortAll: function() {
			items.forEach(function(item) {
				item.trigger('move');
			});
		}
	}));

	chrome.runtime.sendMessage({ action: 'get-tabs-request' });

	chrome.runtime.onMessage.addListener(function (request, sender, sendBack){
		if (request.action == 'get-tabs-response') {
			var tabs = request.value;
			chrome.tabs.query({}, function(moreTabInfo){
				tabs.forEach(function(tab) {
					// include favIconUrl (and other less important properties)
					_.extend(tab, _.findWhere(moreTabInfo, {id: tab.id}));
				});

				items.reset(tabs);

				if (items.length) {
					items.at(0).set('selected', 1);
				}
			});
		}
	});

});