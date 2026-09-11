/**
 * ALICE ESL Phonics P1 - 萌蛙過河主遊戲狀態機與互動控制器 (game.js)
 * 整合 3D 渲染、物理跳躍弧線、題目出題流程、答題回饋與計分結算
 */

class FrogRiverGame {
  constructor() {
    this.container = document.getElementById("game-canvas-container");
    this.currentMode = "LISTEN_HOP";
    this.currentCharacter = "frog"; // frog | duck | bunny
    this.isBilingual = true;
    this.showTextHint = true;
    this.showPromptAnswer = false; // 預設隱藏聽力題目單字，避免洩題
    this.isPromptCardVisible = true; // 上方提示卡顯示狀態（支援一鍵關閉進入純聽力模式）
    this.isVictoryDancing = false; // 終點通關面對玩家跳舞動畫狀態
    this.hasStarted = false; // 是否已點擊開始遊戲按鈕

    // 關卡進度與計分
    this.currentStep = 0;
    this.totalStepsPerRound = 10;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.isJumping = false;
    this.currentQuestion = null;
    this.questionHistory = [];

    // Three.js 核心組件
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.riverWorld = null;
    this.characterGroup = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 視角平滑跟隨參數
    this.clock = new THREE.Clock();
    this.cameraTarget = new THREE.Vector3(0, 1.8, 5.5);
    this.storageKey = "frog_river_saved_settings_v1";
    this.initSettings();

    // 啟動流程
    this.initThree();
    this.initCharacter();
    this.bindEvents();
    this.bindSettingsEvents();
    this.syncSettingsToUI();
    this.initOrientationHandler();
    this.startRound();
    this.animate();
  }

  /**
   * 初始化 Three.js 場景與渲染器
   */
  initThree() {
    this.scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 斜俯視角透視攝影機 (Isometric-like Children Perspective)
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    this.camera.position.set(0, 10, -11);
    this.cameraTarget = new THREE.Vector3(0, 1.8, 5.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 視窗自適應縮放
    window.addEventListener("resize", () => this.onWindowResize());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.onWindowResize(), 150);
    });

    // 建立河流與造景環境
    this.riverWorld = new RiverWorld(this.scene, this.camera);
  }

  /**
   * 響應式視窗縮放處理
   */
  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 手機直立防護與橫向全螢幕鎖定引導
   */
  initOrientationHandler() {
    const overlay = document.getElementById("orientation-lock-overlay");
    const btn = document.getElementById("btn-force-landscape");

    const checkOrientation = () => {
      if (!overlay) return;
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isPortrait) {
        overlay.style.display = "flex";
      } else {
        overlay.style.display = "none";
      }
    };

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", () => {
      setTimeout(checkOrientation, 150);
    });
    checkOrientation();

    if (btn) {
      btn.addEventListener("click", async () => {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
          }
          if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape").catch(() => {});
          }
        } catch (e) {
          console.log("Orientation lock info:", e);
        }
      });
    }
  }

  /**
   * 初始化角色並放置於起點
   */
  initCharacter() {
    if (this.characterGroup) {
      this.scene.remove(this.characterGroup);
    }

    if (this.currentCharacter === "duck") {
      this.characterGroup = ModelFactory.createDuck();
    } else if (this.currentCharacter === "bunny") {
      this.characterGroup = ModelFactory.createBunny();
    } else {
      this.characterGroup = ModelFactory.createFrog();
    }

    this.characterGroup.position.set(0, 0.75, 0);
    this.scene.add(this.characterGroup);
  }

  /**
   * 開始新的一輪過河挑戰
   */
  startRound() {
    this.isVictoryDancing = false; // 恢復正常過河狀態，退出終點跳舞視角
    this.currentStep = 0;
    this.score = 0;
    this.combo = 0;
    this.isJumping = false;
    this.updateHUD();

    // 立即將攝影機位置與視線重設回起點高空俯視角 (完全恢復正常視角)
    if (this.camera) {
      this.camera.position.set(0, 9.8, -10.5);
      if (!this.cameraTarget) {
        this.cameraTarget = new THREE.Vector3(0, 1.8, 5.5);
      } else {
        this.cameraTarget.set(0, 1.8, 5.5);
      }
      this.camera.lookAt(this.cameraTarget);
    }

    // 清空現有河道並重建
    this.riverWorld.clearAll();
    this.riverWorld.createStartPlatform();

    // 預先生成全輪 10 道河道跳島關卡
    for (let i = 1; i <= this.totalStepsPerRound; i++) {
      let qData;
      if (this.currentMode === "BEGINNING_SOUNDS") {
        qData = QuestionGenerator.generatePhonicsQuestion(this.questionHistory);
      } else if (this.currentMode === "ANIMAL_ACTIONS") {
        qData = QuestionGenerator.generateActionQuestion(this.questionHistory);
      } else if (this.currentMode === "ENDLESS") {
        qData = QuestionGenerator.generateEndlessQuestion(i);
      } else {
        qData = QuestionGenerator.generateListenQuestion(this.questionHistory);
      }

      this.questionHistory.push(qData.correctId);
      this.riverWorld.spawnStepLane(i, qData, this.showTextHint);
    }

    // 建立終點勝利島
    this.riverWorld.createFinishIsland(this.totalStepsPerRound);

    // 角色回起點，恢復朝向前方與正常尺寸
    this.initCharacter();
    if (this.characterGroup) {
      this.characterGroup.position.set(0, 0.75, 0);
      this.characterGroup.rotation.set(0, 0, 0); // 面朝河流前方 (+Z)
      this.characterGroup.scale.set(1.1, 1.1, 1.1);
    }

    // 準備第 1 題
    this.activateStep(1);
  }

  /**
   * 啟用指定步數之河道出題
   */
  activateStep(stepIndex) {
    this.currentStep = stepIndex;
    const lane = this.riverWorld.lanes.find(l => l.stepIndex === stepIndex);
    if (!lane) return;

    this.currentQuestion = lane.questionData;
    this.updatePromptCard(this.currentQuestion);

    // 依據題目模式播放語音 (已點擊開始遊戲後才自動朗讀)
    if (this.hasStarted) {
      setTimeout(() => {
        this.playCurrentPromptAudio();
      }, 450);
    }

    this.updateHUD();
  }

  /**
   * 播放當前題目引導語音
   */
  playCurrentPromptAudio() {
    if (!this.currentQuestion) return;

    if (this.currentMode === "LISTEN_HOP") {
      // 聽音尋字：直接播放單字發音
      window.soundCtrl.playWordAudio(this.currentQuestion.ttsAudioId);
    } else if (this.currentMode === "BEGINNING_SOUNDS") {
      // 自然發音：先唸指示再唸單字
      window.soundCtrl.speakText(`Letter ${this.currentQuestion.targetLetter}. Find the word that starts with ${this.currentQuestion.targetLetter}`, 'en-US', () => {
        window.soundCtrl.playWordAudio(this.currentQuestion.ttsAudioId);
      });
    } else if (this.currentMode === "ANIMAL_ACTIONS") {
      // 句型填空：朗讀完整課本肯定句
      window.soundCtrl.speakText(this.currentQuestion.ttsText, 'en-US');
    } else {
      // 無盡模式：依據題目型態朗讀
      if (this.currentQuestion.type === "ANIMAL_ACTIONS") {
        window.soundCtrl.speakText(this.currentQuestion.ttsText, 'en-US');
      } else {
        window.soundCtrl.playWordAudio(this.currentQuestion.ttsAudioId);
      }
    }
  }

  /**
   * 觸發小動物起跳弧線至目標荷葉
   */
  jumpToPad(targetPad) {
    if (this.isJumping) return;
    this.isJumping = true;

    const startPos = this.characterGroup.position.clone();
    const endPos = new THREE.Vector3(targetPad.position.x, 0.75, targetPad.userData.worldZ);
    const isCorrect = targetPad.userData.isCorrect;
    const vocabItem = targetPad.userData.vocabItem;

    // 起跳音效與起跳擠壓拉伸動畫
    window.soundCtrl.playJump();

    const jumpDuration = 0.58;
    const peakY = Math.max(startPos.y, endPos.y) + 2.8;

    // 1. 起跳前蓄力擠壓 (Squash)
    gsap.to(this.characterGroup.scale, {
      x: 1.35,
      y: 0.65,
      z: 1.35,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // 空中拉長 (Stretch)
        gsap.to(this.characterGroup.scale, {
          x: 0.85,
          y: 1.25,
          z: 0.85,
          duration: jumpDuration * 0.45,
          yoyo: true,
          repeat: 1
        });
      }
    });

    // 2. 拋物線起跳位移 (Parabolic Arc)
    const animObj = { progress: 0 };
    gsap.to(animObj, {
      progress: 1,
      duration: jumpDuration,
      ease: "power1.inOut",
      onUpdate: () => {
        const p = animObj.progress;
        // X 與 Z 平滑線性過渡
        this.characterGroup.position.x = THREE.MathUtils.lerp(startPos.x, endPos.x, p);
        this.characterGroup.position.z = THREE.MathUtils.lerp(startPos.z, endPos.z, p);
        // Y 軸拋物線升降
        const arcY = Math.sin(p * Math.PI) * 2.8;
        this.characterGroup.position.y = THREE.MathUtils.lerp(startPos.y, endPos.y, p) + arcY;

        // 起跳空中轉向面向前方
        this.characterGroup.rotation.y = (endPos.x - startPos.x) * 0.12;
      },
      onComplete: () => {
        // 落地水波漣漪與音效
        window.soundCtrl.playSplash();
        this.riverWorld.spawnWaterRipple(endPos.x, endPos.z);
        this.riverWorld.wobblePad(targetPad, !isCorrect);

        // 落地緩衝擠壓 (Landing Squash)
        gsap.to(this.characterGroup.scale, {
          x: 1.3,
          y: 0.72,
          z: 1.3,
          duration: 0.12,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            this.characterGroup.scale.set(1.1, 1.1, 1.1);
            this.characterGroup.rotation.y = 0;
          }
        });

        // 判定答題正誤
        this.handleAnswerResult(isCorrect, targetPad, vocabItem, startPos);
      }
    });
  }

  /**
   * 答題結果回饋處理 (Zero-Frustration Design)
   */
  handleAnswerResult(isCorrect, targetPad, vocabItem, previousPos) {
    if (isCorrect) {
      // 答對處理
      window.soundCtrl.playCorrect();
      this.riverWorld.spawnStarCelebration(targetPad.position.x, 2.0, targetPad.userData.worldZ);

      // 單字真人發音（中英雙語）複習
      window.soundCtrl.playWordAudio(vocabItem.id);

      // 計分與連擊
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const comboBonus = Math.min(this.combo * 50, 250);
      const earnedScore = 100 + comboBonus;
      this.score += earnedScore;

      this.showToast(`✨ Awesome! +${earnedScore}`, "success");
      this.updateHUD();

      // 小動物歡呼 360 度旋轉
      gsap.to(this.characterGroup.rotation, {
        y: Math.PI * 2,
        duration: 0.45,
        ease: "power1.out"
      });

      // 檢查是否完成全輪
      if (this.currentStep >= this.totalStepsPerRound) {
        setTimeout(() => {
          this.celebrateRoundClear();
        }, 1100);
      } else {
        // 平滑邁入下一道河道
        setTimeout(() => {
          this.isJumping = false;
          this.activateStep(this.currentStep + 1);
        }, 1100);
      }

    } else {
      // 答錯處理 (零挫折設計：溫柔提示、小動物搖頭後跳回原位置，絕不 Game Over！)
      window.soundCtrl.playWrong();
      this.combo = 0;
      this.showToast(`💧 Try again! Listen carefully.`, "info");
      this.updateHUD();

      // 小動物逗趣搖頭
      gsap.to(this.characterGroup.rotation, {
        y: 0.35,
        duration: 0.1,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.characterGroup.rotation.y = 0;
        }
      });

      // 0.45 秒後彈回原先安全的河道/起點
      setTimeout(() => {
        window.soundCtrl.playJump();
        gsap.to(this.characterGroup.position, {
          x: previousPos.x,
          z: previousPos.z,
          duration: 0.38,
          ease: "power1.out",
          onComplete: () => {
            this.isJumping = false;
            // 重播一次題目發音供小朋友再次聆聽
            this.playCurrentPromptAudio();
          }
        });
      }, 550);
    }
  }

  /**
   * 全輪通關慶祝：登島、轉身面向鏡頭、在獎盃前方歡樂跳舞、再彈出重新開始視窗
   */
  celebrateRoundClear() {
    this.isJumping = true;
    this.isVictoryDancing = true;

    // 1. 角色大跳躍登上終點彩虹島（落在獎盃前方舞台，絕不與金色獎盃重疊）
    const finishZ = (this.totalStepsPerRound + 1) * 8.5;
    const danceZ = finishZ - 1.5; // 位於獎盃前方 3.7 單位，視覺層次分明

    // 提示看板切換為慶祝資訊
    const promptTitle = document.getElementById("hud-prompt-text");
    const promptSub = document.getElementById("hud-prompt-sub");
    if (promptTitle) promptTitle.innerText = "🎉 You Did It! 成功過河！";
    if (promptSub) promptSub.innerText = "快看！小夥伴正在大獎盃前開心跳舞呢！";

    // 登上終點島跳躍動畫
    gsap.to(this.characterGroup.position, {
      x: 0,
      z: danceZ,
      duration: 0.9,
      ease: "power1.inOut"
    });

    gsap.to(this.characterGroup.position, {
      y: 1.8,
      duration: 0.45,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
      onComplete: () => {
        // 落地水花與金色漣漪
        window.soundCtrl.playSplash();
        this.riverWorld.spawnWaterRipple(0, danceZ, 4.5, 0xfde047);
        this.riverWorld.spawnStarCelebration(0, 3.5, danceZ);

        // 2. 華麗轉身 180 度面向攝影機 (面對我們看的到的地方，身後為大獎盃)
        gsap.to(this.characterGroup.rotation, {
          y: Math.PI,
          duration: 0.45,
          ease: "back.out(2)",
          onComplete: () => {
            // 3. 開始精彩勝利舞蹈演出
            this.playVictoryDance(danceZ);
          }
        });
      }
    });
  }

  /**
   * 勝利慶祝舞蹈序列 (約 3.2 秒生動律動表演，跳完再跳出結算視窗)
   */
  playVictoryDance(finishZ) {
    window.soundCtrl.playCheer();

    // 建立連續律動時間軸
    const danceTimeline = gsap.timeline({
      onComplete: () => {
        // 4. 跳完舞後，優雅跳出重新開始結算視窗
        setTimeout(() => {
          document.getElementById("modal-final-score").innerText = this.score;
          document.getElementById("modal-max-combo").innerText = `${this.maxCombo}x`;
          document.getElementById("round-clear-modal").classList.add("show");
        }, 500);
      }
    });

    // --- 第一段：開心左右擺頭扭腰舞姿 (Shimmy Tilt, 0 ~ 0.8s) ---
    danceTimeline.to(this.characterGroup.rotation, {
      z: 0.28,
      duration: 0.13,
      yoyo: true,
      repeat: 5,
      ease: "sine.inOut"
    }, 0);

    danceTimeline.to(this.characterGroup.position, {
      y: 2.25,
      duration: 0.13,
      yoyo: true,
      repeat: 5,
      ease: "sine.inOut"
    }, 0);

    // --- 第二段：下蹲蓄力 + 連續高空歡呼大彈跳 (Joyful High Bounces, 0.8 ~ 1.8s) ---
    // 第一次高空彈跳
    danceTimeline.to(this.characterGroup.scale, {
      x: 1.4,
      y: 0.65,
      z: 1.4,
      duration: 0.14,
      ease: "power2.in"
    });
    danceTimeline.to(this.characterGroup.position, {
      y: 4.2,
      duration: 0.32,
      ease: "power2.out",
      onStart: () => {
        window.soundCtrl.playJump();
        this.triggerDanceConfetti(1);
      }
    });
    danceTimeline.to(this.characterGroup.scale, {
      x: 0.85,
      y: 1.35,
      z: 0.85,
      duration: 0.32,
      ease: "power2.out"
    }, "<");
    danceTimeline.to(this.characterGroup.position, {
      y: 1.8,
      duration: 0.2,
      ease: "bounce.out",
      onComplete: () => {
        this.riverWorld.spawnStarCelebration(0, 2.5, finishZ);
      }
    });
    danceTimeline.to(this.characterGroup.scale, {
      x: 1.1,
      y: 1.1,
      z: 1.1,
      duration: 0.15
    }, "<");

    // 第二次下蹲與大彈跳
    danceTimeline.to(this.characterGroup.scale, {
      x: 1.4,
      y: 0.65,
      z: 1.4,
      duration: 0.12
    });
    danceTimeline.to(this.characterGroup.position, {
      y: 4.5,
      duration: 0.32,
      ease: "power2.out",
      onStart: () => {
        window.soundCtrl.playJump();
        this.triggerDanceConfetti(2);
      }
    });
    danceTimeline.to(this.characterGroup.scale, {
      x: 0.85,
      y: 1.35,
      z: 0.85,
      duration: 0.32
    }, "<");
    danceTimeline.to(this.characterGroup.position, {
      y: 1.8,
      duration: 0.2,
      ease: "bounce.out"
    });
    danceTimeline.to(this.characterGroup.scale, {
      x: 1.1,
      y: 1.1,
      z: 1.1,
      duration: 0.15
    }, "<");

    // --- 第三段：空中 360 度歡樂大迴旋 (Mid-Air 360 Spin, 1.8 ~ 2.6s) ---
    danceTimeline.to(this.characterGroup.position, {
      y: 4.8,
      duration: 0.35,
      ease: "power2.out",
      onStart: () => {
        this.triggerDanceConfetti(3);
      }
    });
    // 旋轉一整圈 (Math.PI -> Math.PI + 2*Math.PI)，旋轉完依然正面對著我們玩家！
    danceTimeline.to(this.characterGroup.rotation, {
      y: Math.PI + Math.PI * 2,
      duration: 0.7,
      ease: "power1.inOut"
    }, "<");
    danceTimeline.to(this.characterGroup.position, {
      y: 1.8,
      duration: 0.25,
      ease: "power2.in"
    });

    // --- 第四段：勝利謝幕 Pose (Victory Salute, 2.6 ~ 3.2s) ---
    danceTimeline.to(this.characterGroup.rotation, {
      x: 0.2, // 可愛前傾鞠躬致意
      z: 0,
      duration: 0.25
    });
    danceTimeline.to(this.characterGroup.scale, {
      x: 1.25,
      y: 1.05,
      z: 1.25,
      duration: 0.25
    }, "<");
    danceTimeline.to(this.characterGroup.rotation, {
      x: 0,
      duration: 0.25,
      delay: 0.25
    });
  }

  /**
   * 通關跳舞彩帶特效
   */
  triggerDanceConfetti(phase = 1) {
    if (typeof confetti !== "function") return;
    if (phase === 1) {
      confetti({ particleCount: 60, spread: 60, origin: { x: 0.3, y: 0.6 } });
    } else if (phase === 2) {
      confetti({ particleCount: 60, spread: 60, origin: { x: 0.7, y: 0.6 } });
    } else {
      confetti({ particleCount: 140, spread: 100, origin: { x: 0.5, y: 0.5 } });
    }
  }

  /**
   * 鍵盤與直覺按鈕跳躍選取 (Left, Center, Right)
   */
  hopByChoiceIndex(choiceIdx) {
    if (this.isJumping) return;
    const lane = this.riverWorld.lanes.find(l => l.stepIndex === this.currentStep);
    if (!lane || !lane.pads[choiceIdx]) return;
    this.jumpToPad(lane.pads[choiceIdx]);
  }

  /**
   * 事件綁定 (滑鼠點擊、觸控、鍵盤與 UI 控制)
   */
  bindEvents() {
    // 視窗尺寸自我調適
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // 點擊荷葉或懸浮看板射線拾取
    window.addEventListener("pointerdown", (e) => {
      // 避免點擊到 HUD 介面按鈕
      if (e.target.closest(".hud-interactive") || e.target.closest(".modal-card")) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const lane = this.riverWorld.lanes.find(l => l.stepIndex === this.currentStep);
      if (!lane) return;

      const intersects = this.raycaster.intersectObjects(lane.pads, true);
      if (intersects.length > 0) {
        // 尋找被點擊之荷葉頂層 Group
        let target = intersects[0].object;
        while (target.parent && !target.userData.vocabItem) {
          target = target.parent;
        }
        if (target && target.userData.vocabItem) {
          this.jumpToPad(target);
        }
      }
    });

    // 鍵盤方向鍵支援
    window.addEventListener("keydown", (e) => {
      if (this.isJumping) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.hopByChoiceIndex(0); // 左側荷葉
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
        this.hopByChoiceIndex(1); // 中間荷葉
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.hopByChoiceIndex(2); // 右側荷葉
      }
    });

    // UI 按鈕控制項
    // 1. 題目重播按鈕
    document.getElementById("btn-speak-again").addEventListener("click", () => {
      this.playCurrentPromptAudio();
    });

    // 2. 虛擬方向鍵跳躍按鈕 (針對平板與幼童點擊優化)
    document.getElementById("btn-hop-left").addEventListener("click", () => this.hopByChoiceIndex(0));
    document.getElementById("btn-hop-center").addEventListener("click", () => this.hopByChoiceIndex(1));
    document.getElementById("btn-hop-right").addEventListener("click", () => this.hopByChoiceIndex(2));

    // 3. 模式切換按鈕
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentMode = btn.dataset.mode;
        this.startRound();
      });
    });

    // 4. 角色更換按鈕
    document.querySelectorAll(".char-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".char-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentCharacter = btn.dataset.char;
        this.initCharacter();
        window.soundCtrl.playJump();
      });
    });

    // 5. 提示卡文字切換
    const btnHint = document.getElementById("toggle-hint");
    btnHint.addEventListener("click", () => {
      this.showTextHint = !this.showTextHint;
      btnHint.classList.toggle("active", this.showTextHint);
      document.getElementById("hint-label").innerText = `單字: ${this.showTextHint ? "開啟" : "隱藏"}`;
      // 重繪當前荷葉看板
      this.startRound();
    });

    // 6. 雙語語音切換
    const btnBilingual = document.getElementById("toggle-bilingual");
    btnBilingual.addEventListener("click", () => {
      const state = window.soundCtrl.toggleBilingual();
      btnBilingual.classList.toggle("active", state);
      document.getElementById("bilingual-label").innerText = `語音: ${state ? "雙語" : "純英"}`;
    });

    // 7. 靜音開關
    const btnMute = document.getElementById("btn-mute");
    btnMute.addEventListener("click", () => {
      const isMuted = window.soundCtrl.toggleMute();
      btnMute.innerText = isMuted ? "🔇" : "🔊";
      btnMute.classList.toggle("muted", isMuted);
    });

    // 8. 結算彈窗：再來一輪
    document.getElementById("btn-play-again").addEventListener("click", () => {
      document.getElementById("round-clear-modal").classList.remove("show");
      this.startRound();
    });

    // 9. 題目卡文字提示切換按鈕 (防洩題單字切換)
    const btnTogglePrompt = document.getElementById("btn-toggle-prompt-text");
    if (btnTogglePrompt) {
      btnTogglePrompt.addEventListener("click", () => {
        this.showPromptAnswer = !this.showPromptAnswer;
        if (this.currentQuestion) {
          this.updatePromptCard(this.currentQuestion);
        }
      });
    }

    // 10. 上方提示卡關閉與顯示切換按鈕 (純聽力挑戰)
    const btnClosePrompt = document.getElementById("btn-close-prompt");
    if (btnClosePrompt) {
      btnClosePrompt.addEventListener("click", () => {
        this.togglePromptCardVisibility(false);
      });
    }

    const btnExpandPrompt = document.getElementById("btn-expand-prompt");
    if (btnExpandPrompt) {
      btnExpandPrompt.addEventListener("click", () => {
        this.togglePromptCardVisibility(true);
      });
    }

    const btnMinSpeak = document.getElementById("btn-min-speak");
    if (btnMinSpeak) {
      btnMinSpeak.addEventListener("click", () => {
        this.playCurrentPromptAudio();
      });
    }

    const btnHudTogglePrompt = document.getElementById("btn-hud-toggle-prompt");
    if (btnHudTogglePrompt) {
      btnHudTogglePrompt.addEventListener("click", () => {
        this.togglePromptCardVisibility();
      });
    }

    // 11. 遊戲開始按鈕 (開始畫面：儲存設定並啟動遊戲)
    const btnStart = document.getElementById("btn-start-game");
    if (btnStart) {
      btnStart.addEventListener("click", () => {
        this.saveAndApplySettingsFromUI();
        const startModal = document.getElementById("start-game-modal");
        if (startModal) {
          startModal.classList.remove("show");
        }
        this.hasStarted = true;
        window.soundCtrl.playJump();
        this.startRound();
      });
    }

    // 12. 重新開始按鈕 (頂部工具列)
    const btnRestart = document.getElementById("btn-restart-game");
    if (btnRestart) {
      btnRestart.addEventListener("click", () => {
        this.hasStarted = true;
        this.startRound();
        window.soundCtrl.playJump();
      });
    }
  }

  /**
   * 初始化設定（優先從 localStorage 讀取暫存預設）
   */
  initSettings() {
    const defaults = {
      mode: "LISTEN_HOP",
      character: "frog",
      showTextHint: true,
      isPromptCardVisible: true,
      isBilingual: true,
      totalSteps: 10
    };

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentMode = parsed.mode || defaults.mode;
        this.currentCharacter = parsed.character || defaults.character;
        this.showTextHint = typeof parsed.showTextHint === "boolean" ? parsed.showTextHint : defaults.showTextHint;
        this.isPromptCardVisible = typeof parsed.isPromptCardVisible === "boolean" ? parsed.isPromptCardVisible : defaults.isPromptCardVisible;
        this.isBilingual = typeof parsed.isBilingual === "boolean" ? parsed.isBilingual : defaults.isBilingual;
        this.totalStepsPerRound = parseInt(parsed.totalSteps, 10) || defaults.totalSteps;
        return;
      }
    } catch (e) {
      console.warn("讀取本機偏好設定失敗，使用預設值:", e);
    }

    this.currentMode = defaults.mode;
    this.currentCharacter = defaults.character;
    this.showTextHint = defaults.showTextHint;
    this.isPromptCardVisible = defaults.isPromptCardVisible;
    this.isBilingual = defaults.isBilingual;
    this.totalStepsPerRound = defaults.totalSteps;
  }

  /**
   * 將當前設定同步至開始彈窗與頂部 HUD 控制項
   */
  syncSettingsToUI() {
    // 1. 開始彈窗設定選項按鈕
    this.setActiveOptionInGroup("opt-group-mode", this.currentMode);
    this.setActiveOptionInGroup("opt-group-char", this.currentCharacter);
    this.setActiveOptionInGroup("opt-group-hint", String(this.showTextHint));
    this.setActiveOptionInGroup("opt-group-prompt", String(this.isPromptCardVisible));
    this.setActiveOptionInGroup("opt-group-bilingual", String(this.isBilingual));
    this.setActiveOptionInGroup("opt-group-steps", String(this.totalStepsPerRound));

    // 2. 頂部 HUD 模式列
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === this.currentMode);
    });

    // 3. 頂部 HUD 角色列
    document.querySelectorAll(".char-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.char === this.currentCharacter);
    });

    // 4. 提示卡看板狀態
    this.togglePromptCardVisibility(this.isPromptCardVisible);

    // 5. 頂部單字開關按鈕標籤
    const btnHint = document.getElementById("toggle-hint");
    if (btnHint) {
      btnHint.classList.toggle("active", this.showTextHint);
      const hintLabel = document.getElementById("hint-label");
      if (hintLabel) hintLabel.innerText = `荷葉單字: ${this.showTextHint ? "開啟" : "隱藏"}`;
    }

    // 6. 頂部雙語按鈕標籤
    const btnBilingual = document.getElementById("toggle-bilingual");
    if (btnBilingual) {
      btnBilingual.classList.toggle("active", this.isBilingual);
      const biLabel = document.getElementById("bilingual-label");
      if (biLabel) biLabel.innerText = `語音: ${this.isBilingual ? "雙語" : "純英"}`;
    }
  }

  /**
   * 輔助函式：設定指定選項組內唯一 active 按鈕
   */
  setActiveOptionInGroup(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll(".setting-opt-btn").forEach(btn => {
      btn.classList.toggle("active", String(btn.dataset.val) === String(value));
    });
  }

  /**
   * 綁定設定面板選項的點擊切換與即時暫存
   */
  bindSettingsEvents() {
    const optionGroups = [
      "opt-group-mode",
      "opt-group-char",
      "opt-group-hint",
      "opt-group-prompt",
      "opt-group-bilingual",
      "opt-group-steps"
    ];

    optionGroups.forEach(groupId => {
      const group = document.getElementById(groupId);
      if (!group) return;
      group.querySelectorAll(".setting-opt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          group.querySelectorAll(".setting-opt-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    });

    // 齒輪設定按鈕：隨時打開設定面板調整並暫存
    const btnOpenSettings = document.getElementById("btn-open-settings");
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener("click", () => {
        this.syncSettingsToUI();
        const startModal = document.getElementById("start-game-modal");
        if (startModal) startModal.classList.add("show");
      });
    }
  }

  /**
   * 從設定面板套用並儲存設定至 localStorage
   */
  saveAndApplySettingsFromUI() {
    const getVal = (groupId) => {
      const activeBtn = document.querySelector(`#${groupId} .setting-opt-btn.active`);
      return activeBtn ? activeBtn.dataset.val : null;
    };

    const mode = getVal("opt-group-mode") || this.currentMode;
    const character = getVal("opt-group-char") || this.currentCharacter;
    const showTextHint = getVal("opt-group-hint") === "true";
    const isPromptCardVisible = getVal("opt-group-prompt") === "true";
    const isBilingual = getVal("opt-group-bilingual") === "true";
    const totalSteps = parseInt(getVal("opt-group-steps"), 10) || this.totalStepsPerRound;

    const settings = {
      mode,
      character,
      showTextHint,
      isPromptCardVisible,
      isBilingual,
      totalSteps
    };

    // 暫存至瀏覽器 localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (e) {
      console.warn("無法儲存偏好設定至 localStorage:", e);
    }

    // 套用至遊戲實例
    this.currentMode = mode;
    this.currentCharacter = character;
    this.showTextHint = showTextHint;
    this.isPromptCardVisible = isPromptCardVisible;
    this.isBilingual = isBilingual;
    this.totalStepsPerRound = totalSteps;

    // 同步語音控制器的雙語狀態
    if (window.soundCtrl && window.soundCtrl.isBilingual !== undefined) {
      window.soundCtrl.isBilingual = this.isBilingual;
    }

    this.syncSettingsToUI();
  }

  /**
   * 切換上方提示看板的顯示與關閉（純聽力過河模式）
   */
  togglePromptCardVisibility(forceState = null) {
    if (forceState !== null) {
      this.isPromptCardVisible = forceState;
    } else {
      this.isPromptCardVisible = !this.isPromptCardVisible;
    }

    const card = document.getElementById("hud-prompt-card");
    const minCard = document.getElementById("hud-prompt-minimized");
    const toolBtn = document.getElementById("btn-hud-toggle-prompt");
    const toolLabel = document.getElementById("hud-prompt-toggle-label");

    if (this.isPromptCardVisible) {
      if (card) card.style.display = "flex";
      if (minCard) minCard.style.display = "none";
      if (toolBtn) toolBtn.classList.add("active");
      if (toolLabel) toolLabel.innerText = "提示卡: 開啟";
      if (card) {
        gsap.fromTo(card, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(1.5)" });
      }
    } else {
      if (card) card.style.display = "none";
      if (minCard) minCard.style.display = "flex";
      if (toolBtn) toolBtn.classList.remove("active");
      if (toolLabel) toolLabel.innerText = "提示卡: 關閉";
    }
  }

  /**
   * 更新 HUD 頂部看板
   */
  updateHUD() {
    document.getElementById("hud-round").innerText = `${this.currentStep} / ${this.totalStepsPerRound}`;
    document.getElementById("hud-score").innerText = this.score;
    document.getElementById("hud-combo").innerText = `${this.combo}x`;
  }

  /**
   * 更新中上方指示卡牌 (支援防洩題隱藏/顯示功能)
   */
  updatePromptCard(qData) {
    if (!qData) return;
    const titleElem = document.getElementById("hud-prompt-text");
    const subElem = document.getElementById("hud-prompt-sub");
    const eyeIcon = document.getElementById("prompt-eye-icon");
    const eyeText = document.getElementById("prompt-eye-text");
    const btnEye = document.getElementById("btn-toggle-prompt-text");

    if (this.currentMode === "LISTEN_HOP") {
      titleElem.innerText = "Listen & Hop! 🎧";
      if (!this.showPromptAnswer) {
        subElem.innerText = "❓ 請聽發音選荷葉（點擊 👁️ 查看文字）";
        if (eyeIcon) eyeIcon.innerText = "👁️";
        if (eyeText) eyeText.innerText = "顯示單字";
        if (btnEye) btnEye.classList.add("hidden-mode");
      } else {
        subElem.innerText = `Find: "${qData.target ? qData.target.word : qData.correctId}"`;
        if (eyeIcon) eyeIcon.innerText = "🙈";
        if (eyeText) eyeText.innerText = "隱藏單字";
        if (btnEye) btnEye.classList.remove("hidden-mode");
      }
    } else if (this.currentMode === "BEGINNING_SOUNDS") {
      titleElem.innerText = `Find Letter: ${qData.targetLetter} ${qData.target ? qData.target.phonics : ''}`;
      if (!this.showPromptAnswer) {
        subElem.innerText = `❓ 哪一個單字是以 "${qData.targetLetter}" 開頭呢？`;
        if (eyeIcon) eyeIcon.innerText = "👁️";
        if (eyeText) eyeText.innerText = "提示單字";
        if (btnEye) btnEye.classList.add("hidden-mode");
      } else {
        subElem.innerText = `答案單字: "${qData.target ? qData.target.word : qData.correctId}"`;
        if (eyeIcon) eyeIcon.innerText = "🙈";
        if (eyeText) eyeText.innerText = "隱藏單字";
        if (btnEye) btnEye.classList.remove("hidden-mode");
      }
    } else {
      titleElem.innerText = qData.promptText;
      subElem.innerText = qData.promptSub;
      if (eyeIcon) eyeIcon.innerText = "👁️";
      if (eyeText) eyeText.innerText = "提示";
    }

    // 縮放強調動畫
    const card = document.getElementById("hud-prompt-card");
    if (card) {
      gsap.fromTo(card, { scale: 0.95 }, { scale: 1.0, duration: 0.25, ease: "back.out(1.5)" });
    }
  }

  /**
   * 答題回饋快訊 (Toast)
   */
  showToast(msg, type = "success") {
    const toast = document.getElementById("feedback-toast");
    toast.innerText = msg;
    toast.className = `feedback-toast show ${type}`;
    gsap.fromTo(toast, { scale: 0.7, opacity: 0 }, { scale: 1.0, opacity: 1, duration: 0.25, ease: "back.out(2)" });

    setTimeout(() => {
      toast.classList.remove("show");
    }, 1500);
  }

  /**
   * 主渲染循環 (Animation Loop)
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // 1. 環境水流與荷葉波動更新
    if (this.riverWorld) {
      this.riverWorld.update(delta);
    }

    // 2. 攝影機平滑跟隨角色 (Smooth Camera Lerp)
    if (this.characterGroup && this.camera) {
      if (!this.cameraTarget) {
        this.cameraTarget = new THREE.Vector3(0, 1.8, 5.5);
      }
      let targetCamZ = this.characterGroup.position.z - 10.5;
      let targetCamY = 9.8;
      let targetLookZ = this.characterGroup.position.z + 5.5;
      let targetLookY = 1.8;

      if (this.isVictoryDancing) {
        // 勝利跳舞特寫鏡頭：平滑推近並降低仰角，清晰看見小動物開心跳舞面向大家！
        targetCamZ = this.characterGroup.position.z - 6.8;
        targetCamY = 3.6;
        targetLookZ = this.characterGroup.position.z;
        targetLookY = 2.0;
      }

      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.065);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.065);

      this.cameraTarget.z = THREE.MathUtils.lerp(this.cameraTarget.z, targetLookZ, 0.065);
      this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, targetLookY, 0.065);
      this.camera.lookAt(this.cameraTarget);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// 頁面載入完成後啟動遊戲實例
window.addEventListener("DOMContentLoaded", () => {
  window.gameInstance = new FrogRiverGame();
});
