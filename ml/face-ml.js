

import runner        from '@longlost/worker/runner.js';
import * as Comlink  from 'comlink';


let workerRunner;


export const init = async (offscreencanvas, options) => {

  if (!workerRunner) {

    const {default: Worker} = await import(
      /* webpackChunkName: 'app-camera-system-face-ml-worker' */ 
      './face-ml.worker.js'
    );

    // workerRunner = await runner(Worker);


    // Testing...
    workerRunner = await runner(Worker, {idle: 1000000000});


  }

  return workerRunner('init', Comlink.transfer({offscreencanvas}, [offscreencanvas]), options);
};


export const predict = (frame, mirror) => {

  if (!workerRunner) {
    throw new Error(`'init' MUST be called before 'predict'!`);
  }

  return workerRunner('predict', Comlink.transfer({frame}, [frame]), mirror);  
};
