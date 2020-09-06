
/**
  * `ZoomMixin`
  * 
  *   Logic pertaining to app-camera zoom functionality.
  *
  *
  *
  *  Properites:
  *
  *
  *    
  *
  *
  *
  *
  *
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  **/



import {clamp} 									from '@longlost/lambda/lambda.js';
import {consumeEvent, schedule} from '@longlost/utils/utils.js';
// `pinch-to-zoom` definition is lazy loaded if device zooming is available.


export const ZoomMixin = superClass => {
  return class ZoomMixin extends superClass {    


	  static get properties() {
	    return {	      

	      _canZoom: {
	        type: Boolean,
	        computed: '__computeCanZoom(_photoCapabilities.zoom, _trackCapabilities.zoom)'
	      },

	      // Function used to clamp the `_zoom` value
	      // according to photo and track capabilities.
	      _clamper: {
	        type: Object,
	        computed: '__computeClamper(_zoomMin, _zoomMax)'
	      },

	      _currentZoom: {
	        type: Number,
	        computed: '__computeCurrentZoom(_trackSettings.zoom)'
	      },

	      // `pinch-to-zoom` output which is clamped to compute
	      // the `_zoom` factor.
	      _scale: {
	        type: Number,
	        value: 1,
	        observer: '__scaleChanged'
	      },

	      _zoom: {
	        type: Number,
	        value: 1, // Zoom ratio val:1 (ie 4:1 or 1:1 -> no zoom).
	      },

	      _zoomMax: {
	        type: Number,
	        computed: '__computeZoomMax(_currentZoom, _photoCapabilities.zoom, _trackCapabilities.zoom)'
	      },

	      _zoomMin: {
	        type: Number,
	        computed: '__computeZoomMin(_currentZoom, _photoCapabilities.zoom, _trackCapabilities.zoom)'
	      }

	    };
	  }


	  static get observers() {
	    return [
	      '__canZoomReadyChanged(_canZoom, _ready)'
	    ];
	  }


	  __computeCanZoom(photoZoom, trackZoom) {
	    return Boolean(photoZoom || trackZoom);
	  }


	  __computeClamper(min, max) {
	    if (min === undefined || max === undefined) { return; }

	    return clamp(min, max);
	  }


	  __computeCurrentZoom(val) {
	    return val;
	  }

	  // Conflicting documentation on which set of capabilities
	  // determins zooming, so use which ever one is present.
	  __computeZoomMax(currentZoom, photoZoom, trackZoom) {
	    if (typeof currentZoom !== 'number') { return; }

	    if (trackZoom) {
	      const {max} = trackZoom;

	      if (typeof max === 'number') {
	        return max;
	      }
	    }

	    if (photoZoom) {
	      const {max} = photoZoom;

	      if (typeof max === 'number') {
	        return max;
	      }
	    }

	    return currentZoom;
	  }

	  // Conflicting documentation on which set of capabilities
	  // determines zooming, so use which ever one is present.
	  __computeZoomMin(currentZoom, photoZoom, trackZoom) {
	    if (typeof currentZoom !== 'number') { return; }

	    if (trackZoom) {
	      const {min} = trackZoom;

	      if (typeof min === 'number') {
	        return min;
	      }
	    }

	    if (photoZoom) {
	      const {min} = photoZoom;

	      if (typeof min === 'number') {
	        return min;
	      }
	    }

	    return currentZoom;
	  }


	  async __canZoomReadyChanged(canZoom, ready) {

	    if (canZoom && ready) {
	      await import(
	        /* webpackChunkName: 'pinch-to-zoom' */ 
	        '@longlost/pinch-to-zoom/pinch-to-zoom.js'
	      );

	      // Reset the pinch-to-zoom element.
	      this.__setupPinchToZoom();
	    }
	  }

	  // Must compensate for the fact that a max 
	  // cannot be set on pinch-zoom element.
	  // Instead of using the raw scale value, 
	  // use the percentage of change and apply
	  // that to the '_currentZoom' value to get
	  // the new `_zoom` value. Clamp the output according to 
	  // the photo and track capabilities.
	  __scaleChanged(newScale, oldScale = 1) {
	    if (typeof this._clamper !== 'function') { return; }

	    if (typeof newScale !== 'number') { return; }

	    if (!this._ready) { return; }

	    const delta = newScale / oldScale;

	    const zoom = delta > 1 ? this._currentZoom + 1 : this._currentZoom - 1;

	    this._zoom = this._clamper(zoom); // Clamp the new val.
	  }


	  __setupPinchToZoom() {
	    this.$.pinchToZoom.setTransform({
	      scale: 1,
	      x:     0,
	      y:     0,
	      allowChangeEvent: true // Fire events.
	    });
	  }


	  async __pinchToZoomChangeHandler(event) {
	    consumeEvent(event);

	    await schedule();

	    const {scale} = event.detail;
	    const delta   = Math.max(scale, this._scale) / Math.min(scale, this._scale);

	    if (delta < 1.75) { return; }

	    this._scale = event.detail.scale;
	  }
	 

  };
};
