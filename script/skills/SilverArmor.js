// script/skills/SilverArmor.js

const SilverArmor = {
  name: "シルバーアーマー",
  

// ★ デザイン設定
  buttonStyle: {
    backgroundColor: "#A9A9A9", // 背景色
    color: "#FFFFFF",           // 文字色
    border: "2px solid #696969",// 枠線
    
    width: "200px",             // 横幅 (デフォルトは200pxくらい)
    height: "100px",             // 高さ
    fontSize: "20px",           // 文字の大きさ
    fontWeight: "bold"          // 文字の太さ
  },



  // 発動条件チェック
  canUse: function() {
    // 1. すでに使用済みならNG
    if (skillUsed) return false;
    // 2. 30手未満ならNG
    if (moveCount < 30) return false;
    // 3. 自分の玉の周囲に空きマスがなければNG
    const targets = this.getValidTargets();
    return targets.length > 0;
  },

  // ターゲット（玉の周囲の空きマス）を取得
  getValidTargets: function() {
    const targets = [];
    const king = findKing(turn); // 現在の手番（自分）の玉を探す
    if (!king) return [];

    // 玉の周囲8方向
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = king.x + dx;
        const ny = king.y + dy;
        
        // 盤面内 かつ 空きマスならOK
        if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9) {
          if (boardState[ny][nx] === "") {
            targets.push({ x: nx, y: ny });
          }
        }
      }
    }
    return targets;
  },

  // 実行処理（マスを選んだ後に呼ばれる）
  execute: function(x, y) {
    // 1. 銀を生成（先手なら "S", 後手なら "s"）
    const piece = (turn === "black") ? "S" : "s";
    boardState[y][x] = piece;
pieceStyles[y][x] = "green";

// ★★★ 追加：演出の実行 ★★★
    // playSkillEffect(画像ファイル名, 音声ファイル名, 光る色)
    if (typeof playSkillEffect === "function") {
      playSkillEffect("SilverArmor.PNG", "SilverArmor.mp3", "silver");
    }
    // ★★★★★★★★★★★★★★★★★


    // 2. 棋譜用文字列を生成
    // 例: ▲５八銀(skill)
    const files = ["９","８","７","６","５","４","３","２","１"];
    const ranks = ["一","二","三","四","五","六","七","八","九"];
    const mark = (turn === "black") ? "▲" : "△";
    const moveStr = `${moveCount}手目：${mark}${files[x]}${ranks[y]}銀(skill)`;

    return moveStr;
  }

};


