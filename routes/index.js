const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

// 데이터베이스 연결 보장
const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 1. 쇼핑몰 메인 홈 화면 라우터
router.get('/', function(req, res) {
  // 장바구니 품목 수 계산
  const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;

  // 브라우저 텍스트 오작동 방지 설정
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // views/index.ejs 화면 그리기
  return res.render('index', {
    title: '과일 판매 쇼핑몰',
    user: req.session.user || null,
    cartCount: cartCount
  });
});

// 2. 마이페이지 화면 이동 라우터
router.get('/mypage', (req, res) => {
  if (!req.session.user) {
    return res.send('<script>alert("로그인이 필요합니다."); location.href="/login";</script>');
  }
  const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;

  res.render('mypage', {
    user: req.session.user,
    cartCount: cartCount
  });
});

// 3. 🔒 비밀번호 변경 처리 라우터
router.post('/mypage/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.session.user;

  // 로그인 세션 풀림 방어 가드
  if (!user) {
    return res.send('<script>alert("로그인이 만료되었습니다."); location.href="/login";</script>');
  }

  const userId = user.id || user.username;

  // 🚨 [대조 검증] 입력한 현재 비밀번호가 실제 DB에 저장된 비밀번호와 일치하는지 조회
  db.get('SELECT password FROM users WHERE id = ?', [userId], (err, row) => {
    if (err || !row) {
      return res.send('<script>alert("사용자 정보를 조회할 수 없습니다."); history.back();</script>');
    }

    if (row.password !== currentPassword) {
      return res.send('<script>alert("현재 비밀번호가 일치하지 않습니다. 다시 확인해주세요."); history.back();</script>');
    }

    // 현재 비밀번호가 완벽히 일치함이 확인되었을 때만 새 비밀번호로 교체 단행
    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId], (updateErr) => {
      if (updateErr) {
        return res.send('<script>alert("비밀번호 변경 중 오류가 발생했습니다."); history.back();</script>');
      }

      res.send('<script>alert("비밀번호가 안전하게 변경되었습니다!"); location.href="/mypage";</script>');
    });
  });
});

module.exports = router;