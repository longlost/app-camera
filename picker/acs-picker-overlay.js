

/**
  * `acs-picker-overlay`
  * 
  *   This ui presents the user with several options for adding/changing an image.
  *
  *   A preview ui of the image to be picked must be slotted in the default slot.
  *
  *
  *
  *  Properties:
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


import {AppElement, html}  from '@longlost/app-element/app-element.js';
import {hijackEvent, warn} from '@longlost/utils/utils.js';
import htmlString          from './acs-picker-overlay.html';
import '@longlost/app-overlays/app-header-overlay.js';
import '../app-camera-icons.js';
import './acs-picker-button.js';
// `app-camera-system` lazy imported.


class ACSPickerOverlay extends AppElement {
  static get is() { return 'acs-picker-overlay'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      albumName: {
        type: String,
        value: 'My Photos'
      },

      // This MUST be unique to avoid unreachable data.
      albumType: {
        type: String,
        value: 'photos'
      },

      darkMode: Boolean,

      // Set which camera to initialize with.
      //
      // NOTE: Many devices, such as laptops/pc do not 
      //       have an 'environment' facing camera.
      defaultCamera: {
        type: String,
        value: 'user' // Or 'environment'. 
      },

      // Include AR filters, stickers, effects for the human face.
      faceAr: Boolean,

      title: {
        type: String,
        value: 'Change this Photo'
      },

      user: {
        type: Object,
        value: null // Needed for initial button disabled state.
      },

      _opened: Boolean

    };
  }


  static get observers() {
    return [
      '__openedChanged(_opened)'
    ];
  }


  __openedChanged(opened) {
    this.fire('acs-picker-overlay-opened-changed', {value: opened});
  }


  __resetHandler(event) {
    this._opened = false;
  }


  async __btnClickedRippledHandler(event) {
    try {

      hijackEvent(event);

      await import(
        /* webpackChunkName: 'app-camera-system' */ 
        '../app-camera-system.js'
      );

      switch (event?.detail?.type) {

        case 'camera':
          await this.$.cameraSystem.openCamera();
          break;

        case 'picker':
          await this.$.cameraSystem.openSelector();
          break;

        case 'sources':
          await this.$.cameraSystem.openSources();
          break;

        case 'roll':
          await this.$.cameraSystem.openCameraRoll();
          break;

        default:
          throw new Error('Incorrect picker button type.');
      }
    }
    catch (error) {
      console.error(error);

      warn('Could not open the camera system.');
    }
  }


  async open() {
    await this.$.overlay.open();

    this._opened = true;
  }

}

window.customElements.define(ACSPickerOverlay.is, ACSPickerOverlay);
