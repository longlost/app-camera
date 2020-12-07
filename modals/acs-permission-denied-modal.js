
/**
  * `acs-permission-denied-modal`
  * 
  *   This modal ui explains to the user that they will need 
  *   to grant access to the camera in order to use the camera system.
  *
  *   
  *
  *
  *
  *
  *  Properties:
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
  *  
  *  Methods:
  *
  *
  *    
  *
  *   @customElement
  *   @polymer
  *   @demo demo/index.html
  *
  **/


import {
  appCameraPermissionDenied, 
  privacyPolicyUrl
} from 'config.js';

import {AppElement, html} from '@longlost/app-core/app-element.js';
import htmlString         from './acs-permission-denied-modal.html';
import '@longlost/app-overlays/app-modal.js';
import '@polymer/paper-button/paper-button.js';


class ACSPermissionDeniedModal extends AppElement {
  static get is() { return 'acs-permission-denied-modal'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      _appCameraPermissionDenied: String,

      _privacyPolicyUrl: String

    };
  }


  constructor() {
    super();

    this._appCameraPermissionDenied = appCameraPermissionDenied;
    this._privacyPolicyUrl          = privacyPolicyUrl;
  }


  async __dismissHandler() {
    try {
      await this.clicked();
      await this.$.modal.close();
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  open() {
    return this.$.modal.open();
  }

}

window.customElements.define(ACSPermissionDeniedModal.is, ACSPermissionDeniedModal);

