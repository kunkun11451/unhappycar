class DiceSimulator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.dice = [];
        this.diceBody = [];
        this.controls = null;
        this.isRolling = false;
        this.lastResult = null;
        this.currentDiceType = 6; // 当前骰子类型 (6 或 20)
        
        // 初始化3D结果显示相关数组
        this.resultTooltips = [];
        this.resultLines = [];
        this.result3DObjects = [];
        
        this.init();
    }

    async init() {
        this.setupScene();
        this.setupLighting();
        this.setupPhysics();
        this.createDice();
        this.createSurfaces();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
        
        // 隐藏加载提示
        document.getElementById('loading').style.display = 'none';
        
        // 初始化结果显示容器
        this.initResultDisplay();
    }

    setupScene() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // 设置相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 12);

        // 设置渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    setupLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // 点光源1 - 暖色调
        const pointLight1 = new THREE.PointLight(0xff8c42, 0.8, 20);
        pointLight1.position.set(-5, 8, 5);
        pointLight1.castShadow = true;
        this.scene.add(pointLight1);

        // 点光源2 - 冷色调
        const pointLight2 = new THREE.PointLight(0x42a5ff, 0.6, 15);
        pointLight2.position.set(8, 6, -3);
        pointLight2.castShadow = true;
        this.scene.add(pointLight2);

        // 聚光灯
        const spotLight = new THREE.SpotLight(0xffffff, 1.0);
        spotLight.position.set(0, 15, 0);
        spotLight.target.position.set(0, 0, 0);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.2;
        spotLight.decay = 2;
        spotLight.distance = 30;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
    }

    setupPhysics() {
        // 初始化物理世界
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // 设置材质
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            {
                friction: 0.4,
                restitution: 0.3
            }
        );
        this.world.addContactMaterial(defaultContactMaterial);
    }

    createDice(count = 1) {
        // 清空现有骰子
        this.clearDice();
        
        if (this.currentDiceType === 6) {
            this.create6SidedDice(count);
        } else if (this.currentDiceType === 20) {
            this.create20SidedDice(count);
        }
    }

    create6SidedDice(count) {
        const diceGeometry = new THREE.BoxGeometry(2, 2, 2);
        
        this.createDiceTextures().then(materials => {
            const positions = this.calculateDicePositions(count);
            
            for (let i = 0; i < count; i++) {
                const dice = new THREE.Mesh(diceGeometry, materials);
                dice.position.set(...positions[i]);
                dice.castShadow = true;
                dice.receiveShadow = true;
                this.scene.add(dice);
                this.dice.push(dice);

                const diceShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
                const diceBody = new CANNON.Body({ mass: 1 });
                diceBody.addShape(diceShape);
                diceBody.position.set(...positions[i]);
                diceBody.material = new CANNON.Material('dice');
                this.world.add(diceBody);
                this.diceBody.push(diceBody);
            }
        });
    }

    create20SidedDice(count) {
        // 计算骰子位置
        const positions = this.calculateDicePositions(count);
        
        for (let i = 0; i < count; i++) {
            // 创建手动构建的20面体几何体
            const diceGeometry = this.createManualIcosahedronGeometry();
            const diceMaterials = this.create20SidedMaterial();
            
            const dice = new THREE.Mesh(diceGeometry, diceMaterials);
            dice.position.set(...positions[i]);
            dice.castShadow = true;
            dice.receiveShadow = true;
            this.scene.add(dice);
            this.dice.push(dice);

            // 创建20面体物理体
            const diceBody = this.create20SidedPhysicsBody();
            diceBody.position.set(...positions[i]);
            this.world.add(diceBody);
            this.diceBody.push(diceBody);
        }
        
        console.log(`🎲 已创建 ${count} 个20面骰子（手动几何体）`);
    }

    assignMaterialGroups(geometry) {
        // 为20面体的每个面分配材质组
        // 清除现有的组
        geometry.clearGroups();
        
        // 20面体有20个三角形面，每个面3个顶点
        const faceCount = 20;
        
        // 为每个面分配一个材质组
        for (let i = 0; i < faceCount; i++) {
            // 每个面从索引 i*3 开始，包含3个顶点，使用材质索引 i
            geometry.addGroup(i * 3, 3, i);
        }
        
        console.log(`🔧 已为20面骰子分配 ${faceCount} 个材质组`);
    }

    createIcosahedronGeometry() {
        // 使用Three.js内置的20面体几何体
        const geometry = new THREE.IcosahedronGeometry(1.0, 0);
        
        // 为了让20面体看起来更像骰子，我们可以给它添加一些细节
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        
        // 确保几何体有正确的索引
        if (!geometry.index) {
            geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, i) => i));
        }
        
        return geometry;
    }

    create20SidedMaterial() {
        // 创建带数字的20面骰子材质
        const materials = [];
        
        // 为20个面创建材质
        for (let i = 1; i <= 20; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // 绘制背景 
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 256, 256);
            
            // 绘制数字
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 84px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 添加文字阴影
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.shadowBlur = 6;
            
            // 绘制数字
            const numberY = 128 + 35; 
            ctx.fillText(i.toString(), 128, numberY);
            
            // 为数字6和9添加下划线
            if (i === 6 || i === 9) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                const underlineY = numberY + 35; 
                ctx.beginPath();
                ctx.moveTo(85, underlineY);
                ctx.lineTo(171, underlineY);
                ctx.stroke();
            }
            
            // 添加高光效果
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = 'bold 84px Arial';
            ctx.fillText(i.toString(), 126, numberY - 2); 
            
            // 创建纹理
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            const material = new THREE.MeshPhysicalMaterial({
                map: texture,
                metalness: 0.05,
                roughness: 0.4,
                clearcoat: 0.9,
                clearcoatRoughness: 0.05,
                reflectivity: 0.6,
                transparent: false
            });
            
            materials.push(material);
        }
        
        console.log(`🎨 已创建 ${materials.length} 个材质，编号 1-${materials.length}`);
        return materials;
    }

    createSingleTexturedMaterial() {
        // 创建一个包含多个数字的大纹理
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 背景色
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 设置文字样式
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 4;
        
        // 在不同位置绘制数字1-20
        const gridCols = 10;
        const gridRows = 2;
        const cellWidth = canvas.width / gridCols;
        const cellHeight = canvas.height / gridRows;
        
        for (let i = 1; i <= 20; i++) {
            const col = (i - 1) % gridCols;
            const row = Math.floor((i - 1) / gridCols);
            const x = col * cellWidth + cellWidth / 2;
            const y = row * cellHeight + cellHeight / 2;
            
            // 绘制边框
            ctx.strokeStyle = '#2980b9';
            ctx.lineWidth = 2;
            ctx.strokeRect(col * cellWidth + 4, row * cellHeight + 4, cellWidth - 8, cellHeight - 8);
            
            // 绘制数字
            ctx.fillText(i.toString(), x, y);
        }
        
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        const material = new THREE.MeshPhysicalMaterial({
            map: texture,
            metalness: 0.05,
            roughness: 0.4,
            clearcoat: 0.9,
            clearcoatRoughness: 0.05,
            reflectivity: 0.6
        });
        
        console.log('🎨 已创建单一纹理材质（包含1-20数字）');
        return material;
    }

    create20SidedPhysicsBody() {
        // 创建20面体的物理体
        const diceBody = new CANNON.Body({ mass: 1 });
        
        // 使用黄金比例创建20面体的顶点
        const phi = (1 + Math.sqrt(5)) / 2; 
        const scale = 1; // 缩放因子
        
        const vertices = [
            // 12个顶点的坐标（标准化的20面体顶点）
            [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
            [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
            [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
        ].map(v => new CANNON.Vec3(v[0] * scale, v[1] * scale, v[2] * scale));
        
        // 20面体的面索引（与IcosahedronGeometry保持一致的面排序）
        const faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];
        
        // 创建凸包形状
        const diceShape = new CANNON.ConvexPolyhedron(vertices, faces);
        diceBody.addShape(diceShape);
        diceBody.material = new CANNON.Material('dice20');
        
        // 设置物理属性（优化20面骰子的物理特性）
        diceBody.material.friction = 0.5;    // 摩擦力
        diceBody.material.restitution = 0.2; // 弹性
        
        return diceBody;
    }

    clearDice() {
        // 移除场景中的骰子
        this.dice.forEach(dice => {
            this.scene.remove(dice);
        });
        
        // 移除物理世界中的骰子
        this.diceBody.forEach(body => {
            this.world.remove(body);
        });
        
        // 清空数组
        this.dice = [];
        this.diceBody = [];
    }

    calculateDicePositions(count) {
        const positions = [];
        const spacing = 3; // 骰子之间的间距
        const baseHeight = this.currentDiceType === 20 ? 3.0 : 2.5;
        
        switch (count) {
            case 1:
                positions.push([0, baseHeight, 0]);
                break;
            case 2:
                positions.push([-spacing/2, baseHeight, 0]);
                positions.push([spacing/2, baseHeight, 0]);
                break;
            case 3:
                positions.push([-spacing, baseHeight, 0]);
                positions.push([0, baseHeight, 0]);
                positions.push([spacing, baseHeight, 0]);
                break;
            case 4:
                positions.push([-spacing/2, baseHeight, -spacing/2]);
                positions.push([spacing/2, baseHeight, -spacing/2]);
                positions.push([-spacing/2, baseHeight, spacing/2]);
                positions.push([spacing/2, baseHeight, spacing/2]);
                break;
            case 5:
                positions.push([0, baseHeight, 0]); // 中心
                positions.push([-spacing, baseHeight, -spacing]);
                positions.push([spacing, baseHeight, -spacing]);
                positions.push([-spacing, baseHeight, spacing]);
                positions.push([spacing, baseHeight, spacing]);
                break;
            default:
                // 对于更多骰子，排列成网格
                const cols = Math.ceil(Math.sqrt(count));
                for (let i = 0; i < count; i++) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    const x = (col - (cols - 1) / 2) * spacing;
                    const z = (row - (Math.ceil(count / cols) - 1) / 2) * spacing;
                    positions.push([x, baseHeight, z]);
                }
                break;
        }
        
        return positions;
    }

    async createDiceTextures() {
        const materials = [];
        
        // Three.js BoxGeometry 的面顺序：[+X, -X, +Y, -Y, +Z, -Z]
        // 我们要映射的点数顺序：      [1,  6,  2,  5,  3,  4]
        const faceNumbers = [1, 6, 2, 5, 3, 4];
        
        for (let i = 0; i < 6; i++) {
            // 为每个面创建独立的canvas
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // 绘制背景
            const gradient = ctx.createLinearGradient(0, 0, 256, 256);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#f0f0f0');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
            
            // 绘制边框
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 4;
            ctx.strokeRect(8, 8, 240, 240);
            
            // 绘制对应的点数
            ctx.fillStyle = '#333333';
            this.drawDots(ctx, faceNumbers[i]);
            
            // 创建纹理
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            const material = new THREE.MeshPhysicalMaterial({
                map: texture,
                metalness: 0.1,
                roughness: 0.3,
                clearcoat: 0.8,
                clearcoatRoughness: 0.1,
                reflectivity: 0.5
            });
            
            materials.push(material);
        }
        
        return materials;
    }

    drawDots(ctx, number) {
        const dotRadius = 20;
        const positions = {
            1: [[128, 128]],
            2: [[80, 80], [176, 176]],
            3: [[80, 80], [128, 128], [176, 176]],
            4: [[80, 80], [176, 80], [80, 176], [176, 176]],
            5: [[80, 80], [176, 80], [128, 128], [80, 176], [176, 176]],
            6: [[80, 64], [176, 64], [80, 128], [176, 128], [80, 192], [176, 192]]
        };

        positions[number].forEach(pos => {
            // 绘制阴影
            ctx.beginPath();
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.arc(pos[0] + 2, pos[1] + 2, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制点
            ctx.beginPath();
            ctx.fillStyle = '#333333';
            ctx.arc(pos[0], pos[1], dotRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制高光
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.arc(pos[0] - 5, pos[1] - 5, dotRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    createSurfaces() {
        // 创建桌面
        const tableGeometry = new THREE.BoxGeometry(20, 0.5, 20);
        const tableMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x8B4513,
            metalness: 0.1,
            roughness: 0.7,
            clearcoat: 0.3
        });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, -0.25, 0);
        table.receiveShadow = true;
        this.scene.add(table);

        // 创建桌面物理体
        const tableShape = new CANNON.Box(new CANNON.Vec3(10, 0.25, 10));
        const tableBody = new CANNON.Body({ mass: 0 });
        tableBody.addShape(tableShape);
        tableBody.position.set(0, -0.25, 0);
        this.world.add(tableBody);

        // 创建围栏
        this.createWalls();
    }

    createWalls() {
        const wallHeight = 114.514; 
        const wallThickness = 0.5;
        const tableSize = 20;
        
        // 完全透明的空气墙材质
        const wallMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0, 
            visible: false 
        });

        const walls = [
            { pos: [0, wallHeight/2, tableSize/2], size: [tableSize, wallHeight, wallThickness] },
            { pos: [0, wallHeight/2, -tableSize/2], size: [tableSize, wallHeight, wallThickness] },
            { pos: [tableSize/2, wallHeight/2, 0], size: [wallThickness, wallHeight, tableSize] },
            { pos: [-tableSize/2, wallHeight/2, 0], size: [wallThickness, wallHeight, tableSize] }
        ];

        walls.forEach(wall => {
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.visible = false; // 确保网格不可见
            this.scene.add(mesh);

            // 物理墙体保持不变，只是视觉上完全透明
            const shape = new CANNON.Box(new CANNON.Vec3(
                wall.size[0]/2, wall.size[1]/2, wall.size[2]/2
            ));
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.set(...wall.pos);
            this.world.add(body);
        });
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.autoRotate = false;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 25;
    }

    setupEventListeners() {
        // 投掷按钮
        document.getElementById('rollBtn').addEventListener('click', () => {
            this.rollDice();
        });

        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetDice();
        });

        // 骰子类型选择器
        const diceTypeSelect = document.getElementById('diceType');
        if (diceTypeSelect) {
            diceTypeSelect.addEventListener('change', (event) => {
                this.currentDiceType = parseInt(event.target.value);
                const count = parseInt(document.getElementById('diceCount').value);
                // 清除之前的结果显示
                this.clearResultDisplay();
                this.createDice(count);
                const typeName = this.currentDiceType === 6 ? '6面骰子' : '20面骰子';
                console.log(`已切换到${typeName}，点击投掷开始！`);
            });
        }

        // 骰子数量选择器
        const diceCountSelect = document.getElementById('diceCount');
        if (diceCountSelect) {
            diceCountSelect.addEventListener('change', (event) => {
                const count = parseInt(event.target.value);
                // 清除之前的结果显示
                this.clearResultDisplay();
                this.createDice(count);
                const typeName = this.currentDiceType === 6 ? '6面骰子' : '20面骰子';
                console.log(`已设置${count}个${typeName}，点击投掷开始！`);
            });
        }

        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 键盘事件
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                this.rollDice();
            } else if (event.code === 'KeyD') {
                // 按D键调试当前骰子朝向
                this.debugDiceOrientation();
            }
        });
    }

    rollDice() {
        if (this.isRolling || this.dice.length === 0) return;
        
        // 清除之前的结果显示
        this.clearResultDisplay();
        
        this.isRolling = true;
        
        // 更新按钮状态
        const rollBtn = document.getElementById('rollBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        rollBtn.textContent = '🎲 投掷中...';
        rollBtn.classList.add('rolling');
        rollBtn.disabled = true;
        resetBtn.disabled = true;
        
        // 生成平滑的随机动量（使用正态分布近似）
        const generateSmoothRandom = (min, max) => {
            // 使用多个随机数的平均值来近似正态分布
            let sum = 0;
            for (let i = 0; i < 6; i++) {
                sum += Math.random();
            }
            const normalized = (sum - 3) / 3; // 标准化到约-1到1
            return min + (max - min) * (normalized * 0.5 + 0.5);
        };
        
        // 为每个骰子应用力和扭矩
        this.diceBody.forEach((body, index) => {
            // 重置速度和角速度
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            
            // 根据骰子类型调整力的大小
            const forceMultiplier = this.currentDiceType === 20 ? 1.0 : 1.0; // 20面骰子保持相同力度
            const torqueMultiplier = this.currentDiceType === 20 ? 1.2 : 1.0; // 20面骰子需要更多旋转
            
            // 应用平滑的随机力（在原地施加向上和水平的力）
            const force = new CANNON.Vec3(
                generateSmoothRandom(-8, 8) * forceMultiplier,    // 水平X方向力
                generateSmoothRandom(15, 22) * forceMultiplier,   // 向上的力（确保骰子跳起）
                generateSmoothRandom(-8, 8) * forceMultiplier     // 水平Z方向力
            );
            body.applyImpulse(force, body.position);
            
            // 应用更丰富的随机扭矩
            const torque = new CANNON.Vec3(
                generateSmoothRandom(-30, 30) * torqueMultiplier,  // X轴旋转
                generateSmoothRandom(-30, 30) * torqueMultiplier,  // Y轴旋转
                generateSmoothRandom(-30, 30) * torqueMultiplier   // Z轴旋转
            );
            
            // 添加额外的旋转变化
            const extraSpin = new CANNON.Vec3(
                generateSmoothRandom(-12, 12) * torqueMultiplier,
                generateSmoothRandom(-12, 12) * torqueMultiplier,
                generateSmoothRandom(-12, 12) * torqueMultiplier
            );
            
            // 组合基础扭矩和额外旋转
            body.angularVelocity.set(
                torque.x + extraSpin.x, 
                torque.y + extraSpin.y, 
                torque.z + extraSpin.z
            );
        });
        
        // 3秒后检查结果
        setTimeout(() => {
            this.checkResult();
        }, 3000);
    }

    checkResult() {
        if (this.dice.length === 0) return;
        
        const results = [];
        let totalSum = 0;
        
        // 获取每个骰子的结果并创建提示框
        this.dice.forEach((dice, index) => {
            const result = this.getDiceValue(dice);
            results.push(result);
            totalSum += result;
            
            // 为每个骰子创建提示框
            const tooltipData = this.createResultTooltip(dice, index, result);
            this.resultTooltips.push(tooltipData);
        });
        
        this.lastResult = results;
        this.isRolling = false;
        
        // 恢复按钮状态
        const rollBtn = document.getElementById('rollBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        rollBtn.textContent = '🎲 投掷骰子';
        rollBtn.classList.remove('rolling');
        rollBtn.disabled = false;
        resetBtn.disabled = false;
        
        // 更新结果表格
        this.updateCurrentResultsTable(results);
        
        // 在控制台输出结果
        if (results.length === 1) {
            console.log(`🎯 骰子结果: ${results[0]} 点`);
        } else {
            const resultsList = results.map((r, i) => `骰子${i+1}: ${r}`).join(' | ');
            console.log(`🎯 骰子结果: ${resultsList} | 总和: ${totalSum} 点`);
        }
        
        // 添加闪烁效果
        this.addResultEffect();
        
        // 提示框将保持显示直到下一次投掷或重置
    }

    updateCurrentResultsTable(results) {
        const tableBody = document.getElementById('currentResultsBody');
        if (!tableBody) return;
        
        // 清空现有内容
        tableBody.innerHTML = '';
        
        if (results.length === 0) {
            // 显示暂无结果
            const row = document.createElement('tr');
            row.className = 'no-results';
            row.innerHTML = '<td colspan="2">暂无结果</td>';
            tableBody.appendChild(row);
        } else {
            // 显示每个骰子的结果
            results.forEach((result, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="dice-number">骰子 ${index + 1}</td>
                    <td class="dice-value">${result}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    clearCurrentResultsTable() {
        const tableBody = document.getElementById('currentResultsBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr class="no-results"><td colspan="2">暂无结果</td></tr>';
    }

    getDiceValue(diceObject) {
        if (!diceObject) return 1;
        
        if (this.currentDiceType === 6) {
            return this.get6SidedDiceValue(diceObject);
        } else if (this.currentDiceType === 20) {
            return this.get20SidedDiceValue(diceObject);
        }
        
        return 1;
    }

    get6SidedDiceValue(diceObject) {
        // 根据骰子的实际朝向确定点数
        // Three.js BoxGeometry 的面索引顺序：
        // 材质数组索引 [右(+X), 左(-X), 上(+Y), 下(-Y), 前(+Z), 后(-Z)]
        // 对应点数:     [1,     6,     2,     5,     3,     4]
        
        // 获取世界空间中的上方向
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // 定义骰子的6个面法向量和对应点数
        const faces = [
            { normal: new THREE.Vector3(1, 0, 0), value: 1 },   // +X面 = 1点
            { normal: new THREE.Vector3(-1, 0, 0), value: 6 },  // -X面 = 6点
            { normal: new THREE.Vector3(0, 1, 0), value: 2 },   // +Y面 = 2点
            { normal: new THREE.Vector3(0, -1, 0), value: 5 },  // -Y面 = 5点
            { normal: new THREE.Vector3(0, 0, 1), value: 3 },   // +Z面 = 3点
            { normal: new THREE.Vector3(0, 0, -1), value: 4 }   // -Z面 = 4点
        ];
        
        let maxDot = -2;
        let topFaceValue = 1;
        
        // 找到最接近朝上的面
        faces.forEach(face => {
            // 将面法向量转换到世界空间
            const worldNormal = face.normal.clone().applyQuaternion(diceObject.quaternion);
            // 计算与上方向的点积
            const dot = worldNormal.dot(worldUp);
            
            if (dot > maxDot) {
                maxDot = dot;
                topFaceValue = face.value;
            }
        });
        
        return topFaceValue;
    }

    get20SidedDiceValue(diceObject) {
        // 获取20面骰子的实际朝上面值
        // 定义20面体的面法向量（基于IcosahedronGeometry的标准方向）
        const phi = (1 + Math.sqrt(5)) / 2; // 黄金比例
        
        // 20面体的20个面法向量（归一化）
        const faceNormals = [];
        
        // 使用标准20面体的面法向量
        const vertices = [
            [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
            [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
            [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
        ].map(v => new THREE.Vector3(v[0], v[1], v[2]).normalize());
        
        // 20面体的面（每个面对应一个数字1-20）
        const faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];
        
        // 计算每个面的法向量
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            const v1 = vertices[face[0]];
            const v2 = vertices[face[1]];
            const v3 = vertices[face[2]];
            
            // 计算面法向量
            const edge1 = new THREE.Vector3().subVectors(v2, v1);
            const edge2 = new THREE.Vector3().subVectors(v3, v1);
            const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
            
            faceNormals.push(normal);
        }
        
        // 获取世界空间中的上方向
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        let maxDot = -2;
        let topFaceValue = 1;
        
        // 找到最接近朝上的面
        for (let i = 0; i < faceNormals.length; i++) {
            // 将面法向量转换到世界空间
            const worldNormal = faceNormals[i].clone().applyQuaternion(diceObject.quaternion);
            // 计算与上方向的点积
            const dot = worldNormal.dot(worldUp);
            
            if (dot > maxDot) {
                maxDot = dot;
                topFaceValue = i + 1; // 面索引+1就是对应的数字
            }
        }
        
        return topFaceValue;
    }

    addResultEffect() {
        // 创建粒子效果
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setHSL(Math.random(), 1, 0.5)
                })
            );
            
            particle.position.copy(this.dice[0].position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // 动画粒子
        const animateParticles = () => {
            particles.children.forEach(particle => {
                particle.position.add(particle.velocity.clone().multiplyScalar(0.02));
                particle.velocity.y -= 0.01; // 重力
                particle.scale.multiplyScalar(0.98); // 缩小
            });
            
            if (particles.children[0] && particles.children[0].scale.x > 0.1) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particles);
            }
        };
        
        animateParticles();
    }

    resetDice() {
        if (this.diceBody.length === 0) return;
        
        // 清除结果显示
        this.clearResultDisplay();
        
        // 获取当前骰子数量并重新计算位置
        const count = this.diceBody.length;
        const positions = this.calculateDicePositions(count);
        
        // 重置每个骰子的位置和状态
        this.diceBody.forEach((body, index) => {
            body.position.set(...positions[index]);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.quaternion.set(0, 0, 0, 1);
        });
        
        const diceText = count === 1 ? '骰子' : `${count}个骰子`;
        console.log(`点击投掷${diceText}开始游戏！`);
    }

    initResultDisplay() {
        // 创建结果显示容器
        this.resultTooltips = [];
        this.resultLines = [];
        this.result3DObjects = [];
    }

    createResultTooltip(dice, index, result) {
        // 在3D空间中创建提示框和连线
        const dicePosition = dice.position.clone();
        
        // 创建连线（3D空间中的线段）
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(dicePosition.x, dicePosition.y + 2, dicePosition.z),
            new THREE.Vector3(dicePosition.x, dicePosition.y + 4, dicePosition.z)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, // 白色线条，更明显
            linewidth: 2, // 稍粗的线条
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.renderOrder = 998; // 确保线条也在前面显示
        this.scene.add(line);

        // 创建3D提示框
        const tooltip3D = this.create3DTooltip(index, result);
        tooltip3D.position.set(dicePosition.x, dicePosition.y + 4.5, dicePosition.z);
        
        // 立即让提示框面向摄像机
        if (this.camera) {
            tooltip3D.lookAt(this.camera.position);
        }
        
        this.scene.add(tooltip3D);

        // 存储引用
        const tooltipData = { tooltip: tooltip3D, line: line };
        this.resultTooltips.push(tooltipData);
        this.result3DObjects.push(tooltip3D, line);

        return tooltipData;
    }

    create3DTooltip(index, result) {
        // 创建3D文本提示框
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // 绘制毛玻璃效果背景
        // 先绘制基础背景
        ctx.fillStyle = 'rgba(45, 45, 45, 0.95)'; // 更不透明的背景
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加渐变效果增强毛玻璃感
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(70, 70, 70, 0.4)');
        gradient.addColorStop(0.5, 'rgba(40, 40, 40, 0.9)');
        gradient.addColorStop(1, 'rgba(25, 25, 25, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加细微的高光效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, canvas.width, 3);
        ctx.fillRect(0, 0, 3, canvas.height);
        
        // 添加边框
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.8)'; // 更亮的边框
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        // 绘制文本
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial'; // 更大的字体
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 添加文本阴影以增强可读性
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 4;
        
        ctx.fillText(`骰子${index + 1}`, canvas.width / 2, canvas.height / 2 - 15);
        
        // 结果数字用更大更醒目的字体
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffff00'; // 黄色突出显示结果
        ctx.fillText(`${result}点`, canvas.width / 2, canvas.height / 2 + 15);

        // 创建纹理和材质
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrap;
        texture.wrapT = THREE.ClampToEdgeWrap;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false, // 避免深度冲突
            depthTest: true
        });

        // 创建平面几何体，稍微大一点以提高可见性
        const geometry = new THREE.PlaneGeometry(2.2, 1.1);
        const mesh = new THREE.Mesh(geometry, material);
        
        // 设置渲染顺序，确保提示框在前面显示
        mesh.renderOrder = 999;
        
        return mesh;
    }

    clearResultDisplay() {
        // 清除所有3D提示框和连线
        if (this.result3DObjects && this.result3DObjects.length > 0) {
            this.result3DObjects.forEach(obj => {
                if (obj && this.scene) {
                    this.scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (obj.material.map) obj.material.map.dispose();
                        obj.material.dispose();
                    }
                }
            });
        }
        
        // 重置数组
        this.resultTooltips = [];
        this.resultLines = [];
        this.result3DObjects = [];
        
        // 清空结果表格
        this.clearCurrentResultsTable();
    }

    updateTooltipOrientation() {
        // 更新所有3D提示框的朝向，让它们始终面向摄像机
        if (this.resultTooltips && this.resultTooltips.length > 0 && this.camera) {
            this.resultTooltips.forEach(item => {
                if (item && item.tooltip && item.tooltip.parent) {
                    // 获取摄像机位置
                    const cameraPosition = this.camera.position.clone();
                    
                    // 计算从提示框到摄像机的方向，但保持Y轴垂直
                    const tooltipPosition = item.tooltip.position.clone();
                    const direction = new THREE.Vector3();
                    direction.subVectors(cameraPosition, tooltipPosition);
                    
                    // 只在XZ平面上旋转，保持提示框水平
                    direction.y = 0;
                    direction.normalize();
                    
                    // 计算目标位置（稍微偏移以面向摄像机）
                    const targetPosition = tooltipPosition.clone().add(direction);
                    
                    // 让提示框朝向摄像机
                    item.tooltip.lookAt(cameraPosition);
                    
                    // 确保上方向正确
                    item.tooltip.up.set(0, 1, 0);
                }
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 更新物理世界
        this.world.step(1/60);
        
        // 同步所有渲染对象和物理对象
        if (this.dice.length > 0 && this.diceBody.length > 0) {
            for (let i = 0; i < Math.min(this.dice.length, this.diceBody.length); i++) {
                this.dice[i].position.copy(this.diceBody[i].position);
                this.dice[i].quaternion.copy(this.diceBody[i].quaternion);
            }
        }
        
        // 更新3D提示框朝向
        this.updateTooltipOrientation();
        
        // 更新控制器
        this.controls.update();
        
        // 更新性能监控
        if (typeof perfMonitor !== 'undefined') {
            perfMonitor.update();
        }
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }

    debugDiceOrientation() {
        if (this.dice.length === 0) return;
        
        console.log('🔍 骰子调试信息:');
        
        this.dice.forEach((dice, index) => {
            const result = this.getDiceValue(dice);
            
            console.log(`--- 骰子 ${index + 1} ---`);
            console.log('位置:', dice.position);
            console.log('旋转 (弧度):', dice.rotation);
            console.log('旋转 (度):', {
                x: (dice.rotation.x * 180 / Math.PI).toFixed(1),
                y: (dice.rotation.y * 180 / Math.PI).toFixed(1), 
                z: (dice.rotation.z * 180 / Math.PI).toFixed(1)
            });
            console.log('四元数:', dice.quaternion);
            console.log('检测到的朝上面:', result + '点');
            
            // 显示所有面的朝向得分
            const worldUp = new THREE.Vector3(0, 1, 0);
            const faces = [
                { normal: new THREE.Vector3(1, 0, 0), value: 1, name: '+X(1点)' },
                { normal: new THREE.Vector3(-1, 0, 0), value: 6, name: '-X(6点)' },
                { normal: new THREE.Vector3(0, 1, 0), value: 2, name: '+Y(2点)' },
                { normal: new THREE.Vector3(0, -1, 0), value: 5, name: '-Y(5点)' },
                { normal: new THREE.Vector3(0, 0, 1), value: 3, name: '+Z(3点)' },
                { normal: new THREE.Vector3(0, 0, -1), value: 4, name: '-Z(4点)' }
            ];
            
            console.log('各面朝上程度 (点积值):');
            faces.forEach(face => {
                const worldNormal = face.normal.clone().applyQuaternion(dice.quaternion);
                const dot = worldNormal.dot(worldUp);
                console.log(`  ${face.name}: ${dot.toFixed(3)}`);
            });
        });
        
        // 临时显示结果
        const resultElement = document.getElementById('result');
        const originalText = resultElement.textContent;
        const debugText = this.dice.length === 1 ? 
            `调试: 检查控制台详情` : 
            `调试: ${this.dice.length}个骰子 (检查控制台详情)`;
        resultElement.textContent = debugText;
        resultElement.classList.add('show');
        
        setTimeout(() => {
            resultElement.textContent = originalText;
        }, 3000);
    }

    createManualIcosahedronGeometry() {
        // 手动创建20面体几何体，确保材质分组正确
        const geometry = new THREE.BufferGeometry();
        
        // 黄金比例
        const phi = (1 + Math.sqrt(5)) / 2;
        const scale = 1.0;
        
        // 12个顶点
        const vertices = [
            [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
            [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
            [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
        ].map(v => [v[0] * scale, v[1] * scale, v[2] * scale]);
        
        // 20个面的顶点索引
        const faceIndices = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];
        
        // 构建顶点数组和索引数组
        const positionArray = [];
        const normalArray = [];
        const uvArray = [];
        
        // 为每个面创建独立的顶点（这样每个面可以有独立的材质）
        faceIndices.forEach((face, faceIndex) => {
            const v1 = vertices[face[0]];
            const v2 = vertices[face[1]];
            const v3 = vertices[face[2]];
            
            // 添加顶点位置
            positionArray.push(...v1, ...v2, ...v3);
            
            // 计算法向量
            const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];
            
            // 归一化法向量
            const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
            
            // 为三个顶点添加相同的法向量
            normalArray.push(...normal, ...normal, ...normal);
            
            // 为每个面添加UV坐标（整个面使用完整的纹理）
            uvArray.push(0, 0, 1, 0, 0.5, 1);
        });
        
        // 设置几何体属性
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
        
        // 为每个面创建材质组
        for (let i = 0; i < 20; i++) {
            geometry.addGroup(i * 3, 3, i);
        }
        
        console.log(`🔧 手动创建20面体：${faceIndices.length}个面，${positionArray.length/3}个顶点`);
        
        return geometry;
    }
}

// 等待页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查必要的库是否加载
    function checkLibraries() {
        const checks = {
            'Three.js': typeof THREE !== 'undefined',
            'Cannon.js': typeof CANNON !== 'undefined',
            'OrbitControls': typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined'
        };
        
        return checks;
    }
    
    // 延迟初始化以确保所有库都加载完成
    function initializeApp() {
        const checks = checkLibraries();
        const missing = Object.keys(checks).filter(lib => !checks[lib]);
        
        if (missing.length === 0) {
            // 所有库都加载成功，使用完整版本
            console.log('✅ 所有库加载成功，启动完整版骰子模拟器');
            try {
                new DiceSimulator();
            } catch (error) {
                console.error('❌ 完整版初始化失败:', error);
                startSimpleVersion();
            }
        } else if (checks['Three.js'] && checks['OrbitControls']) {
            // 只有 Three.js 加载成功，使用简化版本
            console.warn('⚠️ Cannon.js 未加载，使用简化版骰子模拟器');
            startSimpleVersion();
        } else {
            // 如果基础库还没加载完成，等待一段时间后重试
            if (Date.now() - window.pageLoadTime < 10000) { // 最多等待10秒
                setTimeout(initializeApp, 500);
            } else {
                console.error('❌ 必要的库加载超时');
                document.getElementById('loading').innerHTML = '❌ 加载超时，请刷新页面重试';
            }
        }
    }
    
    function startSimpleVersion() {
        if (typeof SimpleDiceSimulator !== 'undefined') {
            new SimpleDiceSimulator();
        } else {
            console.error('❌ 简化版模拟器也无法启动');
            document.getElementById('loading').innerHTML = '❌ 启动失败，请刷新页面重试';
        }
    }
    
    // 记录页面加载时间
    window.pageLoadTime = Date.now();
    
    // 给一点时间让脚本加载
    setTimeout(initializeApp, 1000);
});
