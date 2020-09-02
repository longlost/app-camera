
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
  consumeEvent,
  listenOnce, 
  message,
  schedule,
  warn
} from '@longlost/utils/utils.js';

import htmlString from './app-camera.html';
import '@longlost/app-icons/app-icons.js';
import '@longlost/app-media/app-media-icons.js';
import '@longlost/app-media/app-media-devices.js';
import '@longlost/app-media/app-media-stream.js';
import '@longlost/app-media/app-media-video.js';
import '@longlost/app-media/app-media-image-capture.js';
import '@polymer/paper-icon-button/paper-icon-button.js';


// TODO:
//      implement pinch to zoom


// TODO:
//      fire an error when the camera cannot be accessed directly (ie. User rejects)




class AppCamera extends AppElement {
  static get is() { return 'app-camera'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

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

      _flash: {
        type: String,
        value: 'auto' // Or 'off', or 'flash'.
      },

      _flashIcon: {
        type: String,
        computed: '__computeFlashIcon(_flash)'
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

      _kind: {
        type: String,
        value: 'videoinput'
      },

      _mirror: {
        type: Boolean,
        value: true,
        computed: '__computeMirror(_cameraFace)'
      },

      _photoCapabilities: Object,

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
        value: 1 // Zoom ratio val:1 (ie 4:1 or 1:1 -> no zoom).
      }

    };
  }


  static get observers() {
    return [
      '__devicesChanged(_devices)'
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
    // return hideFlash && hideTorch;

    return false;


  }





  __computeHideTorchBtn(torch) {
    return !Boolean(torch);
  }


  __computeHideSwitchFaceBtn(facingMode) {
    if (!facingMode || facingMode === 'none') {
      return true;
    } 

    if (Array.isArray(facingMode)) {

      if (!facingMode.length) {
        return true;
      }
    }

    return false;
  }


  __computeFlashIcon(flash) {
    if (!flash) { return ''; }

    if (flash === 'auto') {
      return 'app-media-icons:flash-auto';
    }

    if (flash === 'off') {
      return 'app-media-icons:flash-off';
    }

    return 'app-media-icons:flash-on';
  }


  __computeFaceIcon(cameraFace) {
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


  __devicesChanged(devices) {
    this.fire('app-camera-devices-changed', {value: devices});
  }


  __devicesChangedHandler(event) {
    consumeEvent(event);

    this._devices = event.detail.value;
  }


  __devicesSelectedChangedHandler(event) {
    consumeEvent(event);

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

    this._stream = stream;

    this.fire('app-camera-streaming-changed', {value: Boolean(stream)});
  }


  __streamPermissionDeniedHandler(event) {
    consumeEvent(event);

    this.fire('app-camera-permission-denied');
  }


  // inop
  __sourceChangedHandler(event) {
    consumeEvent(event);

    // console.log('__videoSourceChanged: ', event);
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

    await schedule();

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
