

/**
  * `acs-picker-button`
  * 
  *   A card-like button with an icon and text.
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
import {consumeEvent} 		from '@longlost/utils/utils.js';
import htmlString     		from './acs-picker-button.html';
import '@longlost/app-shared-styles/app-shared-styles.js';
import '@polymer/iron-a11y-keys/iron-a11y-keys.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-ripple/paper-ripple.js';


class ACSPickerButton extends AppElement {
  static get is() { return 'acs-picker-button'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

    	icon: String,

    	text: String,

    	type: String,

      _clicked: Boolean,

      _rippled: Boolean

    };
  }


  static get observers() {
    return [
      '__clickedRippledChanged(_clicked, _rippled)'
    ];
  }


  connectedCallback() {
    super.connectedCallback();

    this.$.a11y.target = this.$.button;
  }


  __a11yKeysPressed(event) {
  	consumeEvent(event);
  	
    const {key} = event.detail.keyboardEvent;

    if (key === 'Enter') {
      this.__btnClicked();
    }
  }


  __clickedRippledChanged(clicked, rippled) {

    if (clicked && rippled) {
      this._clicked = false;
      this._rippled = false;

      this.fire('clicked-rippled', {type: this.type});
    }
  }


  __rippleDoneHandler(event) {
    consumeEvent(event);

    this._rippled = true;
  }


  async __btnClicked() {
    try {
      await this.clicked();

      this._clicked = true;
      this._rippled = false;
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }

}

window.customElements.define(ACSPickerButton.is, ACSPickerButton);