

import * as Comlink                from 'comlink';
import * as tf                     from '@tensorflow/tfjs-core';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';


const bitmapOffscreenCanvas = new OffscreenCanvas(640, 480);
const bitmapOffscreenCtx    = bitmapOffscreenCanvas.getContext('2d');

let canvas;
let context;
let model;
let renderer;
let resizer;


const bitmapToCanvas = bitmap => {  

  bitmapOffscreenCtx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  bitmap.close(); // Memory management.

  return bitmapOffscreenCanvas;
};

// Use for dev/testing only!
// Draw every keypoint to the visible canvas.
const drawFullMeshPoints = predictions => {

  context.clearRect(0, 0, canvas.width, canvas.height); 

  context.fillStyle   = '#32EEDB';
  context.strokeStyle = '#32EEDB';
  context.lineWidth   = 0.5;

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


const getRenderer = async options => {

  const {height, mode, width} = options;

  if (mode === 'test') {

    context = canvas.getContext('2d');

    const resize = (w, h) => {
      canvas.width  = w;
      canvas.height = h;
    };

    resize(width, height);

    return {renderer: drawFullMeshPoints, resizer: resize};
  }

  if (mode === 'stickers') {
    const {default: stickers} = await import(
      /* webpackChunkName: 'app-camera-system-face-ml-stickers' */ 
      './stickers.js'
    );

    return stickers(canvas, width, height);
  }
};


const init = async ({offscreencanvas}, options) => {
  const {height, width} = options;

  canvas = offscreencanvas;

  // Normalize output to input sizes.
  bitmapOffscreenCanvas.width  = width;
  bitmapOffscreenCanvas.height = height;

  const rendererObj = await getRenderer({mode: 'test', ...options});

  renderer = rendererObj.renderer;
  resizer  = rendererObj.resizer;

  await tf.setBackend('webgl');

  model = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, 
    {
      maxFaces: 1, // 10 max.
      ...options
    }
  );
};


const predict = async ({frame}, mirror) => {  

  const bitmapCanvas = bitmapToCanvas(frame);

  const predictions = await model.estimateFaces({
    input:          bitmapCanvas, 
    flipHorizontal: mirror
  });

  if (predictions.length > 0) {
    renderer(predictions);
  }
};

// A seperate function since resizer is set late, after init.
const resize = (...args) => {
  resizer(...args);
};


Comlink.expose({init, predict, resize});
