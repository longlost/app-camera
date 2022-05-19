

import * as Comlink                from 'comlink';
import * as tf                     from '@tensorflow/tfjs-core';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/face_mesh';


const DEFAULT_WIDTH  = 640;
const DEFAULT_HEIGHT = 480;


const bitmapOffscreenCanvas = new OffscreenCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);
const bitmapOffscreenCtx    = bitmapOffscreenCanvas.getContext('2d');

let canvas;
let context;
let detector;
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
const drawFullMeshPoints = faces => {

  context.clearRect(0, 0, canvas.width, canvas.height); 

  context.fillStyle   = '#32EEDB';
  context.strokeStyle = '#32EEDB';
  context.lineWidth   = 0.5;

  faces.forEach(face => {
    const keypoints = face.scaledMesh;
    
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

  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

  // Detector config:
  //
  //    runtime: Must set to be 'tfjs'.
  //
  //    maxFaces: Defaults to 1. Max 10.
  //              The maximum number of faces that will be detected by the model. 
  //              The number of returned faces can be less than the maximum 
  //                (for example when no faces are present in the input). 
  //              It is highly recommended to set this value to the expected max 
  //                number of faces, otherwise the model will continue to search 
  //                for the missing faces which can slow down the performance.
  //
  //    refineLandmarks: Defaults to false. 
  //                     If set to true, refines the landmark coordinates around the eyes 
  //                       and lips, and output additional landmarks around the irises.
  //
  //    detectorModelUrl: An optional string that specifies custom url of the detector model. 
  //                      This is useful for area/countries that don't have access to the 
  //                        model hosted on tf.hub. 
  //                      It also accepts io.IOHandler which can be used with 
  //                        tfjs-react-native to load model from app bundle directory using 
  //                        bundleResourceIO.
  //
  //    landmarkModelUrl: An optional string that specifies custom url of the landmark model. 
  //                      This is useful for area/countries that don't have access to the 
  //                        model hosted on tf.hub. 
  //                      It also accepts io.IOHandler which can be used with 
  //                        tfjs-react-native to load model from app bundle directory using 
  //                        bundleResourceIO.
  const config = {
    runtime:        'tfjs',
    refineLandmarks: true,
    ...options
  };

  detector = await faceLandmarksDetection.createDetector(model, config);
};


const predict = async ({frame}, mirror) => {  

  const bitmapCanvas = bitmapToCanvas(frame);

  const faces = await detector.estimateFaces(bitmapCanvas, {
    flipHorizontal: mirror
  });

  if (faces.length > 0) {
    renderer(faces);
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
