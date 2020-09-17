
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
import '@longlost/app-media/app-media-devices.js';
import '@longlost/app-media/app-media-stream.js';
import '@longlost/app-media/app-media-video.js';
import '@longlost/app-media/app-media-image-capture.js';


// Flip a photographic blob horizontally about its center axis.
// Corrects for 'user' facing camera.
const createMirroredImage = blob => {  
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();

  return new Promise((resolve, reject) => {

    const done = newBlob => {

      // Avoid memory leaks on iOS Safari, see https://stackoverflow.com/a/52586606.
      canvas.width  = 0;
      canvas.height = 0;

      window.URL.revokeObjectURL(blob); // Release memory resources.

      resolve(newBlob);
    };

    img.onload = () => {
      const {naturalHeight, naturalWidth} = img;

      canvas.height = naturalHeight;
      canvas.width  = naturalWidth;

      // Flip horizontally.
      ctx.translate(naturalWidth, 0);
      ctx.scale(-1, 1); 

      ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

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

      flash: {
        type: String,
        value: 'auto' // Or 'off', or 'flash'.
      },

      torch: {
        type: Boolean,
        value: false
      },

      _active: {
        type: Boolean,
        value: false
      },

      _camera: {
        type: String,
        value: 'user' // Or 'environment'.
      },

      _devices: Array,

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
        computed: '__computeMirror(_camera)'
      },

      _ready: Boolean,      

      _stream: Object,

      _trackSettings: Object,

      _videoConstraints: {
        type: Object,
        computed: '__computeVideoConstraints(_camera, _trackConstraints)'
      },

      _videoDevice: Object

    };
  }


  static get observers() {
    return [
      '__cameraChanged(_camera)',
      '__readyChanged(_ready)'
    ];
  }


  constructor() {
    super();

    if (this.defaultCamera === 'user' || this.defaultCamera === 'environment') {
      this._camera = this.defaultCamera;
    }
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


  __cameraChanged(camera) {
    this.fire('app-camera-changed', {value: camera});
  }


  __readyChanged(ready) {
    this.fire('app-camera-ready-changed', {value: ready});
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


  __trackConstraintsChangedHandler(event) {
    consumeEvent(event);

    this._trackConstraints = event.detail.value;
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


  async __metadataLoadedHandler(event) {
    consumeEvent(event);

    this.$.video.classList.add('show');

    await wait(250);

    this._ready = true;
  }

  // MUST use a canvas element that is attached to the DOM
  // for the live video feed not to freeze.
  // No camera settings options, such as flash or redeye reduction,
  // will be available for polyfilled browsers.
  __takePhotoSafariVideoFeedFreezeFix() {
    const videoEl         = this.select('video', this.$.video);
    const {height, width} = videoEl.getBoundingClientRect();

    this.$.canvas.height = height;
    this.$.canvas.width  = width;

    const ctx = this.$.canvas.getContext('2d');

    // Flip horizontally.
    if (this._mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1); 
    }

    ctx.drawImage(videoEl, 0, 0, width, height);

    return new Promise(resolve => {

      const done = newBlob => {

        // Avoid memory leaks on iOS Safari, see https://stackoverflow.com/a/52586606.
        this.$.canvas.height = 0;
        this.$.canvas.width  = 0;

        resolve(newBlob);
      };

      this.$.canvas.toBlob(done, 'image/jpeg', 1); // 1 - No quality reduction.
    });
  }


  getVideoMeasurements() {
    return this.select('video', this.$.video).getBoundingClientRect();
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


  async switchCamera() {

    if (!this._devices || this._devices.length < 2) { return; }

    if (this._stream) {
      this.$.video.classList.remove('show');

      await wait(250);
    }

    if (this._camera === 'user') {
      this._camera = 'environment';
      this.$.devices.selectNextDevice();
    }
    else {
      this._camera = 'user';  
      this.$.devices.selectPreviousDevice();
    }
  }


  async takePhoto() {

    // No camera settings options will be available for polyfilled browsers.
    if (this.$.capture.usingPolyfill) {
      return this.__takePhotoSafariVideoFeedFreezeFix();
    }

    const raw = await this.$.capture.takePhoto();

    const blob = this._mirror ? 
                   await createMirroredImage(raw) : 
                   raw;

    return blob;    
  }

}

window.customElements.define(AppCamera.is, AppCamera);
