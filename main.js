import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dat from 'dat.gui'//I add it to help use to specify what part we want to rotate using user input

THREE.Cache.enabled = true;
// Create a GUI interface
const gui = new dat.GUI();
const guiContainer = document.getElementById('gui-container');
guiContainer.appendChild(gui.domElement);

// Create a scene
const scene = new THREE.Scene();
const axises = new THREE.AxesHelper(2);
scene.add(axises);

// Create a camera
const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 10000);

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(document.getElementsByClassName('screen')[0].offsetWidth, document.getElementsByClassName('screen')[0].offsetHeight);
document.getElementsByClassName('screen')[0].appendChild(renderer.domElement);

// Add a directional light to the scene
const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
directionalLight.position.set(1, 1, 1); // Adjust the light direction
directionalLight.castShadow = true; // Enable shadow casting
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 10);
directionalLight2.position.set(-1, -1, -1); // Adjust the light direction
directionalLight2.castShadow = true; // Enable shadow casting
scene.add(directionalLight2);

const directionalLight3 = new THREE.DirectionalLight(0xffffff, 3);
directionalLight3.position.set(0, 0, -10); // Adjust the light direction
directionalLight3.castShadow = true; // Enable shadow casting
scene.add(directionalLight3);

// Add a ground plane to receive shadows
const groundGeometry = new THREE.PlaneGeometry(2, 1);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
ground.position.y = -0.07; // Adjust position
ground.receiveShadow = true; // Enable shadow receiving
scene.add(ground);

// Orbit controls for interactive rotation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Adjust the camera position and look-at point
camera.position.set(5, 5, 5);
camera.lookAt(scene.position);
controls.update(); //controls.update() must be called after any manual changes to the camera's transform

let gltfGlobalStorage;

if ( WebGL.isWebGLAvailable() ) {
    // Initiate function or other initializations here
    const loader = new GLTFLoader();

    /** Thinking about user operation in VR world */
    // Add event listener to handle user input
    document.addEventListener('mousedown', (event) => onHandleMouseDown(event, gltfGlobalStorage));

    loader.load( '/assembly test.gltf', function ( gltf ) {
        gltfGlobalStorage = gltf;
        // Add the loaded model to the scene
        // gltf.scene.position.set(0, -1, 0);
        scene.add( gltf.scene );
        renderer.render(scene, camera);
        
        }, function (xhr) {

            console.log((xhr.loaded / xhr.total) * 100 + '% loaded');

        }, function ( error ) {

            console.error( error );

        }
    );

    function animate() {
        requestAnimationFrame( animate );
    
        // required if controls.enableDamping or controls.autoRotate are set to true
        controls.update();
        // renderer.setClearColor(0xcbcbcb);// scene background color    
        renderer.render( scene, camera );
    }
    animate();

    // Handle window resize (Emile comment out this for checking purpose)
    // window.addEventListener('resize', () => {
    //     camera.aspect = window.innerWidth / window.innerHeight;
    //     camera.updateProjectionMatrix();
    //     renderer.setSize(window.innerWidth, window.innerHeight);
    // });

    // Function to handle mouse down event on the handle
    let previousNameSavingFlag = true;
    let previousObjectName = "";
    let flagColorSaving = true; // I declare this bcs of unusually browser rendering behavior
    let colorStorage = {};
    let storageToStorePreviousObject;

    function onHandleMouseDown(event, gltfData) {


        // Perform raycasting to detect which object was clicked
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // I found that when I try to pick one part it is coming with someothers
         
        let intersectionFound = false;// Flag to indicate if an intersection has been found
        
        // Traverse the scene and check for intersection with each child object
        gltfData.scene.traverse(function () {
              // Check if an intersection has already been found
        if (!intersectionFound) {
            // Check for intersection with the child object
            const intersects = raycaster.intersectObjects(gltfData.scene.children, true);
            if (intersects.length > 0) {
                // console.log(intersects.length, intersects[0].object);
                // Trigger animation to move machine part
                const closestObject = intersects[0].object;
                console.log("Closest object:", closestObject.name);

                if(previousNameSavingFlag === true) {
                    flagColorSaving = true;
                    previousObjectName = closestObject.userData.name;
                    storageToStorePreviousObject = closestObject;
                    previousNameSavingFlag = false;
                }

                // Highlight the clicked object
                highlightObject(closestObject);

                // Perform animation to move machine Highlighted part
                animateMachinePart(closestObject);

                // Revert material color to original
                if(closestObject.userData.name != previousObjectName) {
                    previousObjectName = closestObject.userData.name;
                    revertMaterialColor(storageToStorePreviousObject);
                }
                 // Set intersection found flag to true
                intersectionFound = true;
            }
        }
        });
    }

    // Function to highlight the clicked object
    function highlightObject(object) {
        if(flagColorSaving === true) {
            // Save original material color
            colorStorage = object.material.color.clone();

            // Change material color to highlight color
            object.material.color.set(0xff0000); // Red color (adjust as needed)
            flagColorSaving = false;
        }
    }

    // Function to revert material color to original
    function revertMaterialColor(object) {
        object.material.color.copy(colorStorage);
        colorStorage = {};
        previousNameSavingFlag = true;
    }

    // Function to animate the movement of the machine part
    let objectForContinuousAnimation;
    let isRotating = true; // Flag to control rotation
    let initialRotation; // Variable to store initial rotation state

    // Function to store the initial rotation state
    function storeInitialRotation() {
        if (objectForContinuousAnimation) {
            initialRotation = objectForContinuousAnimation.rotation.clone();
        }
    }

    // Function to reset rotation to initial state
    function resetRotation() {
        if (objectForContinuousAnimation && initialRotation) {
            objectForContinuousAnimation.rotation.copy(initialRotation);
        }
    }

    // Create an object to store GUI parameters
    const guiParams = {
        partToRotate: '3DGeom-4', //Irizina narikuye muri cansole then Default part to rotate()
        startRotation: false, // Whether to start rotation initially
        // resetScene: function() {// not yet working
        //     // Reset the scene to its initial state
        //     // Example: Reset camera position, object positions, etc.
        //     camera.position.set(5, 5, 5); // Reset camera position
        //     camera.lookAt(scene.position); // Reset camera look-at point
        //     controls.target.copy(scene.position); // Reset controls target
        //     controls.update(); // Update controls
            
        //     // Additional reset steps if needed
            
        //     // Render the scene
        //     renderer.render(scene, camera);
        // }
    };

    // Add GUI controls
    const partControl = gui.add(guiParams, 'partToRotate', [, '3DGeom-4']).name('Part to Rotate'); //'3DGeom-1', '3DGeom-2', '3DGeom-3', '3DGeom-5', '3DGeom-6'
    const startControl = gui.add(guiParams, 'startRotation').name('Start Rotation');
    // gui.add(guiParams, 'resetScene').name('Reset Scene'); // Add reset scene button
    const pivot = new THREE.Object3D();
    pivot.position.set(0.5001, 1.082, -0.001);
    scene.add(pivot); // Add the pivot object to the scene

    // Listen for changes to GUI controls
    partControl.onChange(function(value) {
        // Handle changes to the part to rotate
        // You can update the rotation target based on the selected part
        // Example: objectForContinuousAnimation = scene.getObjectByName(value);
        const part = scene.getObjectByName(value);
        if (part) {
            objectForContinuousAnimation = part;

        } else {
            console.error(`Object with name '${value}' not found in the scene.`);
        }
    });

    startControl.onChange(function(value) {
        // Handle changes to the start/stop rotation flag
        if (value) {
            // Start rotation
            isRotating = true;
            storeInitialRotation();
            animateMachinePartLoop();
        } else {
            // Stop rotation
            stopRotation();
        }
    });


    function animateMachinePart(object) {
        // Perform animation to move machine part
        // This might involve rotating, translating, or scaling the machine part
      

        // Get the name of the part to rotate from the GUI parameters
        const partName = guiParams.partToRotate; 
        let part = scene.getObjectByName(partName);
        
        // // Find the object in the scene based on its name
        // if(object.name == '3DGeom-4'){
        //     part = scene.getObjectByName(partName);
        // } else {
        //     console.error("You selected Wrong Part!");
        // }
        
        if (part) {
            // Perform animation to rotate the spindle
            objectForContinuousAnimation = part;
            // Start a loop to continuously rotate the spindle
                // Start rotation if the startRotation flag is true
            if (guiParams.startRotation) {
                animateMachinePartLoop();
            }
        } else {
            console.error('Only Spindle Can Be Rotated!');
        }
    }

    function animateMachinePartLoop() {
        if(isRotating) {
            // console.log(objectForContinuousAnimation);
            // pivot.add(axises);
            pivot.add(objectForContinuousAnimation);
            objectForContinuousAnimation.position.set(-0.5, 0, -1.0869);
            pivot.rotation.x += 0.08; // Adjust the rotation speed(0.01);
            renderer.render(scene, camera);
              // Request the next frame of the animation
            requestAnimationFrame(animateMachinePartLoop);
        }else {
            resetRotation(); // Reset rotation when rotation stops
            initialRotation = null; // Reset initial rotation state
        }
    }
    // Function to stop the rotation
    function stopRotation() {
        isRotating = false;
    }

} else {

	const warning = WebGL.getWebGLErrorMessage();
	document.getElementById( 'container' ).appendChild( warning );

}