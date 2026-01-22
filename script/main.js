// main.js (CPU vs Player Updated)

// DOM要素の参照
const board = document.getElementById("board");
const blackHandDiv = document.getElementById("blackHand");
const whiteHandDiv = document.getElementById("whiteHand");
const statusDiv = document.getElementById("status");
const checkStatusDiv = document.getElementById("checkStatus");
const resignBtn = document.getElementById("resignBtn");

// 初期化処理
window.addEventListener("load", () => {
  // グローバル変数のオーディオ要素を取得
  bgm = document.getElementById("bgm");
  moveSound = document.getElementById("moveSound");
  promoteSound = document.getElementById("promoteSound");

  applyPlayerImage();

  // イベントリスナー設定
  if (resignBtn) {
    resignBtn.addEventListener("click", resignGame);
  }

  // プレイヤーのキャラIDを取得
  const charId = sessionStorage.getItem('char_black') || 'default';
  
  // IDに基づいて必殺技をセット
  if (charId === 'default' && typeof CharItsumono !== 'undefined') {
    currentSkill = CharItsumono.skill;
  } 
  else if (charId === 'char_a' && typeof CharNekketsu !== 'undefined') {
    currentSkill = CharNekketsu.skill;
  }
  // ★★★ 追加：冷静（char_b）の読み込み ★★★
  else if (charId === 'char_b' && typeof CharReisei !== 'undefined') {
    currentSkill = CharReisei.skill;
  }
  // ★★★★★★★★★★★★★★★★★★★★★
  else {
    currentSkill = null;
  }

  updateSkillButton();

  // ゲーム開始処理
  playBGM();
  startTimer();
  
  // 初期盤面の描画と棋譜表示
  render();
  if (typeof showKifu === "function") {
    showKifu();
  }

  // 初期局面を千日手履歴に登録
  const key = getPositionKey();
  positionHistory[key] = 1;
});

// BGM再生
function playBGM() {
  if (!bgm) return;
  bgm.volume = 0.3;
  bgm.play().catch(() => {
    document.addEventListener("click", () => {
      bgm.play().catch(e => console.log(e));
    }, { once: true });
  });
}

// BGM停止
function stopBGM() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

// 画像切り替え
function applyPlayerImage() {
  const blackHandBox = document.getElementById("blackHandBox");
  if (!blackHandBox) return;

  const charId = sessionStorage.getItem('char_black') || 'default';
  let imageUrl = "";
  
  if (charId === 'default') {
    imageUrl = "url('script/image/karui_1p.PNG')";
  } else if (charId === 'char_a') {
    imageUrl = "url('script/image/char_a.png')";
  } else if (charId === 'char_b') {
    imageUrl = "url('script/image/char_b.png')";
  }

  if (imageUrl) {
    blackHandBox.style.backgroundImage = imageUrl;
  }
}

// 待った機能
function undoMove() {
  if (typeof isThinking !== 'undefined' && isThinking) return;
  if (isSkillTargeting) { // ターゲット選択中ならキャンセル
    isSkillTargeting = false;
    legalMoves = [];
    render();
    return;
  }
  if (history.length < 2 || gameOver) return;
  
  const prev = history[history.length - 2];
  history.length -= 2; 

  restoreState(prev);

  // ※CPU戦では簡易的に、待ったをしても skillUseCount は戻さない仕様とします
  // (厳密に戻すには history に skillUseCount も含める必要があります)

  gameOver = false;
  winner = null;
  statusDiv.textContent = "";
  checkStatusDiv.textContent = "";

  render();
  if (typeof showKifu === "function") {
    showKifu();
  }
  startTimer();
}

// タイマー関連
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
  if (timerBox) {
    timerBox.textContent = "考慮時間: " + currentSeconds + "秒";
  }
}

// 描画関数
function render() {
  if (gameOver) {
    if (winner === "black") {
      statusDiv.textContent = "先手の勝ちです！";
    } else if (winner === "white") {
      statusDiv.textContent = "後手の勝ちです！";
    } else {
      statusDiv.textContent = "千日手です。引き分け。";
    }
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
        // ★追加：青色の文字設定
        else if (pieceStyles[y][x] === "blue") {
          td.style.color = "#1E90FF";       // ドジャーブルー
          td.style.fontWeight = "bold";
          td.style.textShadow = "1px 1px 0px #000";
        }
        // ★★★★★★★★★★★★★★★

        if (lastMoveTo && lastMoveTo.x === x && lastMoveTo.y === y) {
          td.classList.add("moved");
        }
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
    if (turn === "black" && blackBox) {
      blackBox.classList.add("active");
    } else if (turn === "white" && whiteBox) {
      whiteBox.classList.add("active");
    }
  }
  
  // ボタン状態更新
  updateSkillButton();
}

// 持ち駒の描画
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

// 盤面クリック時の処理
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

      // 回数カウントアップ
      skillUseCount++;

      // ターン終了判定
      const endsTurn = (currentSkill.endsTurn !== false);

      if (endsTurn) {
        // 通常の必殺技：もう使えないフラグを立てて交代
        skillUsed = true; 
        turn = (turn === "black" ? "white" : "black");
      } else {
        // ターン消費なし必殺技：上限判定
        const max = currentSkill.maxUses || 1;
        if (skillUseCount >= max) {
          skillUsed = true;
        }
        statusDiv.textContent += " (必殺技完了！続けて指してください)";
      }

      // ★重要：手番が終わっても終わらなくても、手数は進める
      moveCount++;

      // モード解除
      isSkillTargeting = false;
      legalMoves = [];
      selected = null;
      
      updateSkillButton();

      render();
      if (typeof showKifu === "function") showKifu();

      // CPUの手番へ（ターンが終わった場合のみ）
      if (endsTurn && !isSimulating && cpuEnabled && turn === cpuSide && !gameOver) {
        setTimeout(() => cpuMove(), 1000);
      }
    } else {
      isSkillTargeting = false;
      legalMoves = [];
      render();
    }
    return;
  }
  // ----------------------------------------

  // CPU手番中は操作不可
  if (cpuEnabled && turn === cpuSide) {
    return;
  }

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

// 持ち駒クリック時の処理
function selectFromHand(player, index) {
  if (gameOver) return;
  if (turn !== player) return;
  selected = { fromHand: true, player, index };
  legalMoves = getLegalDrops(player, hands[player][index]);
  render();
}

// 駒を動かす
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

    if (target) {
      hands[turn].push(target.replace("+","").toUpperCase());
    }

    const isWhite = piece === piece.toLowerCase();
    const player = isWhite ? "white" : "black";
    const isPromoted = piece.includes("+");
    const base = piece.replace("+","").toUpperCase();

    if (!isPromoted && canPromote(base) &&
       (isInPromotionZone(sel.y, player) || isInPromotionZone(y, player))) {
      
      let doPromote = false;

      if (cpuEnabled && turn === cpuSide) {
        doPromote = true;
      } else {
        const mustPromote =
          (base === "P" || base === "L") && (y === (player === "black" ? 0 : 8)) ||
          (base === "N") && (y === (player === "black" ? 0 : 8) || y === (player === "black" ? 1 : 7));
        
        if (mustPromote || confirm("成りますか？")) {
          doPromote = true;
        } else {
          sel.unpromoted = true;
        }
      }

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
        // ★リセット対象に全色含める
        boardTable.classList.remove("flash-green", "flash-orange", "flash-silver", "flash-red", "flash-blue");
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

    // ★スタイルの移動
    pieceStyles[y][x] = pieceStyles[sel.y][sel.x];
    pieceStyles[sel.y][sel.x] = null;
  }

  kifu[kifu.length - 1] = formatMove(sel, x, y, pieceBefore, boardBefore, moveNumber);
  lastMoveTo = { x, y };

  if (!isSimulating && turn !== cpuSide) {
    lastPlayerMove = {
      piece: pieceBefore.replace("+","").toUpperCase(),
      toX: x,
      toY: y
    };
  }

  turn = turn === "black" ? "white" : "black";
  if (typeof showKifu === "function") showKifu();

  if (!gameOver) {
    startTimer();
  } else {
    stopTimer();
  }

  if (!isSimulating && cpuEnabled && turn === cpuSide && !gameOver) {
    setTimeout(() => cpuMove(), 1000);
  }

  moveCount++;

  // --- 終了判定など ---
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

// 必殺技ボタンが押されたとき
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
    // キャンセルした場合
    legalMoves = [];
    render();
    statusDiv.textContent = "必殺技をキャンセルしました";
  }
}

// ボタンの表示・スタイル更新関数
function updateSkillButton() {
  const skillBtn = document.getElementById("skillBtn");
  if (!skillBtn) return;
  
  if (currentSkill) {
    skillBtn.style.display = "inline-block";
    skillBtn.textContent = currentSkill.name;

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

// ★★★ 必殺技演出実行関数 ★★★
function playSkillEffect(imageName, soundName, flashColor) {
  // 1. 画像カットイン
  const img = document.getElementById("skillCutIn");
  if (img && imageName) {
    img.src = "script/image/" + imageName;
    img.classList.remove("cut-in-active");
    void img.offsetWidth; // リフロー発生
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
    // ★リセット対象に全色含める
    boardTable.classList.remove("flash-green", "flash-orange", "flash-silver", "flash-red", "flash-blue");
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