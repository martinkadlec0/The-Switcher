
window.onerror = function(e, file, line) {
	$('output').html('Error (' + line + ')' + e);
};

RegExp.escape = function(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


$(function() {


	var Item = Backbone.Model.extend({
		defaults: {
			title: '<no title>',
			url: '<no url>',
			id: -1,
			index: 1,
			slelected: 0
		}
	});

	var items = new (Backbone.Collection.extend({
		model: Item
	}));

	var ItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'item',
		template: _.template($('#template-item').html()),
		events: {
			'mouseup': 'handleMouseUp',
			'mousedown': 'handleMouseDown',
		},
		initialize: function() {
			this.model.on('show', this.showModel, this);
			this.model.on('hide', this.hideModel, this);
			this.model.on('scrollToView', this.scrollToView, this);
			this.model.on('change:selected', this.handleSelect, this);
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		showModel: function() {
			this.model.set('index', 1);
			this.$el.css('display', 'block');
		},
		hideModel: function() {
			this.model.set('index', 0);
			this.$el.css('display', 'none');
		},
		handleSelect: function() {
			if (this.model.get('selected') == 1) {
				this.$el.addClass('item-selected');
			} else {
				this.$el.removeClass('item-selected');
			}
		},
		handleMouseDown: function(e) {
			if (this.model.get('selected') != 1) {
				var old = items.where({ selected: 1 })[0];
				if (old) {
					old.set('selected', 0);
				}
				this.model.set('selected', 1);

				var visItems = items.where({ index: 1 });
				for (var i=0; i<visItems.length; i++) {
					if (visItems[i] == this.model) {
						app.si = i;
						break;
					}
				}
			}
		},
		handleMouseUp: function(e) {
			if (this.model.get('selected') == 1) {
				chrome.tabs.update(this.model.get('id'), { selected: true });
			}
		},
		scrollToView: function() {
			this.el.scrollIntoView(true);
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
			items.on('add', this.addOne, this);
		},
		handleKeyDown: function(e) {
			var visItems = items.where({ index: 1 });
			if (!visItems.length) {
				return;
			}

			if (e.keyCode == 13) {
				var s = items.where({ selected: 1 })[0];
				if (!s) {
					s = visItems[0];
				}
				var id = s.get('id');
				chrome.tabs.update(id, { selected: true });
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
					item.trigger('show');
				}, this);
				return;
			}

			/**
			 * Filter
			 */

			v = new RegExp(RegExp.escape(v), 'i');
			items.forEach(function(item) {
				if (v.test(item.get('title'))) {
					item.trigger('show');
				} else {
					item.trigger('hide');
				}
			}, this);
			//$('output').html(e.currentTarget.value);;
		},
		addAll: function(models) {
			$('#items').html('');
			models.forEach(this.addOne, this);
		},
		addOne: function(model) {
			var view = new ItemView({ model: model });
			$('#items').append(view.render().el);
		}
	}));

	

	chrome.windows.getCurrent({ populate: true }, function(win) {
		win.tabs.forEach(function(tab) {
			items.add({ title: tab.title, url: tab.url, id: tab.id });
		});
	});



});