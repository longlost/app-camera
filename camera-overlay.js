

/**
  * `camera-overlay`
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


import {AppElement, html} from '@longlost/app-element/app-element.js';
import {consumeEvent}     from '@longlost/utils/utils.js';
import htmlString         from './camera-overlay.html';
import '@longlost/app-overlays/app-overlay.js';
import '@longlost/app-shared-styles/app-shared-styles.js';
import './app-camera.js';


class CameraOverlay extends AppElement {
  static get is() { return 'camera-overlay'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

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

      _streaming: Boolean,

    };
  }


  static get observers() {
    return [
      '__streamingChanged(_streaming)'
    ];
  }


  __streamingChanged(streaming) {
    this.fire('camera-overlay-streaming-changed', {value: streaming});
  }


  __permissionDeniedHandler(event) {
    consumeEvent(event);

    // TODO:
    //
    //    Show an explainer modal asking the user
    //    to grant access to the device's camera.
  }


  __streamingChangedHandler(event) {
    consumeEvent(event);

    this._streaming = event.detail.value;
  }


  __reset() {
    this.stop();
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

  // Returns a promise that resolves to an ImageBitmap.
  grabFrame() {
    return this.$.cam.grabFrame();
  }


  async open() {
    await this.$.overlay.open();

    this.start();
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

window.customElements.define(CameraOverlay.is, CameraOverlay);
