
/**
  * `ArMixin`
  * 
  *   App Camera System AR specific logic.
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
  *
  *
  *
  *  Methods: 
  *
  *   
  *   
  *
  *
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  **/
  

import {warn} from '@longlost/utils/utils.js';


export const ArMixin = superClass => {
  return class ArMixin extends superClass {    


	  static get properties() {
	    return {

	      // Include AR filters, stickers, effects for the human face.
	      faceAr: Boolean,

	      // Set to true after ar assets have been loaed and initialized.
	      _arReady: Boolean

	    };
	  }


	  static get observers() {
	  	return [
      	'__faceArOffscreenCanvasChanged(faceAr, _offscreencanvas)',
      	'__readyChanged(_ready, _arReady)' 		
	  	];
	  }


	  connectedCallback() {
	    super.connectedCallback();	    

    	this._offscreencanvas = this.$.offscreencanvas;
	  }

	  // AR resize function. Set after initializing AR worker.
	  __arResize() {}

	  // AR predict function. Set after initializing AR worker.
	  __arPredict() {}

	  // Set/update mask texture. Set after initializing AR worker.
	  __setFaceArMask() {}

	  // Set/update 3d sticker models. Set after initializing AR worker.
	  __setFaceArStickers() {}


	  async __faceArOffscreenCanvasChanged(faceAr, canvas) {
	    if (!faceAr || !canvas) { return; }

	    try {

	      const ar = await import(
	        /* webpackChunkName: 'app-camera-system-face-ar' */ 
	        './ar/face-ar.js'
	      );

	      const offscreencanvas = canvas.transferControlToOffscreen(); 


	      // TODO:
	      // 
	      //      Allow mode to be chaged dynamically once other modes are developed.


	      await ar.init(offscreencanvas, {mode: 'stickers'});

	      this.__arResize          = await ar.resize();
	      this.__arPredict         = await ar.predict;
	      this.__setFaceArMask     = await ar.faceMask();
	      this.__setFaceArStickers = await ar.stickers();


	      // TODO:
	      //
	      //      Build mask/sticker picker ui.
	      await this.__setFaceArMask();
	      // await this.__setFaceArStickers();


	      this._arReady = true;
	    }
	    catch (error) {
	      this._arReady            = false;
	      this.__arResize          = undefined;
	      this.__arPredict         = undefined;
	      this.__setFaceArMask     = undefined;
	      this.__setFaceArStickers = undefined;

	      console.error(error);

	      warn(`Uh oh! The AR feature isn't working.`);
	    }
	  }


	  __readyChanged(ready, arReady) {
	    if (ready && arReady) {

	      if (this.faceAr) {

	        // TODO:
	        //      add conditional for stickers vs effects vs none.


	        this.__startFaceAr();
	      }
	    }    
	  }


	  async __startFaceAr() {
	    try {

	      const {height, width} = this.$.cam.getVideoMeasurements();
	      const mirror          = this._camera === 'user'; 

	      await this.__arResize({height, width});

	      while (this._ready && this._streaming) {       

	        const frame = await this.grabFrame();

	        await this.__arPredict(frame, mirror);
	      }
	    }
	    catch (error) {
	      console.error(error);

	      warn(`Uh oh! The AR feature isn't working.`);
	    }
	  }

  };
};
