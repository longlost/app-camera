

import runner        from '@longlost/worker/runner.js';
import * as Comlink  from 'comlink';


let workerRunner;

export const init = async offscreencanvas => {

  if (!workerRunner) {

    const {default: Worker} = await import(
      /* webpackChunkName: 'app-camera-system-face-stickers-worker' */ 
      './face-stickers.worker.js'
    );

    workerRunner = await runner(Worker);
  }

  return workerRunner('init', Comlink.transfer({offscreencanvas}, [offscreencanvas]));
};


export const predict = (frame, mirror) => {

	if (!workerRunner) {
		throw new Error(`'init' MUST be called before 'predict'!`);
	}

  return workerRunner('predict', Comlink.transfer({frame}, [frame]), mirror);  
};
