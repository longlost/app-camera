

/**
  * `app-camera-system`
  * 
  *   This element handles all interaction with the device camera including saving captured photos.
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
  hijackEvent,
  warn
} from '@longlost/utils/utils.js';

import htmlString from './app-camera-system.html';
import './acs-overlay.js';


class AppCameraSystem extends AppElement {
  static get is() { return 'app-camera-system'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      darkMode: Boolean,

      // Set which camera to initialize with.
      //
      // NOTE: Many devices, such as laptops/pc do not 
      //       have an 'environment' facing camera.
      defaultCamera: {
        type: String,
        value: 'user' // Or 'environment'. 
      },

      user: Object

    };
  }


  async __openCameraRollHandler(event) {
    try {
    	hijackEvent(event);

    	if (!this.user) { return; } // Must be signed in to save photos.

      await import(
        /* webpackChunkName: 'app-file-system' */ 
        '@longlost/app-file-system/app-file-system.js'
      );

      await this.$.fs.openList();
    }
    catch (error) {
      console.error(error);

      warn('Sorry! Could not open your photos.');
    }
  }


  async __openOptionsHandler(event) {
    try {
    	hijackEvent(event);

      await import(
        /* webpackChunkName: 'acs-options-overlay' */ 
        './acs-options-overlay.js'
      );

      await this.$.options.open();
    }
    catch (error) {
      console.error(error);

      warn('Sorry! Could not open camera options.');
    }
  }


  open() {
  	return this.$.camera.open();
  }

  // Show a modal which allows the user to choose 
  // whether to use the `camera-overlay` or
  // `app-file-system` 'file-sources' ui to add photos.
  openChooser() {
  	// return this.$.chooser.open();
  }

}

window.customElements.define(AppCameraSystem.is, AppCameraSystem);
