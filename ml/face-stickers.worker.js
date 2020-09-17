

import * as Comlink  from 'comlink';
import * as tf 			 from '@tensorflow/tfjs';
import * as facemesh from '@tensorflow-models/facemesh';


const RETURN_TENSORS = false;
const PREDICTIRISES  = true;

const offscreen 	 = new OffscreenCanvas(640, 480);
const offscreenCtx = offscreen.getContext('2d');

let canvas;
let context;
let model;


const bitmapToCanvas = bitmap => {	

  offscreenCtx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  bitmap.close(); // Memory management.

  return offscreen;
};

// Use for dev/testing only!
// Draw every keypoint to the visible canvas.
const drawFullMeshPoints = predictions => {

	context.clearRect(0, 0, canvas.width, canvas.height);	

  context.fillStyle 	= '#32EEDB';
  context.strokeStyle = '#32EEDB';
  context.lineWidth 	= 0.5;

  predictions.forEach(prediction => {
    const keypoints = prediction.scaledMesh;
    
    for (let i = 0; i < keypoints.length; i++) {
      const x = keypoints[i][0];
      const y = keypoints[i][1];

      context.beginPath();
      context.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
      context.fill();
    }
  });
};


const init = async ({offscreencanvas}) => {
	canvas 	= offscreencanvas;
	// context = canvas.getContext('webgl');
	context = canvas.getContext('2d');

	offscreen.height = canvas.height;
	offscreen.width  = canvas.width;

	model = await facemesh.load();
};


const predict = async ({frame}, mirror) => {	

	const renderer = bitmapToCanvas(frame);

	const predictions = await model.estimateFaces(renderer, RETURN_TENSORS, mirror, PREDICTIRISES);

	if (predictions.length > 0) {
		drawFullMeshPoints(predictions);
	}
};


Comlink.expose({init, predict});
