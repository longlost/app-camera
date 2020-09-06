
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

import {AppElement, html}   from '@longlost/app-element/app-element.js';
import {ZoomMixin}          from './zoom-mixin.js';
import {consumeEvent, wait} from '@longlost/utils/utils.js';
import htmlString           from './app-camera.html';
import '@longlost/app-icons/app-icons.js';
import '@longlost/app-media/app-media-icons.js';
import '@longlost/app-media/app-media-devices.js';
import '@longlost/app-media/app-media-stream.js';
import '@longlost/app-media/app-media-video.js';
import '@longlost/app-media/app-media-image-capture.js';
import '@longlost/app-shared-styles/app-shared-styles.js';
import '@polymer/paper-icon-button/paper-icon-button.js';


// Flip a photographic blob horizontally about its center axis.
// Corrects for 'user' facing camera.
const createMirroredImage = blob => {  
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();

  return new Promise((resolve, reject) => {

    const done = newBlob => {
      window.URL.revokeObjectURL(blob);

      resolve(newBlob);
    };

    img.onload = () => {
      canvas.height = img.naturalHeight;
      canvas.width  = img.naturalWidth;

      ctx.translate(img.naturalWidth, 0);
      ctx.scale(-1, 1); // Flip horizontally.
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(done, blob.type, 1); // 1 - No quality reduction.
    };

    img.onerror = reject;
    img.src     = window.URL.createObjectURL(blob);
  });
};


class AppCamera extends ZoomMixin(AppElement) {
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

      _ready: Boolean,      

      _stream: Object,

      _trackCapabilities: Object,

      _trackSettings: Object,

      _torch: {
        type: Boolean,
        value: false
      },

      _videoConstraints: {
        type: Object,
        computed: '__computeVideoConstraints(_cameraFace, _trackConstraints)'
      },

      _videoDevice: Object

    };
  }


  static get observers() {
    return [
      '__devicesChanged(_devices)',
      '__mirrorChanged(_mirror)',
      '__readyChanged(_ready)'
    ];
  }


  constructor() {
    super();

    if (this.defaultCamera === 'user' || this.defaultCamera === 'environment') {
      this._cameraFace = this.defaultCamera;
    }
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


  __computeVideoConstraints(face, constraints = {}) {
    if (!face) { 
      return {...constraints, facingMode: 'user'}; 
    }

    return {...constraints, facingMode: face};
  }


  __devicesChanged(devices) {
    this.fire('app-camera-devices-changed', {value: devices});
  }


  __mirrorChanged(mirror) {
    this.fire('app-camera-mirror-changed', {value: mirror});
  }


  __readyChanged(ready) {
    this.fire('app-camera-ready-changed: ', {value: ready});
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


  __trackConstraintsChangedHandler(event) {
    consumeEvent(event);

    this._trackConstraints = event.detail.value;
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

    this._ready  = false;
    this._stream = stream;

    this.fire('app-camera-streaming-changed', {value: Boolean(stream)});
  }


  __streamPermissionDeniedHandler(event) {
    consumeEvent(event);

    this.fire('app-camera-permission-denied');
  }

  // `_trackSettings` is currently only used by `ZoomMixin`,
  // but this method is kept here for future use.
  __videoTrackChangedHandler(event) {
    consumeEvent(event);

    const {value: track} = event.detail;    
    this._trackSettings  = track ? track.getSettings() : undefined;
  }


  __sourceChangedHandler(event) {
    consumeEvent(event);

    this.fire('app-camera-source-changed', event.detail);
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
          this._flash = 'flash';
          break;
        case 'flash':
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

    this._ready = true;
  }


  async __captureBtnClicked() {
    try {
      await this.clicked();

      const blob = await this.takePhoto();

      this.fire('app-camera-photo-capture-changed', {value: blob});
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
    this._active = true;
  }


  stop() {
    this._active = false;
  }

  // Returns promise that resolves to a Blob Object.
  async takePhoto() {
    const raw = await this.$.capture.takePhoto();

    const blob = this._mirror ? 
                   await createMirroredImage(raw) : 
                   raw;

    return blob;
  }

}

window.customElements.define(AppCamera.is, AppCamera);
