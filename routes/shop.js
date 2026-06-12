const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 1. 추천 상품 목록 조회
router.get('/products', (req, res) => {
    db.all('SELECT * FROM products WHERE is_featured = 1', [], (err, rows) => {
        if (err) return res.status(500).send('추천 상품 로드 실패');
        res.render('shop_list', {
            products: rows || [],
            user: req.session.user || null,
            cartCount: req.session.cartItems ? req.session.cartItems.length : 0
        });
    });
});

// 2. 전체 상품 목록 조회
router.get('/products/all', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).send('전체 상품 로드 실패');
        res.render('shop_list_all', {
            products: rows || [],
            user: req.session.user || null,
            cartCount: req.session.cartItems ? req.session.cartItems.length : 0
        });
    });
});

// 3. 장바구니 담기 처리
router.post('/cart/add', (req, res) => {
    const { productId } = req.body;
    if (!req.session.cartItems) req.session.cartItems = [];

    db.get('SELECT name, price, emoji FROM products WHERE id = ?', [productId], (err, product) => {
        if (product) {
            req.session.cartItems.push({
                id: productId,
                name: product.name,
                price: product.price,
                emoji: product.emoji
            });
        }
        res.redirect('back');
    });
});

// 4. 장바구니 페이지 이동 (모던 디자인 HTML 내장형)
router.get('/cart', (req, res) => {
    const cartItems = req.session.cartItems || [];
    const cartCount = cartItems.length;
    const user = req.session.user || null;
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    let itemsHtml = '';
    if (cartCount > 0) {
        itemsHtml = '<div style="text-align: left; background: #f9fafb; padding: 20px; border-radius: 14px; margin: 20px 0; border: 1px solid #f3f4f6;">';
        cartItems.forEach(item => {
            itemsHtml += `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #e5e7eb; font-size: 0.98em;">
                    <span style="color: #1f2937;">${item.emoji} <strong style="font-weight: 600;">${item.name}</strong></span>
                    <span style="color: #4b5563; font-weight: 600;">${item.price.toLocaleString()}원</span>
                </div>`;
        });
        itemsHtml += '</div>';
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>장바구니 - 프레시 마켓</title>
            <link rel="stylesheet" href="/stylesheets/style.css">
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; background-color: #f9fafb; color: #111827; }
                header { display: flex; justify-content: space-between; align-items: center; padding: 18px 40px; background-color: #ffffff; border-bottom: 1px solid #f3f4f6; }
                .header-left { display: flex; align-items: center; gap: 35px; }
                .header-left h1 { margin: 0; font-size: 1.4em; font-weight: 800; color: #10b981; }
                nav { display: flex; gap: 24px; }
                nav a { text-decoration: none; color: #4b5563; font-weight: 500; font-size: 0.95em; }
                .auth-zone { font-size: 0.9em; display: flex; align-items: center; gap: 12px; }
                .auth-zone a { color: #4b5563; text-decoration: none; font-weight: 500; }
                .user-tag { font-weight: 600; color: #047857; background-color: #ecfdf5; padding: 4px 10px; border-radius: 20px; }
                .cart-container { max-width: 520px; margin: 60px auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                .btn-checkout { width: 100%; display: block; box-sizing: border-box; text-align: center; padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 1.05em; cursor: pointer; margin-top: 20px; }
                .btn-checkout:hover { background-color: #059669; }
                .link-back { display: inline-block; color: #6b7280; text-decoration: none; font-size: 0.9em; margin-top: 20px; }
            </style>
        </head>
        <body>
        <header>
            <div class="header-left">
                <h1>🌱 프레시 마켓</h1>
                <nav><a href="/">홈</a><a href="/shop/products">추천상품</a><a href="/shop/products/all">전체상품</a><a href="/shop/cart" style="color: #10b981; font-weight: 700;">장바구니 (${cartCount})</a><a href="/post/list">고객센터</a></nav>
            </div>
            <div class="auth-zone">
                ${user ? `<span class="user-tag">👤 ${user.id}님</span> | <a href="/mypage">마이페이지</a> | <a href="/logout" style="color: #ef4444;">로그아웃</a>` : `<a href="/login">로그인</a> | <a href="/register">회원가입</a>`}
            </div>
        </header>
        <main>
            <div class="cart-container">
                <h2>🛒 장바구니 내역</h2>
                ${cartCount > 0 ? `
                    ${itemsHtml}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #111827;">
                        <span style="font-size: 1.1em; font-weight: 700; color: #4b5563;">최종 합계 금액</span>
                        <span style="font-size: 1.7em; font-weight: 800; color: #111827;">${totalPrice.toLocaleString()}원</span>
                    </div>
                    <form action="/shop/checkout" method="POST">
                        <button type="submit" class="btn-checkout">💳 안전하게 결제하기</button>
                    </form>
                ` : `<p style="color: #9ca3af; margin: 40px 0;">장바구니가 비어 있습니다.</p>`}
                <a href="/shop/products/all" class="link-back">쇼핑 계속하기</a>
            </div>
        </main>
        </body>
        </html>
    `);
});

// 5. 결제 및 orders 테이블에 주문 실시간 저장
router.post('/checkout', (req, res) => {
    const cartItems = req.session.cartItems || [];
    const cartCount = cartItems.length;
    const user = req.session.user || null;
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    if (cartCount === 0) {
        return res.send('<script>alert("장바구니가 비어있습니다."); location.href="/shop/products/all";</script>');
    }

    const orderNumber = 'FRUIT-' + Math.floor(100000 + Math.random() * 900000);
    const username = user ? user.id : '비회원 고객';

    // 🚨 관리자가 대시보드에서 가로챌 수 있게 DB에 주문 저장!
    db.run('INSERT INTO orders (order_number, username, total_price, status) VALUES (?, ?, ?, "배송준비중")',
        [orderNumber, username, totalPrice], (err) => {
            if (err) console.error("주문 DB 저장 실패:", err);

            req.session.cartItems = []; // 장바구니 비우기

            res.send(`
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <title>주문 완료 - 프레시 마켓</title>
                    <link rel="stylesheet" href="/stylesheets/style.css">
                    <style>
                        body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; background-color: #f9fafb; color: #111827; }
                        header { display: flex; justify-content: space-between; align-items: center; padding: 18px 40px; background-color: #ffffff; border-bottom: 1px solid #f3f4f6; }
                        .header-left h1 { margin: 0; font-size: 1.4em; font-weight: 800; color: #10b981; }
                        .receipt-container { max-width: 460px; margin: 60px auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 24px; background-color: #ffffff; text-align: center; }
                        .receipt-title { font-size: 1.6em; font-weight: 800; color: #10b981; margin-bottom: 5px; }
                        .receipt-line { border-top: 1px dashed #e5e7eb; margin: 20px 0; }
                        .receipt-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 0.95em; }
                        .btn-home { display: block; text-align: center; width: 100%; box-sizing: border-box; padding: 14px; background-color: #111827; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 30px; }
                    </style>
                </head>
                <body>
                <header><div class="header-left"><h1>🌱 프레시 마켓</h1></div></header>
                <main>
                    <div class="receipt-container">
                        <div class="receipt-title">🎉 결제 완료</div>
                        <p style="color: #6b7280; font-size: 0.95em;">안전하게 주문이 접수되었습니다.</p>
                        <div class="receipt-row"><strong>주문 번호</strong> <span>${orderNumber}</span></div>
                        <div class="receipt-row"><strong>구매자명</strong> <span>${username}</span></div>
                        <div class="receipt-line"></div>
                        <div class="receipt-row" style="font-size: 1.25em; font-weight: 800; color: #111827;">
                            <span style="color: #10b981;">최종 결제 금액</span>
                            <span>${totalPrice.toLocaleString()}원</span>
                        </div>
                        <a href="/" class="btn-home">메인으로 이동하기</a>
                    </div>
                </main>
                </body>
                </html>
            `);
        });
});

module.exports = router;