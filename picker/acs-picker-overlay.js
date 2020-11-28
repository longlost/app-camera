

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


import {AppElement, html} from '@longlost/app-element/app-element.js';
import {hijackEvent}      from '@longlost/utils/utils.js';
import htmlString         from './acs-picker-overlay.html';
import '@longlost/app-overlays/app-header-overlay.js';
import '../app-camera-icons.js';
import './acs-picker-button.js';


class ACSPickerOverlay extends AppElement {
  static get is() { return 'acs-picker-overlay'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      darkMode: Boolean,

      title: {
        type: String,
        value: 'Change this Photo'
      },

      user: Object,

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
    hijackEvent(event);

    this._opened = false;
  }


  __btnClickedRippledHandler(event) {
    hijackEvent(event);

    console.log('btn clicked rippled: ', event.detail);

  }


  async open() {
    await this.$.overlay.open();

    this._opened = true;
  }

}

window.customElements.define(ACSPickerOverlay.is, ACSPickerOverlay);
