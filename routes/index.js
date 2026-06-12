const express = require('express');
const router = express.Router();

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

module.exports = router;