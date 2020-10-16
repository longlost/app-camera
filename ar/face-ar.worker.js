

import * as Comlink                from 'comlink';
import * as tf                     from '@tensorflow/tfjs-core';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';


const DEFAULT_WIDTH  = 640;
const DEFAULT_HEIGHT = 480;


const bitmapOffscreenCanvas = new OffscreenCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);
const bitmapOffscreenCtx    = bitmapOffscreenCanvas.getContext('2d');

let canvas;
let context;
let model;
let renderer;
let resizer;
let setFaceMask;
let setStickers;


const sizeBitmapCanvas = ({height = DEFAULT_HEIGHT, width = DEFAULT_WIDTH}) => {
  bitmapOffscreenCanvas.width  = Math.round(width);
  bitmapOffscreenCanvas.height = Math.round(height);
};


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


const getRenderer = async ({
  height = DEFAULT_HEIGHT, 
  mode   = 'test', 
  width  = DEFAULT_WIDTH
}) => {

  if (mode === 'test') {

    context = canvas.getContext('2d');

    const resize = size => {
      canvas.width  = Math.round(size.width);
      canvas.height = Math.round(size.height);
    };

    resize({width, height});

    return {renderer: drawFullMeshPoints, resizer: resize};
  }

  if (mode === 'stickers') {
    const {default: stickersAR} = await import(
      /* webpackChunkName: 'app-camera-system-face-ar-stickers' */ 
      './stickers.js'
    );

    return stickersAR(canvas, width, height);
  }
};


const init = async ({offscreencanvas}, options = {}) => {

  canvas = offscreencanvas;

  // Normalize output to input sizes.
  sizeBitmapCanvas(options);

  const rendererObj = await getRenderer(options);

  renderer    = rendererObj.renderer;
  resizer     = rendererObj.resizer;
  setFaceMask = rendererObj.setFaceMask;
  setStickers = rendererObj.setStickers;

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

// A seperate proxied function since resizer is set late, after init.
const resize = () => Comlink.proxy(options => {

  // Normalize output to input sizes.
  sizeBitmapCanvas(options);

  resizer(options);
});

// A seperate proxied function since setFaceMask is set late, after init.
const faceMask = () => Comlink.proxy(options => {
  return setFaceMask(options);
});

// A seperate proxied function since setStickers is set late, after init.
const stickers = () => Comlink.proxy(options => {
  return setStickers(options);
});


Comlink.expose({faceMask, init, predict, resize, stickers});
