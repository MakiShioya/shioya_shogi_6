// script/skills/BluePrint.js

const BluePrint = {
  name: "ブループリント",
  
  // ★設定
  endsTurn: false, // 手番は終わらない（手番消費なし）
  maxUses: 1,      // 1局に1回

  // ★デザイン（設計図のような青）
  buttonStyle: {
    backgroundColor: "#0000CD", // ミディアムブルー
    color: "#FFFFFF",
    border: "2px solid #191970", // ミッドナイトブルー
    fontWeight: "bold",
    width: "200px",  // 少し名前が長いので広めに
    height: "100px",
    fontSize: "20px",           // 文字の大きさ
    fontWeight: "bold"          // 文字の太さ
  },


  // 発動条件
  canUse: function() {
    if (skillUseCount >= this.maxUses) return false;

    // 1. 履歴条件のチェック（10手目以内の振り飛車）
    if (!this.checkHistoryCondition()) return false;
    
    // 2. ターゲット（成れる飛車・角）があるか
    const targets = this.getValidTargets();
    return targets.length > 0;
  },

  // 履歴チェック機能
  checkHistoryCondition: function() {
    // 棋譜データ(kifu)がない、または空ならNG
    if (typeof kifu === 'undefined' || kifu.length === 0) return false;

    // 検索範囲：初手から最大10手目まで
    const limit = Math.min(kifu.length, 10);
    
    // 探す動きのリスト（文字列部分一致）
    let targetMoves = [];
    if (turn === "black") {
      // 先手：5～9筋への移動
      targetMoves = ["▲９八飛", "▲８八飛", "▲７八飛", "▲６八飛", "▲５八飛"];
    } else {
      // 後手：1～5筋への移動
      targetMoves = ["△１二飛", "△２二飛", "△３二飛", "△４二飛", "△５二飛"];
    }

    // 過去の棋譜を走査
    for (let i = 0; i < limit; i++) {
      const line = kifu[i];
      // もし棋譜の行の中に、ターゲットの動きが含まれていればOK
      if (targetMoves.some(m => line.includes(m))) {
        return true;
      }
    }
    return false;
  },

  // ターゲット取得（自分の飛車・角で、まだ成っていないもの）
  getValidTargets: function() {
    const targets = [];
    
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = boardState[y][x];
        if (!piece) continue;

        // 自分の駒か
        const isWhite = (piece === piece.toLowerCase());
        if (turn === "black" && isWhite) continue;
        if (turn === "white" && !isWhite) continue;

        const base = piece.replace("+", "").toUpperCase();
        
        // すでに成っている駒は除外
        if (piece.includes("+")) continue;

        // 飛車(R) または 角(B) のみが対象
        if (base === "R" || base === "B") {
          targets.push({ x: x, y: y });
        }
      }
    }
    return targets;
  },

  // 実行処理
  execute: function(x, y) {
    const piece = boardState[y][x];
    const baseUpper = piece.toUpperCase();

    // 1. 成る（"+"をつける）
    let promoted = "+" + baseUpper;
    if (turn === "white") promoted = promoted.toLowerCase();
    
    boardState[y][x] = promoted;

    // 2. 緑色にする（指示通り）
    pieceStyles[y][x] = "green";

    // 3. 演出（画像: BluePrint.png / 音: BluePrint.mp3 / 光: blue）
    if (typeof playSkillEffect === "function") {
       playSkillEffect("BluePrint.PNG", "BluePrint.mp3", "blue");
    }

    // 4. 棋譜
    const files = ["９","８","７","６","５","４","３","２","１"];
    const ranks = ["一","二","三","四","五","六","七","八","九"];
    const mark = (turn === "black") ? "▲" : "△";
    
    // スキル使用ログ
    return `${kifu.length + 1}手目：${mark}${files[x]}${ranks[y]}${pieceName[baseUpper]}成(計画)`;
  }

};
