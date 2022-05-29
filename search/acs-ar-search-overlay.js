

/**
  * `acs-ar-search-overlay`
  * 
  *   Easily search for and change camera options such as face stickers, effects.
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
import template      from './acs-ar-search-overlay.html';
import '@longlost/app-overlays/app-header-overlay.js';
import '@longlost/app-spinner/app-spinner.js';
import '@longlost/tab-pages/tab-pages.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-tabs/paper-tab.js';


class ACSARSearchOverlay extends AppElement {

  static get is() { return 'acs-ar-search-overlay'; }

  static get template() {
    return template;
  }


  static get properties() {
    return {

      // The selected tab value AFTER tab-pages animation finishes.
      _currentPage: {
        type: String,
        value: 'stickers'
      },

      _opened: Boolean,

      _selectedPage: {
        type: String,
        value: 'stickers'
      },

      // Only used for initialization of paper-tabs after
      // the overlay has been opened for the first time.
      _initialTab: String

    };
  }


  static get observers() {
    return [
      '__openedChanged(_opened)'
    ];
  }


  __openedChanged(opened) {

    if (opened) {

      if (!this._initialTab) {
        this._initialTab = 'stickers';
      }

    }
  }


  __overlayResetHandler(event) {

    this._opened = false;
  }

  // `paper-tabs` on-selected-changed handler.
  __selectedPageChangedHandler(event) {

    hijackEvent(event);

    this._selectedPage = event.detail.value;
  }

  // `tab-pages` on-page-changed handler.
  __tabPageChangedHandler(event) {

    hijackEvent(event);

    this._currentPage = event.detail.value;
  }


  __hideSpinnerHandler(event) {

    hijackEvent(event);

    this.$.spinner.hide();
  }


  __showSpinnerHandler(event) {

    hijackEvent(event);

    this.$.spinner.show();
  }
  

  async open() {
    
    await this.$.overlay.open();

    this._opened = true;
  }

}

window.customElements.define(ACSARSearchOverlay.is, ACSARSearchOverlay);
