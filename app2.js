// wwwroot/js/app.js
class WebGLScene {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.rotationEnabled = true;
        this.rotationSpeed = 1.0;
        this.loadedModel = null;
        this.loader = null;
        this.objLoader = null;
        this.controls = null;

        this.init();
    }

    async init() {
        try {
            this.initThreeJS();
            await this.initLoaders();
            await this.createEnvironment();
            this.createLights();
            this.setupControls();
            this.animate();

            // Скрываем индикатор загрузки
            document.getElementById('loading').style.display = 'none';

        } catch (error) {
            console.error('Error initializing WebGL scene:', error);
            this.showError('Failed to initialize WebGL: ' + error.message);
        }
    }

    async initLoaders() {
        // Динамически загружаем необходимые загрузчики
        if (typeof THREE.GLTFLoader === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.js');
        }
        if (typeof THREE.OBJLoader === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/OBJLoader.js');
        }

        this.loader = new THREE.GLTFLoader();
        this.objLoader = new THREE.OBJLoader();
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initThreeJS() {
        // Создаем сцену с прозрачным фоном
        this.scene = new THREE.Scene();
        this.scene.background = null; // Прозрачный фон

        // Создаем камеру
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5.5, 15);

        // Создаем рендерер с прозрачностью
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true // Включаем прозрачность
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;

        // Устанавливаем прозрачный цвет очистки
        this.renderer.setClearColor(0x000000, 0); // Полностью прозрачный
    }

    async createEnvironment() {
        // Минималистичная сцена с прозрачным фоном
        this.scene.background = null;
        this.scene.environment = null;

        // Создаем легкий пол с прозрачностью
        this.createFloor();
    }

    createFloor() {
        // Пол с полупрозрачностью
        const floorGeometry = new THREE.CircleGeometry(8, 32);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.3 // Полупрозрачный пол
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Добавляем легкую сетку для лучшего восприятия пространства
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.2;
        gridHelper.position.y = -0.49; // Чуть выше пола
        this.scene.add(gridHelper);
    }

    createLights() {
        // Мягкое освещение, которое хорошо смотрится на прозрачном фоне
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 8, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 20;
        this.scene.add(mainLight);

        // Заполняющий свет
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Контровой свет
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, 2, -5);
        this.scene.add(rimLight);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
        this.scene.add(ambientLight);
    }

    setupControls() {
        // Обработчики для UI элементов
        const rotationSpeedInput = document.getElementById('rotation-speed');
        const toggleRotationBtn = document.getElementById('toggle-rotation');
        const resetCameraBtn = document.getElementById('reset-camera');
        const loadModelBtn = document.getElementById('load-model');

        if (rotationSpeedInput) {
            rotationSpeedInput.addEventListener('input', (e) => {
                this.rotationSpeed = parseFloat(e.target.value);
            });
        }

        if (toggleRotationBtn) {
            toggleRotationBtn.addEventListener('click', () => {
                this.rotationEnabled = !this.rotationEnabled;
                toggleRotationBtn.textContent = this.rotationEnabled ?
                    'Остановить вращение' : 'Запустить вращение';
            });
        }

        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.camera.position.set(0, 1.5, 5);
                this.camera.lookAt(0, 0, 0);
                if (this.controls) {
                    this.controls.reset();
                }
            });
        }

        if (loadModelBtn) {
            loadModelBtn.addEventListener('click', () => {
                this.openModelLoader();
            });
        }

        // OrbitControls для управления камерой
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 20;
            this.controls.maxPolarAngle = Math.PI / 2;
        }

        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }

    openModelLoader() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gltf,.glb,.obj,.fbx,.3ds,.dae';
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.loadModel(file);
            }
        });
        input.click();
    }

    loadModel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('loading').style.display = 'flex';
            this.processModelFile(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
    }

    processModelFile(arrayBuffer, fileName) {
        try {
            if (fileName.toLowerCase().endsWith('.gltf') || fileName.toLowerCase().endsWith('.glb')) {
                this.loadGLTFModel(arrayBuffer, fileName.toLowerCase().endsWith('.glb'));
            } else if (fileName.toLowerCase().endsWith('.obj')) {
                this.loadOBJModel(arrayBuffer);
            } else {
                throw new Error('Неподдерживаемый формат файла');
            }
        } catch (error) {
            this.showError('Ошибка загрузки: ' + error.message);
            document.getElementById('loading').style.display = 'none';
        }
    }

    loadGLTFModel(arrayBuffer, isBinary) {
        const loader = isBinary ? this.loader : new THREE.GLTFLoader();
        loader.parse(arrayBuffer, '', (gltf) => {
            this.addModelToScene(gltf.scene);
            document.getElementById('loading').style.display = 'none';
        }, (error) => {
            this.showError('Ошибка загрузки GLTF: ' + error.message);
            document.getElementById('loading').style.display = 'none';
        });
    }

    loadOBJModel(arrayBuffer) {
        try {
            const textDecoder = new TextDecoder();
            const objText = textDecoder.decode(arrayBuffer);
            const model = this.objLoader.parse(objText);
            this.addModelToScene(model);
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            this.showError('Ошибка загрузки OBJ: ' + error.message);
            document.getElementById('loading').style.display = 'none';
        }
    }

    addModelToScene(model) {
        // Удаляем предыдущую модель
        if (this.loadedModel) {
            this.scene.remove(this.loadedModel);
        }

        // Центрируем и масштабируем модель
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;

        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        model.scale.multiplyScalar(scale);

        // Настраиваем материалы для прозрачного фона
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Улучшаем материалы для прозрачного фона
                if (child.material) {
                    child.material.transparent = false;
                    child.material.depthWrite = true;
                    child.material.needsUpdate = true;
                }
            }
        });

        this.loadedModel = model;
        this.scene.add(model);

        // Настраиваем камеру
        this.camera.position.set(0, size.y * 1.5, size.z * 2);
        this.camera.lookAt(0, size.y * 0.5, 0);

        if (this.controls) {
            this.controls.target.set(0, size.y * 0.5, 0);
        }
    }

    onWindowResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        if (this.rotationEnabled && this.loadedModel) {
            this.loadedModel.rotation.y += 0.01 * this.rotationSpeed;
        }

        this.renderer.render(this.scene, this.camera);
        this.updateStats();
    }

    updateStats() {
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${Math.round(1000 / 16)}`;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            max-width: 80%;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Глобальная функция инициализации
function initWebGLScene(canvasId) {
    return new WebGLScene(canvasId);
}
