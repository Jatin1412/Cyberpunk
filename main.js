import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import gsap from "gsap";

const scene = new THREE.Scene();
let model;

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 3.5;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("canvas"),
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Add Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Load HDR Environment Map using RGBELoader and PMREMGenerator
const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/pond_bridge_night_1k.hdr",
  function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    // Use PMREMGenerator to generate the prefiltered environment map
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;

    // Apply the environment map to the scene
    scene.environment = envMap; // Reflections and lighting

    // Clean up the original texture as it's no longer needed
    texture.dispose();
    pmremGenerator.dispose();

    const loader = new GLTFLoader();
    loader.load(
      "./DamagedHelmet.gltf",
      (gltf) => {
        model = gltf.scene;
        scene.add(model);
      },
      undefined,
      (error) => {
        console.error("an error occured while loading gltf", error);
      }
    );
  }
);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0030;  // Set the distortion amount (tweak this value for stronger/weaker effects)
composer.addPass(rgbShiftPass);


function animate() {
  window.requestAnimationFrame(animate);
  composer.render();
}

animate();

window.addEventListener('mousemove', (e) => {
  if(model) {
    const rotationX = (e.clientX / window.innerWidth - .5) * (Math.PI * .2);
    const rotationY = (e.clientY / window.innerHeight - .5) * (Math.PI * .2);
    gsap.to(model.rotation, {
      x: rotationY,
      y: rotationX,
      duration: 0.9,
      ease: "power2.out"
    })
  }
});

window.addEventListener('mouseleave', () => {
  if (model) {
    // Smoothly return to the original position
    gsap.to(model.rotation, {
      x: 0,
      y: 0,
      duration: 1.2,
      ease: "power2.out",
    });
  }
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  composer.setSize(width, height);  // Update the composer as well
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

