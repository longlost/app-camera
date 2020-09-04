
/**
  * `app-camera`
  *
  *    Access a live stream from the device's camera.
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  **/

import {
  AppElement, 
  html
} from '@longlost/app-element/app-element.js';

import {
  clamp
} from '@longlost/lambda/lambda.js';

import {
  consumeEvent,
  listenOnce, 
  message,
  schedule,
  warn,
  wait
} from '@longlost/utils/utils.js';

import htmlString from './app-camera.html';
import '@longlost/app-icons/app-icons.js';
import '@longlost/app-media/app-media-icons.js';
import '@longlost/app-media/app-media-devices.js';
import '@longlost/app-media/app-media-stream.js';
import '@longlost/app-media/app-media-video.js';
import '@longlost/app-media/app-media-image-capture.js';
import '@longlost/app-shared-styles/app-shared-styles.js';
import '@longlost/pinch-to-zoom/pinch-to-zoom.js';
import '@polymer/paper-icon-button/paper-icon-button.js';


class AppCamera extends AppElement {
  static get is() { return 'app-camera'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      /**
        * If true, the video will be scaled so that the source video is
        * flush with the edge of the element, but fully contained by it. 
        *
        * If false (the default), the video will be scaled to the smallest size 
        * that is at full-bleed with respect to the element's bounding box.
        *
        * Both settings preserve the aspect ratio of the source video.
        *
        **/
      contain: {
        type: Boolean,
        value: false
      },

      // Set which camera to initialize with.
      // NOTE: Many devices, such as laptops/pc do not have an 'environment' facing camera.
      defaultCamera: {
        type: String,
        value: 'user' // Or 'environment'. 
      },

      // Hide the camera capture button.
      noCapture: {
        type: Boolean,
        value: false
      },

      _active: {
        type: Boolean,
        value: false
      },

      _cameraFace: {
        type: String,
        value: 'user' // Or 'environment'.
      },

      // Function used to clamp the scale value from
      // `pinch-to-zoom` to set the `_zoom`.
      _clamper: {
        type: Object,
        computed: '__computeClamper(_zoomMin, _zoomMax)'
      },

      _devices: Array,

      _faceBtnIcon: {
        type: String,
        computed: '__computeFaceBtnIcon(_cameraFace)'
      },

      _flash: {
        type: String,
        value: 'auto' // Or 'off', or 'flash'.
      },

      _flashBtnIcon: {
        type: String,
        computed: '__computeFlashBtnIcon(_flash)'
      },

      _hideFlashBtn: {
        type: Boolean,
        value: true,
        computed: '__computeHideFlashBtn(_photoCapabilities.fillLightMode)'
      },

      _hideLightingBtns: {
        type: Boolean,
        value: true,
        computed: '__computeHideLightingBtns(_hideFlashBtn, _hideTorchBtn)'
      },

      _hideTorchBtn: {
        type: Boolean,
        value: true,
        computed: '__computeHideTorchBtn(_trackCapabilities.torch)'
      },

      _hideSwitchFaceBtn: {
        type: Boolean,
        value: true,
        computed: '__computeHideSwitchFaceBtn(_trackCapabilities.facingMode)'
      },

      // Must ignore the first change in the selected video device
      // since fetching it happens after the stream starts and thus
      // is the same device as what is already being used.
      // Only update the device when switching to a new one.
      _initialVideoDeviceUsed: Boolean,

      // This MUST be set AFTER the stream has started for iOS Safari
      // to report the correct number of available devices.
      _kind: String,

      _mirror: {
        type: Boolean,
        value: true,
        computed: '__computeMirror(_cameraFace)'
      },

      _photoCapabilities: Object,

      // `pinch-to-zoom` output which is clamped to compute
      // the `_zoom` factor.
      _scale: Number,

      _stream: Object,

      _trackCapabilities: Object,

      _torch: {
        type: Boolean,
        value: false
      },

      _videoConstraints: {
        type: Object,
        computed: '__computeVideoConstraints(_cameraFace)'
      },

      _videoDevice: Object,

      _zoom: {
        type: Number,
        value: 1, // Zoom ratio val:1 (ie 4:1 or 1:1 -> no zoom).
        computed: '__computeZoom(_clamper, _scale)'
      },

      _zoomMax: {
        type: Number,
        computed: '__computeZoomMax(_photoCapabilities.zoom, _trackCapabilities.zoom)'
      },

      _zoomMin: {
        type: Number,
        computed: '__computeZoomMin(_photoCapabilities.zoom, _trackCapabilities.zoom)'
      }

    };
  }


  static get observers() {
    return [    
      '__clamperChanged(_clamper)',
      '__devicesChanged(_devices)'
    ];
  }


  constructor() {
    super();

    if (this.defaultCamera === 'user' || this.defaultCamera === 'environment') {
      this._cameraFace = this.defaultCamera;
    }
  }


  connectedCallback() {
    super.connectedCallback();

    this.__setupPinchToZoom();
  }


  __computeClamper(min, max) {
    return clamp(min, max);
  }


  __computeHideFlashBtn(fillLightMode) {
    if (!fillLightMode || fillLightMode === 'none') { 
      return true; 
    }

    if (Array.isArray(fillLightMode)) {

      if (!fillLightMode.length) {
        return true;
      }
    }

    return false;
  }


  __computeHideLightingBtns(hideFlash, hideTorch) {
    return hideFlash && hideTorch;
  }


  __computeHideTorchBtn(torch) {
    return !Boolean(torch);
  }


  __computeHideSwitchFaceBtn(facingMode) {
    if (!facingMode || facingMode === 'none') {
      return true;
    } 

    if (Array.isArray(facingMode)) {

      if (facingMode.length === 0) {
        return true;
      }
    }

    return false;
  }


  __computeFlashBtnIcon(flash) {
    if (!flash) { return ''; }

    if (flash === 'auto') {
      return 'app-media-icons:flash-auto';
    }

    if (flash === 'off') {
      return 'app-media-icons:flash-off';
    }

    return 'app-media-icons:flash-on';
  }


  __computeFaceBtnIcon(cameraFace) {
    if (!cameraFace) { return ''; }

    if (cameraFace === 'user') {
      return 'app-media-icons:camera-front';
    }

    return 'app-media-icons:camera-rear';
  }


  __computeMirror(face) {
    if (face === 'environment') {
      return false;
    }

    return true;
  }


  __computeVideoConstraints(face) {
    if (!face) { 
      return {facingMode: 'user'}; 
    }

    return {facingMode: face};
  }


  __computeZoom(clamper, scale) {
    if (typeof clamper !== 'function' || typeof scale !== 'number') { return; }

    return clamper(scale);
  }


  __computeZoomMax(photoZoom, trackZoom) {
    if (trackZoom) {
      const {max} = trackZoom;

      return max > 0 ? max : 4;
    }

    if (photoZoom) {
      const {max} = photoZoom;

      return max > 0 ? max : 4;
    }

    return 4;
  }


  __computeZoomMin(photoZoom, trackZoom) {
    if (trackZoom) {
      const {min} = trackZoom;

      return typeof min === 'number' ? min : 1;
    }

    if (photoZoom) {
      const {min} = photoZoom;

      return typeof min === 'number' ? min : 1;
    }

    return 1;
  }


  __clamperChanged(fn) {
    if (!fn) { return; }
    
    // Reset the pinch-to-zoom element.
    this.__setupPinchToZoom();
  }


  __devicesChanged(devices) {
    this.fire('app-camera-devices-changed', {value: devices});
  }


  __setupPinchToZoom() {
    this._scale = 1;

    this.$.pinchToZoom.setTransform({
      scale: 1,
      x: 0,
      y: 0,
      // Fire a 'change' event if values are different to current values
      allowChangeEvent: true
    });
  }


  __devicesChangedHandler(event) {
    consumeEvent(event);

    this._devices = event.detail.value;
  }


  __devicesSelectedChangedHandler(event) {
    consumeEvent(event);

    // Ignore the initial value since it is
    // the same device that is already in use,
    // no need to start a new stream.
    if (!this._initialVideoDeviceUsed) {
      this._initialVideoDeviceUsed = true;

      return;
    }

    this._videoDevice = event.detail.value;
  }


  __trackCapabilitiesChangedHandler(event) {
    consumeEvent(event);

    this._trackCapabilities = event.detail.value;
  }


  __photoCapabilitiesChangedHandler(event) {
    consumeEvent(event);

    this._photoCapabilities = event.detail.value;
  }


  __streamErrorHandler(event) {
    consumeEvent(event);

    const {value} = event.detail;

    this.fire('app-camera-stream-error-changed', {value});
  }


  __streamChangedHandler(event) {
    consumeEvent(event);

    const {value: stream} = event.detail;

    // iOS Safari fix!
    // MUST get devices AFTER the stream has started
    // in order for the browser to report the correct
    // number of available devices.
    if (stream && !this._kind) {
      this._kind = 'videoinput';
    }

    this._stream = stream;

    this.fire('app-camera-streaming-changed', {value: Boolean(stream)});
  }


  __streamPermissionDeniedHandler(event) {
    consumeEvent(event);

    this.fire('app-camera-permission-denied');
  }


  __sourceChangedHandler(event) {
    consumeEvent(event);

    this.fire('app-camera-source-changed', event.detail);
  }


  async __pinchToZoomChangeHandler(event) {
    consumeEvent(event);

    await schedule();

    this._scale = event.detail.scale;
  }


  __stopVideoPreview() {
    this._active = false;
  }


  __startVideoPreview() {
    this._active = true;
  }


  async __torchBtnClicked() {
    try {
      await this.clicked();

      this._torch = !this._torch;
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  async __flashBtnClicked() {
    try {
      await this.clicked();

      switch (this._flash) {
        case 'auto':
          this._flash = 'off';
          break;
        case 'off':
          this._flash = 'on';
          break;
        case 'on':
          this._flash = 'auto';
          break;
      }
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  async __switchFaceBtnClicked() {
    try {
      await this.clicked();

      if (!this._devices || this._devices.length < 2) { return; }

      if (this._stream) {
        this.$.video.classList.remove('show');

        await wait(250);
      }

      if (this._cameraFace === 'user') {
        this._cameraFace = 'environment';

        this.$.devices.selectNextDevice();
      }
      else {
        this._cameraFace = 'user';  

        this.$.devices.selectPreviousDevice();
      }
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  async __metadataLoadedHandler(event) {
    consumeEvent(event);

    this.$.video.classList.add('show');

    await wait(250);

    this.fire('app-camera-ready');
  }


  async __captureBtnClicked() {
    try {
      await this.clicked();

      const blob = await this.takePhoto();

      this.fire('app-camera-photo-captured', {value: blob});
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }

  // Returns a promise that resolves to an ImageBitmap.
  grabFrame() {
    return this.$.capture.grabFrame();
  }


  start() {
    this.__startVideoPreview();
  }


  stop() {
    this.__stopVideoPreview();
  }

  // Returns promise that resolves to a Blob Object.
  takePhoto() {
    return this.$.capture.takePhoto();
  }

}

window.customElements.define(AppCamera.is, AppCamera);
