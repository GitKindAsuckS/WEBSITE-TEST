import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSG } from 'three-csg-ts';
const style = document.createElement('style');
style.innerHTML = `
@keyframes sparkle {
  0%, 100% {
    text-shadow:
      0 0 5px gold,
      0 0 10px goldenrod,
      0 0 20px gold,
      0 0 30px goldenrod;
  }
  50% {
    text-shadow:
      0 0 10px gold,
      0 0 20px goldenrod,
      0 0 30px gold,
      0 0 40px goldenrod;
  }
}
`;
document.head.appendChild(style);
const treePositions = [];

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 2, 5);
scene.fog = new THREE.Fog(0xcccccc, 10, 50);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.normalBias = 0.05;

scene.add(directionalLight);
scene.add(new THREE.AmbientLight(0xaaaaaa));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.2));
//textures
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('retro_grass.png');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(10, 10);  // adjust repeat to fit your scene
const brickColor = textureLoader.load('red_brick_diff_4k.jpg');
const brickNormal = textureLoader.load('red_brick_nor_gl_4k.jpg');
const brickRoughness = textureLoader.load('red_brick_rough_4k.jpg');
const brickDisplacement = textureLoader.load('red_brick_disp_4k.png');



[brickColor, brickNormal, brickRoughness, brickDisplacement].forEach((t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
});
// Wall dimensions
const wallWidth = 25;
const wallHeight = 12.5;
const wallThickness = 1;

// Original front wall (used only for CSG)
const frontWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness),
  new THREE.MeshStandardMaterial({
    map: brickColor,
    normalMap: brickNormal,
    roughnessMap: brickRoughness,
    displacementMap: brickDisplacement,
    displacementScale: 0.2,
    side: THREE.FrontSide,
  })
);
frontWall.position.set(0, wallHeight / 2, 12.5);
frontWall.castShadow = true;
frontWall.receiveShadow = true;
scene.add(frontWall);

// Door settings
const doorWidth = 5;
const doorHeight = 4;
const doorThickness = 1.1;
let doorYOffset = doorHeight / 2 - wallHeight / 2;

const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
const doorMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: true,
  transparent: true,
  opacity: 0.6,
});
const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
scene.add(doorMesh);

const doorHelper = new THREE.BoxHelper(doorMesh, 0xff0000);
scene.add(doorHelper);

let frontWallWithHole = null;

const wallMaterialNoDisplacement = new THREE.MeshStandardMaterial({
  map: brickColor,
  normalMap: brickNormal,
  roughnessMap: brickRoughness,
  side: THREE.FrontSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

function updateWallWithDoorHole() {
  if (frontWallWithHole) {
    scene.remove(frontWallWithHole);
    frontWallWithHole.geometry.dispose();
    frontWallWithHole.material.dispose();
    frontWallWithHole = null;
  }

  scene.remove(frontWall);

  doorMesh.position.set(0, doorYOffset + wallHeight / 2, 12.5 + 0.01);
  doorHelper.position.copy(doorMesh.position);
  doorHelper.updateMatrixWorld(true);

  frontWall.updateMatrixWorld(true);
  doorMesh.updateMatrixWorld(true);

  const wallCSG = CSG.fromMesh(frontWall);
  const doorCSG = CSG.fromMesh(doorMesh);
  const subtracted = wallCSG.subtract(doorCSG);

  frontWallWithHole = CSG.toMesh(subtracted, frontWall.matrixWorld, wallMaterialNoDisplacement);
  frontWallWithHole.castShadow = true;
  frontWallWithHole.receiveShadow = true;
  scene.add(frontWallWithHole);
}

updateWallWithDoorHole();

// Pointer lock controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.body.addEventListener('click', () => controls.lock());

const keysPressed = {};
let velocity = new THREE.Vector3();

document.addEventListener('keydown', (e) => {
  keysPressed[e.code] = true;

  if (e.code === 'ArrowUp') {
    doorYOffset = Math.min(doorYOffset + 0.1, wallHeight / 2 - doorHeight / 2);
    updateWallWithDoorHole();
  } else if (e.code === 'ArrowDown') {
    doorYOffset = Math.max(doorYOffset - 0.1, doorHeight / 2 - wallHeight / 2);
    updateWallWithDoorHole();
  }
});

document.addEventListener('keyup', (e) => (keysPressed[e.code] = false));
// Floor setup
const floorTexture = textureLoader.load('/floor-texture.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(10, 10);

const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;


scene.add(floor);

// House walls (back, left, right)
const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness);
const backWall = new THREE.Mesh(wallGeometry, frontWall.material);
backWall.position.set(0, wallHeight / 2, -12.5);
scene.add(backWall);

const leftWall = new THREE.Mesh(wallGeometry, frontWall.material);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-12.5, wallHeight / 2, 0);
scene.add(leftWall);

const rightWall = new THREE.Mesh(wallGeometry, frontWall.material);
rightWall.rotation.y = Math.PI / 2;
rightWall.position.set(12.5, wallHeight / 2, 0);
scene.add(rightWall);

// Load models
const loader = new GLTFLoader();

// Trident setup
let trident = null;
let tridentPosition = new THREE.Vector3();
const pickupDistance = 2;  // distance to trigger pickup message
const mapSize = 400;  // adjust as needed

// UI message for pickup
const pickupMessage = document.createElement('div');
pickupMessage.style.position = 'absolute';
pickupMessage.style.color = 'white';
pickupMessage.style.background = 'rgba(0,0,0,0.5)';
pickupMessage.style.padding = '8px';
pickupMessage.style.borderRadius = '5px';
pickupMessage.style.display = 'none';
pickupMessage.innerText = 'Press F to pick up';
document.body.appendChild(pickupMessage);

const objectiveMessage = document.createElement('div');
objectiveMessage.style.position = 'absolute';
objectiveMessage.style.top = '20px';
objectiveMessage.style.left = '50%';
objectiveMessage.style.transform = 'translateX(-50%)';
objectiveMessage.style.color = 'gold';
objectiveMessage.style.fontSize = '24px';
objectiveMessage.style.fontWeight = 'bold';
objectiveMessage.style.pointerEvents = 'none';
objectiveMessage.style.userSelect = 'none';
objectiveMessage.style.animation = 'sparkle 2s infinite ease-in-out';
objectiveMessage.innerText = 'Objective: Find Trident';
document.body.appendChild(objectiveMessage);

// Define no-spawn zone (your house area)
const houseArea = {
  xMin: -25,
  xMax: 25,
  zMin: -25,
  zMax: 25
};

// Step 2: Utility functions to check position validity
function isNearTree(x, z, minDistance = 2) {
  for (const pos of treePositions) {
    const dx = pos.x - x;
    const dz = pos.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDistance * minDistance) {
      return true; // too close to a tree
    }
  }
  return false; // safe spot
}

function getValidTridentPosition() {
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = (Math.random() - 0.5) * mapSize;
    const z = (Math.random() - 0.5) * mapSize;

    const inHouseArea =
      x > houseArea.xMin &&
      x < houseArea.xMax &&
      z > houseArea.zMin &&
      z < houseArea.zMax;

    if (inHouseArea) continue;
    if (isNearTree(x, z)) continue;

    return { x, z };
  }
  return { x: 0, z: 0 }; // fallback position
}


let playerPosition = new THREE.Vector3();  // you must update this every frame to player's current position

// Load the trident model
loader.load('gawr_guras_trident.glb', (gltf) => {
  trident = gltf.scene;

  const scaleFactor = 3;
  trident.scale.set(scaleFactor, scaleFactor, scaleFactor);

  const bbox = new THREE.Box3().setFromObject(trident);
  const height = bbox.max.y - bbox.min.y;

  const pos = getValidTridentPosition();

  // Random position on map
  const x = pos.x;
  const z = pos.z;
  const y = height / 2;

   // PLACE YOUR CHECK HERE:
   const inHouseArea =
   x > houseArea.xMin &&
   x < houseArea.xMax &&
   z > houseArea.zMin &&
   z < houseArea.zMax;

  if (inHouseArea) return;  // Skip placement

    trident.position.set(x, y, z);
    tridentPosition.set(x, y, z);
    if (!pos) {
    console.warn('Could not find valid trident spawn location');
    return;
  }
    scene.add(trident);
  });

// Animation / update loop - call this every frame
function update() {
  if (!trident) return;

  // Update playerPosition here based on your player movement logic
  // e.g. playerPosition.set(player.x, player.y, player.z);

  const distance = playerPosition.distanceTo(tridentPosition);

  

  if (distance < pickupDistance) {
    pickupMessage.style.display = 'block';

    // Convert 3D position to 2D screen coords
    const vector = tridentPosition.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    pickupMessage.style.left = `${x}px`;
    pickupMessage.style.top = `${y}px`;
  } else {
    pickupMessage.style.display = 'none';
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f' && trident) {
    const distance = playerPosition.distanceTo(tridentPosition);
    if (distance < pickupDistance) {
      scene.remove(trident);
      trident = null;
      pickupMessage.style.display = 'none';

      // Update objective message text and color
      objectiveMessage.innerText = 'Objective: Trident Collected!';
      objectiveMessage.style.color = '#b0e57c';  // a nice green
      // Remove sparkle animation
      objectiveMessage.style.animation = 'none';

      console.log('Trident picked up!');
    }
  }
});




// Define forest area size
const forestSize = 400; // 1000 x 1000 units

// Load tree12 texture
const treeTexture = textureLoader.load('tree12.png');
treeTexture.flipY = false; // fix upside-down texture
treeTexture.encoding = THREE.sRGBEncoding; // optional, improves color accuracy


// Load tree12
loader.load('tree12.glb', (gltf) => {
  const treeOriginal = gltf.scene;
  treeOriginal.scale.set(0.01, 0.01, 0.01);
  treeOriginal.position.y = 0.1;

  treeOriginal.traverse((child) => {
    if (child.isMesh) {
      child.material.map = treeTexture;
      child.material.transparent = true;
      child.material.alphaTest = 0.5;
      child.material.side = THREE.DoubleSide;
      child.material.needsUpdate = true;
    }
  });

  const forestGroup = new THREE.Group();

  let treesPlaced = 0;
  const maxTrees = 1500;

  while (treesPlaced < maxTrees) {
    const x = (Math.random() - 0.5) * forestSize;
    const z = (Math.random() - 0.5) * forestSize;

    // Skip if inside the house area
    const inHouseArea =
      x > houseArea.xMin &&
      x < houseArea.xMax &&
      z > houseArea.zMin &&
      z < houseArea.zMax;

    if (inHouseArea) continue; // Skip placement

    const treeClone = treeOriginal.clone();
    treeClone.position.set(x, 0.1, z);
    treeClone.rotation.y = Math.random() * Math.PI * 2;

    const randomScale = 0.009 + Math.random() * 0.002;
    treeClone.scale.set(randomScale, randomScale, randomScale);

    forestGroup.add(treeClone);
    treePositions.push(new THREE.Vector3(x, 0.1, z));
    treesPlaced++;
  }

  scene.add(forestGroup);
});



// Tree and bush models
const bushFiles = Array.from({ length: 8 }, (_, i) => `bush${String(i + 1).padStart(2, '0')}.glb`);
const treeFiles = Array.from({ length: 36 }, (_, i) => `tree${String(i + 1).padStart(2, '0')}.glb`);
const vegetationFiles = [...bushFiles, ...treeFiles];
const vegetationModels = [];

vegetationFiles.forEach(filename => {
  loader.load(`/${filename}`, (gltf) => {
    vegetationModels.push(gltf.scene);
  });
});


// Gawr Gura model
loader.load('/gawr_gura.glb', function (gltf) {
  const model = gltf.scene;
  model.position.set(0, 0, 0);
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scaleFactor = 3 / size.y;
  model.scale.setScalar(scaleFactor);
});

// Chair
loader.load('/victorian_chair.glb', (gltf) => {
  const chair = gltf.scene;
  chair.position.set(8, 0, 0);
  chair.scale.set(1.7, 1.7, 1.7);
  scene.add(chair);
});

// Alchemy table
loader.load('/alchemy_table_-_game_model.glb', (gltf) => {
  const table = gltf.scene;
  table.position.set(10, 0, 0);
  table.scale.set(0.03, 0.03, 0.03);
  scene.add(table);
});

// gun model
loader.load('/james_bond_golden_gun.glb', (gltf) => {
  const gun = gltf.scene;
  gun.position.set(10, 2, 0);
  gun.scale.set(0.03, 0.03, 0.03);
  scene.add(gun);
});


// Gun crate
loader.load('/gun_crate.glb', (gltf) => {
  const crate = gltf.scene;
  crate.position.set(10.5, 0, 6);
  crate.scale.set(5, 5, 5);
  scene.add(crate);
});

// === UNIFIED BUMPY TERRAIN AROUND HOUSE (less repeating randomness) ===
const terrainSize = 400;
const innerSize = 25;
const bumpHeight = 1.5;
const terrainYOffset = -0.6; // terrain sits just below house floor

// Simple hash function for pseudo-random consistent noise based on x, z
function pseudoRandom(x, z) {
  const seed = x * 374761393 + z * 668265263; // some big primes
  let t = seed;
  t = (t ^ (t >> 13)) * 1274126177;
  t = t ^ (t >> 16);
  return (t & 0xffff) / 0xffff; // normalized 0..1
}

function createUnifiedTerrain(outerSize, holeSize, segments) {
  const geom = new THREE.PlaneGeometry(outerSize, outerSize, segments, segments);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const halfHole = holeSize / 2;
  const blendWidth = 5;
  const raiseAmount = 1;
  const baseNoiseScale = 2;

  // Helper to generate a stretch scale (0.5 or 1.5) per vertex based on position
  function getStretchScale(x, z) {
    // For example, randomize with a noise based on position to get consistent stretch
    const val = pseudoRandom(Math.floor(x), Math.floor(z));
    // 30% chance for big stretch, otherwise normal
    return val < 0.3 ? 0.5 : 2.0;
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const distX = Math.abs(x) - halfHole;
    const distZ = Math.abs(z) - halfHole;
    const distFromHoleEdge = Math.max(distX, distZ);

    let y;

    if (distFromHoleEdge < 0) {
      y = 0; // inside house, flat
    } else if (distFromHoleEdge < blendWidth) {
      const blendFactor = distFromHoleEdge / blendWidth;
      const stretchScale = getStretchScale(x, z);
      const noiseValue = pseudoRandom(
        Math.floor(x * stretchScale),
        Math.floor(z * stretchScale)
      );
      const noiseHeight = (noiseValue - 0.5) * bumpHeight + raiseAmount;

      y = blendFactor * noiseHeight;
      if (y < 0) y = 0;
    } else {
      const stretchScale = getStretchScale(x, z);
      const noiseValue = pseudoRandom(
        Math.floor(x * stretchScale),
        Math.floor(z * stretchScale)
      );
      y = (noiseValue - 0.5) * bumpHeight + raiseAmount;
    }

    pos.setY(i, y);
  }

  smoothHeights(geom, 1);

  geom.computeVertexNormals();

  return new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({
      map: grassTexture,
      flatShading: true,
      roughness: 1,
      metalness: 0,
    })
  );
}




const unifiedTerrain = createUnifiedTerrain(terrainSize, innerSize + 2, 200);
unifiedTerrain.receiveShadow = true;
unifiedTerrain.position.y = terrainYOffset;
scene.add(unifiedTerrain);


function getTerrainHeightAt(x, z) {
  const geom = unifiedTerrain.geometry;
  const pos = geom.attributes.position;

  const size = terrainSize;
  const segments = 120;

  const halfSize = size / 2;
  const localX = x + halfSize;
  const localZ = z + halfSize;

  const gridX = Math.floor((localX / size) * segments);
  const gridZ = Math.floor((localZ / size) * segments);

  if (gridX < 0 || gridZ < 0 || gridX >= segments || gridZ >= segments) {
    return 0; // outside terrain bounds, default to 0 height
  }

  const vertsPerRow = segments + 1;

  const i00 = gridZ * vertsPerRow + gridX;
  const i10 = i00 + 1;
  const i01 = (gridZ + 1) * vertsPerRow + gridX;
  const i11 = i01 + 1;

  const v00y = pos.getY(i00);
  const v10y = pos.getY(i10);
  const v01y = pos.getY(i01);
  const v11y = pos.getY(i11);

  const s = (localX / size) * segments - gridX;
  const t = (localZ / size) * segments - gridZ;

  // Bilinear interpolation
  const height =
    v00y * (1 - s) * (1 - t) +
    v10y * s * (1 - t) +
    v01y * (1 - s) * t +
    v11y * s * t;

  return height;
}



function smoothHeights(geom, iterations = 1) {
  const pos = geom.attributes.position;
  const vertexCount = pos.count;
  const segments = Math.sqrt(vertexCount) - 1; // assumes square grid

  for (let iter = 0; iter < iterations; iter++) {
    const heights = [];
    for (let i = 0; i < vertexCount; i++) {
      heights.push(pos.getY(i));
    }

    for (let i = 0; i < vertexCount; i++) {
      const x = i % (segments + 1);
      const z = Math.floor(i / (segments + 1));

      let sum = heights[i];
      let count = 1;

      if (x > 0) {
        sum += heights[i - 1];
        count++;
      }
      if (x < segments) {
        sum += heights[i + 1];
        count++;
      }
      if (z > 0) {
        sum += heights[i - (segments + 1)];
        count++;
      }
      if (z < segments) {
        sum += heights[i + (segments + 1)];
        count++;
      }

      pos.setY(i, sum / count);
    }
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();
}



// Player collision setup
const playerSize = new THREE.Vector3(1, 2, 1);
const playerBox = new THREE.Box3();

const wallBoxes = [
  new THREE.Box3().setFromObject(backWall),
  new THREE.Box3().setFromObject(leftWall),
  new THREE.Box3().setFromObject(rightWall),
];

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const speed = 10;
  velocity.set(0, 0, 0);

  if (keysPressed['KeyW']) velocity.z += speed * delta;
  if (keysPressed['KeyS']) velocity.z -= speed * delta;
  if (keysPressed['KeyA']) velocity.x -= speed * delta;
  if (keysPressed['KeyD']) velocity.x += speed * delta;

  controls.moveRight(velocity.x);
  controls.moveForward(velocity.z);

  // Player bounding box for collision
  playerBox.setFromCenterAndSize(controls.getObject().position, playerSize);

  for (const box of wallBoxes) {
    if (box.intersectsBox(playerBox)) {
      // Revert movement on collision
      controls.moveRight(-velocity.x);
      controls.moveForward(-velocity.z);
      break;
    }
  }

  const playerPos = controls.getObject().position;
  const terrainHeight = getTerrainHeightAt(playerPos.x, playerPos.z);
  const playerHeightOffset = 1.8; // adjust this to your player/camera height
  playerPos.y = terrainHeight + playerHeightOffset;

  // Update global playerPosition vector for pickup checks
  playerPosition.copy(playerPos);

  // Update pickup message and interaction logic
  update();

  renderer.render(scene, camera);
}

animate();


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Optional: reposition pickup message immediately on resize
  if (trident && pickupMessage.style.display === 'block') {
    const vector = tridentPosition.clone();
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    pickupMessage.style.left = `${x}px`;
    pickupMessage.style.top = `${y}px`;
  }
});
