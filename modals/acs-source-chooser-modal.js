
/**
  * `acs-source-chooser-modal`
  * 
  *   This optional modal ui presents the user with the option to take a 
  *   photo with 'acs-overlay' or add image files with 'afs-file-sources'.
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


import {AppElement, html} from '@longlost/app-element/app-element.js';
import htmlString         from './acs-source-chooser-modal.html';
import '@longlost/app-overlays/app-modal.js';
import '@longlost/app-shared-styles/app-shared-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-button/paper-button.js';
import '../app-camera-icons.js';


class ACSSourceChooserModal extends AppElement {
  static get is() { return 'acs-source-chooser-modal'; }

  static get template() {
    return html([htmlString]);
  }


  async __modalClicked(event) {
    try {
      await this.clicked();
      await this.$.modal.close();
    }
    catch (error) {
      if (error === 'click disabled') { return; }
      console.error(error);
    }
  }


  async __cameraBtnClicked(event) {
    try {
      await this.clicked();
      await this.$.modal.close();

      this.fire('source-chooser-modal-open-camera');
    }
    catch (error) {
      if (error === 'click disabled') { return; }
      console.error(error);
    }
  }


  async __browseBtnClicked(event) {
    try {
      await this.clicked();
      await this.$.modal.close();

      this.fire('source-chooser-modal-open-sources');
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

window.customElements.define(ACSSourceChooserModal.is, ACSSourceChooserModal);

