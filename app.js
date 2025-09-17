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
        this.loader = new THREE.GLTFLoader();
        this.objLoader = new THREE.OBJLoader();
        this.controls = null;
        this.envMap = null;

        this.init();
    }

    async init() {
        try {
            this.initThreeJS();
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

    initThreeJS() {
        // Создаем сцену
        this.scene = new THREE.Scene();

        // Создаем камеру
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.5, 5);

        // Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
    }

    async createEnvironment() {
        // Используем рабочий cubemap из three.js examples
        try {
            const cubeTextureLoader = new THREE.CubeTextureLoader();

            // Используем проверенный cubemap (Pisa)
            const urls = [
                'https://threejs.org/examples/textures/cube/pisa/px.png',
                'https://threejs.org/examples/textures/cube/pisa/nx.png',
                'https://threejs.org/examples/textures/cube/pisa/py.png',
                'https://threejs.org/examples/textures/cube/pisa/ny.png',
                'https://threejs.org/examples/textures/cube/pisa/pz.png',
                'https://threejs.org/examples/textures/cube/pisa/nz.png'
            ];

            this.envMap = await new Promise((resolve, reject) => {
                cubeTextureLoader.load(urls, (texture) => {
                    texture.encoding = THREE.sRGBEncoding;
                    resolve(texture);
                }, undefined, reject);
            });

            this.scene.background = this.envMap;
            this.scene.environment = this.envMap;

        } catch (error) {
            console.warn('Cubemap loading failed, using fallback:', error);
            // Fallback к простому цвету
            this.scene.background = new THREE.Color(0x222222);
            this.scene.environment = null;
        }

        // Создаем минималистичный пол
        this.createFloor();
    }

    createFloor() {
        // Простой нейтральный пол
        const floorGeometry = new THREE.CircleGeometry(1, 1);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.8,
            metalness: 0.2,
            envMap: this.envMap,
            envMapIntensity: this.envMap ? 0.3 : 0
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        //this.scene.add(floor);
    }

    createLights() {
        // Основное студийное освещение
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(5, 8, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 20;
        this.scene.add(mainLight);

        // Заполняющий свет для мягких теней
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Контровой свет для отделения модели от фона
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 2, -5);
        this.scene.add(rimLight);

        // Легкий ambient light
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
                    'Stop Rotation' : 'Start Rotation';
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

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });

        // Добавляем OrbitControls для интерактивного управления камерой
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 20;
            this.controls.maxPolarAngle = Math.PI / 2;
        }
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
        const fileName = file.name.toLowerCase();
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            document.getElementById('loading').style.display = 'block';

            try {
                if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
                    this.loadGLTFModel(arrayBuffer, fileName.endsWith('.glb'));
                } else if (fileName.endsWith('.obj')) {
                    this.loadOBJModel(arrayBuffer);
                } else {
                    throw new Error('Unsupported file format');
                }
            } catch (error) {
                console.error('Error loading model:', error);
                this.showError('Failed to load model: ' + error.message);
                document.getElementById('loading').style.display = 'none';
            }
        };

        reader.onerror = (error) => {
            console.error('File reading error:', error);
            this.showError('Failed to read file');
            document.getElementById('loading').style.display = 'none';
        };

        reader.readAsArrayBuffer(file);
    }

    loadGLTFModel(arrayBuffer, isBinary) {
        const loader = isBinary ? this.loader : new THREE.GLTFLoader();

        loader.parse(arrayBuffer, '', (gltf) => {
            this.addModelToScene(gltf.scene);
            document.getElementById('loading').style.display = 'none';
        }, (error) => {
            console.error('GLTF parsing error:', error);
            this.showError('Failed to parse GLTF model');
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
            console.error('OBJ parsing error:', error);
            this.showError('Failed to parse OBJ model');
            document.getElementById('loading').style.display = 'none';
        }
    }

    addModelToScene(model) {
        if (this.loadedModel) {
            this.scene.remove(this.loadedModel);
        }

        // Центрируем и масштабируем модель
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;

        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        model.scale.multiplyScalar(scale);

        // Применяем окружение к материалам модели
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material && this.envMap) {
                    child.material.envMap = this.envMap;
                    child.material.envMapIntensity = 0.5;
                    child.material.needsUpdate = true;

                    // Для PBR материалов настраиваем отражения
                    if (child.material.isMeshStandardMaterial) {
                        child.material.roughness = 0.4;
                        child.material.metalness = 0.6;
                    }
                }
            }
        });

        this.loadedModel = model;
        this.scene.add(model);

        // Настраиваем камеру для лучшего обзора
        this.camera.position.set(0, size.y * 1.2, size.z * 2);
        this.camera.lookAt(0, size.y * 0.2, 0);

        if (this.controls) {
            this.controls.target.set(0, size.y * 0.2, 0);
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

        // Обновляем controls если они есть
        if (this.controls) {
            this.controls.update();
        }

        // Вращение загруженной модели
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
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Глобальная функция инициализации
function initWebGLScene(canvasId) {
    return new WebGLScene(canvasId);
}
