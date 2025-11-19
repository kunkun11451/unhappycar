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
        this.isCheckingForStable = false;
        this.stableTime = 0;
        this.showResultsEnabled = true; // 默认开启结果显示
        
        // 初始化3D结果显示相关数组
        this.resultTooltips = [];
        this.resultLines = [];
        this.result3DObjects = [];
        
        // 场地相关对象
        this.tableObjects = [];
        this.wallObjects = [];
        this.tableBodies = [];
        this.wallBodies = [];
        
        // 光源引用（用于动态调整阴影）
        this.mainLight = null;
        this.spotLight = null;
        
        // 音频相关 (Web Audio API)
        this.audioContext = null;
        this.masterGain = null;
        this.lastCollisionTime = 0;
        this.diceHitBuffer = null; // 存储加载的骰子碰撞音效
        
        // UI控制
        this.uiVisible = true; // UI显示状态
        
        this.init();
    }

    async init() {
        this.setupScene();
        this.setupLighting();
        this.setupPhysics();
        this.setupAudio();
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
            75, // 调整视野角度，让视野更宽
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 12, 18); 

        // 设置渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        this.renderer.shadowMap.autoUpdate = true;            
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    setupLighting() {
        // 1. 环境光 - 使用半球光模拟天空和地面的自然光照
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        // 2. 主光源 (DirectionalLight) - 模拟主要的室内照明
        // 调整位置和角度，产生更有立体感的阴影
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        
        // 优化阴影质量
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 100;
        mainLight.shadow.bias = -0.0005; // 减少阴影伪影
        
        // 动态调整阴影范围
        const shadowSize = 30;
        mainLight.shadow.camera.left = -shadowSize;
        mainLight.shadow.camera.right = shadowSize;
        mainLight.shadow.camera.top = shadowSize;
        mainLight.shadow.camera.bottom = -shadowSize;
        
        this.scene.add(mainLight);
        this.mainLight = mainLight;

        // 3. 补光 (PointLight) - 增加场景的体积感和冷暖对比
        // 暖色补光
        const fillLight1 = new THREE.PointLight(0xffaa00, 0.5, 50);
        fillLight1.position.set(-15, 10, -15);
        this.scene.add(fillLight1);

        // 冷色补光
        const fillLight2 = new THREE.PointLight(0x00aaff, 0.4, 50);
        fillLight2.position.set(15, 10, -15);
        this.scene.add(fillLight2);

        // 4. 聚光灯 (SpotLight) - 聚焦在骰子区域，产生戏剧性的高光
        const spotLight = new THREE.SpotLight(0xffffff, 0.8);
        spotLight.position.set(0, 30, 5);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.5; // 柔和边缘
        spotLight.decay = 2;
        spotLight.distance = 100;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        spotLight.shadow.bias = -0.0001;
        
        this.scene.add(spotLight);
        this.spotLight = spotLight;
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
        
        // 重新创建场地（根据骰子数量调整大小）
        this.recreateSurfaces(count);
        
        if (this.currentDiceType === 6) {
            this.create6SidedDice(count);
        } else if (this.currentDiceType === 20) {
            this.create20SidedDice(count);
        }
    }

    create6SidedDice(count) {
        // 尝试使用圆角立方体，如果不可用则回退到普通立方体
        let diceGeometry;
        if (THREE.RoundedBoxGeometry) {
            // 参数: width, height, depth, segments, radius
            diceGeometry = new THREE.RoundedBoxGeometry(2, 2, 2, 4, 0.25);
            this.fixMaterialGroups(diceGeometry);
        } else {
            diceGeometry = new THREE.BoxGeometry(2, 2, 2);
        }
        
        this.createDiceTextures().then(materials => {
            const positions = this.calculateDicePositions(count);
            
            for (let i = 0; i < count; i++) {
                const dice = new THREE.Mesh(diceGeometry, materials);
                dice.position.set(...positions[i]);
                dice.castShadow = true;
                dice.receiveShadow = true;
                this.scene.add(dice);
                this.dice.push(dice);

                // 物理形状保持为盒子，稍微缩小一点以匹配圆角视觉
                const diceShape = new CANNON.Box(new CANNON.Vec3(0.98, 0.98, 0.98));
                const diceBody = new CANNON.Body({ mass: 1 });
                diceBody.addShape(diceShape);
                diceBody.position.set(...positions[i]);
                diceBody.material = new CANNON.Material('dice');
                this.world.add(diceBody);
                this.diceBody.push(diceBody);
            }
        });
    }

    fixMaterialGroups(geometry) {
        // 为 RoundedBoxGeometry 重新计算材质组
        const positionAttribute = geometry.attributes.position;
        const normalAttribute = geometry.attributes.normal;
        const indexAttribute = geometry.index;
        
        if (!indexAttribute) return;
        
        const indices = indexAttribute.array;
        const triangleCount = indices.length / 3;
        const triangles = [];
        
        // 1. 收集所有三角形及其主要朝向
        for (let i = 0; i < triangleCount; i++) {
            const a = indices[i * 3];
            const b = indices[i * 3 + 1];
            const c = indices[i * 3 + 2];
            
            // 使用第一个顶点的法线来判断朝向
            const nx = normalAttribute.getX(a);
            const ny = normalAttribute.getY(a);
            const nz = normalAttribute.getZ(a);
            
            let materialIndex = 0;
            const absX = Math.abs(nx);
            const absY = Math.abs(ny);
            const absZ = Math.abs(nz);
            
            // BoxGeometry 的材质顺序: +x, -x, +y, -y, +z, -z
            if (absX >= absY && absX >= absZ) {
                materialIndex = nx > 0 ? 0 : 1;
            } else if (absY >= absX && absY >= absZ) {
                materialIndex = ny > 0 ? 2 : 3;
            } else {
                materialIndex = nz > 0 ? 4 : 5;
            }
            
            triangles.push({ a, b, c, materialIndex });
        }
        
        // 2. 按材质索引排序三角形
        triangles.sort((t1, t2) => t1.materialIndex - t2.materialIndex);
        
        // 3. 重建索引数组并创建组
        const newIndices = [];
        const groups = [];
        let currentMaterialIndex = -1;
        let groupStart = 0;
        
        for (let i = 0; i < triangles.length; i++) {
            const t = triangles[i];
            newIndices.push(t.a, t.b, t.c);
            
            if (t.materialIndex !== currentMaterialIndex) {
                if (currentMaterialIndex !== -1) {
                    groups.push({
                        start: groupStart,
                        count: (i * 3) - groupStart,
                        materialIndex: currentMaterialIndex
                    });
                }
                currentMaterialIndex = t.materialIndex;
                groupStart = i * 3;
            }
        }
        
        // 添加最后一个组
        if (triangles.length > 0) {
            groups.push({
                start: groupStart,
                count: (triangles.length * 3) - groupStart,
                materialIndex: currentMaterialIndex
            });
        }
        
        // 4. 更新几何体
        geometry.setIndex(newIndices);
        geometry.clearGroups();
        groups.forEach(g => geometry.addGroup(g.start, g.count, g.materialIndex));
    }

    // 添加噪点函数，增加材质真实感
    addNoise(ctx, width, height, amount) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount * 255;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
    }

    async createDiceTextures() {
        const materials = [];
        
        // Three.js BoxGeometry 的面顺序：[+X, -X, +Y, -Y, +Z, -Z]
        // 我们要映射的点数顺序：      [1,  6,  2,  5,  3,  4]
        const faceNumbers = [1, 6, 2, 5, 3, 4];
        
        for (let i = 0; i < 6; i++) {
            // 1. 创建颜色纹理 (Color Map)
            const canvasColor = document.createElement('canvas');
            canvasColor.width = 512; // 提高分辨率
            canvasColor.height = 512;
            const ctxColor = canvasColor.getContext('2d');
            
            // 绘制材质质感背景 - 象牙白/树脂质感
            const gradient = ctxColor.createRadialGradient(256, 256, 50, 256, 256, 360);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#f0f0f0');
            ctxColor.fillStyle = gradient;
            ctxColor.fillRect(0, 0, 512, 512);
            
            // 添加细微噪点
            this.addNoise(ctxColor, 512, 512, 0.03);
            
            // 绘制点数颜色
            const isRedDot = (faceNumbers[i] === 1 || faceNumbers[i] === 4);
            const dotColor = isRedDot ? '#d00000' : '#111111';
            this.drawDots(ctxColor, faceNumbers[i], dotColor, false);

            // 2. 创建凹凸纹理 (Bump Map)
            const canvasBump = document.createElement('canvas');
            canvasBump.width = 512;
            canvasBump.height = 512;
            const ctxBump = canvasBump.getContext('2d');
            
            // 背景设为中灰色 (基准面)
            ctxBump.fillStyle = '#808080'; 
            ctxBump.fillRect(0, 0, 512, 512);
            
            // 移除边缘倒角绘制，因为我们现在使用真实的圆角几何体
            // 这样可以避免"双重圆角"的视觉伪影

            // 绘制点数凹陷
            this.drawDots(ctxBump, faceNumbers[i], '#000000', true);

            // 创建纹理
            const textureColor = new THREE.CanvasTexture(canvasColor);
            const textureBump = new THREE.CanvasTexture(canvasBump);
            
            [textureColor, textureBump].forEach(t => {
                t.wrapS = THREE.ClampToEdgeWrapping;
                t.wrapT = THREE.ClampToEdgeWrapping;
                t.minFilter = THREE.LinearFilter;
                t.magFilter = THREE.LinearFilter;
                t.needsUpdate = true;
                if (this.renderer && this.renderer.capabilities) {
                    t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
                }
            });
            
            const material = new THREE.MeshPhysicalMaterial({
                map: textureColor,
                bumpMap: textureBump,
                bumpScale: 0.15, // 显著的凹凸感
                color: 0xffffff,
                metalness: 0.0,
                roughness: 0.15, // 光滑树脂
                clearcoat: 1.0,  // 强烈的清漆层
                clearcoatRoughness: 0.1,
                reflectivity: 1.0,
                envMapIntensity: 1.0
            });
            
            materials.push(material);
        }
        
        return materials;
    }

    drawDots(ctx, number, color, isBump = false) {
        const dotRadius = 38; // 稍微加大点数
        // 坐标映射到 512x512
        const positions = {
            1: [[256, 256]],
            2: [[160, 160], [352, 352]],
            3: [[160, 160], [256, 256], [352, 352]],
            4: [[160, 160], [352, 160], [160, 352], [352, 352]],
            5: [[160, 160], [352, 160], [256, 256], [160, 352], [352, 352]],
            6: [[160, 128], [352, 128], [160, 256], [352, 256], [160, 384], [352, 384]]
        };

        positions[number].forEach(pos => {
            ctx.beginPath();
            if (isBump) {
                // Bump Map: 径向渐变模拟球形凹陷
                // 中心黑(深凹)，边缘灰(基准)
                const g = ctx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], dotRadius);
                g.addColorStop(0, '#000000'); // 最深
                g.addColorStop(0.7, '#404040');
                g.addColorStop(1, '#808080'); // 回到基准
                ctx.fillStyle = g;
                // 稍微扩大一点绘制区域以确保平滑过渡
                ctx.arc(pos[0], pos[1], dotRadius + 2, 0, Math.PI * 2);
            } else {
                ctx.fillStyle = color;
                ctx.arc(pos[0], pos[1], dotRadius, 0, Math.PI * 2);
            }
            ctx.fill();
            
            // 如果是颜色贴图，添加一点内部高光让它看起来像凹进去的
            if (!isBump) {
                ctx.beginPath();
                ctx.fillStyle = 'rgba(0,0,0,0.1)'; // 内部阴影
                ctx.arc(pos[0], pos[1], dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    create20SidedDice(count) {
        // 计算骰子位置
        const positions = this.calculateDicePositions(count);
        
        const face1Normal = new THREE.Vector3(-1, 1, 1).normalize();
        const upVector = new THREE.Vector3(0, 1, 0);
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(face1Normal, upVector);

        for (let i = 0; i < count; i++) {
            // 创建手动构建的20面体几何体
            const diceGeometry = this.createManualIcosahedronGeometry();
            const diceMaterials = this.create20SidedMaterial();
            
            const dice = new THREE.Mesh(diceGeometry, diceMaterials);
            dice.position.set(...positions[i]);
            
            // 应用旋转
            dice.quaternion.copy(targetQuaternion);

            dice.castShadow = true;
            dice.receiveShadow = true;
            this.scene.add(dice);
            this.dice.push(dice);

            // 创建20面体物理体
            const diceBody = this.create20SidedPhysicsBody();
            diceBody.position.set(...positions[i]);
            
            // 同步物理体旋转
            diceBody.quaternion.set(
                targetQuaternion.x,
                targetQuaternion.y,
                targetQuaternion.z,
                targetQuaternion.w
            );

            this.world.add(diceBody);
            this.diceBody.push(diceBody);
        }
        
        console.log(`🎲 已创建 ${count} 个20面骰子`);
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
            // 1. Color Map
            const canvasColor = document.createElement('canvas');
            canvasColor.width = 512; // 提高分辨率
            canvasColor.height = 512;
            const ctxColor = canvasColor.getContext('2d');
            
            // 绘制背景 (象牙白/树脂)
            ctxColor.fillStyle = '#f8f8f8';
            ctxColor.fillRect(0, 0, 512, 512);
            
            // 添加噪点
            this.addNoise(ctxColor, 512, 512, 0.03);
            
            // 绘制数字
            ctxColor.fillStyle = '#111111';
            ctxColor.font = 'bold 160px Arial';
            ctxColor.textAlign = 'center';
            ctxColor.textBaseline = 'middle';
            
            const numberY = 256 + 60; 
            ctxColor.fillText(i.toString(), 256, numberY);
            
            // 下划线
            if (i === 6 || i === 9) {
                ctxColor.strokeStyle = '#111111';
                ctxColor.lineWidth = 8;
                const underlineY = numberY + 70; 
                ctxColor.beginPath();
                ctxColor.moveTo(170, underlineY);
                ctxColor.lineTo(342, underlineY);
                ctxColor.stroke();
            }
            
            // 2. Bump Map
            const canvasBump = document.createElement('canvas');
            canvasBump.width = 512;
            canvasBump.height = 512;
            const ctxBump = canvasBump.getContext('2d');
            
            // 背景设为中灰色 (基准面)
            ctxBump.fillStyle = '#808080';
            ctxBump.fillRect(0, 0, 512, 512);
            
            // 绘制边缘圆角模拟
            // 使用带模糊的描边来模拟圆滑的边缘过渡
            const drawRoundedEdge = (ctx) => {
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 512);
                ctx.lineTo(512, 512);
                ctx.lineTo(256, 0);
                ctx.closePath();
                
                // 外层柔和过渡，模拟圆角曲率
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#000000';
                ctx.lineWidth = 30;
                ctx.strokeStyle = '#606060';
                ctx.stroke();
                
                // 内层加深，强化边缘
                ctx.shadowBlur = 15;
                ctx.lineWidth = 15;
                ctx.strokeStyle = '#404040';
                ctx.stroke();
                
                // 重置阴影
                ctx.shadowBlur = 0;
            };
            
            drawRoundedEdge(ctxBump);
            
            // 绘制数字凹陷 - 加强版
            ctxBump.fillStyle = '#000000'; // 最深
            ctxBump.font = 'bold 160px Arial';
            ctxBump.textAlign = 'center';
            ctxBump.textBaseline = 'middle';
            
            // 添加边缘高光，增强雕刻感
            ctxBump.shadowColor = 'rgba(255, 255, 255, 0.3)'; 
            ctxBump.shadowBlur = 2;
            ctxBump.shadowOffsetX = 2;
            ctxBump.shadowOffsetY = 2;
            
            ctxBump.fillText(i.toString(), 256, numberY);
            
            // 再次描边加深轮廓，确保数字清晰凹陷
            ctxBump.shadowColor = 'transparent';
            ctxBump.lineWidth = 8;
            ctxBump.strokeStyle = '#000000';
            ctxBump.strokeText(i.toString(), 256, numberY);
            
            if (i === 6 || i === 9) {
                ctxBump.strokeStyle = '#000000';
                ctxBump.lineWidth = 12;
                const underlineY = numberY + 70; 
                ctxBump.beginPath();
                ctxBump.moveTo(170, underlineY);
                ctxBump.lineTo(342, underlineY);
                ctxBump.stroke();
            }

            // 创建纹理
            const textureColor = new THREE.CanvasTexture(canvasColor);
            const textureBump = new THREE.CanvasTexture(canvasBump);
            
            [textureColor, textureBump].forEach(t => {
                t.wrapS = THREE.ClampToEdgeWrapping;
                t.wrapT = THREE.ClampToEdgeWrapping;
                t.minFilter = THREE.LinearFilter;
                t.magFilter = THREE.LinearFilter;
                t.needsUpdate = true;
                if (this.renderer && this.renderer.capabilities) {
                    t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
                }
            });

            const material = new THREE.MeshPhysicalMaterial({
                map: textureColor,
                bumpMap: textureBump,
                bumpScale: 0.35, // 增加凹凸强度
                color: 0xffffff,
                metalness: 0.0,
                roughness: 0.2,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                reflectivity: 0.8
            });
            
            materials.push(material);
        }
        
        // console.log(`🎨 已创建 ${materials.length} 个材质，编号 1-${materials.length}`);
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
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        // 设置各向异性过滤
        if (this.renderer && this.renderer.capabilities) {
            texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        }
        
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
        const spacing = 4; // 骰子之间的间距
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
            case 6:
                // 2x3 排列
                positions.push([-spacing/2, baseHeight, -spacing]);
                positions.push([spacing/2, baseHeight, -spacing]);
                positions.push([-spacing/2, baseHeight, 0]);
                positions.push([spacing/2, baseHeight, 0]);
                positions.push([-spacing/2, baseHeight, spacing]);
                positions.push([spacing/2, baseHeight, spacing]);
                break;
            case 7:
                // 中心1个 + 周围6个
                positions.push([0, baseHeight, 0]); // 中心
                positions.push([-spacing, baseHeight, -spacing]);
                positions.push([0, baseHeight, -spacing]);
                positions.push([spacing, baseHeight, -spacing]);
                positions.push([-spacing, baseHeight, spacing]);
                positions.push([0, baseHeight, spacing]);
                positions.push([spacing, baseHeight, spacing]);
                break;
            case 8:
                // 2x4 排列
                positions.push([-spacing/2, baseHeight, -spacing * 1.5]);
                positions.push([spacing/2, baseHeight, -spacing * 1.5]);
                positions.push([-spacing/2, baseHeight, -spacing/2]);
                positions.push([spacing/2, baseHeight, -spacing/2]);
                positions.push([-spacing/2, baseHeight, spacing/2]);
                positions.push([spacing/2, baseHeight, spacing/2]);
                positions.push([-spacing/2, baseHeight, spacing * 1.5]);
                positions.push([spacing/2, baseHeight, spacing * 1.5]);
                break;
            case 9:
                // 3x3 排列
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        const x = (col - 1) * spacing;
                        const z = (row - 1) * spacing;
                        positions.push([x, baseHeight, z]);
                    }
                }
                break;
            case 10:
                // 2x5 排列
                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 5; col++) {
                        const x = (col - 2) * spacing;
                        const z = (row - 0.5) * spacing;
                        positions.push([x, baseHeight, z]);
                    }
                }
                break;
            default:
                // 对于其他数量，使用网格布局
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



    createSurfaces(diceCount = 1) {
        // 根据骰子数量计算场地大小
        const tableSize = this.calculateTableSize(diceCount);
        
        // 动态调整阴影范围以适应场地大小
        this.adjustShadowsForTableSize(tableSize);
        
        // 1. 创建底座 (Table Base) - 模拟木质桌面
        const baseSize = tableSize + 10;
        const baseGeometry = new THREE.BoxGeometry(baseSize, 1, baseSize);
        const baseMaterial = this.createWoodMaterial();
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(0, -1.0, 0); // 在骰子盘下方
        base.receiveShadow = true;
        this.scene.add(base);
        this.tableObjects.push(base);

        // 2. 创建骰子盘 (Dice Tray)
        // 盘底 - 毛毡材质
        const trayGeometry = new THREE.BoxGeometry(tableSize, 0.5, tableSize);
        const trayMaterial = this.createFeltMaterial();
        const tray = new THREE.Mesh(trayGeometry, trayMaterial);
        tray.position.set(0, -0.25, 0);
        tray.receiveShadow = true;
        this.scene.add(tray);
        this.tableObjects.push(tray);

        // 盘边框 - 木质材质
        const borderHeight = 2.5;
        const borderThickness = 1.5;
        const borderMaterial = baseMaterial; // 复用木质材质

        const borders = [
            // 北
            { pos: [0, borderHeight/2 - 0.25, -tableSize/2 - borderThickness/2], size: [tableSize + borderThickness*2, borderHeight, borderThickness] },
            // 南
            { pos: [0, borderHeight/2 - 0.25, tableSize/2 + borderThickness/2], size: [tableSize + borderThickness*2, borderHeight, borderThickness] },
            // 东
            { pos: [tableSize/2 + borderThickness/2, borderHeight/2 - 0.25, 0], size: [borderThickness, borderHeight, tableSize] },
            // 西
            { pos: [-tableSize/2 - borderThickness/2, borderHeight/2 - 0.25, 0], size: [borderThickness, borderHeight, tableSize] }
        ];

        borders.forEach(b => {
            const borderGeom = new THREE.BoxGeometry(...b.size);
            const border = new THREE.Mesh(borderGeom, borderMaterial);
            border.position.set(...b.pos);
            border.castShadow = true;
            border.receiveShadow = true;
            this.scene.add(border);
            this.tableObjects.push(border);
        });

        // 3. 创建物理碰撞体
        // 桌面物理体
        const tableShape = new CANNON.Box(new CANNON.Vec3(tableSize/2, 0.25, tableSize/2));
        const tableBody = new CANNON.Body({ mass: 0 });
        tableBody.addShape(tableShape);
        tableBody.position.set(0, -0.25, 0);
        // 增加摩擦力，模拟毛毡
        tableBody.material = new CANNON.Material('felt');
        tableBody.material.friction = 0.8;
        tableBody.material.restitution = 0.1; // 低弹性
        this.world.add(tableBody);
        this.tableBodies.push(tableBody);

        // 围栏物理体 (与视觉边框对齐)
        this.createWalls(tableSize);
        
        // 设置碰撞检测（只在第一次创建时设置）
        if (this.tableBodies.length === 1) {
            this.setupCollisionDetection();
        }
    }

    createWoodMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 底色
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 512, 512);

        // 绘制木纹
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(40, 20, 10, ${Math.random() * 0.1})`;
            const y = Math.random() * 512;
            const height = Math.random() * 20 + 5;
            ctx.fillRect(0, y, 512, height);
            
            // 扰动线条
            ctx.beginPath();
            ctx.strokeStyle = `rgba(30, 15, 5, ${Math.random() * 0.2})`;
            ctx.lineWidth = Math.random() * 2 + 1;
            ctx.moveTo(0, Math.random() * 512);
            ctx.bezierCurveTo(
                170, Math.random() * 512,
                340, Math.random() * 512,
                512, Math.random() * 512
            );
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            color: 0x8d6e63,
            roughness: 0.6,
            metalness: 0.1
        });
    }

    createFeltMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 深绿色底色
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(0, 0, 512, 512);

        // 添加大量噪点模拟毛毡
        this.addNoise(ctx, 512, 512, 0.15);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); // 重复纹理以增加细节密度

        return new THREE.MeshStandardMaterial({
            map: texture,
            color: 0x2e7d32,
            roughness: 0.9, // 非常粗糙
            metalness: 0.0,
            bumpMap: texture, // 使用相同的纹理作为凹凸贴图
            bumpScale: 0.05
        });
    }

    calculateTableSize(diceCount) {
        // 根据骰子数量计算合适的桌面大小
        if (diceCount <= 5) {
            return 20;  // 小场地
        } else if (diceCount <= 10) {
            return 30;  // 中等场地
        } else if (diceCount <= 15) {
            return 40;  // 大场地
        } else {
            return 50;  // 超大场地
        }
    }

    recreateSurfaces(diceCount) {
        // 清除现有场地
        this.clearSurfaces();
        // 创建新场地
        this.createSurfaces(diceCount);
    }

    clearSurfaces() {
        // 清除桌面对象
        this.tableObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.tableObjects = [];

        // 清除墙体对象
        this.wallObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.wallObjects = [];

        // 清除物理体
        this.tableBodies.forEach(body => {
            this.world.remove(body);
        });
        this.tableBodies = [];

        this.wallBodies.forEach(body => {
            this.world.remove(body);
        });
        this.wallBodies = [];
    }

    createWalls(tableSize = 20) {
        const wallHeight = 99999;
        const wallThickness = 0.5;
        
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
            this.wallObjects.push(mesh);

            // 物理墙体保持不变，只是视觉上完全透明
            const shape = new CANNON.Box(new CANNON.Vec3(
                wall.size[0]/2, wall.size[1]/2, wall.size[2]/2
            ));
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.set(...wall.pos);
            this.world.add(body);
            this.wallBodies.push(body);
        });
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.autoRotate = false;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 8;  // 增加最小距离
        this.controls.maxDistance = 40; // 增加最大距离，支持观察更多骰子
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
            } else if (event.code === 'F2') {
                event.preventDefault();
                this.toggleUI();
            } else if (event.code === 'KeyD') {
                // 按D键调试当前骰子朝向
                this.debugDiceOrientation();
            }
        });

        // 结果显示开关
        const showResultsToggle = document.getElementById('showResultsToggle');
        if (showResultsToggle) {
            showResultsToggle.addEventListener('change', (event) => {
                this.showResultsEnabled = event.target.checked;
                const resultsContainer = document.querySelector('.current-results');
                if (resultsContainer) {
                    resultsContainer.style.display = this.showResultsEnabled ? '' : 'none';
                }

                // If results are turned ON while a roll is in progress, start stability check
                if (this.showResultsEnabled && this.isRolling) {
                    this.isCheckingForStable = true;
                    this.stableTime = 0;

                    const rollBtn = document.getElementById('rollBtn');
                    rollBtn.textContent = '🎲 投掷中...';
                    rollBtn.classList.add('rolling');
                    rollBtn.disabled = true;
                    // The reset button should not be disabled here.
                }
                console.log(`结果显示已${this.showResultsEnabled ? '开启' : '关闭'}`);
            });
        }
    }

    setupAudio() {
        // 使用 Web Audio API 生成程序化音效，无需加载外部文件
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.5; // 主音量
            
            console.log('🔊 音频系统已初始化 (Web Audio API)');
            
            // 加载外部音效文件 (2.mp3)
            fetch('2.mp3')
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.diceHitBuffer = audioBuffer;
                    console.log('🔊 骰子碰撞音效 (2.mp3) 已加载');
                })
                .catch(e => console.warn('⚠️ 无法加载骰子碰撞音效:', e));

            // 添加用户交互监听以解锁音频上下文
            const resumeAudio = () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
            
        } catch (error) {
            console.warn('⚠️ 无法初始化 Web Audio API:', error);
            this.audioContext = null;
        }
    }

    setupCollisionDetection() {
        // 监听碰撞事件
        this.world.addEventListener('postStep', () => {
            this.world.contacts.forEach((contact) => {
                const bodyA = contact.bi;
                const bodyB = contact.bj;
                
                // 检查是否是骰子与桌面的碰撞
                const isDiceTableCollision = this.checkDiceTableCollision(bodyA, bodyB);
                
                // 检查是否是骰子与骰子之间的碰撞
                const isDiceDiceCollision = this.checkDiceDiceCollision(bodyA, bodyB);
                
                if (isDiceTableCollision || isDiceDiceCollision) {
                    this.playCollisionSound(contact, isDiceDiceCollision);
                }
            });
        });
    }

    checkDiceTableCollision(bodyA, bodyB) {
        // 检查是否是骰子与桌面的碰撞
        const isDiceA = this.diceBody.includes(bodyA);
        const isDiceB = this.diceBody.includes(bodyB);
        const isTableA = this.tableBodies.includes(bodyA);
        const isTableB = this.tableBodies.includes(bodyB);
        
        return (isDiceA && isTableB) || (isDiceB && isTableA);
    }

    checkDiceDiceCollision(bodyA, bodyB) {
        // 检查是否是骰子与骰子之间的碰撞
        const isDiceA = this.diceBody.includes(bodyA);
        const isDiceB = this.diceBody.includes(bodyB);
        
        return isDiceA && isDiceB;
    }

    playCollisionSound(contact, isDiceDiceCollision = false) {
        if (!this.audioContext) return;

        // 防止音效播放过于频繁
        const currentTime = this.audioContext.currentTime;
        
        // 计算碰撞强度
        const relativeVelocity = Math.abs(contact.getImpactVelocityAlongNormal());
        const minVelocity = 0.5; 
        
        if (relativeVelocity > minVelocity) {
            // 限制高频触发 (50ms冷却)
            if (currentTime - this.lastCollisionTime < 0.05) return; 
            this.lastCollisionTime = currentTime;

            // 计算音量强度 (0.1 - 1.0)
            const intensity = Math.min(1, Math.max(0.1, (relativeVelocity - minVelocity) / 8));
            
            if (isDiceDiceCollision) {
                this.playDiceHitDiceSound(intensity);
            } else {
                this.playDiceHitTableSound(intensity);
            }
        }
    }

    playDiceHitTableSound(intensity) {
        if (this.audioContext.state === 'suspended') return;
        
        const t = this.audioContext.currentTime;
        
        // 1. 撞击主体 (厚重的低频) - 模拟台球撞库
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        
        osc.type = 'sine';
        // 频率：从稍高处快速下潜，模拟冲击
        // 台球撞库通常在 80-200Hz 之间有很强的能量
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(intensity * 1.0, t + 0.005); // 快速起音
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15); // 较快的衰减，但保留一点厚度
        
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);

        // 2. 冲击瞬态 (短促的打击声)
        // 使用带通滤波的噪声来模拟木质/毛毡的接触声
        const noiseBufferSize = this.audioContext.sampleRate * 0.05; // 50ms
        const noiseBuffer = this.audioContext.createBuffer(1, noiseBufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 400; // 较低的截止频率，去除高频刺耳声
        noiseFilter.Q.value = 1;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(intensity * 0.8, t + 0.002);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04); // 极短
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    }

    playDiceHitDiceSound(intensity) {
        if (this.audioContext.state === 'suspended') return;
        
        // 如果已加载外部音效，则优先使用
        if (this.diceHitBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.diceHitBuffer;
            
            const gainNode = this.audioContext.createGain();
            // 根据强度调整音量，稍微放大一点因为录音可能比较小
            gainNode.gain.value = intensity * 1.2; 
            
            // 随机改变一点播放速度，增加变化感
            source.playbackRate.value = 0.9 + Math.random() * 0.2;
            
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            source.start(0);
            return;
        }

        const t = this.audioContext.currentTime;
        
        // 1. 硬物碰撞核心 (清脆的短音)
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        
        osc.type = 'sine'; // 正弦波比三角波更干净，像硬塑料/骨头
        // 频率：高频，且几乎不变化，或者变化极快
        // 2500Hz - 3500Hz 是比较清脆的范围
        const baseFreq = 2800 + Math.random() * 400;
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.01); // 极短的频率微降
        
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(intensity * 0.5, t + 0.001); // 瞬间起音
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015); // 极速衰减 (15ms)
        
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.02);
        
        // 2. 碰撞瞬态 (高频点击声)
        const noiseBufferSize = this.audioContext.sampleRate * 0.01; // 10ms
        const noiseBuffer = this.audioContext.createBuffer(1, noiseBufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass'; 
        noiseFilter.frequency.value = 3000; // 只保留高频
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(intensity * 0.3, t + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.005); // 5ms 极短
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    }

    rollDice() {
        if (this.dice.length === 0) return;

        if (this.isRolling && !this.showResultsEnabled) {
            // 如果正在滚动且结果显示关闭，则施加额外的力
            this.applyForces();
            return;
        }

        if (this.isRolling && this.showResultsEnabled) {
            return;
        }
        
        // 清除之前的结果显示
        this.clearResultDisplay();
        
        this.isRolling = true;
        
        // 更新按钮状态
        if (this.showResultsEnabled) {
            const rollBtn = document.getElementById('rollBtn');
            
            rollBtn.textContent = '🎲 投掷中...';
            rollBtn.classList.add('rolling');
            rollBtn.disabled = true;
            // 重置按钮不再禁用
        }
        
        this.applyForces(true); // 初始投掷，重置速度
        
        // 开始检查骰子是否稳定
        if (this.showResultsEnabled) {
            this.isCheckingForStable = true;
            this.stableTime = 0;
        }
    }

    applyForces(isInitialRoll = false) {
        // 生成随机动量的函数
        const generateSmoothRandom = (min, max) => {
            // 使用多个随机数的平均值来近似正态分布
            let sum = 0;
            for (let i = 0; i < 6; i++) {
                sum += Math.random();
            }
            const normalized = (sum - 3) / 3; 
            return min + (max - min) * (normalized * 0.5 + 0.5);
        };
        
        // 🎛️ 可调整的力度参数
        const FORCE_SETTINGS = {
            // 水平力度范围 (X和Z方向)
            horizontalForceMin: -8,
            horizontalForceMax: 8,
            
            // 向上力度范围 (Y方向)
            upwardForceMin: 8,
            upwardForceMax: 22,
            
            // 旋转力度范围
            rotationForceMin: -50,
            rotationForceMax: 50,
            
            // 额外旋转力度范围
            extraSpinMin: -24,
            extraSpinMax: 24
        };
        
        this.diceBody.forEach((body) => {
            if (isInitialRoll) {
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
            }
            
            // 根据骰子类型调整力的大小
            const forceMultiplier = this.currentDiceType === 20 ? 1.0 : 1.0;
            const torqueMultiplier = this.currentDiceType === 20 ? 1.2 : 1.0;
            
            // 应用平滑的随机力（在原地施加向上和水平的力）
            const force = new CANNON.Vec3(
                generateSmoothRandom(FORCE_SETTINGS.horizontalForceMin, FORCE_SETTINGS.horizontalForceMax) * forceMultiplier,
                generateSmoothRandom(FORCE_SETTINGS.upwardForceMin, FORCE_SETTINGS.upwardForceMax) * forceMultiplier,
                generateSmoothRandom(FORCE_SETTINGS.horizontalForceMin, FORCE_SETTINGS.horizontalForceMax) * forceMultiplier
            );
            body.applyImpulse(force, body.position);
            
            const torque = new CANNON.Vec3(
                generateSmoothRandom(FORCE_SETTINGS.rotationForceMin, FORCE_SETTINGS.rotationForceMax) * torqueMultiplier,
                generateSmoothRandom(FORCE_SETTINGS.rotationForceMin, FORCE_SETTINGS.rotationForceMax) * torqueMultiplier,
                generateSmoothRandom(FORCE_SETTINGS.rotationForceMin, FORCE_SETTINGS.rotationForceMax) * torqueMultiplier
            );
            
            const extraSpin = new CANNON.Vec3(
                generateSmoothRandom(FORCE_SETTINGS.extraSpinMin, FORCE_SETTINGS.extraSpinMax) * torqueMultiplier,
                generateSmoothRandom(FORCE_SETTINGS.extraSpinMin, FORCE_SETTINGS.extraSpinMax) * torqueMultiplier,
                generateSmoothRandom(FORCE_SETTINGS.extraSpinMin, FORCE_SETTINGS.extraSpinMax) * torqueMultiplier
            );
            
            body.angularVelocity.vadd(new CANNON.Vec3(
                torque.x + extraSpin.x, 
                torque.y + extraSpin.y, 
                torque.z + extraSpin.z
            ), body.angularVelocity);
        });
    }

    checkResult() {
        if (this.dice.length === 0) return;
        
        const results = [];
        let totalSum = 0;
        const diceCount = this.dice.length;
        
        // 获取每个骰子的结果
        this.dice.forEach((dice, index) => {
            const result = this.getDiceValue(dice);
            results.push(result);
            totalSum += result;

            // 根据用户设置决定是否创建提示框
            if (this.showResultsEnabled) {
                const tooltipData = this.createResultTooltip(dice, index, result);
                this.resultTooltips.push(tooltipData);
            }
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
        
        // 根据用户设置决定是否更新结果表格
        if (this.showResultsEnabled) {
            this.updateCurrentResultsTable(results);
        } else {
            // 如果关闭了结果显示，则清空表格
            this.clearCurrentResultsTable();
        }
        
        // 在控制台输出结果
        if (results.length === 1) {
            console.log(`🎯 骰子结果: ${results[0]} 点`);
        } else if (diceCount < 20) {
            const resultsList = results.map((r, i) => `骰子${i+1}: ${r}`).join(' | ');
            console.log(`🎯 骰子结果: ${resultsList} | 总和: ${totalSum} 点`);
        } else {
            // 对于20个骰子，只输出总和
            console.log(`🎯 20个骰子投掷完成，总和: ${totalSum} 点`);
        }
        
        // 只有在开启结果显示时才添加闪烁效果
        if (this.showResultsEnabled) {
            this.addResultEffect();
        }
        
        // 提示框将保持显示直到下一次投掷或重置
    }

    checkDiceStability(deltaTime) {
        const STABLE_THRESHOLD = 0.15; // 判定稳定的速度阈值
        const REQUIRED_STABLE_DURATION = 0.5; // 需要保持稳定的时间（秒）

        let allDiceStable = true;
        if (this.diceBody.length === 0) {
            allDiceStable = false;
        } else {
            for (const body of this.diceBody) {
                const linearVelocity = body.velocity.length();
                const angularVelocity = body.angularVelocity.length();

                if (linearVelocity > STABLE_THRESHOLD || angularVelocity > STABLE_THRESHOLD) {
                    allDiceStable = false;
                    break;
                }
            }
        }

        if (allDiceStable) {
            this.stableTime += deltaTime;
        } else {
            this.stableTime = 0; // 如果有任何一个骰子在动，重置计时器
        }

        if (this.stableTime >= REQUIRED_STABLE_DURATION) {
            this.isCheckingForStable = false;
            this.stableTime = 0;
            this.checkResult();
        }
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

        this.isRolling = false;
        this.isCheckingForStable = false;
        this.stableTime = 0;
        
        // 清除结果显示
        this.clearResultDisplay();

        // 恢复按钮状态
        const rollBtn = document.getElementById('rollBtn');
        const resetBtn = document.getElementById('resetBtn');
        rollBtn.textContent = '🎲 投掷骰子';
        rollBtn.classList.remove('rolling');
        rollBtn.disabled = false;
        resetBtn.disabled = false;
        
        // 获取当前骰子数量并重新计算位置
        const count = this.diceBody.length;
        const positions = this.calculateDicePositions(count);
        
        // 准备20面骰子的初始旋转
        let targetQuaternion = null;
        if (this.currentDiceType === 20) {
            const face1Normal = new THREE.Vector3(-1, 1, 1).normalize();
            const upVector = new THREE.Vector3(0, 1, 0);
            targetQuaternion = new THREE.Quaternion().setFromUnitVectors(face1Normal, upVector);
        }

        // 重置每个骰子的位置和状态
        this.diceBody.forEach((body, index) => {
            body.position.set(...positions[index]);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            
            if (this.currentDiceType === 20 && targetQuaternion) {
                body.quaternion.set(
                    targetQuaternion.x,
                    targetQuaternion.y,
                    targetQuaternion.z,
                    targetQuaternion.w
                );
            } else {
                body.quaternion.set(0, 0, 0, 1);
            }
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
        
        // 创建连线 - 极简风格
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(dicePosition.x, dicePosition.y + 1.5, dicePosition.z),
            new THREE.Vector3(dicePosition.x, dicePosition.y + 4.2, dicePosition.z)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            linewidth: 1, 
            transparent: true,
            opacity: 0.2 // 非常淡的线
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.renderOrder = 998; 
        this.scene.add(line);

        // 创建3D提示框
        const tooltip3D = this.create3DTooltip(index, result);
        tooltip3D.position.set(dicePosition.x, dicePosition.y + 5.0, dicePosition.z); // 稍微抬高一点
        
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
        // 创建3D文本提示框 - 极简高级感风格
        const canvas = document.createElement('canvas');
        canvas.width = 512;  
        canvas.height = 256; 
        const ctx = canvas.getContext('2d');

        // 绘制圆角矩形背景
        const radius = 12; // 小圆角，更现代
        const x = 60; // 左右留白增加，使卡片更窄
        const y = 20;
        const width = canvas.width - 120;
        const height = canvas.height - 40;

        // 绘制圆角矩形函数
        function roundRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景：毛玻璃效果 (浅色，低透明度)
        roundRect(ctx, x, y, width, height, radius);
        // 使用浅蓝灰色，透明度降低，模拟毛玻璃的通透感
        ctx.fillStyle = 'rgba(60, 70, 90, 0.4)'; 
        ctx.fill();
        
        // 顶部装饰线 (Accent Line)
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.8)'; // 稍微透明一点的蓝色
        ctx.stroke();
        
        // 极细边框 - 增强一点亮度
        roundRect(ctx, x, y, width, height, radius);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // 绘制文本 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 序号 (顶部小字)
        ctx.font = '500 50px Arial'; 
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // 稍微亮一点
        ctx.fillText(`DICE ${index + 1}`, canvas.width / 2, y + 45);
        
        // 结果数字 (核心大字)
        ctx.font = 'bold 110px Arial'; 
        ctx.fillStyle = '#ffffff'; 
        
        // 数字发光效果
        ctx.shadowColor = 'rgba(74, 144, 226, 0.6)';
        ctx.shadowBlur = 20;
        ctx.fillText(result.toString(), canvas.width / 2, canvas.height / 2 + 25);
        ctx.shadowBlur = 0;

        // 创建纹理和材质
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        // 使用 MeshPhysicalMaterial 尝试模拟更好的质感，或者保持 Basic 但调整颜色
        // 这里保持 Basic 以确保 UI 清晰度，通过颜色模拟毛玻璃
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false 
        });

        // 创建平面几何体 - 调整比例
        const geometry = new THREE.PlaneGeometry(3.0, 1.5); 
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.renderOrder = 1000;
        mesh.userData.isTooltip = true;
        
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
        // 更新所有3D提示框的朝向和大小，让它们始终面向摄像机且保持固定大小
        if (this.resultTooltips && this.resultTooltips.length > 0 && this.camera) {
            this.resultTooltips.forEach(item => {
                if (item && item.tooltip && item.tooltip.parent && item.tooltip.userData.isTooltip) {
                    // 获取摄像机位置
                    const cameraPosition = this.camera.position.clone();
                    const tooltipPosition = item.tooltip.position.clone();
                    
                    // 让提示框始终朝向摄像机
                    item.tooltip.lookAt(cameraPosition);
                    
                    // 确保上方向正确
                    item.tooltip.up.set(0, 1, 0);
                    
                    // 计算到摄像机的距离
                    const distance = cameraPosition.distanceTo(tooltipPosition);
                    
                    // 根据距离调整缩放，让提示框看起来大小固定
                    // 基准距离设为18（摄像机新的初始距离），基准缩放为1
                    const baseDistance = 18;
                    const scaleFactor = distance / baseDistance;
                    
                    // 应用缩放，让提示框在视觉上保持相同大小
                    item.tooltip.scale.setScalar(scaleFactor);
                }
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = 1/60;
        // 更新物理世界
        this.world.step(deltaTime);
        
        // 同步所有渲染对象和物理对象
        if (this.dice.length > 0 && this.diceBody.length > 0) {
            for (let i = 0; i < Math.min(this.dice.length, this.diceBody.length); i++) {
                this.dice[i].position.copy(this.diceBody[i].position);
                this.dice[i].quaternion.copy(this.diceBody[i].quaternion);
            }
        }
        
        // 检查骰子是否稳定
        if (this.isCheckingForStable) {
            this.checkDiceStability(deltaTime);
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
        
        // console.log(`🔧 手动创建20面体：${faceIndices.length}个面，${positionArray.length/3}个顶点`);
        
        return geometry;
    }

    // 根据场地大小动态调整阴影范围
    adjustShadowsForTableSize(tableSize) {
        if (this.mainLight) {
            // 根据场地大小动态设置阴影相机范围
            const shadowRange = Math.max(tableSize * 0.7, 20); // 至少保证20的最小范围
            this.mainLight.shadow.camera.left = -shadowRange;
            this.mainLight.shadow.camera.right = shadowRange;
            this.mainLight.shadow.camera.top = shadowRange;
            this.mainLight.shadow.camera.bottom = -shadowRange;
            this.mainLight.shadow.camera.updateProjectionMatrix();
            
            // 根据场地大小调整主光源位置，保持良好的照明效果
            const lightDistance = Math.max(tableSize * 0.6, 15);
            this.mainLight.position.set(lightDistance, lightDistance * 1.3, lightDistance * 0.8);
            
            console.log(`🌟 已调整阴影范围至 ±${shadowRange}，适应 ${tableSize}x${tableSize} 场地`);
        }
        
        if (this.spotLight) {
            // 调整聚光灯高度和照射距离
            const spotHeight = Math.max(tableSize * 0.8, 20);
            const spotDistance = Math.max(tableSize * 1.2, 40);
            this.spotLight.position.set(0, spotHeight, 0);
            this.spotLight.distance = spotDistance;
            
            // 根据场地大小调整聚光灯角度
            if (tableSize > 30) {
                this.spotLight.angle = Math.PI / 3.5; // 大场地用更宽的角度
            } else {
                this.spotLight.angle = Math.PI / 4;   // 小场地用标准角度
            }
        }
    }

    toggleUI() {
        this.uiVisible = !this.uiVisible;
        
        // 获取需要隐藏/显示的UI元素
        const controlsElement = document.querySelector('.controls');
        const infoElement = document.querySelector('.info');
        
        if (this.uiVisible) {
            // 显示UI - 使用更优雅的动画
            this.showUIElement(controlsElement, 'controls');
            this.showUIElement(infoElement, 'info');
            console.log('🎮 UI已显示 (F2可隐藏)');
        } else {
            // 隐藏UI
            this.hideUIElement(controlsElement, 'controls');
            this.hideUIElement(infoElement, 'info');
            console.log('🎮 UI已隐藏 (F2可显示，空格键仍可投掷)');
        }
    }

    showUIElement(element, type) {
        if (!element) return;
        
        // 确保元素可见
        element.style.display = '';
        element.style.pointerEvents = 'auto';
        
        // 设置初始状态
        if (type === 'controls') {
            element.style.opacity = '0';
            element.style.transform = 'translateX(-50%) translateY(40px) scale(0.95)';
        } else if (type === 'info') {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-40px) scale(0.95)';
        }
        
        // 强制重绘以确保初始状态生效
        element.offsetHeight;
        
        // 使用双重requestAnimationFrame确保动画顺畅
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (type === 'controls') {
                    element.style.opacity = '1';
                    element.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                } else if (type === 'info') {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0) scale(1)';
                }
            });
        });
    }

    hideUIElement(element, type) {
        if (!element) return;
        
        element.style.pointerEvents = 'none';
        
        if (type === 'controls') {
            element.style.opacity = '0';
            element.style.transform = 'translateX(-50%) translateY(40px) scale(0.95)';
        } else if (type === 'info') {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-40px) scale(0.95)';
        }
        
        // 延迟隐藏以等待动画完成
        setTimeout(() => {
            if (!this.uiVisible) {
                element.style.display = 'none';
            }
        }, 350); // 稍微增加延迟以确保动画完成
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
