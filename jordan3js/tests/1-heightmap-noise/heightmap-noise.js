import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Create the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a plane geometry to represent the heightmap
const width = 256; // Width of the heightmap
const height = 256; // Height of the heightmap
const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
const material = new THREE.MeshBasicMaterial({ color: 0x228B22, wireframe: false });
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2; // Rotate the plane to make it horizontal
scene.add(plane);

// Function to generate heightmap using Perlin noise
function generateHeightmap() {
    const simplex = new SimplexNoise();
    const heightData = new Float32Array(width * height);
    
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            heightData[i * width + j] = simplex.noise2D(i / 50, j / 50) * 10; // Scale height
        }
    }
    
    // Update the plane geometry with the generated heights
    for (let i = 0; i < geometry.attributes.position.count; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        geometry.attributes.position.setZ(i, heightData[x * width + y]);
    }
    geometry.attributes.position.needsUpdate = true; // Notify Three.js that the positions have changed
}

// Set up camera position
camera.position.set(128, 50, 128); // Position the camera above the heightmap
camera.lookAt(new THREE.Vector3(128, 0, 128));

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Generate the heightmap
generateHeightmap();

// Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update the controls
    renderer.render(scene, camera);
}

animate();