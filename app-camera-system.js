

/**
  * `app-camera-system`
  * 
  *   This element handles all interaction with the device camera including saving captured photos.
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
import './acs-options-overlay.js'; // Not lazy loading as it may kill stream on iOS Safari App mode.


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


  __openOptionsHandler(event) {
    hijackEvent(event);

    this.$.options.open();
  }

  
  async __openPermissionDeniedModalHandler(event) {
    hijackEvent(event);

    await import(
      /* webpackChunkName: 'acs-source-chooser-modal' */ 
      './modals/acs-permission-denied-modal.js'
    );

    this.$.denied.open();
  }


  async __openSourcesHandler(event) {
    try {
      hijackEvent(event);

      if (!this.user) { return; } // Must be signed in to save photos.

      await import(
        /* webpackChunkName: 'app-file-system' */ 
        '@longlost/app-file-system/app-file-system.js'
      );

      await this.$.fs.open();
    }
    catch (error) {
      console.error(error);

      warn('Sorry! Could not open the file browser.');
    }
  }


  open() {
    return this.$.camera.open();
  }

  // Show a modal which allows the user to choose 
  // whether to use the `acs-overlay` or
  // `afs-file-sources` ui to add photos.
  async openChooser() {

    await import(
      /* webpackChunkName: 'acs-source-chooser-modal' */ 
      './modals/acs-source-chooser-modal.js'
    );

    return this.$.chooser.open();
  }

}

window.customElements.define(AppCameraSystem.is, AppCameraSystem);
