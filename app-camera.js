/**
 * `app-camera`
 * access a live stream from the devices camera
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
import {
  SpritefulElement, 
  html
}                 from '@spriteful/spriteful-element/spriteful-element.js';
import {
  listen, 
  listenOnce, 
  message, 
  warn
}                 from '@spriteful/utils/utils.js';
import htmlString from './app-camera.html';
import '@spriteful/app-overlay/app-overlay.js';
import '@spriteful/app-icons/app-icons.js';
import '@spriteful/app-media/app-media-icons.js';
import '@spriteful/app-media/app-media-devices.js';
import '@spriteful/app-media/app-media-stream.js';
import '@spriteful/app-media/app-media-video.js';
import '@spriteful/app-media/app-media-image-capture.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/iron-image/iron-image.js';


// detect Safari PWA mode
// if (window.navigator.standalone === true) {
//   console.log('display-mode is standalone');
// }


class SpritefulAppCamera extends SpritefulElement {
  static get is() { return 'app-camera'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

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

    // listen(this.$.stream, 'stream-changed',    this.__streamChanged.bind(this));
    listen(this.$.stream, 'media-stream-error', this.__streamError.bind(this));

    listen(this.$.video, 'metadata-loaded', this.__videoReady.bind(this));
    listen(this.$.video, 'source-changed', this.__videoSourceChanged.bind(this));

    listen(this.$.imageCapture, 'photo-capabilities-changed', this.__photoCapabilitiesChanged.bind(this));
    listen(this.$.imageCapture, 'track-capabilities-changed', this.__trackCapabilitiesChanged.bind(this));


    listen(this.$.preview, 'loaded-changed', this.__imgLoadedChanged.bind(this));
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
    // console.log('__devicesChanged: ', devices);
  }


  __trackCapabilitiesChanged(event) {
    this._trackCapabilities = event.detail.value;
  }


  __photoCapabilitiesChanged(event) {
    this._photoCapabilities = event.detail.value;
  }


  __streamError(event) {
    console.log('__streamError', event);

    warn('stream error');
  }


  __streamChanged(event) {
    const {value: stream} = event.detail;
    if (stream) {

      // message('stream on');
    }
    // else {
    //  message('stream off');
    // }
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


  __resetPreview() {
    this.$.preview.classList.remove('scale-down');
  }


  __scaleDownPreview() {
    this.$.preview.classList.add('scale-down');
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


  async __closeBtnClicked() {
    try {
      await this.clicked();
      this.__close();
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
        this._videoConstraints = {facingMode: 'environment'};
        this.$.devices.selectNextDevice();
      }
      else {
        this._cameraFace = 'user';        
        this._videoConstraints = {facingMode: 'user'};
        this.$.devices.selectPreviousDevice();
      }
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }



  __imgLoadedChanged(event) {
    if (event.detail.value) {
      window.URL.revokeObjectURL(this._src);
    }
  }


  __videoReady() {
    fire('video-ready');
  }


  async __captureBtnClicked() {
    try {
      await this.clicked();
      this.__resetPreview();
      const blob = await this.$.imageCapture.takePhoto();
      this._src = window.URL.createObjectURL(blob);
      this.__stopVideoPreview();
      this.__startVideoPreview();
      this.__scaleDownPreview();
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  async __close() {
    this._detecting     = false;
    this._stopDetecting = true;
    await this.$.overlay.close();
    this.__stopVideoPreview();
  }


  async open() {
    this._stopDetecting = false;
    await this.$.overlay.open();
    this.__startVideoPreview();
  }


  close() {
    return this.__close();  
  }

}

window.customElements.define(SpritefulAppCamera.is, SpritefulAppCamera);
