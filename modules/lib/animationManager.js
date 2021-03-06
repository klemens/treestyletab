/*
 Animation Task Manager

 Usage:
   animationManager.addTask(
     function(aTime, aBeginningValue, aTotalChange, aDuration) {
       // some animation task runned by interval
       var current = someEasingFunction(aTime, aBeginningValue, aTotalChange, aDuration);
       target.style.left = current+'px';
       return aTime > aDuration; // return true if the animation finished.
     },
     100, // beginning
     200, // total change (so, the final value will be 100+200=300)
     250, // msec, duration
     window // the window (used by Firefox 4 animation frame API)
   );
   // stop all
   animationManager.stop();
   // restart after doing something
   animationManager.start();

 license: The MIT License, Copyright (c) 2009-2015 YUKI "Piro" Hiroshi
 original:
   http://github.com/piroor/fxaddonlib-animation-manager
*/

var EXPORTED_SYMBOLS = ['animationManager'];
var animationManager;

(function() {
	const currentRevision = 20;

	var Cc = Components.classes;
	var Ci = Components.interfaces;

	animationManager = {
		revision : currentRevision,

		running : false,

		addTask : function(aTask, aBeginningValue, aTotalChange, aDuration, aRelatedWindow) 
		{
			if (!aRelatedWindow &&
				window &&
				typeof window.Window == 'function' &&
				window instanceof window.Window)
				aRelatedWindow = window;

			if (!aTask || !aRelatedWindow) return;

			if (this._windows.indexOf(aRelatedWindow) < 0)
				this._windows.push(aRelatedWindow);

			var startTime = aRelatedWindow ? aRelatedWindow.mozAnimationStartTime : undefined;
			// mozAnimationStartTime is removed at Firefox 42.
			// see: https://bugzilla.mozilla.org/show_bug.cgi?id=909154
			startTime = startTime || Date.now();
			this.tasks.push({
				task      : aTask,
				start     : startTime,
				beginning : aBeginningValue,
				change    : aTotalChange,
				duration  : aDuration,
				window    : aRelatedWindow
			});

			this.start();
		},

		removeTask : function(aTask) 
		{
			if (!aTask) return;
			for (let i = this.tasks.length - 1; i > -1; i--)
			{
				let registeredTask = this.tasks[i];
				if (registeredTask) {
					if (registeredTask.task != aTask)
						continue;
					delete registeredTask.task;
					delete registeredTask.start;
					delete registeredTask.beginning;
					delete registeredTask.change;
					delete registeredTask.duration;
					delete registeredTask.window;
				}
				this.tasks.splice(i, 1);
			}
			this._cleanUpWindows();
		},

		start : function()
		{
			if (!this._windows.length)
				return;
			this._windows.forEach(function(aWindow) {
				if (this._animatingWindows.indexOf(aWindow) > -1)
					return;
				this._animatingWindows.push(aWindow);
				let self = this;
				aWindow.requestAnimationFrame(function() {
					self.processAnimationFrame(aWindow);
				});
			}, this);
		},

		stop : function() 
		{
			this._animatingWindows = [];
		},

		removeAllTasks : function()
		{
			this.stop();
			this.tasks = [];
			this._windows = [];
		},

		tasks    : [],
		_windows : [],
		_animatingWindows : [],

		_cleanUpWindows : function()
		{
			for (let i = this._windows.length - 1; i > -1; i--)
			{
				let w = this._windows[i];
				if (this.tasks.some(function(aTask) {
						return aTask && aTask.window == w;
					}))
					continue;

				let index = this._animatingWindows.indexOf(w);
				if (index > -1)
					this._animatingWindows.splice(index, 1);

				this._windows.splice(i, 1);
			}
		},

		processAnimationFrame : function(aWindow)
		{
			if (this._animatingWindows.indexOf(aWindow) > -1) {
				this.onAnimation(aWindow);
			}
			this._cleanUpWindows();
			if (this._animatingWindows.indexOf(aWindow) > -1) {
				let self = this;
				aWindow.requestAnimationFrame(function() {
					self.processAnimationFrame(aWindow);
				});
			}
		},

		onAnimation : function(aWindow) 
		{
			// task should return true if it finishes.
			var now = Date.now();
			for (let i = this.tasks.length - 1; i > -1; i--)
			{
				let task = this.tasks[i];
				try {
					if (task && !task.window.closed) {
						if (task.window != aWindow)
							continue;
						let time = Math.min(task.duration, now - task.start);
						let finished = task.task(
								time,
								task.beginning,
								task.change,
								task.duration
							);
						if (!finished && (time < task.duration))
							continue;
					}
				}
				catch(e) {
					dump(e+'\n'+e.stack+'\n');
				}
				this.tasks.splice(i, 1);
			}
		}

	};
})();

