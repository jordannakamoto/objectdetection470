// ---------------------------------------------------------------- //
// heightmap-noise.js
// Generate a 3D moon scene of navigable terrain
// 1. Generates a noise function for soft slopes
// 2. Generates lighting surface normals and locations for potholes
//      TODO:
//    - Right now potholes are just perfect cones
//    - Surface normals only reflect a single light source I think
//    - Positioning the light sources would be helpful probably
// 3. Probably want a Player Camera mode
// ---------------------------------------------------------------- //

import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/*================================================================

Setup

================================================================*/

// Create the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadow mapping
document.body.appendChild(renderer.domElement);

// Create a plane geometry to represent the heightmap
const width = 256; // Width of the heightmap
const height = 256; // Height of the heightmap
const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);

// Create a gray texture
const texture = new THREE.TextureLoader().load('../textures/regolith1.jpg'); // Replace with your texture path
const material = new THREE.MeshStandardMaterial({ map: texture, wireframe: false });
const plane = new THREE.Mesh(geometry, material);
plane.receiveShadow = true; // Make sure the plane can receive shadows
plane.rotation.x = -Math.PI / 2; // Rotate the plane to make it horizontal
scene.add(plane);

// Create a canvas for noise display
const noiseCanvas = document.getElementById('noiseCanvas');
const noiseCtx = noiseCanvas.getContext('2d');

/*================================================================

Generate HeightMap + Potholes

================================================================*/

// Function to get the height safely
function getHeight(y, x) {
    // Ensure x and y are within the bounds of the heightmap
    if (x < 0 || x >= width || y < 0 || y >= height) {
        return 0; // Return 0 for out-of-bounds
    }
    return lastHeightmapData[x * width + y]; // Retrieve the height
}

// Function to calculate normals
function calculateNormals() {
    const normals = new Float32Array(width * height * 3); // Three components for x, y, z

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            // Get neighboring heights with correct bounds
            const hL = getHeight(i - 1, j);
            const hR = getHeight(i + 1, j);
            const hD = getHeight(i, j - 1);
            const hU = getHeight(i, j + 1);

            // Calculate normals
            const normalX = hL - hR;
            const normalY = hD - hU;
            const normalZ = 2.0; // This value can be adjusted for more or less steep normals

            // Normalize the normal vector
            const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
            normals[(i * height + j) * 3] = normalX / length;
            normals[(i * height + j) * 3 + 1] = normalY / length;
            normals[(i * height + j) * 3 + 2] = normalZ / length;
        }
    }
    return normals;
}

// Variable to store the last generated heightmap
let lastHeightmapData = null;

function generateHeightmap() {
    const simplex = new SimplexNoise();
    const heightData = new Float32Array(width * height);

    // Create a flat base heightmap with subtle noise
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            // Generate smooth base height with lower noise scale
            heightData[i * width + j] = simplex.noise2D(i / 50, j / 50) * 1; // Subtle variations
        }
    }
    // ----------------------------------------------------------------
    // POTHOLE PARAMS
    // ----------------------------------------------------------------


    
    // Define pothole parameters
    const potholeCount = 4; // Number of potholes
    const minPotholeRadius = 20; // Minimum radius for potholes
    const maxPotholeRadius = 30; // Maximum radius for potholes
    const potholeDepthMultiplier = -20; // Depth multiplier for potholes

    // Introduce distinct potholes
    for (let k = 0; k < potholeCount; k++) {
        const potholeX = Math.floor(Math.random() * (width - 40)) + 20; // Avoid edges
        const potholeY = Math.floor(Math.random() * (height - 40)) + 20; // Avoid edges
        const potholeRadius = Math.floor(Math.random() * (maxPotholeRadius - minPotholeRadius + 1)) + minPotholeRadius; // Random radius between min and max

        for (let i = -potholeRadius; i <= potholeRadius; i++) {
            for (let j = -potholeRadius; j <= potholeRadius; j++) {
                const distance = Math.sqrt(i * i + j * j);
                if (distance < potholeRadius) {
                    const x = potholeX + i;
                    const y = potholeY + j;

                    // Check boundaries
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        // Create a sharper depth effect for potholes
                        const potholeDepth = potholeDepthMultiplier * (1 - (distance / potholeRadius)); // More noticeable depth
                        heightData[x * width + y] += potholeDepth; // Apply depth to height data
                    }
                }
            }
        }
    }


    // Store the generated heightmap data
    lastHeightmapData = heightData;

    // Update the plane geometry with the generated heights
    for (let i = 0; i < geometry.attributes.position.count; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        geometry.attributes.position.setZ(i, heightData[x * width + y]);
    }
    geometry.attributes.position.needsUpdate = true; // Notify Three.js that the positions have changed

    // Calculate and set the normals
    const normals = calculateNormals(heightData);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
}

/*================================================================

Lights and Camera

================================================================*/

// Set up camera position
camera.position.set(128, 50, 128); // Position the camera above the heightmap
camera.lookAt(new THREE.Vector3(128, 0, 128));

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Add floodlights
const LIGHT_INTENSITY = .4;
const directionalLight1 = new THREE.DirectionalLight(0xffffff, LIGHT_INTENSITY); // Increased intensity
directionalLight1.position.set(10, 20, 10).normalize(); // Higher position
directionalLight1.castShadow = true; // Enable shadow casting
directionalLight1.shadow.bias = -0.05; // Adjust shadow bias
directionalLight1.shadow.mapSize.width = 2048; // Increase shadow map width
directionalLight1.shadow.mapSize.height = 2048; // Increase shadow map height
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, LIGHT_INTENSITY); // Increased intensity
directionalLight2.position.set(-10, 20, 10).normalize(); // Higher position
directionalLight2.castShadow = true; // Enable shadow casting
directionalLight2.shadow.bias = -0.05; // Adjust shadow bias
directionalLight2.shadow.mapSize.width = 2048; // Increase shadow map width
directionalLight2.shadow.mapSize.height = 2048; // Increase shadow map height
scene.add(directionalLight2);


const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);

// =================================================================
// GENERATE ARENA
// =================================================================

// 1. CYLINDER WALLS

// Function to create short wall cylinders
function createWalls() {
    console.log("Creating Walls");
    const wallHeight = 255; // Height of the walls (thickness)
    const wallRadius = 6.0; // Radius of the walls (length)
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray color

    // Create walls at the edges of the arena
    const wallPositions = [
        { side: 1, x: 0, z: -height / 2 }, // Bottom wall
        { side: 2, x: 0, z: height / 2 },  // Top wall
        { side: 3, x: -width / 2, z: 0 },  // Left wall
        { side: 4, x: width / 2, z: 0 }     // Right wall
    ];

    wallPositions.forEach(pos => {
        const wallGeometry = new THREE.CylinderGeometry(wallRadius, wallRadius, wallHeight, 32);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(pos.x, wallHeight / 2, pos.z); // Position the wall
        wall.rotation.z = Math.PI / 2; // Rotate to lay it flat
        wall.position.y = 5;
        // Rotate based on wall side
        if (pos.side === 3 || pos.side === 4) {
            wall.rotation.y = Math.PI / 2; // Rotate for horizontal walls
        }
        
        wall.castShadow = true; // Enable shadow casting for the wall
        wall.receiveShadow = true; // Enable shadow receiving for the wall
        scene.add(wall);
    });

}

// 2a. DROP SAMPLE BEACON CYAN
function dropColorBlockBeaconCyan() {
    const boxWidth = 10; // Width of the box
    const boxHeight = 10; // Height of the box
    const boxDepth = 2; // Depth of the box

    // Create box geometry
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    // Create materials for the box sides
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x00FFFF }), // Cyan
        new THREE.MeshStandardMaterial({ color: 0x00FFFF }), // Cyan
        new THREE.MeshStandardMaterial({ color: 0x00FFFF }), // Cyan
        new THREE.MeshStandardMaterial({ color: 0x00FFFF }), // Cyan
        new THREE.MeshStandardMaterial({ color: 0x00FFFF }), // Cyan
        new THREE.MeshStandardMaterial({ color: 0x00FFFF })  // Cyan
    ];

    // Create a mesh with the geometry and the materials
    const box = new THREE.Mesh(boxGeometry, materials);

    // Position the box
    box.position.set(100, 8, 122); // Adjust the position as needed

    // Enable shadows if needed
    box.castShadow = true; // Enable shadow casting for the box
    box.receiveShadow = true; // Enable shadow receiving for the box

    // Add the box to the scene
    scene.add(box);
}

// 2b. DROP SAMPLE BEACON MAGENTA
function dropColorBlockBeaconMagenta() {
    const boxWidth = 10; // Width of the box
    const boxHeight = 10; // Height of the box
    const boxDepth = 2; // Depth of the box

    // Create box geometry
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    // Create materials for the box sides
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0xFF00FF }), // Magenta
        new THREE.MeshStandardMaterial({ color: 0xFF00FF }), // Magenta
        new THREE.MeshStandardMaterial({ color: 0xFF00FF }), // Magenta
        new THREE.MeshStandardMaterial({ color: 0xFF00FF }), // Magenta
        new THREE.MeshStandardMaterial({ color: 0xFF00FF }), // Magenta
        new THREE.MeshStandardMaterial({ color: 0xFF00FF })  // Magenta
    ];

    // Create a mesh with the geometry and the materials
    const box = new THREE.Mesh(boxGeometry, materials);

    // Position the box
    box.position.set(122, 8, 80); // Adjust the position as needed
    box.rotation.y = Math.PI/2;

    // Enable shadows if needed
    box.castShadow = true; // Enable shadow casting for the box
    box.receiveShadow = true; // Enable shadow receiving for the box

    // Add the box to the scene
    scene.add(box);
}



// ___________________
// 
// Generate the Arena
//
generateHeightmap();
createWalls();
dropColorBlockBeaconCyan()
dropColorBlockBeaconMagenta()
// ___________________

/*================================================================

Tools

================================================================*/

// Function to visualize the stored heightmap
function visualizeNoise() {
    if (!lastHeightmapData) return; // Check if heightmap data exists

    const imageData = noiseCtx.createImageData(width, height);
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            const heightValue = lastHeightmapData[i * width + j];
            const colorValue = ((heightValue + 15) / 15) * 255; // Normalize to 0-255 for visualization

            const index = (i + j * width) * 4;
            imageData.data[index] = colorValue; // Red
            imageData.data[index + 1] = colorValue; // Green
            imageData.data[index + 2] = colorValue; // Blue
            imageData.data[index + 3] = 255; // Alpha
        }
    }
    noiseCtx.putImageData(imageData, 0, 0);
}

// Event listener for button
document.getElementById('generateNoiseBtn').addEventListener('click', visualizeNoise);

// Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update the controls
    renderer.render(scene, camera);
}

animate();