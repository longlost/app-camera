

/**
  * `acs-overlay`
  * 
  *   Live camera feed with interactive camera ui suite.
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
  *  Events:
  *
  *
  *   
  *  
  *  Methods:
  *
  *
  *    open()
  *
  *
  *
  *   @customElement
  *   @polymer
  *   @demo demo/index.html
  *
  *
  **/


import {
  AppElement, 
  html
} from '@longlost/app-element/app-element.js';

import {
  consumeEvent, 
  getBBox, 
  schedule
} from '@longlost/utils/utils.js';

// `o9n` is a screen orientation ponyfill.
// It normalizes the output of different browsers, 
// namely Safari, which is an outlier that hasn't
// adopted the ScreenOrientation api spec.
// https://github.com/chmanie/o9n
import {orientation} from 'o9n'; 

import services   from '@longlost/services/services.js';
import htmlString from './acs-overlay.html';
import '@longlost/app-icons/app-icons.js';
import '@longlost/app-images/flip-image.js';
import '@longlost/app-images/lazy-image.js';
import '@longlost/app-overlays/app-overlay.js';
import '@longlost/app-shared-styles/app-shared-styles.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-ripple/paper-ripple.js';
import './app-camera.js';
import './app-camera-icons.js';


class ACSOverlay extends AppElement {
  static get is() { return 'acs-overlay'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      coll: String,

      // Set which camera to initialize with.
      //
      // NOTE: Many devices, such as laptops/pc do not 
      //       have an 'environment' facing camera.
      defaultCamera: {
        type: String,
        value: 'user' // Or 'environment'. 
      },

      // Hide the camera capture button.
      noCapture: {
        type: Boolean,
        value: false
      },

      user: Object,

      _btnDisabled: {
        type: Boolean,
        value: true,
        computed: '__computeBtnDisabled(_ready)'
      },

      _camera: String, // 'user' or 'environment'. 

      // FLIP image input.
      _capture: Object,

      // Always place capture button at bottom of device,
      // away from the camera, as opposed to the bottom of the screen.
      _captureBtnClass: {
        type: String,
        value: 'bottom-btn center-horz-btn',
        computed: '__computeCaptureBtnClass(_screenOrientation)'
      },

      _faceBtnIcon: {
        type: String,
        computed: '__computeFaceBtnIcon(_camera)'
      },

      _flashBtnIcon: {
        type: String,
        computed: '__computeFlashBtnIcon(_flash)'
      },

      _flash: {
        type: String,
        value: 'auto' // Or 'off', or 'flash'.
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

      _imgClicked: Boolean,

      _imgRippled: Boolean,

      // Control preview image no-fade property.
      // Fade-in when setting the placeholder from db,
      // don't fade-in when transitioning from FLIP.
      _noFade: {
        type: Boolean,
        value: true
      },

      _opened: Boolean,

      _photoCapabilities: Object,

      _placeholder: String,

      _previewClass: {
        type: String,
        computed: '__computePreviewClass(_placeholder, _src)'
      },

      // FLIP image input.
      _measurements: Object,

      _ready: Boolean,

      // From `o9n` screen orientation ponyfill.
      // https://github.com/chmanie/o9n
      //
      // This is used to correctly place the capture button
      // at the 'bottom' of the device, close to user's fingers
      // and await from the camera.
      _screenOrientation: String,

      _src: String,

      _streaming: Boolean,

      _trackCapabilities: Object,

      _torch: {
        type: Boolean,
        value: false
      },

    };
  }


  static get observers() {
    return [
      '__imgClickedRippledChanged(_imgClicked, _imgRippled)',
      '__openedChanged(_opened)',
      '__streamingChanged(_streaming)',
      '__userOpenedSrcChanged(user, _opened, _src)'
    ];
  }


  connectedCallback() {
    super.connectedCallback();

    this.__getOrientation  = this.__getOrientation.bind(this);
    this.__getMeasurements = this.__getMeasurements.bind(this);

    this.__getOrientation();

    orientation.addEventListener('change', this.__getOrientation);
    window.addEventListener(     'resize', this.__getMeasurements);
  }


  disconnectedCallback() {
    super.disconnectedCallback();

    orientation.removeEventListener('change', this.__getOrientation);
    window.removeEventListener(     'resize', this.__getMeasurements);    
  }


  __computeBtnDisabled(ready) {
    return !ready;
  }


  __computeCaptureBtnClass(orientation) {

    if (orientation === 'landscape-primary') {
      return 'right-btn center-vert-btn';
    }

    if (orientation === 'landscape-secondary') {
      return 'left-btn center-vert-btn';
    }

    return 'bottom-btn center-horz-btn';
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
      return 'app-camera-icons:flash-auto';
    }

    if (flash === 'off') {
      return 'app-camera-icons:flash-off';
    }

    return 'app-camera-icons:flash-on';
  }


  __computeFaceBtnIcon(cameraFace) {
    if (!cameraFace) { return ''; }

    if (cameraFace === 'user') {
      return 'app-camera-icons:camera-front';
    }

    return 'app-camera-icons:camera-rear';
  }


  __computePreviewClass(placeholder, src) {
    if (placeholder || src) {
      return 'shared-card-shadow';
    }
    
    return '';
  }


  __imgClickedRippledChanged(clicked, rippled) {

    if (clicked && rippled) {
      this._imgClicked = false;
      this._imgRippled = false;

      this.fire('camera-overlay-open-camera-roll');
    }
  }


  __openedChanged(opened) {
    if (opened) {
      this.__getMeasurements();
      this.start();
    }
    else {
      this.stop();
    }
  }


  __streamingChanged(streaming) {
    this.fire('camera-overlay-streaming-changed', {value: streaming});
  }


  async __userOpenedSrcChanged(user, opened, src) {
    try {      

      if (user && opened && !src) {

        const [item] = await services.getAll({
          // coll:  this.coll,

          coll:  'test',


          limit: 1,
          orderBy: {
            prop:      'timestamp',
            direction: 'desc'
          } 
        });

        if (item && !src && !this._placeholder) {
          this._noFade      = false;
          this._placeholder = item.thumbnail || item.optimized;
        }      
      }
    }
    catch (error) {
      console.log('Could not fetch latest capture for preview: ', error);
    }
  }


  __getOrientation() {
    if (!orientation) { return; }

    this._screenOrientation = orientation.type;
  }


  __getMeasurements() {
    if (!this._opened) { return; }

    this._measurements = getBBox(this.$.overlay);
  }


  __resetHandler() {
    this._opened = false;
  }


  __cameraChangedHandler(event) {
    consumeEvent(event);

    this._camera = event.detail.value;
  }


  __permissionDeniedHandler(event) {
    consumeEvent(event);

    this.fire('camera-overlay-permission-denied');
  }


  __photoCapabilitiesChangedHandler(event) {
    consumeEvent(event);

    this._photoCapabilities = event.detail.value;
  }


  __readyChangedHandler(event) {
    consumeEvent(event);

    this._ready = event.detail.value;
  }


  __streamingChangedHandler(event) {
    consumeEvent(event);

    this._streaming = event.detail.value;
  }


  __trackCapabilitiesChangedHandler(event) {
    consumeEvent(event);

    this._trackCapabilities = event.detail.value;
  }


  async __srcLoadedHandler(event) {
    consumeEvent(event);

    const {value: loaded} = event.detail;

    if (loaded) {

      await schedule();

      this._capture = undefined;

      this.$.flip.reset();
      window.URL.revokeObjectURL(this._src);
    }
  }


  __rippleDoneHandler(event) {
    consumeEvent(event);

    this._imgRippled = true;
  }


  async __backBtnClicked() {
    try {
      await this.clicked();

      this.$.overlay.back();
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }

  
  async __optionsBtnClicked() {
    try {
      await this.clicked();

      this.fire('camera-overlay-open-options');
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


  async __imgClickHandler() {
    try {
      await this.clicked();

      this._imgClicked = true;
      this._imgRippled = false;
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  async __captureBtnClicked() {
    try {
      await this.clicked();

      const blob = await this.takePhoto();

      this._capture = window.URL.createObjectURL(blob);

      this.$.flip.reset();

      await schedule();

      await this.$.flip.play();

      this._noFade      = true;
      this._placeholder = undefined;
      this._src         = this._capture;
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  async __switchCameraBtnClicked() {
    try {
      await this.clicked();

      this._ready = false;

      this.$.cam.switchCamera();
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }

  // Returns a promise that resolves to an ImageBitmap.
  grabFrame() {
    return this.$.cam.grabFrame();
  }


  async open() {
    await this.$.overlay.open();

    this._opened = true;
  }

  // Initialize video stream.
  start() {
    this.$.cam.start();
  }

  // Halt video stream.
  stop() {
    this.$.cam.stop();
  }

  // Returns promise that resolves to a Blob Object.
  takePhoto() {
    return this.$.cam.takePhoto();
  }

}

window.customElements.define(ACSOverlay.is, ACSOverlay);
