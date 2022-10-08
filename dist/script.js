console.clear();
import * as THREE from "https://cdn.skypack.dev/three@0.136";
import {OrbitControls} from "https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js";

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 100);
camera.position.set(0, 40, 40);
let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);


let dummy = new THREE.Object3D();
let radius = 10;
let layers = 10;
let stacks = 20;
let itemsPerStack = 70;
let aStep = (Math.PI * 2) / itemsPerStack;

let g = new THREE.BoxGeometry(1, 1, 1, 10, 1, 1);
g.translate(0.5, 0, 0)
let m = new THREE.MeshBasicMaterial({
  onBeforeCompile: shader => {
    shader.vertexShader = `
      attribute vec3 instData;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
        #include <begin_vertex>
       
        float aStep = instData.z;
        float halfStep = aStep * 0.5;
        float angle = mod(atan(instData.y, instData.x) + PI2, PI2);
        float radius = length(instData.xy);
        
        float currAngle = angle - halfStep + (aStep * position.x);
        transformed.x = cos(currAngle) * (radius - position.z) - instData.x;
        transformed.z = sin(currAngle) * (radius - position.z) - instData.y;
      `
    )
    //console.log(shader.vertexShader);
    shader.fragmentShader = `
      float edgeFactor(vec2 p){ // antialiased grid (madebyevan)
        vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p);
        return min(grid.x, grid.y);
      }
      ${shader.fragmentShader}
    `.replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `
        float a = clamp(edgeFactor(vUv), 0., 1.);
        vec3 c = mix(vec3(0), diffuse, a);
        vec4 diffuseColor = vec4( c, opacity );
      `
    )
    //console.log(shader.fragmentShader)
  },
  wireframe: false
});
m.defines = { "USE_UV": ""};
m.extensions = {derivatives: true};

let o = new THREE.InstancedMesh(g, m, layers * stacks * itemsPerStack);
scene.add(o);
console.log(layers * stacks * itemsPerStack);

let holder = new THREE.Group();
let proxy = [];
let instData = []; // x, z, aStep - vec3

let colors = [
  [0xffff88, 0x88ff88],
  [0xff00ff, 0xffff00],
  [0x00ffff, 0xff0000],
  [0x00ff88, 0xff88ff]
];
let c = new THREE.Color();

for(let k = 0; k < layers; k++){
  let layer = new THREE.Group();
  holder.add(layer);
  for(let j = 0; j < stacks; j++){
    for(let i = 0; i < itemsPerStack; i++){
      
      let obj = new THREE.Object3D();
      proxy.push(obj);
      layer.add(obj);
      let r = radius + (k * 1.25);
      obj.position.setFromCylindricalCoords(r, i*aStep, j);
      instData.push(obj.position.x, obj.position.z, aStep);
      obj.updateMatrix();
      let idx = k * stacks * itemsPerStack + j * itemsPerStack + i;
      o.setMatrixAt(idx, obj.matrix);
      o.setColorAt(idx, c.set(Math.random() > 0.5 ? colors[k % 4][0] : colors[k % 4][1] ));

    }
  }
}

g.setAttribute("instData", new THREE.InstancedBufferAttribute(new Float32Array(instData), 3));



renderer.setAnimationLoop( _ => {
  holder.children.forEach((c, idx) => {
    c.rotation.y += 0.001 * (idx % 2 == 0 ? 1 : -1);
  })
  holder.updateMatrixWorld();
  
  proxy.forEach( (p, idx) => {
    o.setMatrixAt(idx, p.matrixWorld);
  })
  o.instanceMatrix.needsUpdate = true;
  
  renderer.render(scene, camera);
})