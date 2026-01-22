// script/skills/PassionateSupport.js

const PassionateSupport = {
  name: "熱烈な応援",
  
  // ★設定
  endsTurn: false, // 技を使っても手番が終わらない
  maxUses: 2,      // 1局に2回まで使える

  // ★デザイン（熱血なので赤！）
  buttonStyle: {
    backgroundColor: "#FF4500", // オレンジレッド
    color: "#FFFFFF",
    border: "2px solid #8B0000",
    width: "200px",             // 横幅 (デフォルトは200pxくらい)
    height: "100px",             // 高さ
    fontSize: "20px",           // 文字の大きさ
    fontWeight: "bold"          // 文字の太さ
  },

  // 発動条件
  canUse: function() {
    // 1. 使用回数が上限(2回)に達していたらNG
    // ※ skillUsed フラグではなく、skillUseCount で判定します
    if (skillUseCount >= this.maxUses) return false;
    
    // 2. ターゲット（成れる駒）が盤上になければNG
    const targets = this.getValidTargets();
    return targets.length > 0;
  },

  // ターゲット取得（自分の駒で、成れるものだけ）
  getValidTargets: function() {
    const targets = [];
    
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = boardState[y][x];
        if (!piece) continue;

        // 自分の駒かチェック
        const isWhite = (piece === piece.toLowerCase());
        if (turn === "black" && isWhite) continue;
        if (turn === "white" && !isWhite) continue;

        // 種類チェック
        // 禁止: 成駒(+付き), 玉(K), 金(G), 飛(R), 角(B), 歩(P)
        // 許可: 香(L), 桂(N), 銀(S)
        const base = piece.replace("+", "").toUpperCase();
        
        if (piece.includes("+")) continue; // すでに成っている
        if (["K", "G", "R", "B", "P"].includes(base)) continue; // 禁止リスト

        targets.push({ x: x, y: y });
      }
    }
    return targets;
  },

  // 実行処理
  execute: function(x, y) {
    const piece = boardState[y][x];
    
    // 1. その場で成る
    // promote関数は rules.js にある前提ですが、簡易的に処理を書きます
    // 大文字にして "+" をつけて、元の色(小文字かどうか)に戻す
    const baseUpper = piece.toUpperCase();
    let promoted = "+" + baseUpper; 
    
    if (piece === piece.toLowerCase()) {
      promoted = promoted.toLowerCase(); // 後手なら小文字に戻す
    }
    boardState[y][x] = promoted;

    // 2. 緑色にする
    pieceStyles[y][x] = "green";

    // 3. 演出（もしあれば）
    if (typeof playSkillEffect === "function") {
      // 画像や音があれば指定してください。なければ空文字でOK
    playSkillEffect("PassionateSupport.png", "PassionateSupport.mp3", "red"); 
    }

    // 4. 棋譜用文字列
    const files = ["９","８","７","６","５","４","３","２","１"];
    const ranks = ["一","二","三","四","五","六","七","八","九"];
    const mark = (turn === "black") ? "▲" : "△";
    
    // ★修正：moveCount ではなく (kifu.length + 1) を使います
    return `${kifu.length + 1}手目：${mark}${files[x]}${ranks[y]}${pieceName[baseUpper]}成(応援)`;
  }

}; 

