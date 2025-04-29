// 游戏配置
const config = {
    canvasWidth: 0,           // 画布宽度，会根据容器动态设置
    canvasHeight: 0,          // 画布高度，会根据容器动态设置
    gridRows: 12,             // 竖直方向的格子数
    reservedRowsTop: 2,       // 顶部保留的空白格数
    reservedRowsBottom: 2,    // 底部保留的空白格数
    birdInitialRow: 3,        // 小鸟初始位置（从上往下第4格）
    fallInterval: 10000,      // 小鸟下落的时间间隔（10秒）
    soundEnabled: true,       // 音效是否启用
    gameStarted: false,       // 游戏是否开始
    wordInterval: 15000,      // 每个单词的时间限制（15秒）
    sunRayRotation: 0,        // 太阳光芒旋转角度
    sunRayScale: 1,           // 太阳光芒缩放比例
    splashAnimation: null,    // 水花动画对象
    difficulty: 1,            // 难度等级：0-低, 1-中, 2-高
};

// 难度配置
const DIFFICULTY_SETTINGS = {
    LOW: {
        fallInterval: 8000,      // 低难度：每格下落时间为8秒
        wrongPenalty: false       // 低难度：拼写错误不下落
    },
    MEDIUM: {
        fallInterval: 5000,      // 中难度：每格下落时间为5秒
        wrongPenalty: false       // 中难度：拼写错误不下落
    },
    HIGH: {
        fallInterval: 5000,      // 高难度：每格下落时间为5秒
        wrongPenalty: true        // 高难度：拼写错误会下落一格
    }
};

// 音效文件路径
const SOUNDS = {
    background: 'assets/sounds/background.mp3',
    correct: 'assets/sounds/correct.mp3',
    wrong: 'assets/sounds/wrong.mp3',
    success: 'assets/sounds/success.mp3',
    failure: 'assets/sounds/failure.mp3',
};

// 游戏状态
const gameState = {
    birdRow: config.birdInitialRow,     // 小鸟当前所在行
    birdPosition: 0,                    // 小鸟在水平方向的位置 (0-1)
    sunPosition: 2/3,                   // 太阳在水平方向的位置 (0-1)
    sunExpression: 0,                   // 太阳表情 (0-2: 平静、微笑、开心)
    currentWordIndex: 0,                // 当前单词索引
    words: [],                          // 单词列表
    selectedLetters: [],                // 已选择的字母
    missingLetters: [],                 // 缺失的字母
    letterOptions: [],                  // 字母选项（打乱顺序的）
    cloudPositions: [],                 // 云朵位置
    gameOver: false,                    // 游戏是否结束
    gameWon: false,                     // 游戏是否胜利
    lastFallTime: 0,                    // 上次小鸟下落的时间
    currentWordTime: 0,                 // 当前单词的计时
    victoryAnimation: null,             // 胜利动画对象
    cloudTypes: [],                     // 云朵类型数组
};

// 音频对象
const audio = {
    background: new Audio(),
    correct: new Audio(),
    wrong: new Audio(),
    success: new Audio(),
    failure: new Audio(),
    
    loadSounds() {
        this.background.src = SOUNDS.background;
        this.background.loop = true;
        this.correct.src = SOUNDS.correct;
        this.wrong.src = SOUNDS.wrong;
        this.success.src = SOUNDS.success;
        this.failure.src = SOUNDS.failure;
    },
    
    play(sound) {
        if (!config.soundEnabled) return;
        
        if (sound === 'background') {
            this.background.play();
        } else if (sound === 'correct') {
            this.correct.play();
        } else if (sound === 'wrong') {
            this.wrong.play();
        } else if (sound === 'success') {
            this.success.play();
        } else if (sound === 'failure') {
            this.failure.play();
        }
    },
    
    stop(sound) {
        if (sound === 'background') {
            this.background.pause();
            this.background.currentTime = 0;
        }
    }
};

// DOM元素
const elements = {
    canvas: document.getElementById('gameCanvas'),
    incompleteWord: document.getElementById('incompleteWord'),
    wordMeaning: document.getElementById('wordMeaning'),
    letterOptions: document.getElementById('letterOptions'),
    soundToggle: document.getElementById('soundToggle'),
    difficultyToggle: document.getElementById('difficultyToggle'),
    fileInput: document.getElementById('fileInput'),
    startButton: document.getElementById('startGame'),
};

// 创建绘图上下文
const ctx = elements.canvas.getContext('2d');

// 初始化游戏
function initGame() {
    // 启用画布抗锯齿
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 设置画布尺寸
    resizeCanvas();
    
    // 生成初始的云朵位置
    generateClouds();
    
    // 加载音效
    audio.loadSounds();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 渲染初始游戏界面
    render();
    
    // 启动背景动画 - 即使游戏没开始也有动态背景
    startBackgroundAnimation();
}

// 设置事件监听器
function setupEventListeners() {
    // 窗口大小变化时调整画布大小
    window.addEventListener('resize', resizeCanvas);
    
    // 禁止右键菜单，适用于触屏设备
    elements.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // 禁止整个文档的右键菜单
    document.body.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // 点击字母选项
    elements.letterOptions.addEventListener('click', (e) => {
        if (!config.gameStarted || gameState.gameOver) return;
        
        if (e.target.classList.contains('letter-option')) {
            const letter = e.target.textContent;
            const index = gameState.letterOptions.indexOf(letter);
            
            if (index !== -1) {
                handleLetterSelection(letter, index);
            }
        }
    });
    
    // 音效开关
    elements.soundToggle.addEventListener('click', toggleSound);
    
    // 难度切换
    elements.difficultyToggle.addEventListener('click', toggleDifficulty);
    
    // 文件导入
    elements.fileInput.addEventListener('change', handleFileImport);
    
    // 开始游戏
    elements.startButton.addEventListener('click', startGame);
}

// 调整画布大小
function resizeCanvas() {
    const container = elements.canvas.parentElement;
    const containerWidth = container.clientWidth;
    
    // 重要：画布应该只占据容器的70%高度，而不是整个容器高度
    // 这样才能留出空间给单词拼写区域和按钮区域
    const gameContainerHeight = container.clientHeight;
    const canvasHeight = gameContainerHeight * 0.7; // 画布应该只占70%的高度
    
    // 获取设备像素比
    const dpr = window.devicePixelRatio || 1;
    
    // 设置画布的显示大小
    elements.canvas.style.width = `${containerWidth}px`;
    elements.canvas.style.height = `${canvasHeight}px`;
    
    // 设置画布的实际大小，考虑设备像素比
    elements.canvas.width = Math.floor(containerWidth * dpr);
    elements.canvas.height = Math.floor(canvasHeight * dpr);
    
    // 更新配置中的画布尺寸
    config.canvasWidth = containerWidth;
    config.canvasHeight = canvasHeight;
    
    // 重置缩放比例
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 设置缩放以匹配设备像素比
    ctx.scale(dpr, dpr);
    
    // 始终强制渲染一次，确保内容正确显示
    render();
}

// 生成云朵
function generateClouds() {
    gameState.cloudPositions = [];
    gameState.cloudTypes = [];
    
    // 生成5-8个云朵
    const cloudCount = Math.floor(Math.random() * 4) + 5;
    
    for (let i = 0; i < cloudCount; i++) {
        gameState.cloudPositions.push({
            x: Math.random() * config.canvasWidth,
            y: Math.random() * (config.canvasHeight * 0.6),
            size: Math.random() * 0.5 + 0.5, // 0.5-1倍大小
            speed: Math.random() * 0.5 + 0.5, // 0.5-1倍速度
        });
        
        // 随机选择云朵类型 (0-3)
        gameState.cloudTypes.push(Math.floor(Math.random() * 4));
    }
}

// 切换音效
function toggleSound() {
    config.soundEnabled = !config.soundEnabled;
    
    // 更新按钮显示
    const soundOn = elements.soundToggle.querySelector('.sound-on');
    const soundOff = elements.soundToggle.querySelector('.sound-off');
    
    if (config.soundEnabled) {
        soundOn.classList.remove('hidden');
        soundOff.classList.add('hidden');
        elements.soundToggle.style.backgroundColor = '#4CAF50'; // 恢复绿色
        if (config.gameStarted && !gameState.gameOver) {
            audio.play('background');
        }
    } else {
        soundOn.classList.add('hidden');
        soundOff.classList.remove('hidden');
        elements.soundToggle.style.backgroundColor = '#777'; // 直接设置灰色
        audio.stop('background');
    }
}

// 切换难度
function toggleDifficulty() {
    // 切换难度等级: 0-低, 1-中, 2-高
    config.difficulty = (config.difficulty + 1) % 3;
    
    // 根据难度设置游戏参数
    switch(config.difficulty) {
        case 0: // 低难度
            config.fallInterval = DIFFICULTY_SETTINGS.LOW.fallInterval;
            
            // 更新按钮显示
            elements.difficultyToggle.classList.remove('difficulty-medium', 'difficulty-high');
            elements.difficultyToggle.classList.add('difficulty-low');
            elements.difficultyToggle.querySelector('.difficulty-text').textContent = '难度：低';
            break;
            
        case 1: // 中难度
            config.fallInterval = DIFFICULTY_SETTINGS.MEDIUM.fallInterval;
            
            // 更新按钮显示
            elements.difficultyToggle.classList.remove('difficulty-low', 'difficulty-high');
            elements.difficultyToggle.classList.add('difficulty-medium');
            elements.difficultyToggle.querySelector('.difficulty-text').textContent = '难度：中';
            break;
            
        case 2: // 高难度
            config.fallInterval = DIFFICULTY_SETTINGS.HIGH.fallInterval;
            
            // 更新按钮显示
            elements.difficultyToggle.classList.remove('difficulty-low', 'difficulty-medium');
            elements.difficultyToggle.classList.add('difficulty-high');
            elements.difficultyToggle.querySelector('.difficulty-text').textContent = '难度：高';
            break;
    }
}

// 处理文件导入
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        let data;
        let workbook;
        
        // 处理CSV和Excel文件
        if (file.name.endsWith('.csv')) {
            // 对于CSV文件，使用UTF-8编码读取
            const csvContent = e.target.result;
            workbook = XLSX.read(csvContent, { type: 'string' });
        } else {
            // 对于Excel文件使用二进制读取
            data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });
        }
        
        // 假设第一个工作表包含单词
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: ["word", "meaning", "incomplete"] });
        
        // 移除表头（如果有）
        if (jsonData.length > 0 && typeof jsonData[0].word === 'string' && 
            (jsonData[0].word.toLowerCase() === 'word' || 
             jsonData[0].word.toLowerCase() === '单词')) {
            jsonData.shift();
        }
        
        // 保存单词 - 不再强制转为大写
        gameState.words = jsonData.map(item => ({
            word: item.word,
            meaning: item.meaning,
            incomplete: item.incomplete
        }));
        
        // 如果单词导入成功，启用开始按钮
        elements.startButton.disabled = gameState.words.length === 0;
        
        // 使用自定义弹窗替代alert
        showMessage(`成功导入 ${gameState.words.length} 个单词！`, '导入成功');
    };
    
    // 根据文件类型选择读取方式
    if (file.name.endsWith('.csv')) {
        reader.readAsText(file, 'UTF-8'); // 以UTF-8编码读取CSV文件
    } else {
        reader.readAsArrayBuffer(file);   // 以二进制方式读取Excel文件
    }
}

// 开始游戏
function startGame() {
    if (gameState.words.length === 0) {
        // 使用自定义弹窗替代alert
        showMessage('请先导入单词！', '提示');
        return;
    }
    
    // 设置游戏已开始标志
    config.gameStarted = true;
    
    // 播放背景音乐
    if (config.soundEnabled) {
        audio.play('background');
    }
    
    // 应用当前难度设置
    applyDifficultySettings();
    
    // 重置游戏状态
    gameState.birdRow = config.birdInitialRow;
    gameState.birdPosition = 0;
    gameState.sunPosition = 2/3;
    gameState.sunExpression = 0;
    gameState.currentWordIndex = 0;
    gameState.selectedLetters = [];
    gameState.gameOver = false;
    gameState.gameWon = false;
    gameState.lastFallTime = Date.now();
    gameState.currentWordTime = Date.now();
    gameState.victoryAnimation = null;  // 确保胜利动画被重置
    
    // 重置水花动画
    config.splashAnimation = null;
    
    // 设置第一个单词
    setupCurrentWord();
    
    // 启动游戏循环
    gameLoopRunning = false; // 重置循环状态
    gameLoop();
}

// 应用难度设置
function applyDifficultySettings() {
    switch(config.difficulty) {
        case 0: // 低难度
            config.fallInterval = DIFFICULTY_SETTINGS.LOW.fallInterval;
            break;
        case 1: // 中难度
            config.fallInterval = DIFFICULTY_SETTINGS.MEDIUM.fallInterval;
            break;
        case 2: // 高难度
            config.fallInterval = DIFFICULTY_SETTINGS.HIGH.fallInterval;
            break;
    }
}

// 设置当前单词
function setupCurrentWord() {
    const currentWord = gameState.words[gameState.currentWordIndex];
    
    // 显示不完整单词和含义
    elements.incompleteWord.textContent = currentWord.incomplete;
    elements.wordMeaning.textContent = currentWord.meaning;
    
    // 计算缺失的字母
    gameState.missingLetters = [];
    for (let i = 0; i < currentWord.word.length; i++) {
        if (currentWord.incomplete[i] === '_') {
            gameState.missingLetters.push(currentWord.word[i]);
        }
    }
    
    // 创建字母选项（使用洗牌算法确保真正随机）
    gameState.letterOptions = [...gameState.missingLetters];
    shuffleArray(gameState.letterOptions);
    
    // 重置已选择的字母
    gameState.selectedLetters = [];
    
    // 渲染字母选项
    renderLetterOptions();
    
    // 重置当前单词计时
    gameState.currentWordTime = Date.now();
}

// 洗牌算法 - 真正随机打乱数组
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        // 生成随机索引
        const j = Math.floor(Math.random() * (i + 1));
        // 交换元素
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 渲染字母选项
function renderLetterOptions() {
    elements.letterOptions.innerHTML = '';
    
    gameState.letterOptions.forEach((letter, index) => {
        const letterElement = document.createElement('div');
        letterElement.classList.add('letter-option');
        letterElement.textContent = letter;
        letterElement.dataset.index = index;
        elements.letterOptions.appendChild(letterElement);
    });
}

// 处理字母选择
function handleLetterSelection(letter, index) {
    // 移除已选择的字母选项
    gameState.letterOptions.splice(index, 1);
    
    // 添加到已选择的字母列表
    gameState.selectedLetters.push(letter);
    
    // 更新单词显示
    updateWordDisplay();
    
    // 检查是否拼写正确
    checkSpelling();
    
    // 重新渲染字母选项
    renderLetterOptions();
}

// 更新单词显示
function updateWordDisplay() {
    const currentWord = gameState.words[gameState.currentWordIndex];
    let incompleteWord = currentWord.incomplete;
    let selectedIndex = 0;
    
    // 用已选择的字母替换下划线
    for (let i = 0; i < incompleteWord.length; i++) {
        if (incompleteWord[i] === '_' && selectedIndex < gameState.selectedLetters.length) {
            incompleteWord = incompleteWord.substring(0, i) + gameState.selectedLetters[selectedIndex] + incompleteWord.substring(i + 1);
            selectedIndex++;
        }
    }
    
    elements.incompleteWord.textContent = incompleteWord;
}

// 检查拼写是否正确
function checkSpelling() {
    // 判断是否拼写完成
    if (gameState.selectedLetters.length === gameState.missingLetters.length) {
        const currentWord = gameState.words[gameState.currentWordIndex];
        let spelledWord = currentWord.incomplete;
        let selectedIndex = 0;
        
        // 构建拼写后的单词
        for (let i = 0; i < spelledWord.length; i++) {
            if (spelledWord[i] === '_') {
                spelledWord = spelledWord.substring(0, i) + gameState.selectedLetters[selectedIndex] + spelledWord.substring(i + 1);
                selectedIndex++;
            }
        }
        
        // 检查拼写是否正确 - 进行大小写不敏感的比较
        if (spelledWord.toLowerCase() === currentWord.word.toLowerCase()) {
            // 拼写正确
            if (config.soundEnabled) {
                audio.play('correct');
            }
            
            // 小鸟上升一格
            gameState.birdRow = Math.max(0, gameState.birdRow - 1);
            
            // 进入下一个单词
            gameState.currentWordIndex++;
            
            // 更新游戏进度 - 确保最后一个单词完成时位置超过1.0让小鸟飞出画面
            if (gameState.currentWordIndex >= gameState.words.length) {
                // 设置终点位置为正好在屏幕边界
                gameState.birdPosition = 1.0; 
                
                // 设置胜利飞行动画
                createVictoryAnimation();
            } else {
                // 正常进度计算
                gameState.birdPosition = gameState.currentWordIndex / Math.max(1, gameState.words.length - 1);
            }
            
            // 太阳位置跟随进度变化
            gameState.sunPosition = 2/3 - (1/3) * (gameState.currentWordIndex / Math.max(1, gameState.words.length));
            gameState.sunExpression = Math.min(2, Math.floor((gameState.currentWordIndex / Math.max(1, gameState.words.length)) * 3));
            
            // 检查是否完成所有单词
            if (gameState.currentWordIndex >= gameState.words.length) {
                // 让动画先播放，之后才显示胜利弹窗
                // 不立即结束游戏，让胜利动画完成
            } else {
                // 设置下一个单词
                setupCurrentWord();
            }
        } else {
            // 拼写错误
            if (config.soundEnabled) {
                audio.play('wrong');
            }
            
            // 高难度模式下，拼写错误会导致小鸟下落一格
            if (config.difficulty === 2 && DIFFICULTY_SETTINGS.HIGH.wrongPenalty) {
                gameState.birdRow++;
                
                // 检查游戏是否结束
                if (gameState.birdRow >= config.gridRows - 1) {
                    endGame(false);
                    return;
                }
            }
            
            // 重置当前单词
            setupCurrentWord();
        }
    }
}

// 胜利动画对象
function createVictoryAnimation() {
    gameState.victoryAnimation = {
        startTime: Date.now(),
        duration: 1500, // 动画持续1.5秒
        startPosition: gameState.birdPosition,
        complete: false
    };
}

// 更新胜利动画
function updateVictoryAnimation() {
    if (!gameState.victoryAnimation) return;
    
    const elapsed = Date.now() - gameState.victoryAnimation.startTime;
    const progress = Math.min(1, elapsed / gameState.victoryAnimation.duration);
    
    // 使用缓动函数使动画更自然
    // 先慢后快的加速
    const easing = progress * progress;
    
    // 从初始位置飞到屏幕外
    gameState.birdPosition = gameState.victoryAnimation.startPosition + easing * 0.6;
    
    // 动画结束时
    if (progress >= 1 && !gameState.victoryAnimation.complete) {
        gameState.victoryAnimation.complete = true;
        
        // 显示胜利界面
        endGame(true);
    }
}

// 结束游戏
function endGame(isWin) {
    gameState.gameOver = true;
    gameState.gameWon = isWin;
    
    // 设置游戏已结束标志
    config.gameStarted = false;
    
    // 停止背景音乐
    audio.stop('background');
    
    // 播放胜利或失败音效
    if (config.soundEnabled) {
        if (isWin) {
            audio.play('success');
        } else {
            audio.play('failure');
            
            // 创建水花动画
            createSplashAnimation();
        }
    }
    
    // 显示游戏结果弹窗，但延迟一会儿，让水花动画先显示
    setTimeout(() => {
        showGameResult(isWin);
    }, isWin ? 300 : 1500);
}

// 创建水花溅起动画
function createSplashAnimation() {
    const gridHeight = config.canvasHeight / config.gridRows;
    const birdY = gridHeight * gameState.birdRow + gridHeight / 2;
    const birdX = config.canvasWidth * 0.2 + config.canvasWidth * 0.6 * gameState.birdPosition;
    
    // 水面高度
    const oceanHeight = config.canvasHeight * 0.3;
    const oceanY = config.canvasHeight - oceanHeight;
    
    // 创建简化的水花动画
    config.splashAnimation = {
        startTime: Date.now(),
        duration: 1000,      // 动画持续时间(毫秒)
        birdX: birdX,        // 小鸟落水位置X坐标
        birdY: birdY,        // 小鸟落水位置Y坐标
        oceanY: oceanY,      // 海面高度
        
        // 水花参数
        splashSize: Math.min(40, config.canvasHeight * 0.06), // 水花基础大小，与小鸟大小保持一致
        
        // 波纹动画参数
        rippleSize: 0,       // 波纹大小，会随时间增长
        rippleAlpha: 0.3     // 波纹透明度，会随时间减小
    };
}

// 更新水花动画
function updateSplashAnimation() {
    if (!config.splashAnimation) return;
    
    const elapsed = Date.now() - config.splashAnimation.startTime;
    
    // 检查动画是否结束
    if (elapsed > config.splashAnimation.duration) {
        config.splashAnimation = null;
        return;
    }
    
    // 计算动画进度 (0-1)
    const progress = elapsed / config.splashAnimation.duration;
    
    // 更新波纹大小 - 随时间扩大
    // rippleSize决定椭圆波纹的大小，可修改系数(1.5)调整扩散速度
    config.splashAnimation.rippleSize = config.splashAnimation.splashSize * (1 + progress * 1.5);
    
    // 更新波纹透明度 - 随时间减小
    // rippleAlpha决定波纹透明度，值越大越不透明
    config.splashAnimation.rippleAlpha = 0.8 - progress;
}

// 绘制水花动画
function drawSplashAnimation() {
    if (!config.splashAnimation) return;
    
    const { birdX, birdY, oceanY, splashSize, rippleSize, rippleAlpha } = config.splashAnimation;
    
    ctx.save();
    
    // 1. 绘制水面椭圆形波纹 - 确保位置更深
    // 使用半透明蓝白色渐变
    const gradient = ctx.createRadialGradient(
        birdX, birdY + splashSize, 0,
        birdX, birdY + splashSize, rippleSize
    );
    // 波纹渐变颜色设置 - 从内到外的颜色过渡
    gradient.addColorStop(0, `rgba(255, 255, 255, ${rippleAlpha * 0.9})`); // 内部颜色：白色
    gradient.addColorStop(0.5, `rgba(200, 230, 255, ${rippleAlpha * 0.7})`); // 中间颜色：淡蓝
    gradient.addColorStop(1, `rgba(150, 200, 255, ${rippleAlpha * 0.3})`); // 外部颜色：更深的蓝
    
    ctx.fillStyle = gradient;
    
    // 绘制波浪线条的椭圆 - 在更深的位置
    ctx.beginPath();
    
    // 椭圆参数
    const radiusX = rippleSize;                // 椭圆X轴半径，控制波纹宽度
    const radiusY = rippleSize * 0.4;          // 椭圆Y轴半径，控制波纹高度，值越小越扁平
    const rotation = 0;                        // 椭圆旋转角度
    const startAngle = 0;                      // 起始角度
    const endAngle = Math.PI * 2;              // 结束角度
    
    // 绘制椭圆 - 下移位置
    const ellipseCenterY = birdY + splashSize; // 椭圆中心Y坐标，+splashSize让它在鸟下方
    ctx.ellipse(birdX, ellipseCenterY, radiusX, radiusY, rotation, startAngle, endAngle);
    ctx.fill();
    
    // 给椭圆添加波浪线条效果
    ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha * 0.8})`; // 波浪线颜色：半透明白色
    ctx.lineWidth = 2;                        // 波浪线宽度
    ctx.beginPath();
    
    // 在椭圆内部绘制几条波浪线 - 第一条内圈
    const innerRadiusX = radiusX * 0.7;        // 内圈X半径，是外圈的0.7倍
    const innerRadiusY = radiusY * 0.7;        // 内圈Y半径
    ctx.ellipse(birdX, ellipseCenterY, innerRadiusX, innerRadiusY, rotation, startAngle, endAngle);
    ctx.stroke();
    
    // 第二条内圈
    const innerRadiusX2 = radiusX * 0.4;       // 最内圈X半径，是外圈的0.4倍
    const innerRadiusY2 = radiusY * 0.4;       // 最内圈Y半径
    ctx.beginPath();
    ctx.ellipse(birdX, ellipseCenterY, innerRadiusX2, innerRadiusY2, rotation, startAngle, endAngle);
    ctx.stroke();
    
    // 2. 绘制上方的波浪线 - 水面上的波纹
    ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha * 0.8})`;
    ctx.lineWidth = 2.5;
    
    // 计算波浪位置 - 在椭圆上方适当距离
    const waveDistance = rippleSize * 0.7; // 波浪与椭圆中心的垂直距离，值越大波纹越靠上
    
    // 绘制三条波浪线，顺序调整：最短弧度最大的在底部，最长弧度最小的在顶部
    for (let i = 0; i < 3; i++) {
        // 反转i值的使用方式，使得顺序从下到上
        const reversedI = 2 - i;
        
        // 波纹位置 - 从下到上依次升高
        const waveY = ellipseCenterY - waveDistance - i * 8; // i*8控制波纹间距
        
        // 波纹宽度 - 宽度随高度变化
        const waveWidth = rippleSize * (1.5 - reversedI * 0.2); // 控制波纹宽度
        
        // 波纹高度 - 弧度大小
        const waveHeight = 6 + reversedI * 2; // 控制波纹弧度，值越大弧度越大
        
        ctx.beginPath();
        ctx.moveTo(birdX - waveWidth, waveY);
        
        // 使用更大的控制点偏移，增大弧度
        ctx.quadraticCurveTo(
            birdX,  // 控制点X坐标
            waveY - waveHeight,  // 控制点Y坐标，越小弧度越大
            birdX + waveWidth,  // 终点X坐标
            waveY  // 终点Y坐标
        );
        
        ctx.stroke();
    }
    
    ctx.restore();
}

// 显示游戏结果
function showGameResult(isWin) {
    // 创建弹窗内容
    const title = isWin ? '恭喜你！' : '游戏结束';
    const message = isWin 
        ? '你已成功完成所有单词拼写！' 
        : '小鸟掉海里了，再接再厉！';
    
    // 显示自定义弹窗
    showMessage(message, title, () => {
        startGame();
    }, '再玩一次');
}

// 渲染游戏界面
function render() {
    // 重置变换和缩放
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 清空画布
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    // 设置设备像素比例的缩放
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    
    // 绘制背景
    drawBackground();
    
    // 绘制云朵
    drawClouds();
    
    // 绘制太阳
    drawSun();
    
    // 绘制海洋
    drawOcean();
    
    // 只在没有水花动画时绘制小鸟
    if (!config.splashAnimation) {
        drawBird();
    }
    
    // 绘制水花动画（如果有）
    drawSplashAnimation();
}

// 通用消息弹窗函数
function showMessage(message, title = '提示', callback = null, buttonText = '确定') {
    // 移除已有的弹窗（如果存在）
    const existingModal = document.querySelector('.game-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // 创建弹窗
    const modal = document.createElement('div');
    modal.classList.add('game-modal');
    
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    
    const titleElement = document.createElement('h2');
    titleElement.classList.add('modal-title');
    titleElement.textContent = title;
    
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    
    // 创建按钮容器，使按钮可以并排显示
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('modal-buttons');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';
    
    // 主按钮（确定或再玩一次）
    const button = document.createElement('button');
    button.classList.add('modal-btn');
    button.textContent = buttonText;
    button.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (callback) callback();
    });
    
    // 如果是游戏结束弹窗，添加关闭按钮
    if (buttonText === '再玩一次') {
        const closeButton = document.createElement('button');
        closeButton.classList.add('modal-btn');
        closeButton.textContent = '关闭';
        closeButton.style.backgroundColor = '#777';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 将主按钮添加在左侧，关闭按钮添加在右侧
        buttonContainer.appendChild(button);
        buttonContainer.appendChild(closeButton);
    } else {
        // 如果只有一个按钮，直接添加
        buttonContainer.appendChild(button);
    }
    
    modalContent.appendChild(titleElement);
    modalContent.appendChild(messageElement);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // 显示弹窗
    setTimeout(() => {
        modal.classList.add('show');
    }, 100);
}

// 绘制背景
function drawBackground() {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, config.canvasHeight);
    gradient.addColorStop(0, '#87CEEB'); // 天空蓝
    gradient.addColorStop(0.7, '#B0E2FF'); // 浅蓝色
    
    // 绘制背景
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
}

// 绘制云朵
function drawClouds() {
    ctx.fillStyle = '#FFF';
    
    gameState.cloudPositions.forEach((cloud, index) => {
        const cloudWidth = 100 * cloud.size;
        const cloudHeight = 60 * cloud.size;
        const cloudType = gameState.cloudTypes[index] || 0;
        
        // 根据云朵类型选择不同的绘制方式
        switch(cloudType) {
            case 0: // 标准圆形云
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloudHeight * 0.5, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.2, cloud.y - cloudHeight * 0.1, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.4, cloud.y, cloudHeight * 0.5, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.6, cloud.y - cloudHeight * 0.1, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.8, cloud.y, cloudHeight * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 1: // 更蓬松的云，使用更多的圆
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.15, cloud.y - cloudHeight * 0.2, cloudHeight * 0.35, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.3, cloud.y, cloudHeight * 0.45, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.5, cloud.y - cloudHeight * 0.15, cloudHeight * 0.5, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.7, cloud.y + cloudHeight * 0.1, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.85, cloud.y - cloudHeight * 0.1, cloudHeight * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 2: // 扁平的云
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloudHeight * 0.3, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.25, cloud.y - cloudHeight * 0.05, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.5, cloud.y, cloudHeight * 0.45, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.75, cloud.y - cloudHeight * 0.05, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth, cloud.y, cloudHeight * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 3: // 不对称的云
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloudHeight * 0.3, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.2, cloud.y - cloudHeight * 0.2, cloudHeight * 0.5, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.5, cloud.y - cloudHeight * 0.1, cloudHeight * 0.4, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloudWidth * 0.7, cloud.y + cloudHeight * 0.1, cloudHeight * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    });
}

// 绘制太阳
function drawSun() {
    const sunX = config.canvasWidth * gameState.sunPosition;
    const sunY = config.canvasHeight * 0.2;
    const sunRadius = 50;
    
    // 更新太阳光芒旋转角度
    config.sunRayRotation += 0.01;
    
    // 更新太阳光芒缩放比例（使用正弦函数实现脉动效果）
    config.sunRayScale = 1 + Math.sin(Date.now() / 600) * 0.1;
    
    // 太阳光芒
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(config.sunRayRotation);
    ctx.scale(config.sunRayScale, config.sunRayScale);
    
    // 绘制光芒
    ctx.fillStyle = '#FFFF66';
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(sunRadius * 0.9, 0);
        ctx.lineTo(sunRadius * 1.5, 0);
        ctx.lineTo(sunRadius * 1.2, sunRadius * 0.2);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
    
    // 太阳主体
    const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    gradient.addColorStop(0, '#FFFFA1');
    gradient.addColorStop(1, '#FFCC00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 太阳表情
    ctx.fillStyle = '#FF6600';
    
    // 眼睛 - 改为椭圆形
    ctx.beginPath();
    ctx.ellipse(sunX - sunRadius * 0.2, sunY - sunRadius * 0.2, sunRadius * 0.08, sunRadius * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(sunX + sunRadius * 0.2, sunY - sunRadius * 0.2, sunRadius * 0.08, sunRadius * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛高光
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(sunX - sunRadius * 0.18, sunY - sunRadius * 0.22, sunRadius * 0.03, 0, Math.PI * 2);
    ctx.arc(sunX + sunRadius * 0.22, sunY - sunRadius * 0.22, sunRadius * 0.03, 0, Math.PI * 2);
    ctx.fill();
    
    // 表情（根据游戏进度变化）
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FF6600';
    ctx.beginPath();
    
    if (gameState.sunExpression === 0) {
        // 平静表情
        ctx.moveTo(sunX - sunRadius * 0.3, sunY + sunRadius * 0.3);
        ctx.lineTo(sunX + sunRadius * 0.3, sunY + sunRadius * 0.3);
    } else if (gameState.sunExpression === 1) {
        // 微笑表情
        ctx.arc(sunX, sunY + sunRadius * 0.1, sunRadius * 0.3, 0.1 * Math.PI, 0.9 * Math.PI, false);
    } else {
        // 开心表情
        ctx.arc(sunX, sunY + sunRadius * 0.1, sunRadius * 0.4, 0, Math.PI, false);
    }
    
    ctx.stroke();
}

// 绘制海洋
function drawOcean() {
    const oceanHeight = config.canvasHeight * 0.3;
    const oceanY = config.canvasHeight - oceanHeight;
    
    // 创建渐变
    const gradient = ctx.createLinearGradient(0, oceanY, 0, config.canvasHeight);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(1, '#2C3E50');
    
    ctx.fillStyle = gradient;
    
    // 绘制波浪
    ctx.beginPath();
    ctx.moveTo(0, oceanY);
    
    // 使用多个正弦波叠加创建自然的海浪效果
    const time = Date.now() / 1000;
    
    // 增加采样点密度，使曲线更平滑
    const step = Math.max(1, Math.floor(config.canvasWidth / 200));
    
    for (let x = 0; x <= config.canvasWidth; x += step) {
        const y = oceanY + 
                  Math.sin(x / 200 + time) * 10 + 
                  Math.sin(x / 100 - time * 0.5) * 5 + 
                  Math.sin(x / 50 + time * 0.2) * 3;
        
        ctx.lineTo(x, y);
    }
    
    // 完成海洋路径
    ctx.lineTo(config.canvasWidth, config.canvasHeight);
    ctx.lineTo(0, config.canvasHeight);
    ctx.closePath();
    ctx.fill();
    
    // 绘制泡沫
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    
    // 使用二次贝塞尔曲线绘制泡沫线
    ctx.beginPath();
    ctx.moveTo(0, oceanY);
    
    // 增加采样点密度
    const foamStep = Math.max(10, Math.floor(config.canvasWidth / 40));
    
    for (let x = 0; x <= config.canvasWidth; x += foamStep) {
        const y1 = oceanY + 
                  Math.sin(x / 200 + time) * 10 + 
                  Math.sin(x / 100 - time * 0.5) * 5;
        
        const nextX = x + foamStep;
        const nextY = oceanY + 
                     Math.sin(nextX / 200 + time) * 10 + 
                     Math.sin(nextX / 100 - time * 0.5) * 5;
        
        // 控制点偏移量
        const controlX = x + foamStep / 2;
        const controlY = Math.min(y1, nextY) - Math.random() * 10 - 5;
        
        // 二次贝塞尔曲线
        ctx.quadraticCurveTo(controlX, controlY, nextX, nextY);
    }
    
    ctx.stroke();
}

// 绘制小鸟
function drawBird() {
    // 如果游戏胜利且小鸟飞出画面，则不绘制
    if (gameState.gameWon && gameState.birdPosition > 1.1) return;
    
    const gridHeight = config.canvasHeight / config.gridRows;
    const birdY = gridHeight * gameState.birdRow + gridHeight / 2;
    const birdX = config.canvasWidth * 0.2 + config.canvasWidth * 0.6 * gameState.birdPosition;
    
    // 根据画布高度计算小鸟大小，而不是格子高度
    // 固定为画布高度的一个比例，确保在各种屏幕上大小一致
    const canvasHeightPercent = 0.06; // 小鸟大小为画布高度的6%
    const maxBirdSize = Math.min(config.canvasHeight * canvasHeightPercent, 40); // 最大尺寸40像素
    
    // 设置一个固定的比例因子，不再使用设备像素比调整
    const birdSize = maxBirdSize;
    
    // 如果小鸟在画面外，不绘制
    if (birdX < -birdSize || birdX > config.canvasWidth + birdSize) return;
    
    // 翅膀扇动动画
    const wingOffset = Math.sin(Date.now() / 200) * 15;
    
    // 保存当前状态
    ctx.save();
    
    // 设置变换，但避免使用额外的缩放，因为我们已经在render中处理了dpr
    ctx.translate(birdX, birdY);
    
    // 绘制所有图形时使用固定的线条宽度
    const lineWidth = 1;
    
    // 绘制尾巴 - 增强可见度和形状
    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#388E3C'; // 深绿色描边增强边缘
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-birdSize * 0.8, -birdSize * 0.25); // 调整尾巴形状
    ctx.lineTo(-birdSize * 0.9, 0); // 延长尾巴
    ctx.lineTo(-birdSize * 0.8, birdSize * 0.25); // 调整尾巴形状
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); // 添加描边增强边缘
    
    // 绘制身体（玫红色）
    ctx.fillStyle = '#E91E63';
    ctx.strokeStyle = '#C2185B'; // 深玫红色描边
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(0, 0, birdSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke(); // 添加描边增强边缘
    
    // 翅膀连接点调整 - 上移左移
    const wingConnectX = -birdSize * 0.1; // 左移
    const wingConnectTopY = -birdSize * 0.2; // 上移
    const wingConnectBottomY = birdSize * 0.05; // 上移
    
    // 绘制翅膀（紫-深紫色渐变）
    const wingGradient = ctx.createLinearGradient(0, -birdSize * 0.6, 0, birdSize * 0.4);
    wingGradient.addColorStop(0, '#9C27B0');
    wingGradient.addColorStop(1, '#4A148C');
    
    ctx.fillStyle = wingGradient;
    ctx.strokeStyle = '#7B1FA2'; // 中紫色描边
    ctx.lineWidth = lineWidth;
    
    // 为翅膀大小设置固定的比例，避免缩放问题
    const wingScale = 0.5; // 减小翅膀的相对大小以修复比例问题
    
    // 上翅膀 - 调整连接点和缩放
    ctx.beginPath();
    ctx.moveTo(wingConnectX, wingConnectTopY);
    ctx.quadraticCurveTo(
        -birdSize * 0.3, -birdSize * 0.5 - wingOffset * wingScale,
        -birdSize * 0.5, -birdSize * 0.3 - wingOffset * wingScale
    );
    ctx.lineTo(-birdSize * 0.2, -birdSize * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); // 添加描边增强边缘
    
    // 下翅膀 - 调整连接点和缩放
    ctx.beginPath();
    ctx.moveTo(wingConnectX, wingConnectBottomY);
    ctx.quadraticCurveTo(
        -birdSize * 0.3, birdSize * 0.5 + wingOffset * wingScale,
        -birdSize * 0.5, birdSize * 0.3 + wingOffset * wingScale
    );
    ctx.lineTo(-birdSize * 0.2, birdSize * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); // 添加描边增强边缘
    
    // 绘制翅膀上的羽毛线条
    ctx.strokeStyle = '#6A1B9A';
    ctx.lineWidth = lineWidth;
    
    // 上翅膀羽毛 - 调整连接点和缩放
    for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(wingConnectX, wingConnectTopY);
        ctx.quadraticCurveTo(
            -birdSize * 0.2, -birdSize * (0.2 + i * 0.1) - wingOffset * wingScale * 0.8,
            -birdSize * 0.4, -birdSize * (0.2 + i * 0.05) - wingOffset * wingScale * 0.6
        );
        ctx.stroke();
    }
    
    // 下翅膀羽毛 - 调整连接点和缩放
    for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(wingConnectX, wingConnectBottomY);
        ctx.quadraticCurveTo(
            -birdSize * 0.2, birdSize * (0.2 + i * 0.1) + wingOffset * wingScale * 0.8,
            -birdSize * 0.4, birdSize * (0.2 + i * 0.05) + wingOffset * wingScale * 0.6
        );
        ctx.stroke();
    }
    
    // 绘制头部（橙色）
    ctx.fillStyle = '#FF9800';
    ctx.strokeStyle = '#F57C00'; // 深橙色描边
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(birdSize * 0.3, -birdSize * 0.2, birdSize / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke(); // 添加描边增强边缘
    
    // 绘制嘴巴（黄色）- 修改为朝前的三角形
    ctx.fillStyle = '#FFEB3B';
    ctx.strokeStyle = '#FBC02D'; // 深黄色描边
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(birdSize * 0.5, -birdSize * 0.2);
    ctx.lineTo(birdSize * 0.8, -birdSize * 0.1);
    ctx.lineTo(birdSize * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); // 添加描边增强边缘
    
    // 绘制眼睛（黑色，白色高光）- 提高眼睛清晰度
    // 绘制眼睛外圈
    ctx.fillStyle = '#000';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(birdSize * 0.4, -birdSize * 0.25, birdSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛高光 - 更加明显和清晰
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(birdSize * 0.42, -birdSize * 0.27, birdSize * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// 更新云朵位置
function updateClouds() {
    gameState.cloudPositions.forEach(cloud => {
        // 向左移动
        cloud.x -= cloud.speed;
        
        // 如果云朵移出屏幕左侧，从右侧重新进入
        if (cloud.x + 100 * cloud.size < 0) {
            cloud.x = config.canvasWidth + Math.random() * 100;
            cloud.y = Math.random() * (config.canvasHeight * 0.6);
            // 随机重新分配云朵类型
            const index = gameState.cloudPositions.indexOf(cloud);
            if (index !== -1) {
                gameState.cloudTypes[index] = Math.floor(Math.random() * 4);
            }
        }
    });
}

// 更新游戏状态
function updateGameState() {
    const currentTime = Date.now();
    
    // 检查小鸟是否需要下落
    if (currentTime - gameState.lastFallTime >= config.fallInterval) {
        gameState.birdRow++;
        gameState.lastFallTime = currentTime;
        
        // 检查游戏是否结束 - 考虑新的下边界
        const maxSafeRow = config.gridRows - config.reservedRowsBottom - 1;
        if (gameState.birdRow >= maxSafeRow) {
            endGame(false);
        }
    }
    
    // 检查单词是否超时
    if (currentTime - gameState.currentWordTime >= config.wordInterval) {
        // 重置当前单词
        setupCurrentWord();
        gameState.currentWordTime = currentTime;
    }
    
    // 更新水花动画（如果有）
    updateSplashAnimation();
    
    // 更新胜利动画（如果有）
    if (gameState.victoryAnimation && !gameState.gameOver) {
        updateVictoryAnimation();
    }
}

// 游戏主循环标志
let gameLoopRunning = false;

// 游戏主循环
function gameLoop() {
    if (!config.gameStarted || gameState.gameOver) {
        gameLoopRunning = false;
        return;
    }
    
    // 标记循环为正在运行
    gameLoopRunning = true;
    
    // 更新游戏状态
    updateGameState();
    
    // 更新云朵位置
    updateClouds();
    
    // 渲染游戏界面
    render();
    
    // 继续下一帧
    requestAnimationFrame(gameLoop);
}

// 启动背景动画（云朵移动，太阳旋转等）
function startBackgroundAnimation() {
    // 如果游戏已经开始，则不需要单独的背景动画
    if (config.gameStarted || gameLoopRunning) return;
    
    // 更新云朵位置
    updateClouds();
    
    // 更新太阳光芒动画参数
    config.sunRayRotation += 0.01;
    config.sunRayScale = 1 + Math.sin(Date.now() / 600) * 0.1;
    
    // 渲染
    render();
    
    // 继续下一帧
    requestAnimationFrame(startBackgroundAnimation);
}

// 初始化游戏
window.addEventListener('load', initGame); 