
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
  

import {warn} from '@longlost/app-core/utils.js';


export const ArMixin = superClass => {
  return class ArMixin extends superClass {    


	  static get properties() {
	    return {

	      // Include AR filters, stickers, effects for the human face.
	      faceAr: Boolean,

	      // Set to true after ar assets have been initialized, before they have been loaded.
	      _arInitialized: Boolean,

	      // Set to true after ar assets have been initialized and loaded.
	      _arReady: Boolean,

	      // Controls loading ui elements' state.
      	_arLoading: {
      		type: Boolean,
      		value: false
      	}

	    };
	  }


	  static get observers() {
	  	return [
      	'__faceArOpenedOffscreenCanvasChanged(faceAr, _opened, _offscreencanvas)',
      	'__openedInitializedReadyChanged(_opened, _arInitialized, _ready, _arReady)' 		
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

	  // AR worker termination function. Set after initializing AR worker.
	  __arTerminate() {}

	  // Set/update mask texture. Set after initializing AR worker.
	  __setFaceArMask() {}

	  // Set/update 3d sticker models. Set after initializing AR worker.
	  __setFaceArStickers() {}


	  __resetAR() {
	  	this._arInitialized 		 = false;
	  	this._arReady            = false;
	  	this._arLoading 	 			 = false;
      this.__arResize          = undefined;
      this.__arPredict         = undefined;
      this.__setFaceArMask     = undefined;
      this.__setFaceArStickers = undefined;
	  }


	  async __faceArOpenedOffscreenCanvasChanged(faceAr, opened, canvas) {
	    if (!faceAr || !opened || !canvas) { return; }

	    try {

	    	this._arLoading = true;

	      const ar = await import(
	        /* webpackChunkName: 'app-camera-system-face-ar' */ 
	        './face-ar.js'
	      );

	      const offscreencanvas = canvas.transferControlToOffscreen(); 


	      // TODO:
	      // 
	      //      Allow mode to be chaged dynamically once other modes are developed.


	      await ar.init(offscreencanvas, {mode: 'stickers'});

	      this.__arResize          = await ar.resize();
	      this.__arPredict         = await ar.predict;
	      this.__arTerminate 			 = await ar.terminate;
	      this.__setFaceArMask     = await ar.faceMask();
	      this.__setFaceArStickers = await ar.stickers();

	      this._arInitialized = true;


	      // TODO:
	      //
	      //      Build mask/sticker picker ui.

	      if (!this.__setFaceArMask || !this.__setFaceArStickers) { return; }

	      await this.__setFaceArMask();
	      // await this.__setFaceArStickers();


	      this._arReady = true;
	    }
	    catch (error) {
	      this.__resetAR();

	      console.error(error);

	      warn(`Uh oh! The AR feature isn't working.`);
	    }
	  }


	  __openedInitializedReadyChanged(opened, arInitialized, ready, arReady) {

	  	if (!opened && arInitialized) {

	      this.__arTerminate();
	      this.__resetAR();
	  	}
	    else if (ready && arReady) {

	      if (this.faceAr) {

	        // TODO:
	        //      add conditional for stickers vs effects vs none.


	        this.__startAr();
	      }
	    }  
	  }


	  async __startAr() {
	    try {

	      const {height, width} = this.$.cam.getVideoMeasurements();
	      const mirror          = this._camera === 'user'; 

	      await this.__arResize({height, width});

	      while (this._ready && this._streaming) {

	        const frame = await this.grabFrame();	        
	        await this.__arPredict(frame, mirror);	        

	      	this._arLoading = false;
	      }
	    }
	    catch (error) {

	    	// Terminated early, so consume error.
	    	if (!this._arReady) { return; }

	      console.error(error);

	      warn(`Uh oh! The AR feature isn't working.`);
	    }
	  }

  };
};
