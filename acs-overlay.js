

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
} from '@longlost/app-core/app-element.js';

import {blobToFile} from '@longlost/app-core/lambda.js';

import {
  consumeEvent, 
  getBBox,
  getRootTarget, 
  schedule
} from '@longlost/app-core/utils.js';

import timer from '@longlost/app-core/worker/timer.js';

// `o9n` is a screen orientation ponyfill.
// It normalizes the output of different browsers, 
// namely Safari, which is an outlier that hasn't
// adopted the ScreenOrientation api spec.
//
// https://github.com/chmanie/o9n
import {orientation} from 'o9n'; 

import {ArMixin} from './ar/ar-mixin.js';

import mime       from 'mime-types';
import services   from '@longlost/app-core/services/services.js';
import htmlString from './acs-overlay.html';
import '@longlost/app-core/app-icons.js';
import '@longlost/app-core/app-shared-styles.js';
import '@longlost/app-images/flip-image.js';
import '@longlost/app-images/lazy-image.js';
import '@longlost/app-overlays/app-overlay.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-ripple/paper-ripple.js';
import './app-camera.js';
import './app-camera-icons.js';


class ACSOverlay extends ArMixin(AppElement) {
  static get is() { return 'acs-overlay'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      // Firebase collection to save and fetch captures.
      coll: String,

      // Set which camera to initialize with.
      //
      // NOTE: Many devices, such as laptops/pc do not 
      //       have an 'environment' facing camera.
      defaultCamera: {
        type: String,
        value: 'user' // Or 'environment'. 
      },

      faceAr: Boolean,

      // Hide the camera capture button.
      noCapture: {
        type: Boolean,
        value: false
      },

      user: Object,

      // The photographic capture Blob.
      _blob: Object,

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

      _hideArBtn: {
        type: Boolean,
        value: true,
        computed: '__computeHideArBtn(faceAr)' // Future proofing for other types of ar (ie handAr).
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

      // Used along with '_opened' to start the camera, but only
      // once/if the overlay is opened. 
      // This ensures that the camera is not accessed when the feed is 
      // not visible, in order to make intentions clear and keep user trust.
      _startCam: Boolean,

      _streaming: Boolean,

      _trackCapabilities: Object,

      _torch: {
        type: Boolean,
        value: false
      },

      _uiIdleTime: {
        type: Number,
        value: 3000
      },

      _uiTimer: Object

    };
  }


  static get observers() {
    return [
      '__collUserOpenedSrcChanged(coll, user, _opened, _src)',
      '__imgClickedRippledChanged(_imgClicked, _imgRippled)',
      '__openedChanged(_opened)',
      '__openedStartCamChanged(_opened, _startCam)',
      '__streamingChanged(_streaming)'
    ];
  }


  connectedCallback() {
    super.connectedCallback();

    this.__getOrientation  = this.__getOrientation.bind(this);
    this.__resize          = this.__resize.bind(this);
    this.__uiTimerCallback = this.__uiTimerCallback.bind(this);

    this.__getOrientation();

    this._uiTimer = timer();

    orientation.addEventListener('change', this.__getOrientation);
    window.addEventListener(     'resize', this.__resize);
  }


  disconnectedCallback() {
    super.disconnectedCallback();

    this._uiTimer.stop();

    orientation.removeEventListener('change', this.__getOrientation);
    window.removeEventListener(     'resize', this.__resize);   
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


  __computeHideArBtn(faceAr) {
    return !Boolean(faceAr);
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

  // Fetch the most recently taken photo to display as a camera roll access ui.
  async __collUserOpenedSrcChanged(coll, user, opened, src) {
    try {      

      // Unless user has already taken a capture during 
      // this session (testing for src to be falsey).
      if (coll && user && opened && !src) { 

        const [item] = await services.getAll({
          coll,
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
      this.__startUiTimer();
      this.start();
    }
    else {
      this.stop();
    }

    this.fire('camera-overlay-opened-changed', {value: opened});
  }


  __openedStartCamChanged(opened, start) {
    
    if (opened && start) { 
      this.$.cam.start();
    }    
  }


  __streamingChanged(streaming) {
    this.fire('camera-overlay-streaming-changed', {value: streaming});
  }


  __getOrientation() {
    if (!orientation) { return; }

    this._screenOrientation = orientation.type;
  }


  __getMeasurements() {
    if (!this._opened) { return; }

    this._measurements = getBBox(this.$.overlay);
  }


  async __resize() {
    this.__getMeasurements();

    await schedule();

    this.__arResize(this.$.cam.getVideoMeasurements());
  }


  async __startUiTimer() {
    this._uiTimer.start(this._uiIdleTime, this.__uiTimerCallback);

    this.$.ui.style['display'] = 'block';

    await schedule();

    this.$.ui.classList.remove('hide-ui');
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


  __uiTimerCallback() {
    this.$.ui.classList.add('hide-ui');
  }


  async __contentClicked() {
    try {
      await this.clicked();      

      this.__startUiTimer();
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  __uiTransitionendHandler(event) {    
    consumeEvent(event);

    const target = getRootTarget(event);

    if (
      target.id          === 'ui'            && 
      event.type         === 'transitionend' && 
      event.propertyName === 'opacity'
    ) {

      if (this.$.ui.classList.contains('hide-ui')) {
        this.$.ui.style['display'] = 'none';
      }
    }
  }


  async __srcLoadedHandler(event) {
    consumeEvent(event);

    const {value: loaded} = event.detail;

    if (loaded) {

      await schedule();

      this._capture = undefined;

      this.$.flip.reset();
      window.URL.revokeObjectURL(this._src);

      // Start saving captures to user's collection.
      if (this.coll) {

        const name    = `capture.${mime.extension(this._blob.type)}`;
        const capture = blobToFile(this._blob, name, this._blob.type);

        this.fire('camera-overlay-save-capture', {capture});

        this._blob = undefined;
      }
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


  async __settingsBtnClicked() {
    try {
      await this.clicked();

      this.fire('camera-overlay-open-settings');
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

      this._blob = await this.takePhoto();

      this._capture = window.URL.createObjectURL(this._blob);

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

  
  async __arBtnClicked() {
    try {
      await this.clicked();


      // TODO:
      // 
      //      This should open the ar effects quick chooser

      console.log('ar button clicked');

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
    this._startCam = true;
  }

  // Halt video stream.
  stop() {
    this._startCam = false;
    this.$.cam.stop();
  }

  // Returns promise that resolves to a Blob Object.
  takePhoto() {
    return this.$.cam.takePhoto();
  }

}

window.customElements.define(ACSOverlay.is, ACSOverlay);
