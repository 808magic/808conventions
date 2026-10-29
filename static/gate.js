// 預覽密碼畫面：只在 content 的 preview.enabled 為 true 時載入。
// 頁面只存密碼的 SHA-256 雜湊，不存密碼本身。這是靜態網站的「軟性」保護，
// 用來在正式上線前擋住一般訪客；需要真正的權限控管時，請改用主機的密碼功能。
(function () {
  var root = document.documentElement;
  var expected = root.getAttribute('data-preview');
  var form = document.getElementById('gate-form');
  if (!expected || !form) return;

  // SHA-256（純 JS 版本，file:// 開啟時瀏覽器沒有 crypto.subtle 也能用）
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, mw = mp(2, 32), i, j, res = '', words = [], abl = ascii.length * 8, hash = [], k = [], pc = 0, isC = {};
    for (var c = 2; pc < 64; c++) {
      if (!isC[c]) {
        for (i = 0; i < 313; i += c) isC[i] = c;
        hash[pc] = (mp(c, .5) * mw) | 0;
        k[pc++] = (mp(c, 1 / 3) * mw) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((abl / mw) | 0);
    words[words.length] = abl;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oh = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i]
          + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7]
            + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oh[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      res += ((b < 16) ? 0 : '') + b.toString(16);
    }
    return res;
  }

  function digest(password) {
    // 先轉成 UTF-8，中文密碼也能用
    return sha256(unescape(encodeURIComponent('808|' + password)));
  }

  var input = document.getElementById('gate-pw');
  var error = document.getElementById('gate-error');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (digest(input.value) === expected) {
      try { localStorage.setItem('m8-preview', expected); } catch (e) { /* 無痕模式：這次有效，下次再輸入 */ }
      root.classList.remove('m8-locked');
    } else {
      error.hidden = false;
      input.select();
    }
  });
  if (root.classList.contains('m8-locked')) input.focus();

  if (typeof module !== 'undefined') module.exports = digest;
})();
