// main_player.js (PvP Full Version)

// DOM要素の参照
const board = document.getElementById("board");
const blackHandDiv = document.getElementById("blackHand");
const whiteHandDiv = document.getElementById("whiteHand");
const statusDiv = document.getElementById("status");
const checkStatusDiv = document.getElementById("checkStatus");
const resignBtn = document.getElementById("resignBtn");
// skillBtnは関数内で取得するので定義不要ですが、あってもOK

// ★ PvP用：個別の必殺技管理変数
let p1Skill = null;      // 先手の技オブジェクト
let p2Skill = null;      // 後手の技オブジェクト
// ★変更：回数制限に対応するため、booleanではなく数値で管理
let p1SkillCount = 0;    // 先手の使用回数
let p2SkillCount = 0;    // 後手の使用回数

// 初期化処理
window.addEventListener("load", () => {
  cpuEnabled = false;
  bgm = document.getElementById("bgm");
  moveSound = document.getElementById("moveSound");
  promoteSound = document.getElementById("promoteSound");

  applyPlayerImage(); // 画像反映

  // ★★★ 必殺技の初期セットアップ ★★★
  const charBlackId = sessionStorage.getItem('char_black') || 'default';
  const charWhiteId = sessionStorage.getItem('char_white') || 'default';

  // --- 先手の技設定 ---
  if (charBlackId === 'default' && typeof CharItsumono !== 'undefined') {
    p1Skill = CharItsumono.skill;
  } else if (charBlackId === 'char_a' && typeof CharNekketsu !== 'undefined') {
    p1Skill = CharNekketsu.skill;
  } else if (charBlackId === 'char_b' && typeof CharReisei !== 'undefined') {
    p1Skill = CharReisei.skill;
  } 
    

  // --- 後手の技設定 ---
  if (charWhiteId === 'default' && typeof CharItsumono !== 'undefined') {
    p2Skill = CharItsumono.skill;
  } else if (charWhiteId === 'char_a' && typeof CharNekketsu !== 'undefined') {
    p2Skill = CharNekketsu.skill;
  } else if (charWhiteId === 'char_b' && typeof CharReisei !== 'undefined') {
    p2Skill = CharReisei.skill;
  }
  
  // 初回の手番に合わせてグローバル変数を同期
  syncGlobalSkillState();

  // イベントリスナー
  if (resignBtn) resignBtn.addEventListener("click", resignGame);

  // ゲーム開始
  playBGM();
  startTimer();
  render();
  if (typeof showKifu === "function") showKifu();

  const key = getPositionKey();
  positionHistory[key] = 1;
});

// ★★★ 手番ごとのスキル状態同期（重要） ★★★
// ターン交代時に、グローバルの skillUseCount などを書き換えて、
// 汎用の必殺技ファイル(PassionateSupport.jsなど)が誤動作しないようにする
function syncGlobalSkillState() {
  if (turn === "black") {
    currentSkill = p1Skill;
    skillUseCount = p1SkillCount; // グローバル変数を先手の回数で上書き
    
    // skillUsed（もう使えないかフラグ）を計算
    if (currentSkill) {
      const max = currentSkill.maxUses || 1;
      skillUsed = (skillUseCount >= max);
    } else {
      skillUsed = true;
    }
  } else {
    // 後手
    currentSkill = p2Skill;
    skillUseCount = p2SkillCount; // グローバル変数を後手の回数で上書き
    
    if (currentSkill) {
      const max = currentSkill.maxUses || 1;
      skillUsed = (skillUseCount >= max);
    } else {
      skillUsed = true;
    }
  }
  
  // ボタンの表示更新
  updateSkillButton();
}

// ボタンの表示・スタイル更新関数
function updateSkillButton() {
  const skillBtn = document.getElementById("skillBtn");
  if (!skillBtn) return;
  
  if (currentSkill) {
    skillBtn.style.display = "inline-block";
    skillBtn.textContent = currentSkill.name;

    // --- スタイルの動的適用 ---
    if (currentSkill.buttonStyle) {
      skillBtn.style.backgroundColor = currentSkill.buttonStyle.backgroundColor || "";
      skillBtn.style.color = currentSkill.buttonStyle.color || "";
      skillBtn.style.border = currentSkill.buttonStyle.border || "";

      skillBtn.style.width = currentSkill.buttonStyle.width || "";
      skillBtn.style.height = currentSkill.buttonStyle.height || "";
      skillBtn.style.fontSize = currentSkill.buttonStyle.fontSize || "";
      skillBtn.style.fontWeight = currentSkill.buttonStyle.fontWeight || "";
    } else {
      // デフォルト
      skillBtn.style.backgroundColor = "#ff4500";
      skillBtn.style.color = "white";
      skillBtn.style.border = "none";
      skillBtn.style.width = "";
      skillBtn.style.height = "";
      skillBtn.style.fontSize = "";
      skillBtn.style.fontWeight = "";
    }

    // 使用済みならグレーアウト
    skillBtn.disabled = skillUsed; 
    skillBtn.style.opacity = skillUsed ? 0.5 : 1.0;
    
    if (skillUsed) {
        skillBtn.style.backgroundColor = "#ccc";
        skillBtn.style.border = "1px solid #999";
    }

  } else {
    skillBtn.style.display = "none";
  }
}

// ★★★ 必殺技ボタンが押されたとき ★★★
function toggleSkillMode() {
  if (gameOver) return;
  if (!currentSkill) return;
  
  if (skillUsed) {
    alert("この対局では、必殺技はもう使えません。");
    return;
  }
  if (!currentSkill.canUse()) {
    alert("現在は必殺技の発動条件を満たしていません。");
    return;
  }

  isSkillTargeting = !isSkillTargeting;
  
  if (isSkillTargeting) {
    selected = null;
    legalMoves = currentSkill.getValidTargets(); // 光らせる場所を取得
    render();
    statusDiv.textContent = `必殺技【${currentSkill.name}】：発動するマスを選んでください`;
  } else {
    legalMoves = [];
    render();
    statusDiv.textContent = "必殺技をキャンセルしました";
  }
}

// 画像切り替え
function applyPlayerImage() {
  const blackHandBox = document.getElementById("blackHandBox");
  const charBlackId = sessionStorage.getItem('char_black') || 'default';
  if (blackHandBox) {
    const bgUrl = getImageUrlById(charBlackId);
    if (bgUrl) blackHandBox.style.backgroundImage = bgUrl;
  }

  const whiteHandBox = document.getElementById("whiteHandBox");
  const charWhiteId = sessionStorage.getItem('char_white') || 'default';
  if (whiteHandBox) {
    const bgUrl = getImageUrlById(charWhiteId);
    if (bgUrl) whiteHandBox.style.backgroundImage = bgUrl;
  }
}

function getImageUrlById(charId) {
  if (charId === 'char_a') return "url('script/image/char_a.png')";
  if (charId === 'char_b') return "url('script/image/char_b.png')";
  if (charId === 'default') return "url('script/image/karui_1p.PNG')";
  return null;
}

// BGM関連
function playBGM() {
  if (!bgm) return;
  bgm.volume = 0.3;
  bgm.play().catch(() => {
    document.addEventListener("click", () => {
      bgm.play().catch(e => {});
    }, { once: true });
  });
}

function stopBGM() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

// 待った機能
function undoMove() {
  if (isSkillTargeting) {
    isSkillTargeting = false;
    legalMoves = [];
    render();
    return;
  }

  if (history.length < 2 || gameOver) return;
  
  const prev = history[history.length - 2];
  history.length -= 2; 

  restoreState(prev);

  // ★注意: PvPの待った処理
  // 簡易実装として、待ったをした場合「技の使用回数」は戻りません（仕様とします）。
  // 厳密に戻すには deepCopyState に p1SkillCount 等を含める必要がありますが、
  // 複雑化を防ぐためこのままにします。

  gameOver = false;
  winner = null;
  statusDiv.textContent = "";
  checkStatusDiv.textContent = "";

  // 手番が戻ったので、その手番に合わせて同期
  syncGlobalSkillState();

  render();
  if (typeof showKifu === "function") showKifu();
  startTimer();
}

// タイマー
let timerInterval = null;
let currentSeconds = 0;

function startTimer() {
  stopTimer();
  currentSeconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    currentSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const timerBox = document.getElementById("timerBox");
  if (timerBox) timerBox.textContent = "考慮時間: " + currentSeconds + "秒";
}

// 描画
function render() {
  if (gameOver) {
    if (winner === "black") statusDiv.textContent = "先手の勝ちです！";
    else if (winner === "white") statusDiv.textContent = "後手の勝ちです！";
    else statusDiv.textContent = "千日手です。引き分け。";
    checkStatusDiv.textContent = "";
  } else {
    // 必殺技選択中でなければ通常のステータス
    if (!isSkillTargeting) {
      statusDiv.textContent =
        "現在の手番：" + (turn === "black" ? "先手" : "後手") +
        " / 手数：" + moveCount +
        (isKingInCheck(turn) ? "　王手！" : "");
    }
    checkStatusDiv.textContent = "";
  }

  board.innerHTML = "";
  for (let y = 0; y < 9; y++) {
    const tr = document.createElement("tr");
    for (let x = 0; x < 9; x++) {
      const td = document.createElement("td");
      const piece = boardState[y][x];
      if (piece) {
        const isWhite = piece === piece.toLowerCase();
        const key = piece.startsWith("+") ? "+" + piece.replace("+","").toUpperCase() : piece.toUpperCase();
        td.textContent = pieceName[key];
        if (isWhite) td.style.transform = "rotate(180deg)";
        
        // ★★★ スタイルの適用 ★★★
        if (pieceStyles[y][x] === "green") {
          td.style.color = "#32CD32";       // ライムグリーン
          td.style.fontWeight = "bold";
          td.style.textShadow = "1px 1px 0px #000";
        }
        // ★★★★★★★★★★★★★★★
        
        if (lastMoveTo && lastMoveTo.x === x && lastMoveTo.y === y) td.classList.add("moved");
      }
      if (selected && !selected.fromHand && selected.x === x && selected.y === y) td.classList.add("selected");
      if (legalMoves.some(m => m.x === x && m.y === y)) td.classList.add("move");
      
      td.onclick = () => onCellClick(x, y);
      tr.appendChild(td);
    }
    board.appendChild(tr);
  }
  renderHands();

  const blackBox = document.getElementById("blackHandBox");
  const whiteBox = document.getElementById("whiteHandBox");
  if (blackBox) blackBox.classList.remove("active");
  if (whiteBox) whiteBox.classList.remove("active");

  if (!gameOver) {
    if (turn === "black" && blackBox) blackBox.classList.add("active");
    else if (turn === "white" && whiteBox) whiteBox.classList.add("active");
  }
  
  // ボタン状態更新
  updateSkillButton();
}

// 持ち駒描画
function renderHands() {
  const order = ["P", "L", "N", "S", "G", "B", "R"];
  hands.black.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  hands.white.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  blackHandDiv.innerHTML = "";
  whiteHandDiv.innerHTML = "";

  hands.black.forEach((p, i) => {
    const span = document.createElement("span");
    span.textContent = pieceName[p];
    if (selected && selected.fromHand && selected.player === "black" && selected.index === i) span.classList.add("selected");
    span.onclick = () => selectFromHand("black", i);
    blackHandDiv.appendChild(span);
  });

  hands.white.forEach((p, i) => {
    const span = document.createElement("span");
    span.textContent = pieceName[p];
    if (selected && selected.fromHand && selected.player === "white" && selected.index === i) span.classList.add("selected");
    span.onclick = () => selectFromHand("white", i);
    whiteHandDiv.appendChild(span);
  });
}

// ★★★ 盤面クリック時の処理（修正版） ★★★
function onCellClick(x, y) {
  if (gameOver) return;

  // --- 必殺技発動モード ---
  if (isSkillTargeting) {
    if (legalMoves.some(m => m.x === x && m.y === y)) {
      history.push(deepCopyState());

      // 技実行
      const kifuStr = currentSkill.execute(x, y);
      kifu.push(""); 
      kifu[kifu.length - 1] = kifuStr;
      lastMoveTo = null;
      
      if (moveSound) {
        moveSound.currentTime = 0;
        moveSound.play().catch(() => {});
      }

      // ★ PvP用：回数カウントの更新
      if (turn === "black") p1SkillCount++;
      else p2SkillCount++;

      // ★ 手番を終了するかどうかの判定
      const endsTurn = (currentSkill.endsTurn !== false);

      isSkillTargeting = false;
      legalMoves = [];
      selected = null;

      if (endsTurn) {
        // 通常の必殺技：手番交代
        turn = (turn === "black" ? "white" : "black");
      } else {
        // 熱血（応援）：手番そのまま
        statusDiv.textContent += " (必殺技完了！続けて指してください)";
      }
      
      // ★★★ 修正箇所：手番交代の有無にかかわらず、手数を進める ★★★
      moveCount++; 
      // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

      // ★ 次の状態へ同期
      syncGlobalSkillState();

      render();
      if (typeof showKifu === "function") showKifu();
      startTimer();
    } else {
      isSkillTargeting = false;
      legalMoves = [];
      render();
    }
    return;
  }
  // ------------------------
  
  // (以下、通常の駒移動処理は変更なし)
  if (!selected) {
    const piece = boardState[y][x];
    if (!piece) return;
    const isWhite = piece === piece.toLowerCase();
    if ((turn === "black" && isWhite) || (turn === "white" && !isWhite)) return;
    selected = { x, y, fromHand: false };
    legalMoves = getLegalMoves(x, y);
    render();
    return;
  }

  const sel = selected;
  if (legalMoves.some(m => m.x === x && m.y === y)) {
    movePieceWithSelected(sel, x, y);
  }

  selected = null;
  legalMoves = [];
  render();
}

function selectFromHand(player, index) {
  if (gameOver) return;
  if (turn !== player) return;
  selected = { fromHand: true, player, index };
  legalMoves = getLegalDrops(player, hands[player][index]);
  render();
}

function movePieceWithSelected(sel, x, y) {
  history.push(deepCopyState());

  const pieceBefore = sel.fromHand
    ? hands[sel.player][sel.index]
    : boardState[sel.y][sel.x];
  const boardBefore = boardState.map(r => r.slice());
  const moveNumber = kifu.length + 1;
  kifu.push("");  

  if (moveSound) {
    moveSound.currentTime = 0;
    moveSound.volume = 0.3;
    moveSound.play().catch(() => {});
  }

  if (sel.fromHand) {
    const piece = hands[sel.player][sel.index];
    boardState[y][x] = sel.player === "black" ? piece : piece.toLowerCase();
    hands[sel.player].splice(sel.index, 1);
    
    // スタイルクリア
    pieceStyles[y][x] = null;

  } else {
    let piece = boardState[sel.y][sel.x];
    const target = boardState[y][x];
    if (target) hands[turn].push(target.replace("+","").toUpperCase());

    const isWhite = piece === piece.toLowerCase();
    const player = isWhite ? "white" : "black";
    const isPromoted = piece.includes("+");
    const base = piece.replace("+","").toUpperCase();

    if (!isPromoted && canPromote(base) &&
       (isInPromotionZone(sel.y, player) || isInPromotionZone(y, player))) {
      
      let doPromote = false;
      const mustPromote =
        (base === "P" || base === "L") && (y === (player === "black" ? 0 : 8)) ||
        (base === "N") && (y === (player === "black" ? 0 : 8) || y === (player === "black" ? 1 : 7));
      
      if (mustPromote || confirm("成りますか？")) doPromote = true;
      else sel.unpromoted = true;

      if (doPromote) {
        piece = promote(piece.toUpperCase());
        if (player === "white") piece = piece.toLowerCase();
        sel.promoted = true;
        if (promoteSound) {
          promoteSound.currentTime = 0;
          promoteSound.volume = 0.8;
          promoteSound.play().catch(() => {});
        }
        const boardTable = document.getElementById("board");
        // 念のため全色消す
        boardTable.classList.remove("flash-green", "flash-orange", "flash-silver", "flash-red");
        void boardTable.offsetWidth;
        
        if (base === "R") {
          boardTable.classList.add("flash-green");
          setTimeout(() => boardTable.classList.remove("flash-green"), 2000);
        } else if (base === "B") {
          boardTable.classList.add("flash-orange");
          setTimeout(() => boardTable.classList.remove("flash-orange"), 2000);
        }
      }
    }
    boardState[sel.y][sel.x] = "";
    boardState[y][x] = piece;

    // ★ スタイル（色）移動
    pieceStyles[y][x] = pieceStyles[sel.y][sel.x];
    pieceStyles[sel.y][sel.x] = null;
  }

  kifu[kifu.length - 1] = formatMove(sel, x, y, pieceBefore, boardBefore, moveNumber);
  lastMoveTo = { x, y };

  if (turn !== "") { 
    lastPlayerMove = {
      piece: pieceBefore.replace("+","").toUpperCase(),
      toX: x, toY: y
    };
  }

  // 手番交代
  turn = turn === "black" ? "white" : "black";
  
  // ★ PvP用：次の手番用にグローバル変数を同期
  syncGlobalSkillState();

  if (typeof showKifu === "function") showKifu();

  if (!gameOver) startTimer();
  else stopTimer();

  moveCount++;

  // --- 千日手などの判定（共通） ---
  if (moveCount >= 500) {
    gameOver = true;
    winner = null;
    statusDiv.textContent = "500手に達したため、引き分けです。";
    if (typeof showKifu === "function") showKifu();
    return;
  }
  if (isKingInCheck(turn) && !hasAnyLegalMove(turn)) {
    gameOver = true;
    winner = turn === "black" ? "white" : "black";
    if (typeof showKifu === "function") showKifu();
    return;
  }
  const key = getPositionKey();
  positionHistory[key] = (positionHistory[key] || 0) + 1;
  recordRepetition();
  if (positionHistory[key] >= 4) {
    const records = repetitionHistory[key].slice(-4);
    const allCheck = records.every(r => r.isCheck);
    const sameSide = records.every(r => r.checkingSide === records[0].checkingSide);
    gameOver = true;
    if (allCheck && sameSide && records[0].checkingSide !== null) {
      winner = records[0].checkingSide === "black" ? "white" : "black";
      statusDiv.textContent = "連続王手の千日手です。王手をかけ続けた側の負けです。";
    } else {
      winner = null;
      statusDiv.textContent = "千日手です。引き分け。";
      if (typeof showKifu === "function") showKifu();
    }
  }
}

function resignGame() {
  if (gameOver) return;
  if (!confirm("投了しますか？")) return;
  gameOver = true;
  stopTimer();
  winner = turn === "black" ? "white" : "black";
  statusDiv.textContent = "投了により、" + (winner === "black" ? "先手" : "後手") + "の勝ちです。";
  checkStatusDiv.textContent = "";
  if (typeof showKifu === "function") showKifu();
}

// ★★★ 必殺技演出実行関数（修正版） ★★★
function playSkillEffect(imageName, soundName, flashColor) {
  // 1. 画像カットイン
  const img = document.getElementById("skillCutIn");
  if (img && imageName) {
    img.src = "script/image/" + imageName;
    img.classList.remove("cut-in-active");
    void img.offsetWidth;
    img.classList.add("cut-in-active");
  }

  // 2. 効果音再生
  const audio = document.getElementById("skillSound");
  if (audio && soundName) {
    audio.src = "script/audio/" + soundName;
    audio.volume = 1.0; 
    audio.play().catch(e => console.log("音声ファイルが見つかりません: " + soundName));
  }

  // 3. 盤面発光
  const boardTable = document.getElementById("board");
  if (boardTable && flashColor) {
    // ★重要：赤色(flash-red)もリセット対象に含める
    boardTable.classList.remove("flash-green", "flash-orange", "flash-silver", "flash-red");
    void boardTable.offsetWidth; 

    if (flashColor === "silver") {
      boardTable.classList.add("flash-silver");
    } else if (flashColor === "red") {
      boardTable.classList.add("flash-red");
    } else if (flashColor === "blue") {
      boardTable.classList.add("flash-blue");
    }
  }
}
      