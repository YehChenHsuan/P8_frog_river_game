/**
 * ALICE ESL Phonics P1 - 3D 河流環境與跳島動態生成器 (river.js)
 * 管理動態水流波動、兩岸森林、荷葉跳島佈局、射線拾取與水花漣漪特效
 */

class RiverWorld {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.lanes = []; // 河道跳島群組
    this.activeLilyPads = []; // 可供點擊的荷葉目標
    this.waterRipples = []; // 活躍的水波漣漪
    this.celebrationParticles = []; // 答對慶祝金色星芒
    this.time = 0;

    // 建立環境場景
    this.initEnvironment();
    this.initWater();
    this.initRiverbanks();
  }

  initEnvironment() {
    // 柔和自然天空背景色
    this.scene.background = new THREE.Color(0xdbeafe);
    this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.016);

    // 溫暖主光源 (陽光)
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
    this.sunLight.position.set(20, 35, -15);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.scene.add(this.sunLight);

    // 柔和環境天光
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x86efac, 0.65);
    this.scene.add(hemiLight);
  }

  initWater() {
    // 3D 閃爍清澈河流主網格
    const waterGeo = new THREE.PlaneGeometry(36, 320, 48, 64);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.86
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.set(0, -0.05, 120);
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // 河床金色沙底
    const riverbedGeo = new THREE.PlaneGeometry(38, 320);
    riverbedGeo.rotateX(-Math.PI / 2);
    const riverbedMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
    const riverbed = new THREE.Mesh(riverbedGeo, riverbedMat);
    riverbed.position.set(0, -1.2, 120);
    this.scene.add(riverbed);
  }

  initRiverbanks() {
    // 兩岸草地斜坡 (Left & Right Banks)
    const bankMat = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
    const bankGeo = new THREE.BoxGeometry(16, 2.8, 320);

    // 左岸
    const leftBank = new THREE.Mesh(bankGeo, bankMat);
    leftBank.position.set(-16.5, 0.8, 120);
    this.scene.add(leftBank);

    // 右岸
    const rightBank = new THREE.Mesh(bankGeo, bankMat);
    rightBank.position.set(16.5, 0.8, 120);
    this.scene.add(rightBank);

    // 兩岸茂密卡通樹木與鮮花造景
    for (let z = -10; z < 280; z += 12) {
      // 左岸樹
      const treeL = ModelFactory.createTree(z % 24 === 0 ? "round" : "pine");
      treeL.position.set(-11.5 - Math.random() * 3, 2.2, z + (Math.random() * 4 - 2));
      const sL = 0.8 + Math.random() * 0.4;
      treeL.scale.set(sL, sL, sL);
      this.scene.add(treeL);

      // 右岸樹
      const treeR = ModelFactory.createTree(z % 18 === 0 ? "round" : "pine");
      treeR.position.set(11.5 + Math.random() * 3, 2.2, z + (Math.random() * 4 - 2));
      const sR = 0.8 + Math.random() * 0.4;
      treeR.scale.set(sR, sR, sR);
      this.scene.add(treeR);
    }
  }

  /**
   * 建立起點青綠草坪平台 (Starting Platform)
   */
  createStartPlatform() {
    const dockGroup = new THREE.Group();
    dockGroup.position.set(0, 0, 0);

    const grassGeo = new THREE.CylinderGeometry(3.5, 4.0, 0.8, 24);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 0.35;
    grass.receiveShadow = true;
    dockGroup.add(grass);

    // 起點木質路標旗幟
    const signPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const post = new THREE.Mesh(signPostGeo, signMat);
    post.position.set(-2.2, 1.1, 0);
    dockGroup.add(post);

    const bannerGeo = new THREE.BoxGeometry(1.6, 0.65, 0.1);
    const bannerMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(-1.4, 1.8, 0);
    dockGroup.add(banner);

    this.scene.add(dockGroup);
    this.startDock = dockGroup;
  }

  /**
   * 生成單一河道關卡之 3 朵荷葉跳島 (Spawn Lily Pad Step)
   */
  spawnStepLane(stepIndex, questionData, showText = true) {
    const zPos = stepIndex * 8.5; // 每一步距離 8.5 單位
    const laneGroup = new THREE.Group();
    laneGroup.position.set(0, 0, zPos);
    laneGroup.userData = { stepIndex, questionData };

    // 依據相機自 -Z 望向 +Z 視角：+X 位於畫面左側，-X 位於畫面右側
    const xOffsets = [3.8, 0, -3.8]; // 索引 0: 畫面左側荷葉, 索引 1: 中央荷葉, 索引 2: 畫面右側荷葉
    const pads = [];

    questionData.options.forEach((vocabItem, idx) => {
      const pad = ModelFactory.createLilyPad(vocabItem, showText);
      const posX = xOffsets[idx];
      pad.position.set(posX, 0, 0);
      pad.userData.laneIndex = stepIndex;
      pad.userData.choiceIndex = idx;
      pad.userData.isCorrect = (vocabItem.id === questionData.correctId);
      pad.userData.worldZ = zPos;
      pad.userData.baseY = 0;
      pad.userData.bobOffset = idx * 1.8 + stepIndex;

      laneGroup.add(pad);
      pads.push(pad);
      this.activeLilyPads.push(pad);
    });

    this.scene.add(laneGroup);
    this.lanes.push({
      stepIndex,
      group: laneGroup,
      pads: pads,
      questionData: questionData
    });

    return laneGroup;
  }

  /**
   * 建立終點彩虹勝利島 (Finish Celebration Island)
   */
  createFinishIsland(totalSteps) {
    const finishZ = (totalSteps + 1) * 8.5;
    const finishGroup = new THREE.Group();
    finishGroup.position.set(0, 0, finishZ);

    // 巨大黃金勝利島嶼
    const islandGeo = new THREE.CylinderGeometry(5.5, 6.2, 1.2, 32);
    const islandMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = 0.5;
    finishGroup.add(island);

    // 勝利金色大獎盃 (放在終點島後方作為榮耀背景，與前方表演舞台區隔)
    const trophyGroup = new THREE.Group();
    trophyGroup.position.set(0, 0, 2.2);

    const trophyMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.8,
      roughness: 0.2
    });
    const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.4, 16), trophyMat);
    cupBase.position.y = 1.3;
    trophyGroup.add(cupBase);

    const cupStem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12), trophyMat);
    cupStem.position.y = 1.8;
    trophyGroup.add(cupStem);

    const cupBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 1.4, 16), trophyMat);
    cupBowl.position.y = 2.8;
    trophyGroup.add(cupBowl);

    // 閃耀星星頂飾
    const star = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45), trophyMat);
    star.position.y = 4.0;
    trophyGroup.add(star);
    finishGroup.add(trophyGroup);

    // 彩虹拱門 (位於獎盃後方背景)
    const rainbowColors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6, 0xa855f7];
    rainbowColors.forEach((color, i) => {
      const rGeo = new THREE.TorusGeometry(4.2 - i * 0.25, 0.12, 12, 36, Math.PI);
      const rMat = new THREE.MeshBasicMaterial({ color: color });
      const arch = new THREE.Mesh(rGeo, rMat);
      arch.position.set(0, 1.2, 2.5);
      finishGroup.add(arch);
    });

    this.scene.add(finishGroup);
    this.finishIsland = finishGroup;
    return finishGroup;
  }

  /**
   * 水波漣漪特效產生 (Water Ripple FX)
   */
  spawnWaterRipple(x, z, maxRadius = 2.4, color = 0xbae6fd) {
    const rippleGeo = new THREE.RingGeometry(0.2, 0.35, 28);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ripple = new THREE.Mesh(rippleGeo, rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(x, 0.05, z);
    this.scene.add(ripple);

    this.waterRipples.push({
      mesh: ripple,
      radius: 0.2,
      maxRadius: maxRadius,
      opacity: 0.95,
      speed: 0.065
    });
  }

  /**
   * 答對星光爆炸特效 (Star Sparkle Explosion)
   */
  spawnStarCelebration(x, y, z) {
    const starCount = 18;
    for (let i = 0; i < starCount; i++) {
      const geo = new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.12);
      const mat = new THREE.MeshBasicMaterial({
        color: [0xfacc15, 0x38bdf8, 0xf472b6, 0x4ade80][Math.floor(Math.random() * 4)]
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.12;
      this.celebrationParticles.push({
        mesh: mesh,
        vx: Math.cos(angle) * speed,
        vy: 0.12 + Math.random() * 0.14,
        vz: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.015
      });
    }
  }

  /**
   * 荷葉受碰撞/踩踏之歪斜晃動動畫 (Wobble Animation)
   */
  wobblePad(pad, isWrong = false) {
    gsap.killTweensOf(pad.position);
    gsap.killTweensOf(pad.rotation);

    if (isWrong) {
      // 答錯：逗趣下沉晃動再彈回原位
      gsap.to(pad.position, {
        y: -0.4,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut"
      });
      gsap.to(pad.rotation, {
        z: 0.22,
        duration: 0.12,
        yoyo: true,
        repeat: 3,
        ease: "sine.inOut",
        onComplete: () => {
          pad.rotation.z = 0;
        }
      });
    } else {
      // 答對：下沉受力彈跳
      gsap.to(pad.position, {
        y: -0.25,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: "power1.out"
      });
    }
  }

  /**
   * 每幀動畫更新：水面波動、荷葉微幅起伏、粒子生命週期
   */
  update(deltaTime) {
    this.time += deltaTime;

    // 1. 荷葉隨波起伏 (Gentle Bobbing Sine Waves)
    this.lanes.forEach(lane => {
      lane.pads.forEach(pad => {
        const bob = Math.sin(this.time * 2.2 + pad.userData.bobOffset) * 0.065;
        pad.position.y = pad.userData.baseY + bob;
        // 看板微仰向鏡頭
        if (pad.userData.cardStand) {
          pad.userData.cardStand.rotation.y = Math.sin(this.time * 1.5 + pad.userData.bobOffset) * 0.05;
        }
      });
    });

    // 2. 水波漣漪擴散與消逝
    for (let i = this.waterRipples.length - 1; i >= 0; i--) {
      const r = this.waterRipples[i];
      r.radius += r.speed;
      r.opacity -= 0.024;
      r.mesh.scale.set(r.radius, r.radius, 1);
      r.mesh.material.opacity = Math.max(0, r.opacity);

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.waterRipples.splice(i, 1);
      }
    }

    // 3. 答對星光噴發粒子運動
    for (let i = this.celebrationParticles.length - 1; i >= 0; i--) {
      const p = this.celebrationParticles[i];
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;
      p.vy -= 0.006; // 重力
      p.life -= p.decay;
      p.mesh.scale.setScalar(Math.max(0, p.life));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.celebrationParticles.splice(i, 1);
      }
    }
  }

  /**
   * 清除全部河道
   */
  clearAll() {
    this.lanes.forEach(lane => {
      this.scene.remove(lane.group);
    });
    this.lanes = [];
    this.activeLilyPads = [];

    this.waterRipples.forEach(r => this.scene.remove(r.mesh));
    this.waterRipples = [];

    this.celebrationParticles.forEach(p => this.scene.remove(p.mesh));
    this.celebrationParticles = [];

    if (this.startDock) {
      this.scene.remove(this.startDock);
      this.startDock = null;
    }
    if (this.finishIsland) {
      this.scene.remove(this.finishIsland);
      this.finishIsland = null;
    }
  }
}

window.RiverWorld = RiverWorld;
