

import runner       from '@longlost/worker/runner.js';
import * as Comlink from 'comlink';


let runWorker;
let terminateWorker;


export const init = async (offscreencanvas, options) => {

  if (!runWorker) {

    const {default: Worker} = await import(
      /* webpackChunkName: 'app-camera-system-face-ar-worker' */ 
      './face-ar.worker.js'
    );

    const {run, terminate} = await runner(Worker, {terminateAfterIdle: false});

    runWorker       = run;
    terminateWorker = terminate;
  }

  return runWorker('init', Comlink.transfer({offscreencanvas}, [offscreencanvas]), options);
};


export const predict = (frame, mirror) => {

  if (!runWorker) {
    throw new Error(`'init' MUST be called before 'predict'!`);
  }

  return runWorker('predict', Comlink.transfer({frame}, [frame]), mirror);  
};

// Resize the 3d scene and camera.
export const resize = () => {

  if (!runWorker) {
    throw new Error(`'init' MUST be called before 'resize'!`);
  }

  return runWorker('resize');
};

// Set a custom face mask texture.
export const faceMask = () => {

  if (!runWorker) {
    throw new Error(`'init' MUST be called before 'faceMask'!`);
  }

  return runWorker('faceMask');  
};

// Set custom 3d sticker model(s).
export const stickers = () => {

  if (!runWorker) {
    throw new Error(`'init' MUST be called before 'stickers'!`);
  }

  return runWorker('stickers');  
};


// Terminate the worker and GC resources.
export const terminate = () => {

  if (!runWorker) {
    throw new Error(`'init' MUST be called before 'terminate'!`);
  }

  terminateWorker();

  runWorker       = undefined;
  terminateWorker = undefined;  
};
