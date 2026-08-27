import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

const viewer = document.querySelector('#viewer');
const loading = document.querySelector('#loading');
const modelName = document.querySelector('#model-name');
const modelFormat = document.querySelector('#model-format');
const modelSize = document.querySelector('#model-size');
const speedInput = document.querySelector('#speed-input');
const speedOutput = document.querySelector('#speed-output');
const axisInput = document.querySelector('#axis-input');
const playButton = document.querySelector('#play-button');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151713);
const camera = new THREE.PerspectiveCamera(42, 1, 0.001, 10000);
camera.position.set(2.8, 2, 2.8);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
viewer.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.autoRotate = false;
scene.add(new THREE.HemisphereLight(0xffffff, 0x3d4935, 2.3));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xa8cfff, 1.5);
rimLight.position.set(-4, 2, -5);
scene.add(rimLight);

const turntable = new THREE.Group();
scene.add(turntable);
const grid = new THREE.GridHelper(4, 20, 0x5e6957, 0x30372d);
scene.add(grid);
let currentModel;
let rotating = true;
let speed = 20;
let currentUrls = [];

function disposeCurrent() {
  if (!currentModel) return;
  turntable.remove(currentModel);
  currentModel.traverse((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => value?.isTexture && value.dispose());
      material.dispose?.();
    });
  });
  currentUrls.forEach(URL.revokeObjectURL);
  currentUrls = [];
}

function showModel(object, name, format) {
  disposeCurrent();
  currentModel = object;
  turntable.add(object);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) throw new Error('表示できる頂点がありません。');
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  const size = box.getSize(new THREE.Vector3());
  const maxSide = Math.max(size.x, size.y, size.z) || 1;
  const distance = maxSide / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.45;
  camera.near = Math.max(maxSide / 1000, 0.0001);
  camera.far = Math.max(distance * 20, 100);
  camera.position.set(distance * .9, distance * .65, distance * .9);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
  grid.scale.setScalar(maxSide / 2);
  grid.position.y = -size.y / 2;
  modelName.textContent = name;
  modelFormat.textContent = format.toUpperCase();
  modelSize.textContent = `${fmt(size.x)} × ${fmt(size.y)} × ${fmt(size.z)}`;
}

function fmt(value) {
  return value >= 100 ? value.toFixed(0) : value >= 1 ? value.toFixed(2) : value.toPrecision(3);
}

function defaultMaterial(geometry) {
  const hasColors = Boolean(geometry.getAttribute('color'));
  if (!geometry.getAttribute('normal') && geometry.index) geometry.computeVertexNormals();
  return new THREE.MeshStandardMaterial({ color: hasColors ? 0xffffff : 0xc8f05a, vertexColors: hasColors, roughness: .72, metalness: .03, side: THREE.DoubleSide });
}

function geometryObject(geometry, points = false) {
  const isMesh = !points && (geometry.index || geometry.getAttribute('normal'));
  if (isMesh) return new THREE.Mesh(geometry, defaultMaterial(geometry));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: .008, sizeAttenuation: true, color: geometry.getAttribute('color') ? 0xffffff : 0xc8f05a, vertexColors: Boolean(geometry.getAttribute('color')) }));
}

async function loadFiles(fileList) {
  const files = [...fileList];
  const supported = ['obj', 'ply', 'glb', 'gltf', 'stl', 'dae'];
  const primary = files.find((file) => supported.includes(ext(file.name)));
  if (!primary) throw new Error('対応する3Dファイルが見つかりません。');
  const fileMap = new Map();
  const urls = [];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    urls.push(url);
    fileMap.set(file.name.toLowerCase(), url);
    fileMap.set(file.webkitRelativePath?.toLowerCase(), url);
  }
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => fileMap.get(decodeURIComponent(url).split(/[\\/]/).pop().toLowerCase()) || url);
  const format = ext(primary.name);
  let object;
  if (format === 'obj') {
    const mtl = files.find((file) => ext(file.name) === 'mtl');
    const loader = new OBJLoader(manager);
    if (mtl) {
      const materials = new MTLLoader(manager).parse(await mtl.text(), '');
      materials.preload();
      loader.setMaterials(materials);
    }
    object = loader.parse(await primary.text());
  } else if (format === 'ply') {
    const geometry = new PLYLoader(manager).parse(await primary.arrayBuffer());
    object = geometryObject(geometry, !geometry.index);
  } else if (format === 'stl') {
    object = geometryObject(new STLLoader(manager).parse(await primary.arrayBuffer()));
  } else if (format === 'dae') {
    object = new ColladaLoader(manager).parse(await primary.text(), '').scene;
  } else {
    const buffer = await primary.arrayBuffer();
    object = (await new Promise((resolve, reject) => new GLTFLoader(manager).parse(buffer, '', resolve, reject))).scene;
  }
  showModel(object, primary.name, format);
  currentUrls = urls;
}

function ext(name) { return name.split('.').pop().toLowerCase(); }

async function loadUrl(url) {
  const clean = url.split(/[?#]/)[0];
  const format = ext(clean);
  let object;
  if (format === 'obj') {
    const manager = new THREE.LoadingManager();
    const base = clean.slice(0, clean.lastIndexOf('/') + 1);
    const mtlUrl = clean.replace(/\.obj$/i, '.mtl');
    const loader = new OBJLoader(manager);
    try {
      const materials = await new MTLLoader(manager).setPath(base).loadAsync(mtlUrl.slice(base.length));
      materials.preload();
      loader.setMaterials(materials);
    } catch { /* OBJ without an MTL is valid. */ }
    object = await loader.loadAsync(url);
  } else if (format === 'ply') {
    const geometry = await new PLYLoader().loadAsync(url);
    object = geometryObject(geometry, !geometry.index);
  } else if (format === 'stl') {
    object = geometryObject(await new STLLoader().loadAsync(url));
  } else if (format === 'dae') {
    object = (await new ColladaLoader().loadAsync(url)).scene;
  } else if (format === 'glb' || format === 'gltf') {
    object = (await new GLTFLoader().loadAsync(url)).scene;
  } else throw new Error(`未対応の形式です: ${format}`);
  showModel(object, decodeURIComponent(clean.split('/').pop()), format);
}

async function runLoad(task) {
  loading.classList.remove('hidden');
  try { await task(); }
  catch (error) { console.error(error); alert(`読み込みに失敗しました。\n${error.message}`); }
  finally { loading.classList.add('hidden'); }
}

const dropZone = document.querySelector('#drop-zone');
document.querySelector('#file-input').addEventListener('change', (event) => runLoad(() => loadFiles(event.target.files)));
for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragging'); });
for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragging'); });
dropZone.addEventListener('drop', (event) => runLoad(() => loadFiles(event.dataTransfer.files)));
document.querySelector('#url-button').addEventListener('click', () => runLoad(() => loadUrl(document.querySelector('#url-input').value.trim())));
speedInput.addEventListener('input', () => { speed = Number(speedInput.value); speedOutput.value = `${speed}°/秒`; });
playButton.addEventListener('click', () => { rotating = !rotating; playButton.textContent = rotating ? '停止' : '再生'; playButton.classList.toggle('active', rotating); });
document.querySelector('#theme-button').addEventListener('click', () => {
  document.body.classList.toggle('light');
  scene.background.set(document.body.classList.contains('light') ? 0xdfe3d9 : 0x151713);
});

const sample = new THREE.Mesh(new THREE.TorusKnotGeometry(.72, .22, 180, 24), new THREE.MeshStandardMaterial({ color: 0xc8f05a, roughness: .52, metalness: .12 }));
showModel(sample, 'turntable sample', 'Three.js');
const initialModelUrl = new URLSearchParams(location.search).get('model');
if (initialModelUrl) {
  document.querySelector('#url-input').value = initialModelUrl;
  runLoad(() => loadUrl(initialModelUrl));
}
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  if (rotating && currentModel) turntable.rotation[axisInput.value] += THREE.MathUtils.degToRad(speed) * delta;
  controls.update();
  renderer.render(scene, camera);
}
function resize() {
  const { clientWidth: width, clientHeight: height } = viewer;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
resize();
animate();
