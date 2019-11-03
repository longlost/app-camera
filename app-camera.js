/**
 * `app-camera`
 * access a live stream from the devices camera
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
import {
  AppElement, 
  html
}                 from '@longlost/app-element/app-element.js';
import {
  listen, 
  listenOnce, 
  message, 
  warn
}                 from '@longlost/utils/utils.js';
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
//      fire an error when the camera cannot be accessed directly (ie. Safari PWA mode)


// detect Safari PWA mode
// if (window.navigator.standalone === true) {
//   console.log('display-mode is standalone');
// }


class AppCamera extends AppElement {
  static get is() { return 'app-camera'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

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
        value: 'user' // or 'environment'
      },

      _devices: Array,

      _flash: {
        type: String,
        value: 'auto' // or 'off' or 'flash'
      },

      _hideFlashBtn: {
        type: Boolean,
        value: true,
        computed: '__computeHideFlashBtn(_photoCapabilities.fillLightMode)'
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
        value: {
          facingMode: 'user'
        }
      },

      _videoDevice: Object,

      _zoom: {
        type: Number,
        value: 1 // zoom ratio val:1 (ie 4:1 or 1:1 -> no zoom)
      }

    };
  }


  static get observers() {
    return [
      '__devicesChanged(_devices)'
    ];
  }


  async connectedCallback() {
    super.connectedCallback();

    listen(this.$.stream,       'stream-changed',             this.__streamChanged.bind(this));
    listen(this.$.stream,       'media-stream-error',         this.__streamError.bind(this));
    listen(this.$.video,        'metadata-loaded',            this.__videoReady.bind(this));
    listen(this.$.video,        'source-changed',             this.__videoSourceChanged.bind(this));
    listen(this.$.imageCapture, 'photo-capabilities-changed', this.__photoCapabilitiesChanged.bind(this));
    listen(this.$.imageCapture, 'track-capabilities-changed', this.__trackCapabilitiesChanged.bind(this));
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


  __computeHideTorchBtn(torch) {
    return torch ? false : true;
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


  __devicesChanged(devices) {
    this.fire('devices-changed', {value: devices});
  }


  __trackCapabilitiesChanged(event) {
    this._trackCapabilities = event.detail.value;
  }


  __photoCapabilitiesChanged(event) {
    this._photoCapabilities = event.detail.value;
  }


  __streamError(event) {
    this.fire('stream-error', {value: event});
  }


  __streamChanged(event) {
    const {value: stream} = event.detail;
    this.fire('streaming-changed', {value: Boolean(stream)});
  }


  // inop
  __videoSourceChanged(event) {
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
        this._cameraFace       = 'environment';
        this._videoConstraints = {facingMode: 'environment'};
        this.$.devices.selectNextDevice();
      }
      else {
        this._cameraFace       = 'user';        
        this._videoConstraints = {facingMode: 'user'};
        this.$.devices.selectPreviousDevice();
      }
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  __videoReady() {
    this.fire('video-ready');
  }


  async __captureBtnClicked() {
    try {
      await this.clicked();
      const blob = await this.takePhoto();
      this.fire('photo-captured', {value: blob});
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }

  // returns a promise that resolves to an ImageBitmap
  grabFrame() {
    return this.$.imageCapture.grabFrame();
  }


  start() {
    this.__startVideoPreview();
  }


  stop() {
    this.__stopVideoPreview();
  }

  // returns promise that resolves to an image blob
  takePhoto() {
    return this.$.imageCapture.takePhoto();
  }

}

window.customElements.define(AppCamera.is, AppCamera);
