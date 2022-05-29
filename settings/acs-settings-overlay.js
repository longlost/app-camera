

/**
  * `acs-settings-overlay`
  * 
  *   Easily change camera options such as face stickers, effects and settings.
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
  *   @customElement
  *   @polymer
  *   @demo demo/index.html
  *
  **/


import {AppElement}  from '@longlost/app-core/app-element.js';
import {hijackEvent} from '@longlost/app-core/utils.js';
import template      from './acs-settings-overlay.html';
import '@longlost/app-overlays/app-header-overlay.js';


class ACSSettingsOverlay extends AppElement {

  static get is() { return 'acs-settings-overlay'; }

  static get template() {
    return template;
  }


  static get properties() {
    return {

      _opened: Boolean

    };
  }


  static get observers() {
    return [
      '__openedChanged(_opened)'
    ];
  }


  __openedChanged(opened) {

    if (opened) {

    }
  }


  __overlayResetHandler(event) {

    this._opened = false;
  }
  

  async open() {
    
    await this.$.overlay.open();

    this._opened = true;
  }

}

window.customElements.define(ACSSettingsOverlay.is, ACSSettingsOverlay);
