
// From https://github.com/spite/FaceMeshFaceGeometry/examples/mask/main.js

import {
  WebGLRenderer,
  PCFSoftShadowMap,
  sRGBEncoding,
  Scene,
  SpotLight,
  HemisphereLight,
  AmbientLight,
  IcosahedronGeometry,
  OrthographicCamera,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three/build/three.module.js';

import {FaceMeshFaceGeometry} from './facemesh-three-geometry.js';


// Create a new geometry helper.
const faceGeometry = new FaceMeshFaceGeometry();


export default (canvas, width, height) => {

	// Set a background color, or change alpha to false for a solid canvas.
	const renderer = new WebGLRenderer({
		antialias: true, 
		alpha: 		 true, 
		canvas
	});

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type 	 = PCFSoftShadowMap;
	renderer.outputEncoding 	 = sRGBEncoding;

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
	// const wireframeMaterial = new MeshBasicMaterial({
	//   color: 0xff00ff,
	//   wireframe: true,
	// });

	// // Create mask mesh.
	// const mask = new Mesh(faceGeometry, wireframeMaterial);

	// scene.add(mask);
	// mask.receiveShadow = mask.castShadow = true;	


	// Add lights.
	const spotLight = new SpotLight(0xffffbb, 1);

	spotLight.position.set(0.5, 0.5, 1);
	spotLight.position.multiplyScalar(400);
	scene.add(spotLight);

	spotLight.castShadow = true;

	spotLight.shadow.mapSize.width 	= 1024;
	spotLight.shadow.mapSize.height = 1024;

	spotLight.shadow.camera.near = 200;
	spotLight.shadow.camera.far  = 800;

	spotLight.shadow.camera.fov = 40;

	spotLight.shadow.bias = -0.001125;

	scene.add(spotLight);

	const hemiLight = new HemisphereLight(0xffffbb, 0x080820, 0.25);
	scene.add(hemiLight);

	const ambientLight = new AmbientLight(0x404040, 0.25);
	scene.add(ambientLight);

	// Create a red material for the nose.
	const noseMaterial = new MeshStandardMaterial({
	  color: 			 0xff2010,
	  roughness: 	 0.4,
	  metalness: 	 0.1,
	  transparent: true,
	});

	const nose = new Mesh(new IcosahedronGeometry(1, 3), noseMaterial);

	nose.castShadow = nose.receiveShadow = true;
	scene.add(nose);
	nose.scale.setScalar(40);
	

	const render = faces => {

    // Update face mesh geometry with new data.
    faceGeometry.update(faces[0]);

    // Modify nose position and orientation.
    const track = faceGeometry.track(5, 45, 275);
    nose.position.copy(track.position);
    nose.rotation.setFromRotationMatrix(track.rotation);
	    
	  renderer.render(scene, camera);
	};

	return {renderer: render, resizer: resize};
};
