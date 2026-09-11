/**
 * ALICE ESL Phonics P1 - 3D 卡通模型與幾何生成庫 (models.js)
 * 提供程序化低多邊形萌寵角色（青蛙、小鴨、小兔）、3D 荷葉閃卡載台與水流森林造景
 */

class ModelFactory {
  /**
   * 建立萌蛙角色 (Froggy)
   */
  static createFrog() {
    const frogGroup = new THREE.Group();
    frogGroup.name = "character_frog";

    // 身體主材質 (翠綠色與嫩黃肚皮)
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
    const bellyMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });
    const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const eyeBlackMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const cheekMat = new THREE.MeshLambertMaterial({ color: 0xf472b6, transparent: true, opacity: 0.75 });

    // 1. 圓潤身體
    const bodyGeo = new THREE.SphereGeometry(0.72, 16, 14);
    bodyGeo.scale(1.15, 0.9, 1.0);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    frogGroup.add(body);

    // 2. 淺黃色肚皮
    const bellyGeo = new THREE.SphereGeometry(0.55, 14, 12);
    bellyGeo.scale(1.0, 0.8, 0.45);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.58, 0.45);
    belly.rotation.x = 0.15;
    frogGroup.add(belly);

    // 3. 雙眼（大大的萌萌眼睛）
    const eyeSocketGeo = new THREE.SphereGeometry(0.3, 14, 12);
    const eyeBallGeo = new THREE.SphereGeometry(0.24, 14, 12);
    const pupilGeo = new THREE.SphereGeometry(0.12, 12, 10);
    const sparkleGeo = new THREE.SphereGeometry(0.045, 8, 8);

    [-0.42, 0.42].forEach(x => {
      // 眼眶
      const socket = new THREE.Mesh(eyeSocketGeo, bodyMat);
      socket.position.set(x, 1.22, 0.22);
      frogGroup.add(socket);

      // 眼白
      const eyeWhite = new THREE.Mesh(eyeBallGeo, eyeWhiteMat);
      eyeWhite.position.set(x, 1.25, 0.32);
      frogGroup.add(eyeWhite);

      // 瞳孔
      const pupil = new THREE.Mesh(pupilGeo, eyeBlackMat);
      pupil.position.set(x * 0.95, 1.26, 0.48);
      frogGroup.add(pupil);

      // 眼神光 (Sparkle)
      const sparkle = new THREE.Mesh(sparkleGeo, eyeWhiteMat);
      sparkle.position.set(x * 0.95 + 0.04, 1.30, 0.56);
      frogGroup.add(sparkle);

      // 害羞粉嫩腮紅
      const cheekGeo = new THREE.CircleGeometry(0.14, 12);
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(x * 1.15, 0.72, 0.78);
      cheek.rotation.y = x > 0 ? 0.3 : -0.3;
      frogGroup.add(cheek);
    });

    // 4. 後腿與蹼足 (蹲姿與起跳彈性)
    const legGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.65, 8);
    legGeo.rotateZ(Math.PI / 3);
    const footGeo = new THREE.BoxGeometry(0.35, 0.1, 0.5);

    [-0.62, 0.62].forEach((x, i) => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(x, 0.36, -0.05);
      leg.rotation.z = i === 0 ? 0.4 : -0.4;
      leg.rotation.y = i === 0 ? -0.3 : 0.3;
      frogGroup.add(leg);

      const foot = new THREE.Mesh(footGeo, bodyMat);
      foot.position.set(x * 1.1, 0.06, 0.3);
      frogGroup.add(foot);
    });

    // 5. 前手
    const armGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8);
    [-0.38, 0.38].forEach(x => {
      const arm = new THREE.Mesh(armGeo, bodyMat);
      arm.position.set(x, 0.38, 0.52);
      arm.rotation.x = -0.35;
      frogGroup.add(arm);
    });

    frogGroup.scale.set(1.1, 1.1, 1.1);
    return frogGroup;
  }

  /**
   * 建立小鴨角色 (Ducky)
   */
  static createDuck() {
    const duckGroup = new THREE.Group();
    duckGroup.name = "character_duck";

    const featherMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
    const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const eyeBlackMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

    // 1. 身體
    const bodyGeo = new THREE.SphereGeometry(0.68, 14, 12);
    bodyGeo.scale(1.0, 0.9, 1.25);
    const body = new THREE.Mesh(bodyGeo, featherMat);
    body.position.y = 0.65;
    duckGroup.add(body);

    // 2. 圓圓小頭
    const headGeo = new THREE.SphereGeometry(0.52, 14, 12);
    const head = new THREE.Mesh(headGeo, featherMat);
    head.position.set(0, 1.25, 0.35);
    duckGroup.add(head);

    // 3. 橘色扁鴨嘴
    const beakGeo = new THREE.BoxGeometry(0.42, 0.14, 0.4);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 1.18, 0.82);
    duckGroup.add(beak);

    // 4. 眼睛
    [-0.24, 0.24].forEach(x => {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeWhiteMat);
      eyeW.position.set(x, 1.35, 0.72);
      duckGroup.add(eyeW);

      const eyeP = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeBlackMat);
      eyeP.position.set(x, 1.35, 0.82);
      duckGroup.add(eyeP);
    });

    // 5. 翅膀 (兩側小翅膀)
    const wingGeo = new THREE.BoxGeometry(0.12, 0.45, 0.7);
    [-0.65, 0.65].forEach(x => {
      const wing = new THREE.Mesh(wingGeo, featherMat);
      wing.position.set(x, 0.75, 0.1);
      wing.rotation.z = x > 0 ? -0.2 : 0.2;
      duckGroup.add(wing);
    });

    // 6. 橘色蹼足
    const footGeo = new THREE.BoxGeometry(0.3, 0.08, 0.45);
    [-0.28, 0.28].forEach(x => {
      const foot = new THREE.Mesh(footGeo, beakMat);
      foot.position.set(x, 0.05, 0.1);
      duckGroup.add(foot);
    });

    duckGroup.scale.set(1.1, 1.1, 1.1);
    return duckGroup;
  }

  /**
   * 建立小雪兔角色 (Bunny)
   */
  static createBunny() {
    const bunnyGroup = new THREE.Group();
    bunnyGroup.name = "character_bunny";

    const furMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const earPinkMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
    const eyeBlackMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const noseMat = new THREE.MeshLambertMaterial({ color: 0xf43f5e });

    // 1. 身體
    const bodyGeo = new THREE.SphereGeometry(0.68, 14, 12);
    bodyGeo.scale(1.0, 1.1, 0.95);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.y = 0.65;
    bunnyGroup.add(body);

    // 2. 圓圓頭部
    const headGeo = new THREE.SphereGeometry(0.5, 14, 12);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 1.35, 0.15);
    bunnyGroup.add(head);

    // 3. 招風長耳朵
    const earGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 10);
    earGeo.scale(0.8, 1.0, 0.4);
    const earInnerGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.75, 10);
    earInnerGeo.scale(0.8, 1.0, 0.35);

    [-0.22, 0.22].forEach(x => {
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(x, 2.05, 0.1);
      ear.rotation.z = x > 0 ? -0.15 : 0.15;
      ear.rotation.x = -0.1;
      bunnyGroup.add(ear);

      const earInner = new THREE.Mesh(earInnerGeo, earPinkMat);
      earInner.position.set(x, 2.02, 0.15);
      earInner.rotation.z = x > 0 ? -0.15 : 0.15;
      earInner.rotation.x = -0.1;
      bunnyGroup.add(earInner);
    });

    // 4. 眼睛與小紅鼻
    [-0.18, 0.18].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeBlackMat);
      eye.position.set(x, 1.42, 0.55);
      bunnyGroup.add(eye);
    });

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), noseMat);
    nose.position.set(0, 1.32, 0.62);
    bunnyGroup.add(nose);

    // 5. 圓球小尾巴
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), furMat);
    tail.position.set(0, 0.42, -0.65);
    bunnyGroup.add(tail);

    bunnyGroup.scale.set(1.05, 1.05, 1.05);
    return bunnyGroup;
  }

  /**
   * 圓角矩形相容繪製輔助函式
   */
  static drawRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
  }

  /**
   * 建立動態單字閃卡材質 (Offscreen Canvas -> Three.Texture)
   * 繪製高清晰度圖卡圖片 + 超大高對比描邊單字 + 字母角標
   */
  /**
   * 建立純文字單字標籤畫布 (僅繪製純向量與文字，保證 100% 不受 CORS 污染，任何環境皆可上傳 WebGL)
   */
  // 快取已解碼的圖片物件，避免重複非同步建立
  static imageElementCache = {};

  /**
   * 建立一體成形動態單字閃卡材質 (上方真實教材插圖 + 下方清晰文字單字條)
   * 採用 512x640 高清離線 Canvas 合成，100% 避免 3D Mesh 互相穿透遮蔽，保證呈現上方插圖、下方文字
   */
  static createFlashcardTexture(vocabItem, showText = true) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    // 重新繪製整張閃卡
    const renderCard = (loadedImg = null) => {
      ctx.clearRect(0, 0, 512, 640);

      // 1. 白色卡牌圓角外框與立體邊框
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      this.drawRoundedRect(ctx, 4, 4, 504, 632, 28);
      ctx.fill();

      // 卡牌精緻雙色外框
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#38bdf8";
      ctx.stroke();

      // 2. 上方插圖區塊 (480 x 480，四周留白 16px)
      if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
        ctx.drawImage(loadedImg, 16, 16, 480, 480);
      } else {
        // 預設佔位圓形與首字母圖案
        ctx.fillStyle = "#f0f9ff";
        ctx.beginPath();
        this.drawRoundedRect(ctx, 24, 24, 464, 464, 20);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#bae6fd";
        ctx.stroke();

        ctx.fillStyle = "#0284c7";
        ctx.font = "bold 160px 'Fredoka', 'Quicksand', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const initial = vocabItem.letter ? vocabItem.letter.charAt(0) : vocabItem.word.charAt(0).toUpperCase();
        ctx.fillText(initial, 256, 256);
      }

      // 3. 下方文字區塊 (512 ~ 624)
      if (showText) {
        // 深海藍色底座膠囊
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        this.drawRoundedRect(ctx, 16, 508, 480, 114, 22);
        ctx.fill();

        ctx.lineWidth = 4;
        ctx.strokeStyle = "#38bdf8";
        ctx.stroke();

        // 左側自然發音字母小徽章
        if (vocabItem.letter) {
          ctx.fillStyle = "#f0fdf4";
          ctx.beginPath();
          this.drawRoundedRect(ctx, 24, 516, 115, 98, 16);
          ctx.fill();

          ctx.lineWidth = 3;
          ctx.strokeStyle = "#22c55e";
          ctx.stroke();

          ctx.fillStyle = "#15803d";
          ctx.font = "bold 44px 'Fredoka', 'Quicksand', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${vocabItem.letter}`, 81, 566);
        }

        // 右側單字大字 (特大白色文字 + 深藍描邊)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 64px 'Fredoka', 'Quicksand', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#0369a1";
        const textX = vocabItem.letter ? 310 : 256;
        ctx.strokeText(vocabItem.word, textX, 566);
        ctx.fillText(vocabItem.word, textX, 566);
      } else {
        // 隱藏單字模式：顯示優雅的聽力圖示引導條
        ctx.fillStyle = "#f1f5f9";
        ctx.beginPath();
        this.drawRoundedRect(ctx, 16, 508, 480, 114, 22);
        ctx.fill();

        ctx.fillStyle = "#64748b";
        ctx.font = "bold 36px 'Fredoka', 'Quicksand', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🎧 Listen & Choose", 256, 566);
      }

      tex.needsUpdate = true;
    };

    // 取得圖片來源 (Base64 或本機路徑)
    let imageSrc = vocabItem.image;
    if (false && typeof P1_FLASHCARD_IMAGES !== "undefined") {
      imageSrc = P1_FLASHCARD_IMAGES[vocabItem.id];
    }

    if (imageSrc) {
      if (this.imageElementCache[vocabItem.id]) {
        // 快取已存在
        const cached = this.imageElementCache[vocabItem.id];
        if (cached.complete) {
          renderCard(cached);
        } else {
          renderCard(null);
          cached.addEventListener("load", () => renderCard(cached));
        }
      } else {
        renderCard(null);
        const img = new Image();
        img.src = imageSrc;
        this.imageElementCache[vocabItem.id] = img;
        img.onload = () => {
          renderCard(img);
        };
        img.onerror = () => {
          console.warn(`教材圖片載入失敗，保留向量圖卡: ${vocabItem.word}`);
        };
      }
    } else {
      renderCard(null);
    }

    return tex;
  }

  /**
   * 建立 3D 浮水荷葉載台 (Lily Pad Raft with Flashcard Stand)
   */
  static createLilyPad(vocabItem, showText = true) {
    const padGroup = new THREE.Group();
    padGroup.name = `lilypad_${vocabItem.id}`;
    padGroup.userData = { vocabItem: vocabItem };

    // 1. 綠色荷葉葉盤 (帶有自然弧度的葉盤)
    const leafGeo = new THREE.CylinderGeometry(1.65, 1.75, 0.18, 32);
    leafGeo.scale(1.0, 1.0, 0.95);
    const leafMat = new THREE.MeshLambertMaterial({
      color: 0x16a34a
    });
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.y = 0.08;
    leafMesh.receiveShadow = true;
    padGroup.add(leafMesh);

    // 2. 荷葉放射狀葉脈裝飾
    const veinMat = new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 2 });
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const points = [
        new THREE.Vector3(0, 0.18, 0),
        new THREE.Vector3(Math.cos(angle) * 1.5, 0.18, Math.sin(angle) * 1.4)
      ];
      const veinGeo = new THREE.BufferGeometry().setFromPoints(points);
      const vein = new THREE.Line(veinGeo, veinMat);
      padGroup.add(vein);
    }

    // 3. 粉紅睡蓮花朵 (Lotus Blossom on side)
    const lotusGroup = new THREE.Group();
    lotusGroup.position.set(1.15, 0.18, 0.85);

    const petalMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
    const petalCenterMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
      petalGeo.rotateX(Math.PI / 3);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16);
      petal.rotation.y = a;
      lotusGroup.add(petal);
    }
    const lotusCenter = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), petalCenterMat);
    lotusCenter.position.y = 0.1;
    lotusGroup.add(lotusCenter);
    padGroup.add(lotusGroup);

    // 4. 水下光環 (Landing Guide Ring)
    const ringGeo = new THREE.RingGeometry(1.5, 1.85, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    const guideRing = new THREE.Mesh(ringGeo, ringMat);
    guideRing.rotation.x = -Math.PI / 2;
    guideRing.position.y = 0.02;
    padGroup.add(guideRing);
    padGroup.userData.guideRing = guideRing;

    // 5. 3D 懸浮閃卡看板組 (上方圖片、下方文字一體成形，絕無穿透遮蔽，無木棍擋視線)
    const cardStandGroup = new THREE.Group();
    cardStandGroup.position.set(0, 1.85, -0.05);

    const cardW = 2.2;
    const cardH = 2.75;

    // (A) 正面卡牌 (包含上方圖片與下方文字)
    const cardTex = this.createFlashcardTexture(vocabItem, showText);
    const cardMat = new THREE.MeshBasicMaterial({
      map: cardTex,
      side: THREE.FrontSide
    });
    const cardGeo = new THREE.PlaneGeometry(cardW, cardH);
    // 旋轉幾何體以正面朝向攝影機，並給予仰角迎接上方攝影機俯視
    cardGeo.rotateY(Math.PI);
    cardGeo.rotateX(0.18);
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.position.set(0, 0, 0);
    cardStandGroup.add(cardMesh);

    // (B) 背面純白防透背板 (位於後方 +Z 方向，較遠離攝影機)
    const backGeo = new THREE.PlaneGeometry(cardW, cardH);
    backGeo.rotateX(-0.18);
    const backMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, side: THREE.FrontSide });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.set(0, 0, 0.04);
    cardMesh.renderOrder = 2;
    backMesh.renderOrder = 1;
    cardStandGroup.add(backMesh);

    // (C) 低矮晶石基座 (貼合荷葉表面，高度僅 0.12，絕不阻擋後方視線)
    const baseGeo = new THREE.CylinderGeometry(0.38, 0.45, 0.12, 16);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const pedestal = new THREE.Mesh(baseGeo, baseMat);
    pedestal.position.set(0, -1.82, 0);
    cardStandGroup.add(pedestal);

    padGroup.add(cardStandGroup);
    padGroup.userData.cardStand = cardStandGroup;

    return padGroup;
  }

  /**
   * 建立岸邊低多邊形樹木 (Low-Poly Pine Tree)
   */
  static createTree(type = "pine") {
    const treeGroup = new THREE.Group();

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const foliageMat1 = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const foliageMat2 = new THREE.MeshLambertMaterial({ color: 0x22c55e });

    // 樹幹
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.6, 8), trunkMat);
    trunk.position.y = 0.8;
    treeGroup.add(trunk);

    if (type === "pine") {
      // 雙層松樹圓錐
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.8, 7), foliageMat1);
      c1.position.y = 2.1;
      treeGroup.add(c1);

      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.5, 7), foliageMat2);
      c2.position.y = 2.9;
      treeGroup.add(c2);
    } else {
      // 蓬鬆圓葉樹
      const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), foliageMat2);
      f1.position.y = 2.4;
      treeGroup.add(f1);
    }

    return treeGroup;
  }
}

window.ModelFactory = ModelFactory;
