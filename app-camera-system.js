

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

import services   from '@longlost/app-shell/services/services.js';
import htmlString from './app-camera-system.html';
import './acs-overlay.js';
import './search/acs-ar-search-overlay.js'; // Not lazy loading as it may kill stream on iOS Safari App mode.
import './settings/acs-settings-overlay.js';


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

      // Include AR filters, stickers, effects for the human face.
      faceAr: Boolean,

      user: Object,

      _album: {
        type: String,
        computed: '__computeAlbum(albumType, _albumUid)'
      },

      _albumUid: String,

      _cameraOpened: Boolean,

      _cameraRollOpened: Boolean,

      _filePickerOpened: Boolean,

      _stamp: {
        type: Boolean,
        value: false
      }

    };
  }


  static get observers() {
    return [
      '__userOpenedChanged(user, _cameraOpened, _cameraRollOpened, _filePickerOpened)'
    ];
  }


  __computeAlbum(type, uid) {
    if (!type || !uid) { return; }

    return `albums/${uid}/${type}`;
  }

  // Fetch/create the user's photo album.
  async __userOpenedChanged(user, cameraOpened, cameraRollOpened, filePickerOpened) {
    try {

      if (!user) { return; }      

      if (cameraOpened || cameraRollOpened || filePickerOpened) {

        const coll = `users/${user.uid}/albums`;

        const [albumObj] = await services.query({
          coll,
          limit: 1,
          query: {
            comparator: this.albumType,
            field:      'type',
            operator:   '=='
          }
        });

        // Use the album uid to access its photos.
        if (albumObj) {
          this._albumUid = albumObj.uid;
        }

        // The user does not yet have an album of this type,
        // so create one and assign it a uid. 
        else {

          const ref = await services.add({
            coll, 
            data: {
              description: null,
              name:        this.albumName,
              thumbnail:   null,
              timestamp:   Date.now(),
              type:        this.albumType
            }
          });

          const uid = ref.id;

          await services.set({
            coll,
            doc:   uid,
            data: {uid}
          });

          this._albumUid = uid;
        }         
      }
    }
    catch (error) {
      console.error(`Could not setup the user's photo album: ${error}`);
    }
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

      this._cameraRollOpened = true;
    }
    catch (error) {
      console.error(error);

      warn('Sorry! Could not open your photos.');
    }
  }


  __openArSearchHandler(event) {
    hijackEvent(event);

    this.select('#search').open();
  }


  __openSettingsHandler(event) {
    hijackEvent(event);

    this.select('#settings').open();
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

      this._filePickerOpened = true;
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


  async __stampTemplate() {
    if (this._stamp) { return; }

    this._stamp = true;

    await listenOnce(this.$.stamper, 'dom-change');
    await schedule();
  }


  async open() {

    await this.__stampTemplate();

    await this.select('#camera').open();

    this._cameraOpened = true;
  }

  // Show a modal which allows the user to choose 
  // whether to use the camera (`acs-overlay`) or
  // camera roll (`afs-file-sources`) ui to add photos.
  async openChooser() {

    await import(
      /* webpackChunkName: 'acs-source-chooser-modal' */ 
      './modals/acs-source-chooser-modal.js'
    );

    await this.__stampTemplate();

    return this.select('#chooser').open();
  }

}

window.customElements.define(AppCameraSystem.is, AppCameraSystem);
