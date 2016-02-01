/*var ClickCounterViewModel= function(first) {
	self = this;

	self.numberOfClicks = ko.observable(0);
	self.gene= ko.observable(first);
	self.registerClick = function() {
		self.numberOfClicks(self.numberOfClicks() + 1);
	};

	self.masterBlaster = function() {
		self.numberOfClicks(self.numberOfClicks() + 2);
	};
	self.resetClicks= function() {
		self.numberOfClicks(0);
	};

	self.hasClickedTooManyTimes= ko.pureComputed(function(){
		return self.numberOfClicks() >= 10;

	});
	};
	*/

	
var SimpleListModel = function(items) {
	this.items = ko.observableArray(items);
	this.itemToAdd = ko.observable("");
	this.addItem= function() {
		if (this.itemToAdd() != "") {
			this.items.push(this.itemToAdd());
			this.itemToAdd("");
		}
	}.bind(this);
};
$(document).ready(function(){
		// ko.applyBindings(new ClickCounterViewModel("Annie"));
		ko.applyBindings(new SimpleListModel(["Alpha","Beta","Kapa"]));
	});