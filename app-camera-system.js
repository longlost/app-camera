

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
  listenOnce,
  schedule,
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

      user: Object,

      _album: {
        type: String,
        computed: '__computeAlbum(albumType, _albumUid)'
      },

      _albumUid: String,

      _stamp: {
        type: Boolean,
        value: false
      }

    };
  }


  __computeAlbum(type, uid) {
    return `albums/${uid}/${type}`;
  }


  __albumUidChangedHandler(event) {
    hijackEvent(event);

    this._albumUid = event.detail.value;
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

      this.select('#camera').stop();
    }
    catch (error) {
      console.error(error);

      warn('Sorry! Could not open your photos.');
    }
  }


  __openOptionsHandler(event) {
    hijackEvent(event);

    this.select('#options').open();
  }

  
  async __openPermissionDeniedModalHandler(event) {
    hijackEvent(event);

    await import(
      /* webpackChunkName: 'acs-source-chooser-modal' */ 
      './modals/acs-permission-denied-modal.js'
    );

    this.select('#denied').open();
  }

  
  __cameraOpenedChangedHandler(event) {
    hijackEvent(event);

    const {value: opened} = event.detail;

    if (!opened) {
      this._stamp = false;
    }
  }


  async __saveCaptureHandler(event) {
    try {      
      hijackEvent(event);

      await import(
        /* webpackChunkName: 'app-file-system' */ 
        '@longlost/app-file-system/app-file-system.js'
      );

      await this.$.fs.add([event.detail.capture]);
    }
    catch (error) {
      console.error(error);

      warn('Could not save that photo!');
    }
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

      this.select('#camera').stop();
    }
    catch (error) {
      console.error(error);

      warn('Sorry! Could not open the file browser.');
    }
  }


  __listClosedHander(event) {
    hijackEvent(event);

    this.select('#camera').start();
  }


  async open() {

    this._stamp = true;

    await listenOnce(this.$.stamper, 'dom-change');
    await schedule();

    return this.select('#camera').open();
  }

  // Show a modal which allows the user to choose 
  // whether to use the `acs-overlay` or
  // `afs-file-sources` ui to add photos.
  async openChooser() {

    await import(
      /* webpackChunkName: 'acs-source-chooser-modal' */ 
      './modals/acs-source-chooser-modal.js'
    );

    return this.select('#chooser').open();
  }

}

window.customElements.define(AppCameraSystem.is, AppCameraSystem);
