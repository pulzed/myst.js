/*
 * myst.ui.js
 * UI extension for myst.js
 *
 * (c) 2021 Danijel Durakovic
 * MIT License
 *
 */

/*jshint browser:true*/
/*globals myst*/

/**
 * @file myst.ui.js
 * @version 0.1.0
 * @author Danijel Durakovic
 * @copyright 2021
 */

myst.ui = (function() { "use strict";

	var input = null;
	var globalContext = null;

	///////////////////////////////////////////////////////////////////////////////
	//
	//  Utility
	//
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Returns the next incremental event id.
	 *
	 * @returns {number}
	 */
	var getNextEventId = (function() {
		var uid = 0;
		return function() {
			return ++uid;
		};
	}());

	/**
	 * Passes given option, or returns the default.
	 *
	 * @returns {object}
	 */
	function fromOption(option, defaultOption) {
		return (option != null) ? option : defaultOption;
	}

	/**
	 * Invoke a user event.
	 *
	 * @param {function} callback - User function to call.
	 * @param {object} self - Reference to component invoking the event.
	 */
	function invokeEvent(callback, self) {
		if (callback instanceof Function) {
			callback.call(self);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//
	//  Atomic components
	//
	///////////////////////////////////////////////////////////////////////////////
	
	/**
	 * @namespace atomic_components
	 */
	var atomic_components = {

		/**
		 * Base atomic component.
		 *
		 * @class Base
		 * @classdesc Base component implements functions common to all components.
		 * @memberof atomic_components
		 *
		 * @param {object} options - Constructor options.
		 * @param {object} [options.context] - State context. Global context by default.
		 * @param {number} [options.x=0] - Component x position.
		 * @param {number} [options.y=0] - Component y position.
		 * @param {number} [options.width=0] - Component width.
		 * @param {number} [options.height=0] - Component height.
		 * @param {number} [options.alpha=1] - Component alpha level.
		 * @param {number} [options.angle=0] - Component rotation angle.
		 * @param {bool} [options.enabled=true] - Component enabled status.
		 * @param {string} [options.background] - Component background color. Default to null
		 *   for transparent background.
		 * @param {function} [options.onAdded] - Added event is triggered when the component is
		 *   added to a container.
		 * @param {function} [options.onRemoved] - Removed event is triggered when the component is
		 *   removed from a container.
		 */
		Base: function(options, self) {
			self = self || this;

			self._x = fromOption(options.x, 0);
			self._y = fromOption(options.y, 0);
			self._width = fromOption(options.width, 0);
			self._height = fromOption(options.height, 0);
			self._alpha = fromOption(options.alpha, 1);
			self._angle = fromOption(options.angle, 0);
			self._background = null;
			self._enabled = fromOption(options.enabled, true);
			self._context = fromOption(options.context, globalContext);

			self._rootContext = self.context;
			self._owner = null;

			self._requestRepaint = true;
			self._alwaysRepaint = false;

			self._surface = new myst.Surface({
				width: self._width,
				height: self._height
			});

			self._texSurface = self._surface.canvas;
			
			self._events = {};

			// "onRepaint" is triggered when the component requests a repaint
			self._events.onRepaint = C_EMPTYF;
			// "onAdded" is triggered when the component is added to a container
			self._events.onAdded = function() { invokeEvent(options.onAdded, self); };
			// "onRemoved" is triggered when the component is removed from a container
			self._events.onRemoved = function() { invokeEvent(options.onRemoved, self); };
			// "onResized" is triggered when the component changes size
			self._events.onResized = function() { invokeEvent(options.onResized, self); };
	/*
				onEnabled: function() { invokeEvent(options.onEnabled, self); },
				onDisabled: function() { invokeEvent(options.onDisabled, self); },
				onMoved: function() { invokeEvent(options.onMoved, self); },
				onAlphaSet: function() { invokeEvent(options.onAlphaSet, self); },
				onAngleSet: function() { invokeEvent(options.onAngleSet, self); }
		
			*/

			self.paint = self._surface.render;

			/**
			 * Enables the component.
			 *
			 * @function enable
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.enable = function() {
				self._enabled = true;
				return self;
			};

			/**
			 * Disables the component.
			 *
			 * @function disable
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.disable = function() {
				self._enabled = false;
				return self;
			};

			/**
			 * Returns the component enabled state.
			 *
			 * @function isEnabled
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {bool} Enabled state.
			 */
			self.isEnabled = function() {
				// climb the chain of owners to determine enabled state
				var component = self;
				do {
					if (!component._enabled) {
						return false;
					}
				} while ((component = component._owner));
				return true;
			};

			/**
			 * Sets the component x position.
			 *
			 * @function setX
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.setX = function(x) {
				self._x = x;
				return self;
			};

			/**
			 * Sets the component y position.
			 *
			 * @function setY
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.setY = function(y) {
				self._y = y;
				return self;
			};

			/**
			 * Returns the component x position.
			 *
			 * @function getX
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number} Component x coordinate.
			 */
			self.getX = function() {
				return self._x;
			};

			/**
			 * Returns the component y position.
			 *
			 * @function getY
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number} Component y coordinate.
			 */
			self.getY = function() {
				return self._y;
			};

			/**
			 * Returns the component position as a pair of coordinates.
			 *
			 * @function getPosition
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {array} Component coordinates.
			 */
			self.getPosition = function() {
				return [self._x, self._y];
			};

			/**
			 * Returns the component global x position.
			 *
			 * @function getRealX
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number} Component global x coordinate.
			 */
			self.getRealX = function() {
				var x = 0;
				var component = self;
				do { x += component._x; } while ((component = component._owner));
				return x;
			};

			/**
			 * Returns the component global y position.
			 *
			 * @function getRealY
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number} Component global y coordinate.
			 */
			self.getRealY = function() {
				var y = 0;
				var component = self;
				do { y  += component._y; } while ((component = component._owner));
				return y;
			};

			/**
			 * Returns the component global position as a pair of coordinates.
			 *
			 * @function getRealPosition
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {array} Component global coordinates.
			 */
			self.getRealPosition = function() {
				var x = 0, y = 0;
				var component = self;
				do {
					x += component._x;
					y += component._y;
				} while ((component = component._owner));
				return [x, y];
			};

			/**
			 * Moves the component to given position.
			 *
			 * @function moveTo
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} x - x position.
			 * @param {number} y - y position.
			 *
			 * @returns {object} Self.
			 */
			self.moveTo = function(x, y) {
				self._x = x;
				self._y = y;
				return self;
			};

			/**
			 * Moves the component by desired distance.
			 *
			 * @function moveBy
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} x - x distance.
			 * @param {number} y - y distance.
			 *
			 * @returns {object} Self.
			 */
			self.moveBy = function(dx, dy) {
				self._x += dx;
				self._y += dy;
				return self;
			};

			/**
			 * Sets the component width.
			 *
			 * @function setWidth
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} width
			 *
			 * @returns {object} Self.
			 */
			self.setWidth = function(width) {
				self._width = width;
				self._surface.resize(self._width, self._height);
				self._requestRepaint = true;
				self._events.onResized();
				return self;
			};

			/**
			 * Sets the component height.
			 *
			 * @function setHeight
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} height
			 *
			 * @returns {object} Self.
			 */
			self.setHeight = function(height) {
				self._height = height;
				self._surface.resize(self._width, self._height);
				self._requestRepaint = true;
				self._events.onResized();
				return self;
			};

			/**
			 * Returns the component width.
			 *
			 * @function getWidth
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number}
			 */
			self.getWidth = function() {
				return self._width;
			};

			/**
			 * Returns the component height.
			 *
			 * @function getHeight
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number}
			 */
			self.getHeight = function() {
				return self._height;
			};

			/**
			 * Returns the component size as a pair of values.
			 *
			 * @function getSize
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {array} Component size.
			 */
			self.getSize = function() {
				return [self._width, self._height];
			};

			/**
			 * Resize the component.
			 *
			 * @function setSize
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} width
			 * @param {number} height
			 *
			 * @returns {object} Self.
			 */
			self.setSize = function(width, height) {
				// TODO constraints
				self._width = width;
				self._height = height;
				self._surface.resize(self._width, self._height);
				self._requestRepaint = true;
				self._events.onResized();
				return self;
			};

			/**
			 * Grow the component width in both directions by given amount.
			 *
			 * @function growByWidth
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} width
			 *
			 * @returns {object} Self.
			 */
			self.growByWidth = function(width) {
				self._x -= width;
				self._width += width * 2;
				self._surface.resize(self._width, self._height);
				self._requestRepaint = true;
				self._events.onResized();
				return self;
			};

			/**
			 * Shrink the component width in both directions by given amount.
			 *
			 * @function shrinkByWidth
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} width
			 *
			 * @returns {object} Self.
			 */
			self.shrinkByWidth = function(width) {
				self.growByWidth(-width);
			};

			/**
			 * Grow the component height in both directions by given amount.
			 *
			 * @function growByHeight
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} height
			 *
			 * @returns {object} Self.
			 */
			self.growByHeight = function(height) {
				self._y -= height;
				self._height += height * 2;
				self._surface.resize(self._width, self._height);
				self._requestRepaint = true;
				self._events.onResized();
				return self;
			};

			/**
			 * Shrink the component height in both directions by given amount.
			 *
			 * @function shrinkByHeight
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} height
			 *
			 * @returns {object} Self.
			 */
			self.shrinkByHeight = function(height) {
				self.growByHeight(-height);
			};

			/**
			 * Grow the component in all directions by given amount.
			 *
			 * @function growBy
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.growBy = function(size) {
				self._x -= size;
				self._width += size * 2;
				self._y -= size;
				self._height += size * 2;
				self._surface.resize(self._width, self._height);
				self._requestRepaint = true;
				return self;
			};

			/**
			 * Shrink the component in all directions by given amount.
			 *
			 * @function shrinkBy
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.shrinkBy = function(size) {
				return self.growBy(-size);
			};

			/**
			 * Reset component x position to one provided at construction.
			 *
			 * @function resetX
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.resetX = function() {
				self.setX(fromOption(options.x, 0));
				return self;
			};

			/**
			 * Reset component y position to one provided at construction.
			 *
			 * @function resetY
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.resetY = function() {
				self.setY(fromOption(options.y, 0));
				return self;
			};

			/**
			 * Reset component position to one provided at construction.
			 *
			 * @function resetPosition
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.resetPosition = function() {
				return self.resetX().resetY();
			};

			/**
			 * Reset component width to one provided at construction.
			 *
			 * @function resetWidth
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.resetWidth = function() {
				self.setWidth(fromOption(options.width, 0));
				return self;
			};

			/**
			 * Reset component height to one provided at construction.
			 *
			 * @function resetHeight
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.resetHeight = function() {
				self.setHeight(fromOption(options.height, 0));
				return self;
			};

			/**
			 * Reset component size to one provided at construction.
			 *
			 * @function resetSize
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.resetSize = function() {
				return self.resetWidth().resetHeight();
			};

			/**
			 * Shows the component.
			 *
			 * @function show
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.show = function() {
				self._alpha = 1;
				return self;
			};

			/**
			 * Hides the component.
			 *
			 * @function hide
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.hide = function() {
				self._alpha = 0;
				return self;
			};

			/**
			 * Sets the component alpha level.
			 *
			 * @function setAlpha
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} alpha - Alpha level (0 to 1).
			 *
			 * @returns {object} Self.
			 */
			self.setAlpha = function(alpha) {
				self._alpha = myst.clamp(alpha, 0, 1);
				return self;
			};

			/**
			 * Returns the component alpha level.
			 *
			 * @function getAlpha
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number}
			 */
			self.getAlpha = function() {
				return self._alpha;
			};

			/**
			 * Returns the component visible state.
			 */
			self.isVisible = function() {
				var component = self;
				do {
					if (component._alpha <= 0) {
						return false;
					}
				} while ((component = component._owner));
				return true;
			};

			/**
			 * Centers component x position relative to owner.
			 *
			 * @function centerX
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.centerX = function() {
				var ownerWidth = (self._owner) ? self.owner._width : self._context.surface.width;
				self.setX(Math.floor((ownerWidth - self._width) / 2));
				return self;
			};

			/**
			 * Centers component y position relative to owner.
			 *
			 * @function centerY
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.centerY = function() {
				var ownerHeight = (self._owner) ? self.owner._height : self._context.surface.height;
				self.setY(Math.floor((ownerHeight - self._height) / 2));
				return self;
			};

			/**
			 * Centers component relative to owner.
			 *
			 * @function center
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.center = function() {
				return self.centerX().centerY();
			};

			/**
			 * Sets component rotation angle.
			 *
			 * @function setAngle
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {number} angle - Rotation angle in degrees.
			 *
			 * @returns {object} Self.
			 */
			self.setAngle = function(angle) {
				self._angle = angle;
				return self;
			};

			/**
			 * Returns component rotation angle.
			 *
			 * @function getAngle
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {number}
			 */
			self.getAngle = function() {
				return self._angle;
			};

			/**
			 * Set component background to specified background color.
			 *
			 * @function setBackground
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @param {string} color - Component background color.
			 *
			 * @returns {object} Self.
			 */
			self.setBackground = function(color) {
				self._background = color;
				self._surface.setFillClearMethod(color);
				self._requestRepaint = true;
				return self;
			};

			/**
			 * Set component background to transparent.
			 *
			 * @function removeBackground
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.removeBackground = function() {
				self._background = null;
				self._surface.setDefaultClearMethod();
				self._requestRepaint = true;
				return self;
			};

			/**
			 * Returns component background color. Returns null when background is transparent.
			 *
			 * @function getBackground
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.getBackground = function() {
				return self._background;
			};

			/**
			 * Forces component to repaint itself on next draw call.
			 *
			 * @function forceRepaint
			 * @memberof atomic_components.Base
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.forceRepaint = function() {
				self._requestRepaint = true;
			};

			/**
			 * Draw the component.
			 *
			 * @function draw
			 * @memberof atomic_components.Base
			 * @instance
			 */
			self.draw = function() {
				if (self._alwaysRepaint || self._requestRepaint) {
					//console.log('repaint called');
					self._surface.clear();
					self._events.onRepaint();
					self._requestRepaint = false;
				}
				var alpha = self.getAlpha();
				if (alpha <= 0) {
					return;
				}
				if (self._angle !== 0) {
					var centerX = Math.floor(self._x + self._width / 2);
					var centerY = Math.floor(self._y + self._height / 2);
					self._context.paint.rotate(self._angle, [centerX, centerY]);
				}
				if (alpha < 1) {
					self._context.paint.setAlpha(alpha);
				}
				self._context.paint.graphics(self._texSurface, self._x, self._y);
				if (alpha < 1) {
					self._context.paint.setAlpha();
				}
				if (self._angle !== 0) {
					self._context.paint.restore();
				}
			};

			// initialize Base
			if (options.background) {
				self.setBackground(options.background);
			}
		},

		/**
		 * Debuggable atomic component.
		 *
		 * @class Debuggable
		 * @classdesc Adds debug features to component.
		 * @memberof atomic_components
		 *
		 * @param {object} options - Constructor options.
		 * @param {bool} [options.debug=false] - When set to true, debugging features will be enabled.
		 * @param {string} [options.debugColor=#c2f] - Color of debug display.
		 * TODO @param {string} [options.debugString=$type] - String of variables to watch and display.
		 *   Private variables are prefixed with $, public variables with %.
		 * TODO @param {number} [options.debugOutputAnchor=1] - Debug label anchor. 1-4 for each corner
		 *   of the container.
		 * TODO @param {array} [options.debugOutputOffset=[0,-15]] - Debug label position.
		 * TODO @param {number} [options.debugBorderWidth=2] - Debug border thickness.
		 */
		Debuggable: function(options, self) {
			self = self || this;

			var debugDisplayText = '';
			function updateDebugDisplayText() {
				debugDisplayText = '';
				for (var i = 0; i < debugWatch.length; i++) {
					debugDisplayText += self[debugWatch[i]] + ' ';
				}
			}

			if (options.debug) {
				var debugWatch = (options.debugString) ? options.debugString.replace(/\$/g, '_').split(' ') : ['_type'];
				var debugColor = options.debugColor || '#c2f';
				setTimeout(updateDebugDisplayText, 5);
				setInterval(updateDebugDisplayText, 100);
				var s_draw = self.draw; // @super:draw
				self.draw = function() { // @override
					s_draw();
					if (self._angle !== 0) {
						var centerX = Math.floor(self._x + self._width / 2);
						var centerY = Math.floor(self._y + self._height / 2);
						self._context.paint.rotate(self._angle, [centerX, centerY]);
					}
					self._context.paint.text(debugDisplayText, self._x, self._y - 15, debugColor, 'left', '11px sans-serif');
					self._context.paint.rect(self._x, self._y, self._width, self._height, debugColor, 2);
					if (self._angle !== 0) {
						self._context.paint.restore();
					}
				};
			}
		},

		/**
		 * Tweenable atomic component.
		 *
		 * @class Tweenable
		 * @classdesc Gives component superpowers.
		 * @memberof atomic_components.
		 *
		 * @param {object} options - Constructor options.
		 */
		Tweenable: function(options, self) {

			var _activeTweens = [];

			function finalizeAllTweens() {
				_activeTweens.forEach(function(tween) {
					if (tween.isActive()) {
						tween.finish();
					}
				});
			}

			/**
			 * Performs a tween.
			 *
			 * @function tween
			 * @memberof atomic_components.Tweenable
			 * @instance
			 *
			 * @param {object} properties - Collection of properties and corresponding values to tween.
			 * @param {object} [options] - Tween options.
			 * @param {number} [options.duration=240] - Tween duration in milliseconds.
			 * @param {function} [options.ease=myst.ease.quadInOut] - Easing function.
			 * @param {number} [options.delay=0] - TODO Tween delay in milliseconds.
			 * @param {function} [options.onDone] - TODO Is called when tween is done animating.
			 */
			self.tween = function(properties, options) {
				options = options || {};
				var duration = fromOption(options.duration, 240);
				var easef = fromOption(options.ease, myst.ease.quadInOut);

				finalizeAllTweens();
				_activeTweens = [];

				myst.iter(properties, function(key, value) {
					var memberfstr = key.charAt(0).toUpperCase() + key.slice(1);
					var from = self['get' + memberfstr]();
					var to = value;
					var setf = self['set' + memberfstr];
					console.log(memberfstr, from, to, setf);
					var tween = new myst.Tween(from, to, duration, setf, function() {
						invokeEvent(options.onDone, self);
					}, easef);
					_activeTweens.push(tween);
					tween.start();
				});
				return self;
			};

			/**
			 * Fade out a component.
			 *
			 * @function fadeOut
			 * @memberof atomic_components.Tweenable
			 * @instance
			 *
			 * @param {object} [options] - Tween options.
			 * @param {number} [options.duration=240] - Tween duration in milliseconds.
			 * @param {function} [options.ease=myst.ease.quadInOut] - Easing function.
			 * @param {number} [options.delay=0] - TODO Tween delay in milliseconds.
			 */
			self.fadeOut = function(options) {
				self.tween({ alpha: 0 }, options);
			};

			/**
			 * Fade in a component.
			 *
			 * @function fadeIn
			 * @memberof atomic_components.Tweenable
			 * @instance
			 *
			 * @param {object} [options] - Tween options.
			 * @param {number} [options.duration=240] - Tween duration in milliseconds.
			 * @param {function} [options.ease=myst.ease.quadInOut] - Easing function.
			 * @param {number} [options.delay=0] - TODO Tween delay in milliseconds.
			 */
			self.fadeIn = function(options) {
				self.tween({ alpha: 1 }, options);
			};

			/**
			 * Fade a component to specific alpha value.
			 *
			 * @function fadeTo
			 * @memberof atomic_components.Tweenable
			 * @instance
			 *
			 * @param {number} alpha - Alpha value.
			 * @param {object} [options] - Tween options.
			 * @param {number} [options.duration=240] - Tween duration in milliseconds.
			 * @param {function} [options.ease=myst.ease.quadInOut] - Easing function.
			 * TODO @param {number} [options.delay=0] - Tween delay in milliseconds.
			 */
			self.fadeTo = function(alpha, options) {
				self.tween({ alpha: alpha }, options);
			};
		},

		/**
		 * Graphics atomic component.
		 *
		 * @class Graphics
		 * @classdesc Displays graphics.
		 *
		 * @memberof atomic_components
		 *
		 * @param {object} options - Constructor options.
		 * @param {object} options.texture - Component graphics.
		 */
		Graphics: function(options, self) {
			self = self || this;

			self._texGraphic = options.texture;

			self._events.onRepaint = function() {
				self.paint.graphics(self._texGraphic, 0, 0, self._width, self._height);
			};
		},

		/**
		 * Tile atomic component.
		 *
		 * @class Tile
		 * @classdesc Displays a tile from a tileset.
		 *
		 * @memberof atomic_components
		 *
		 * @param {object} options - Constructor options.
		 * @param {object} options.texture - Component graphics.
		 * @param {array} [options.tile=[0,0]] - Current tile.
		 */
		Tile: function(options, self) {
			self = self || this;

			self._texTileset = options.texture;
			self._tileWidth = options.tileWidth || self._width;
			self._tileHeight = options.tileHeight || self._height;
			
			self._activeTile = fromOption(options.tile, [0, 0]);

			self._events.onRepaint = function() {
				self.paint.stretchTile(
					self._texTileset, 0, 0,
					self._tileWidth, self._tileHeight,
					self._activeTile[0] * self._tileWidth, self._activeTile[1] * self._tileHeight,
					self._width, self._height
				);
			};
		},

		/**
		 * AbstractButton atomic component.
		 *
		 * @class AbstractButton
		 * @classdesc Defines a button abstraction with corresponding events.
		 * @memberof atomic_components
		 *
		 * @param {object} options - Constructor options.
		 */
		AbstractButton: function(options, self) {
			self = self || this;

			// unique event identifier
			var _eventId = '_@' + getNextEventId();
			console.log(_eventId);

			// "press" gets triggered whenever a button is pressed down
			self._events.onPress = C_EMPTYF;
			// "release" gets triggered whenever a button is released
			self._events.onRelease = C_EMPTYF;
			// "click" gets triggered whenever a button is clicked
			self._events.onClick = C_EMPTYF;

			function _pointInAABB(coords) {
				return myst.pointInRect(coords[0], coords[1], self.getRealX(), self.getRealY(), self._width, self._height);
			}

			function _pointIn(coords) {
				var component = self;
				var list = [];
				do {
					list.push(component);
				} while ((component = component._owner));
				for (var i = list.length - 1; i >= 0; i--) {
					component = list[i];
					if (component._angle !== 0) {
						var centerPoint = [
							Math.floor(component.getRealX() + component._width / 2),
							Math.floor(component.getRealY() + component._height / 2)
						];
						coords = myst.rotatePoint(coords[0], coords[1], centerPoint[0], centerPoint[1], -component._angle);
					}
				}
				return _pointInAABB(coords);
			}

			self._holding = false;
			self._pressed = false;

			input.on('press', function(coords) {
				if (!self.isEnabled() || !self.isVisible()) {
					return;
				}
				if (_pointIn(coords)) {
					self._holding = self._pressed = true;
					self._events.onPress();
				}
			}, _eventId).bindTo(self._rootContext);

			input.on('move', function(coords) {
				if (self._holding && self.isEnabled() && self.isVisible()) {
					var prevPressed = self._pressed;
					var nextPressed = _pointIn(coords);
					if (prevPressed !== nextPressed) {
						if ((self._pressed = nextPressed)) {
							self._events.onPress();
						}
						else if (!self._pressed) {
							self._events.onRelease();
						}
					}
				}
			}, _eventId).bindTo(self._rootContext);

			input.on('release', function(coords) {
				if (self._holding && self.isEnabled() && self.isVisible()) {
					var prevPressed = self._pressed;
					self._holding = self._pressed = false;
					if (prevPressed) {
						self._events.onRelease();
						self._events.onClick();
					}
				}
			}, _eventId).bindTo(self._rootContext);

			self.unregisterEvents = function() {
				if (_eventId) {
					input.off('press', _eventId);
					input.off('move', _eventId);
					input.off('release', _eventId);
				}
			};

			//TODO reset state on enable or disable?
			//TODO implement clickmasks?
		},

		/**
		 * Container atomic component.
		 *
		 * @class Container
		 * @classdesc Defines a container abstraction.
		 * @memberof atomic_components
		 *
		 * @param {object} options - Constructor options.
		 * @param {object} [options.components] - Components to add to container.
		 */
		Container: function(options, self) {
			self = self || this;

			// list of components
			self._componentList = [];
			self._componentKeys = [];

			/**
			 * Adds components to the container.
			 *
			 * @function enable
			 * @memberof atomic_components.Container
			 * @instance
			 *
			 * @param {object} components - Components to be added.
			 */
			self.add = function(components) {
				myst.iter(components, function(componentKey, componentObject) {
					if (self[componentKey]) { // disallow reserved or duplicate keys
						console.error('Cannot add component "' + componentKey + '" due to a name clash.');
						return;
					}
					self._componentList.push(self[componentKey] = componentObject);
					self._componentKeys.push(componentKey);
					// set component context to this container
					componentObject._context = componentObject._owner = self;
					// set root context to current root context
					componentObject._rootContext = self._rootContext;
					// invoke added event
					if (componentObject._events.onAdded) {
						componentObject._events.onAdded();
					}
				});
				return self;
			};

			/**
			 * Get the list of components.
			 *
			 * @function getComponents
			 * @memberof atomic_components.Container
			 * @instance
			 *
			 * @returns {array}
			 */
			self.getComponents = function() {
				return self._componentList;
			};

			/**
			 * Get the list of component keys.
			 *
			 * @function getComponentKeys
			 * @memberof atomic_components.Container
			 * @instance
			 *
			 * @returns {array}
			 */
			self.getComponentKeys = function() {
				return self._componentKeys;
			};

			/**
			 * Remove specific component from the container.
			 *
			 * @function remove
			 * @memberof atomic_components.Container
			 * @instance
			 *
			 * @param {string} componentKey - Key of component to remove.
			 *
			 * @return {bool} Removal success.
			 */
			self.remove = function(componentKey) {
				//TODO
				return false;
			};

			/**
			 * Remove all components from the container.
			 *
			 * @function removeAll
			 * @memberof atomic_components.Container
			 * @instance
			 *
			 * @returns {object} Self.
			 */
			self.removeAll = function() {
				self._componentList.forEach(function(componentObject) {
					// unregister any events attached to components
					if (componentObject.unregisterEvents) {
						componentObject.unregisterEvents();
					}
					// recursively remove all contained containers
					if (componentObject.removeAll) {
						componentObject.removeAll();
					}
					// invoke removed event
					if (componentObject._events.onRemoved) {
						componentObject._events.onRemoved();
					}
				});
				// clear component lists
				self._componentList = [];
				// clear component keys
				self._componentKeys.forEach(function(componentKey) {
					delete self[componentKey];
				});
				// clear component key list
				self._componentKeys = [];
				return self;
			};

			// initialize Container
			if (options.components) {
				self.add(options.components);
			}
		}

	};

	///////////////////////////////////////////////////////////////////////////////
	//
	//  Public components
	//
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * @namespace public_components
	 */
	var public_components = {

		/**
		 * Control component. Extends {@link atomic_components.Base|Base},
		 *   {@link atomic_components.Debuggable|Debuggable}, {@link atomic_components.Tweenable|Tweenable}.
		 *
		 * @class Control
		 * @classdesc A plain control component.
		 * @memberof public_components
		 *
		 * @param {object} options - Constructor options.
		 */
		Control: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new atomic_components.Base(options, self),
				new atomic_components.Debuggable(options, self),
				new atomic_components.Tweenable(options, self)
			);

			self._type = 'Control';
		},

		/**
		 * Frame control. Extends {@link public_components.Control|Control},
		 *   {@link atomic_components.Container|Container}
		 *
		 * @class Frame
		 * @classdesc This component can be used as a container for other components.
		 * @memberof public_components
		 *
		 * @param {object} options - Constructor options.
		 */
		Frame: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new public_components.Control(options, self),
				new atomic_components.Container(options, self)
			);

			self._type = 'Frame';

			/**
			 * Render the component and all children components.
			 */
			self._events.onRepaint = function() {
				var n_components = self._componentList.length;
				for (var i = 0; i < n_components; i++) {
					self._componentList[i].draw();
				}
			};

			// set frame to autorepaint
			self._alwaysRepaint = true;
		},

		/**
		 * Shape control. Extends {@link public_components.Control|Control}.
		 *
		 * @class Shape
		 * @classdesc A control that may display one of several shapes.
		 * @memberof public_components
		 *
		 * @param {object} options - Constructor options.
		 * @param {object} options.shape - Shape options.
		 * @param {string} [options.shape.color="#000"] - Shape color.
		 * @param {bool} [options.shape.fill=false] - Shape fill. Set to true to fill the shape.
		 * @param {number} [options.shape.border=1] - Shape border thickness.
		 * @param {array} [options.shape.geometry] - Shape geometry. Array of coordinate pairs.
		 * @param {string} [options.shape.type] - Shape type. Can be one of the following: rectangle,
		 *   line, triangle, polygon, circle or arc.
		 */
		Shape: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new public_components.Control(options, self)
			);

			self._type = 'Shape';

			var SHAPE_TYPE = {
				rectangle: 1,
				line: 2,
				triangle: 3,
				polygon: 4,
				circle: 5,
				arc: 6
			};

			self._shapeRealUnits = null;
			self._shapeColor = null;
			self._shapeFill = null;
			self._shapeBorder = null;
			self._shapeType = null;
			self._shapeGeometry = null;
			self._shapeRadius = null;
			self._shapeParameters = null;

			var defaultShapeRealUnits = false;
			var defaultShapeColor = '#000';
			var defaultShapeFill = true;
			var defaultShapeBorder = 1;
			var defaultShapeType = SHAPE_TYPE.rectangle;

			function getDefaultShapeGeometry() {
				switch (self._shapeType) {
					case SHAPE_TYPE.rectangle: return [[0, 0], [1, 1]];
					case SHAPE_TYPE.line: return [[0, 0], [1, 0]];
					case SHAPE_TYPE.triangle: return [[0, 1], [0.5, 0], [1, 1]];
					case SHAPE_TYPE.polygon: return [[0, 1], [0.5, 0], [1, 1]];
					case SHAPE_TYPE.circle: return [[0.5, 0.5]];
					case SHAPE_TYPE.arc: return [[0.5, 0.5]];
				}
			}

			function getDefaultShapeRadius() {
				switch (self._shapeType) {
					case SHAPE_TYPE.circle:
					case SHAPE_TYPE.arc:
						return 0.5;
					default:
						return 0;
				}
			}

			function getDefaultShapeParameters() {
				switch (self._shapeType) {
				}
			}

			/**
			 * Sets shape color.
			 *
			 * @function setShapeColor
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {string} color - Shape color.
			 *
			 * @returns {object} Self.
			 */
			self.setShapeColor = function(color) {
				self._shapeColor = color;
				self._requestRepaint = true;
			};

			/**
			 * Sets shape fill.
			 *
			 * @function setShapeFill
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {bool} fill - Controls whether full shape is filled, or just the outlines.
			 *
			 * @returns {object} Self.
			 */
			self.setShapeFill = function(fill) {
				self._shapeFill = Boolean(fill);
				self._requestRepaint = true;
			};

			/**
			 * Sets shape border thickness.
			 *
			 * @function setShapeBorder
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {number} border - Shape border thickness.
			 *
			 * @returns {object} Self.
			 */
			self.setShapeBorder = function(border) {
				self._shapeBorder = Mat.max(1, parseInt(border, 10));
				self._requestRepaint = true;
			};

			/**
			 * Sets shape type.
			 *
			 * @function setShapeType
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {string} type
			 *
			 * @returns {object} Self.
			 */
			self.setShapeType = function(type) {
				self._shapeType = SHAPE_TYPE[type] || defaultShapeType;
				self._requestRepaint = true;
			};

			/**
			 * Sets shape geometry.
			 *
			 * @function setShapeGeometry
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {array} geometry
			 *
			 * @returns {object} Self.
			 */
			self.setShapeGeometry = function(geometry) {
				self._requestRepaint = true;
			};

			/**
			 * Sets shape radius.
			 *
			 * @function setShapeRadius
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {number} radius
			 *
			 * @returns {object} Self.
			 */
			self.setShapeRadius = function(radius) {
				self._shapeRadius = radius;
				self._requestRepaint = true;
			};

			/**
			 * Sets shape parameters.
			 *
			 * @function setShapeParameters
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {array} parameters
			 *
			 * @returns {object} Self.
			 */
			self.setShapeParameters = function(parameters) {
				self._shapeParameters = parameters;
				self._requestRepaint = true;
			};

			/**
			 * Sets shape real units.
			 *
			 * @function setShapeRealUnits
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {bool} shapeRealUnits
			 *
			 * @returns {object} Self.
			 */
			self.setShapeRealUnits = function(shapeRealUnits) {
				self._shapeRealUnits = Boolean(shapeRealUnits);
				self._requestRepaint = true;
			};

			/**
			 * Sets shape.
			 *
			 * @function setShape
			 * @memberof public_components.Shape
			 * @instance
			 *
			 * @param {object} options - Constructor options.
			 * @param {bool} [options.realUnits=false]
			 * @param {string} [options.color='#000']
			 * @param {bool} [options.fill=true]
			 * @param {number} [options.border]
			 * @param {string} [options.type='rectangle']
			 * @param {array} [options.geometry]
			 * @param {number} [options.radius]
			 * @param {array} [options.parameters]
			 *
			 * @returns {object} Self.
			 */
			self.setShape = function(shapeOptions) {
				shapeOptions = shapeOptions || {};
				self._requestRepaint = true;
				// shape real units
				if (shapeOptions.realUnits !== undefined) {
					self._shapeRealUnits = Boolean(shapeOptions.realUnits);
				}
				else if (self._shapeRealUnits === null) {
					self._shapeRealUnits = defaultShapeRealUnits;
				}
				// shape color
				if (shapeOptions.color !== undefined) {
					self._shapeColor = shapeOptions.color;
				}
				else if (self._shapeColor === null) {
					self._shapeColor = defaultShapeColor;
				}
				// shape fill
				if (shapeOptions.fill !== undefined) {
					self._shapeFill = Boolean(shapeOptions.fill);
				}
				else if (self._shapeFill === null) {
					self._shapeFill = defaultShapeFill;
				}
				// shape border
				if (shapeOptions.border !== undefined) {
					self._shapeBorder = Math.max(0, parseInt(shapeOptions.border, 10));
				}
				else if (self._shapeBorder === null) {
					self._shapeBorder = defaultShapeBorder;
				}
				self._shapeBorder = (shapeOptions.border !== undefined) ? parseInt(shapeOptions.border, 10) : defaultShapeBorder;
				// shape type
				var previousShapeType = self._shapeType;
				self._shapeType = SHAPE_TYPE[shapeOptions.type] || defaultShapeType;
				var hasShapeChanged = self._shapeType !== previousShapeType;
				// shape geometry
				if (shapeOptions.geometry !== undefined) {
					self._shapeGeometry = shapeOptions.geometry;
				}
				else if (self._shapeGeometry === null || hasShapeChanged) {
					self._shapeGeometry = getDefaultShapeGeometry();
				}
				// shape radius
				if (shapeOptions.radius !== undefined) {
					self._shapeRadius = shapeOptions.radius;
				}
				else if (self._shapeRadius === null) {
					self._shapeRadius = getDefaultShapeRadius();
				}
				console.log(self._shapeRadius);
				// shape parameters
				if (shapeOptions.parameters !== undefined) {
					self._shapeParameters = shapeOptions.parameters;
				}
				else if (self._shapeParameters === null) {
					self._shapeParameters = getDefaultShapeParameters();
				}
				return self;
			};

			self._events.onRepaint = function() { // @override
				if (!self._shapeGeometry instanceof Array) {
					return;
				}
				var n_points = self._shapeGeometry.length;
				var shapeType = self._shapeType;
				var shapeFill = self._shapeFill;
				var shapeColor = self._shapeColor;
				var shapeBorder = self._shapeBorder;
				var shapeRadius = self._shapeRadius;

				/**
				 * Translate unit geometry to pixels.
				 */
				function translateUnitGeometry(geometry) {
					var realGeometry = [];
					var scale_x = self.getWidth();
					var scale_y = self.getHeight();
					var scale_min = Math.min(scale_x, scale_y);
					for (var p = 0; p < n_points; p++) {
						var pointUnitCoordinates = geometry[p];
						if (pointUnitCoordinates instanceof Array && pointUnitCoordinates.length === 2) {
							var px = pointUnitCoordinates[0] * scale_x;
							var py = pointUnitCoordinates[1] * scale_y;
							if (!shapeFill || shapeFill && shapeType === SHAPE_TYPE.line) {
								// shrink shape by border
								px = myst.clamp(px, shapeBorder, scale_x - shapeBorder);
								py = myst.clamp(py, shapeBorder, scale_y - shapeBorder);
							}
							realGeometry.push([px, py]);
						}
					}
					return realGeometry;
				};

				var geometry = (self._shapeRealUnits) ? self._shapeGeometry : translateUnitGeometry(self._shapeGeometry);

				switch (shapeType) {
					case SHAPE_TYPE.rectangle:
						if (n_points < 2) {
							return;
						}
						if (shapeFill) {
							self.paint.rectFill(
								geometry[0][0], geometry[0][1],
								geometry[1][0] - geometry[0][0], geometry[1][1] - geometry[0][1],
								shapeColor,
								shapeRadius
							);
						}
						else {
							self.paint.rect(
								geometry[0][0], geometry[0][1],
								geometry[1][0] - geometry[0][0], geometry[1][1] - geometry[0][1],
								shapeColor,
								shapeBorder,
								shapeRadius
							);
						}
						break;
					case SHAPE_TYPE.line:
						if (n_points < 2) {
							return;
						}
						self.paint.line(
							geometry[0][0], geometry[0][1],
							geometry[1][0], geometry[1][1],
							shapeColor,
							shapeBorder
						);
						break;
					case SHAPE_TYPE.triangle:
						if (n_points !== 3) {
							return;
						}
						//-->FALLTHROUGH-->//
					case SHAPE_TYPE.polygon:
						if (n_points < 3) {
							return;
						}
						if (shapeFill) {
							self.paint.polygonFill(geometry, shapeColor);
						}
						else {
							self.paint.polygon(geometry, shapeColor, shapeBorder);
						}
						break;
					case SHAPE_TYPE.circle:
						break;
					case SHAPE_TYPE.arc:
						break;
				}
			};

			// initialize Shape
			self.setShape(options.shape);

/*
			var SHAPE_TYPE = {
				rectangle: 0,
				line: 1,
				triangle: 2,
				polygon: 3,
				circle: 4,
				arc: 5,
				//TODO?
				pie: 6,
				star: 7
			};

			self._recalculateGeometry = false;

			self._shapeColor = '#fff';
			self._shapeFill = false;
			self._shapeBorder = 1;
			self._shapeUnitGeometry = null;
			self._shapeRealGeometry = [];
			self._shapeType = SHAPE_TYPE.rectangle;

			function getDefaultGeometry(shapeType) {
				switch (shapeType) {
					case SHAPE_TYPE.rectangle: return [[0, 0], [1, 1]];
					case SHAPE_TYPE.line: return [[0, 0], [1, 0]];
					case SHAPE_TYPE.triangle: return [[0.5, 0], [0, 1], [1, 1]];
					case SHAPE_TYPE.circle: return [[0.5, 0.5], 0.5];
					case SHAPE_TYPE.arc: return [[0.5, 0.5], 0.5, 0, 120];
				}
			}

			function updateRealGeometry() {
				self._shapeRealGeometry = [];
				var n_params = self._shapeUnitGeometry.length;
				var scale_x = self.getWidth();
				var scale_y = self.getHeight();
				var scale_min = Math.min(scale_x, scale_y);
				for (var p = 0; p < n_params; p++) {
					var geometry = self._shapeUnitGeometry[p];
					if (geometry instanceof Array && geometry.length === 2) {
						var px = geometry[0] * scale_x;
						var py = geometry[1] * scale_y;
						// shrink shape by border
						if (!self._shapeFill || self._shapeFill && self._shapeType === SHAPE_TYPE.line) {
							px = myst.clamp(px, self._shapeBorder, scale_x - self._shapeBorder);
							py = myst.clamp(py, self._shapeBorder, scale_y - self._shapeBorder);
						}
						self._shapeRealGeometry.push([px, py]);
					}
					else {
						if (p > 1) {
							self._shapeRealGeometry.push(geometry);
							continue;
						}
						var ps = geometry * scale_min;
						if (!self.shapeFill && (self._shapeType === SHAPE_TYPE.circle || self._shapeType === SHAPE_TYPE.arc)) {
							// shrink radius by border
							ps = myst.clamp(ps * 2, self._shapeBorder, scale_min - self._shapeBorder) / 2;
						}
						console.log(ps);
						self._shapeRealGeometry.push(ps);
					}
				}
			}

			self.setShape = function(shape) {
				shape = shape || {};
				self._shapeColor = fromOption(shape.color, self._shapeColor);
				self._shapeFill = fromOption(shape.fill, self._shapeFill);
				self._shapeBorder = fromOption(shape.border, self._shapeBorder);
				var prevType = self._shapeType;
				self._shapeType = fromOption(SHAPE_TYPE[shape.type], self._shapeType);
				if (self._shapeType !== prevType) {
					self._shapeUnitGeometry = fromOption(shape.geometry, getDefaultGeometry(self._shapeType));
				}
				else {
					self._shapeUnitGeometry = fromOption(shape.geometry, self._shapeUnitGeometry || getDefaultGeometry(self._shapeType));
				}
				self._requestRepaint = true;
				self._recalculateGeometry = true;
				return self;
			};

			var s_events_onResized = self._events.onResized; // @super:_events:onResized
			self._events.onResized = function() { // @override
				self._recalculateGeometry = true;
				s_events_onResized();
			};

			self._events.onRepaint = function() { // @override
				if (self._recalculateGeometry) {
					updateRealGeometry();
					self._recalculateGeometry = false;
				}

				var geometry = self._shapeRealGeometry;
				var n_params = geometry.length;

				switch (self._shapeType) {
					//
					// rectangle shape
					//
					case SHAPE_TYPE.rectangle:
						if (n_params < 2) {
							return;
						}
						if (self._shapeFill) {
							self.paint.rectFill(
								geometry[0][0], geometry[0][1],
								geometry[1][0] - geometry[0][0], geometry[1][1] - geometry[0][1],
								self._shapeColor,
								geometry[2]
							);
						}
						else {
							self.paint.rect(
								geometry[0][0], geometry[0][1],
								geometry[1][0] - geometry[0][0], geometry[1][1] - geometry[0][1],
								self._shapeColor,
								self._shapeBorder,
								geometry[2]
							);
						}
						break;
					//
					// line shape
					//
					case SHAPE_TYPE.line:
						if (n_params < 2) {
							return;
						}
						self.paint.line(
							geometry[0][0], geometry[0][1],
							geometry[1][0], geometry[1][1],
							self._shapeColor,
							self._shapeBorder
						);
						break;
					//
					// triangle/polygon shape
					//
					case SHAPE_TYPE.triangle:
					case SHAPE_TYPE.polygon:
						if (n_params < 3) {
							return;
						}
						if (self._shapeFill) {
							self.paint.polygonFill(geometry, self._shapeColor);
						}
						else {
							self.paint.polygon(geometry, self._shapeColor, self._shapeBorder);
						}
						break;
					//
					// circle shape
					//
					case SHAPE_TYPE.circle:
						if (n_params < 2) {
							return;
						}
						if (self._shapeFill) {
							self.paint.circleFill(geometry[0][0], geometry[0][1], geometry[1], self._shapeColor);
						}
						else {
							self.paint.circle(geometry[0][0], geometry[0][1], geometry[1], self._shapeColor, self._shapeBorder);
						}
						break;
					//
					// arc shape
					//
					case SHAPE_TYPE.arc:
						if (self._shapeFill) {
							self.paint.arcFill(geometry[0][0], geometry[0][1], geometry[1], geometry[2], geometry[3], self._shapeColor);
						}
						else {
							self.paint.arc(geometry[0][0], geometry[0][1], geometry[1], geometry[2], geometry[3], self._shapeColor, self._shapeBorder);
						}
						break;
				}
			};

			// set shape on init
			self.setShape(options.shape);

		*/
		},

		Image: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new public_components.Control(options, self),
				new atomic_components.Graphics(options, self)
			);

			self._type = 'Image';
		},

		TileImage: function(options, self) {
		},

		Label: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new public_components.Control(options, self)
			);

			self._type = 'Label';

			self._autoResize = fromOption(options.autoResize, false);
			self._text = '';

			/**
			 * Set label text.
			 */
			self.setText = function(text) {
			};

			// initialize Label
			self.setText(options.text);
		},

		BitmapLabel: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new public_components.Control(options, self)
			);

			self._type = 'BitmapLabel';
		},

		TileButton: function(options, self) {
			self = self || this;
			options = options || {};

			myst.compose(
				self,
				new public_components.Control(options, self),
				new atomic_components.Tile(options, self),
				new atomic_components.AbstractButton(options, self)
			);

			self._type = 'TileButton';

			self._events.onPress = function() { // @override
				self._activeTile = options.tiles.pressed;
				self._requestRepaint = true;
				invokeEvent(options.onPress, self);
			};

			self._events.onRelease = function() { // @override
				self._activeTile = options.tiles.normal;
				self._requestRepaint = true;
				invokeEvent(options.onRelease, self);
			};

			self._events.onClick = function() { // @override
				invokeEvent(options.onClick, self);
			};
		},

		GraphicButton: function() {
		},

		ToggleButton: function() {
		},

		StateBox: function() {
		},

		CheckBox: function() {
		},

		OptionBox: function() {
		}

	};

	///////////////////////////////////////////////////////////////////////////////
	//
	//  Public functions
	//
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * @namespace public_functions
	 */
	var public_functions = {

		/**
		 * Initializes myst.ui.
		 *
		 * @function init
		 * @memberof public_functions
		 * @instance
		 *
		 * @param {object} inputObject - myst.js Input object
		 */
		init: function(inputObject) {
			input = inputObject;
		},

		/**
		 * Creates a tile from a given texture.
		 *
		 * @function createTile
		 * @memberof public_functions
		 * @instance
		 *
		 * @param {object} texture - Source graphics.
		 * @param {number} tileX
		 * @param {number} tileY
		 * @param {number} tileWidth
		 * @param {number} tileHeight
		 *
		 * @returns {object}
		 */
		createTile: function(texture, tileX, tileY, tileWidth, tileHeight) {
			var tileSurface = new myst.Surface({
				width: tileWidth,
				height: tileHeight
			});
			tileSurface.render.tile(texture, 0, 0, tileWidth, tileHeight, tileX, tileY);
			return tileSurface.canvas;
		},

		/**
		 * Sets a global context which all newly created controls will default to when
		 * being constructed.
		 *
		 * @function setGlobalContext
		 * @memberof public_functions
		 * @instance
		 *
		 * @param {object} stateContext - Context to set as global context.
		 */
		setGlobalContext: function(stateContext) {
			globalContext = stateContext;
		}

	};

	return myst.compose({ atomic: atomic_components }, public_components, public_functions);

}()); // end of myst.UI
