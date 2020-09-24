
// From https://github.com/spite/FaceMeshFaceGeometry/examples/mask/main.js

import {
  AmbientLight,
  CanvasTexture,
	DoubleSide,
  HemisphereLight,
  // IcosahedronGeometry,
  OrthographicCamera,
  Mesh,
  // MeshBasicMaterial,

  MeshPhongMaterial,
  MeshStandardMaterial,

  PCFSoftShadowMap,
  sRGBEncoding,
  Scene,
  SpotLight,
  WebGLRenderer
} from 'three/build/three.module.js';

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {FaceMeshFaceGeometry} from './facemesh-three-geometry.js';


// Create a new geometry helper.
const faceGeometry = new FaceMeshFaceGeometry();
const loader 			 = new GLTFLoader();

// String --> Promise --> Object/Error
//
// The single argument is a url or path string pointing
// to a .gltf or .glb file.
//
// The returned promise resolves to a gltf three.js object.
// The returned promise fails with an error object.
//
//
// loader.load( 'path/to/model.glb', function ( gltf ) {
// 	scene.add( gltf.scene );
// }, undefined, function ( error ) {
// 	console.error( error );
// } );
//
// Used to add 3d assets with bones that track along with the face.
const loadGLTF = url => {
	return new Promise((resolve, reject) => {
		loader.load(url, resolve, undefined, reject);
	});
};

// Used to create custom textured face mask materials.
const loadImageTexture = async url => {

	const response = await fetch(url);

	if (!response.ok) {
    throw new Error('loadImageTexture fetch failed.');
  }

	const blob 	 = await response.blob();
	const bitmap = await createImageBitmap(blob);

	// Texture does not work in a worker context, but CanvasTexture does.
	const texture = new CanvasTexture(bitmap);

	texture.encoding = sRGBEncoding;

	return texture;
};

// Create wireframe material for debugging.
const addDebuggingWireframe = (faceGeometry, scene) => {

	const wireframeMaterial = new MeshBasicMaterial({
	  color: 		 0xff00ff,
	  wireframe: true,
	});

	// Create mask mesh.
	const mask = new Mesh(faceGeometry, wireframeMaterial);

	mask.receiveShadow = true; 
	mask.castShadow 	 = true;

	scene.add(mask);
};

// Create a whole-face mask material for debugging.
const addDebuggingMask = async (faceGeometry, scene) => {

	const [colorTexture, aoTexture, alphaTexture] = await Promise.all([
		loadImageTexture('images/mesh_map.jpg'),
		loadImageTexture('images/ao.jpg'),
		loadImageTexture('images/mask.png')
	]);

	// Create material for mask.
	const material = new MeshStandardMaterial({
	  color: 				0x808080, // Light grey.
	  roughness: 		0.8,
	  metalness: 		0.1,
	  alphaMap: 		alphaTexture,
	  aoMap: 				aoTexture,
	  map: 					colorTexture,
	  roughnessMap: colorTexture,
	  transparent: 	true,
	  side: 				DoubleSide
	});

	// Create mask mesh.
	const mask = new Mesh(faceGeometry, material);

	mask.receiveShadow = true; 
	mask.castShadow 	 = true;	

	scene.add(mask);
};

// Create a red material for the nose.
const addDebuggingNose = scene => {
	 
	const noseMaterial = new MeshStandardMaterial({
	  color: 			 0xff2010,
	  roughness: 	 0.4,
	  metalness: 	 0.1,
	  transparent: true,
	});

	const nose = new Mesh(new IcosahedronGeometry(1, 3), noseMaterial);

	nose.castShadow 	 = true; 
	nose.receiveShadow = true;

	nose.scale.setScalar(40);

	scene.add(nose);

	return nose;
};


const addCustomTexturedMask = async (faceGeometry, scene, url) => {

	// TextureLoader does not work in a worker context.
	const colorTexture = await loadImageTexture('images/test_sticker.png');

	// Create material for mask.
	const material = new MeshStandardMaterial({
	  roughness: 		0.5, // Default: 1.0 - 0.0 is smooth, fully reflective surface, 1.0 is fully diffuse
	  metalness: 		0.3, // Default: 0.0 - Wood or stone would be 0.0, 1.0 is metalic surface.
	  map: 					colorTexture,
	  transparent: 	true,
	  side: 				DoubleSide
	});

	// // Create material for mask.
	// const material = new MeshPhongMaterial({
	//   map: 					colorTexture,
	//   transparent: 	true,
	//   shininess: 		15, // Default: 30, How shiny the .specular highlight is; a higher value gives a sharper highlight.
	//   side: 				DoubleSide,
	//   specular: 		0x111111 // Default: 0x111111 (very dark grey).
	// });


	// Create mask mesh.
	const mask = new Mesh(faceGeometry, material);

	mask.receiveShadow = true;
	mask.castShadow 	 = true;

	scene.add(mask);
};
	

// Add lights.
const addLighting = scene => {

	const spotLight = new SpotLight(0xffffbb, 1);

	spotLight.position.set(0.5, 0.5, 1);
	spotLight.position.multiplyScalar(400);

	spotLight.castShadow = true;

	spotLight.shadow.mapSize.width 	= 1024;
	spotLight.shadow.mapSize.height = 1024;

	spotLight.shadow.camera.near = 200;
	spotLight.shadow.camera.far  = 800;

	spotLight.shadow.camera.fov = 40;

	spotLight.shadow.bias = -0.001125;

	const hemiLight 	 = new HemisphereLight(0xffffbb, 0x080820, 0.25);
	const ambientLight = new AmbientLight(0x404040, 0.25);

	scene.add(spotLight);
	scene.add(hemiLight);
	scene.add(ambientLight);	
};


export default async (canvas, width, height) => {

	// Set a background color, or change alpha to false for a solid canvas.
	const renderer = new WebGLRenderer({
		antialias: true, 
		alpha: 		 true, 
		canvas
	});

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type 	 = PCFSoftShadowMap;
	renderer.outputEncoding 	 = sRGBEncoding;



	// const gltf = await loadGLTF('images/test.gltf');



	const scene  = new Scene();
	const camera = new OrthographicCamera(1, 1, 1, 1, -1000, 1000);

	const resize = (w, h) => {
	  width  = w;
	  height = h;

    camera.left 	= -0.5 * width;
    camera.right 	=  0.5 * width;
    camera.top 		=  0.5 * height;
    camera.bottom = -0.5 * height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
    faceGeometry.setSize(width, height);
	};
	
	resize(width, height);
	renderer.render(scene, camera);
	

	// // Create wireframe material for debugging.
	// addDebuggingWireframe(faceGeometry, scene);

	// // Create a whole-face mask material for debugging.
	// await addDebuggingMask(faceGeometry, scene);

	// // Create a red material for the nose.
	// const nose = addDebuggingNose(scene);

	// Create a mask material that is textured by an image.
	await addCustomTexturedMask(faceGeometry, scene, 'images/test_sticker.png');

	// Add lights.
	addLighting(scene);	
	

	const render = faces => {

    // Update face mesh geometry with new data.
    faceGeometry.update(faces[0]);

    // // Modify nose position and orientation.
    // const track = faceGeometry.track(5, 45, 275);
    // nose.position.copy(track.position);
    // nose.rotation.setFromRotationMatrix(track.rotation);
	    
	  renderer.render(scene, camera);
	};

	return {renderer: render, resizer: resize};
};
