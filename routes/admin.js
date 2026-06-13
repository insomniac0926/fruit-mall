const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.id === 'admin' || req.session.user.username === 'admin')) {
        return next();
    }
    // ⭕ 관리자 아닐 때 로그인 페이지로 튕기는 주소 수정 (/login -> /stud11/login)
    return res.send('<script>alert("관리자만 접근 가능합니다."); location.href="/stud11/login";</script>');
}

router.get('/', isAdmin, (req, res) => {
    const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;

    db.all('SELECT * FROM products', [], (err, products) => {
        db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, orders) => {
            db.all('SELECT * FROM users', [], (err, allRows) => {
                // 명부 조회용 핏: admin 명칭 포함된 계정 깔끔하게 제외
                const fallbackUsers = (allRows || []).filter(u => {
                    return u.id !== 'admin' && u.username !== 'admin';
                });

                res.render('admin_dashboard', {
                    products: products || [],
                    orders: orders || [],
                    users: fallbackUsers,
                    user: req.session.user,
                    cartCount: cartCount
                });
            });
        });
    });
});

router.post('/product/toggle-featured', isAdmin, (req, res) => {
    const { productId, currentFeatured } = req.body;
    const newFeatured = parseInt(currentFeatured) === 1 ? 0 : 1;

    db.run('UPDATE products SET is_featured = ? WHERE id = ?', [newFeatured, productId], (err) => {
        if (err) console.error(err);
        // ⭕ 리다이렉트 주소 수정 (/admin -> /stud11/admin)
        res.redirect('/stud11/admin');
    });
});

router.post('/order/update', isAdmin, (req, res) => {
    const { orderId, status } = req.body;
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err) => {
        // ⭕ 리다이렉트 주소 수정 (/admin -> /stud11/admin)
        res.redirect('/stud11/admin');
    });
});

// 화면에서 출력할 때 가리켰던 그 고유 id를 받아와서 DELETE 수행
router.post('/user/delete', isAdmin, (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        // ⭕ 리다이렉트 주소 수정 (/admin -> /stud11/admin)
        return res.redirect('/stud11/admin');
    }

    // 화면에 띄울 때 사용했던 고유 id 키값 대입하여 완벽하게 데이터 매칭 물리 삭제
    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) console.error("물리 삭제 실패:", err);
        // ⭕ 리다이렉트 주소 수정 (/admin -> /stud11/admin)
        res.redirect('/stud11/admin');
    });
});

module.exports = router;