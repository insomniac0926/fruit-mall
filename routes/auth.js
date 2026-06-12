const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

// 📂 SQLite 데이터베이스 파일 연결
const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 🛠️ 테이블 강제 동기화 및 8개 과일 데이터 구조 보장
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, password TEXT NOT NULL)`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, writer TEXT, reg_date TEXT, parent_id INTEGER)`, () => {
        db.run(`ALTER TABLE posts ADD COLUMN writer TEXT`, () => {});
        db.run(`ALTER TABLE posts ADD COLUMN reg_date TEXT`, () => {});
        db.run(`ALTER TABLE posts ADD COLUMN parent_id INTEGER`, () => {});
    });

    db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price INTEGER NOT NULL, image TEXT, description TEXT)`, () => {
        db.run(`ALTER TABLE products ADD COLUMN emoji TEXT`, () => {
            db.run(`ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0`, () => {
                db.run('DELETE FROM products', () => {
                    const insertProd = db.prepare('INSERT INTO products (name, price, image, description, emoji, is_featured) VALUES (?, ?, ?, ?, ?, ?)');
                    insertProd.run('키위', 12000, 'kiwi.png', '비타민 가득 상큼한 키위', '🥝', 1);
                    insertProd.run('사과', 8000, 'apple.png', '아침에 먹으면 좋은 아삭한 사과', '🍎', 1);
                    insertProd.run('바나나', 5000, 'banana.png', '부드럽고 달콤한 바나나', '🍌', 1);
                    insertProd.run('오렌지', 15000, 'orange.png', '새콤달콤 즙이 많은 오렌지', '🍊', 1);
                    insertProd.run('포도', 9000, 'grape.png', '한 알 한 알 살아있는 달콤함', '🍇', 0);
                    insertProd.run('수박', 22000, 'watermelon.png', '여름철 최고의 시원함과 수분 충전', '🍉', 0);
                    insertProd.run('레몬', 4000, 'lemon.png', '비타민C가 풍부한 상큼함의 대명사', '🍋', 0);
                    insertProd.run('복숭아', 11000, 'peach.png', '향긋하고 즙이 풍부한 핑크빛 복숭아', '🍑', 0);
                    insertProd.finalize();
                });
            });
        });
    });
});

// 1. 🛒 로그인 화면 띄우기 (장바구니 배열의 length를 연동하여 상단 헤더에 정확히 매칭)
router.get('/login', (req, res) => {
    const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;
    res.render('login', { cartCount: cartCount, user: req.session.user || null });
});

// 2. 로그인 처리
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.send('<script>alert("아이디와 비밀번호를 모두 입력해주세요."); history.back();</script>');

    db.get('SELECT * FROM users WHERE id = ?', [username], (err, row) => {
        if (err) return res.send('<script>alert("로그인 처리 중 오류가 발생했습니다."); history.back();</script>');
        if (!row) return res.send('<script>alert("존재하지 않는 아이디입니다."); history.back();</script>');
        if (row.password !== password) return res.send('<script>alert("비밀번호가 일치하지 않습니다."); history.back();</script>');

        req.session.user = { id: row.id, password: row.password };
        return res.send('<script>alert("로그인 성공!"); location.href="/";</script>');
    });
});

// 3. 회원가입 화면 띄우기
router.get('/register', (req, res) => {
    const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;
    res.render('register', { cartCount: cartCount, user: req.session.user || null });
});

// 4. 회원가입 처리
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.send('<script>alert("아이디와 비밀번호를 모두 입력해주세요."); history.back();</script>');

    db.get('SELECT id FROM users WHERE id = ?', [username], (err, row) => {
        if (err) return res.send('<script>alert("회원검증 중 오류가 발생했습니다."); history.back();</script>');
        if (row) return res.send('<script>alert("이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요."); history.back();</script>');

        db.run('INSERT INTO users (id, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) return res.send('<script>alert("회원가입 등록 실패"); history.back();</script>');
            return res.send(`<script>alert("${username}님 회원가입이 완료되었습니다! 로그인해주세요."); location.href="/login";</script>`);
        });
    });
});

// 5. 마이페이지 화면 띄우기
router.get('/mypage', (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인이 필요합니다."); location.href="/login";</script>');
    const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;
    res.render('mypage', { user: req.session.user, cartCount: cartCount });
});

// 6. 비밀번호 변경
router.post('/mypage/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!req.session.user) return res.send('<script>alert("세션이 만료되었습니다. 다시 로그인해주세요."); location.href="/login";</script>');
    if (req.session.user.password !== currentPassword) return res.send('<script>alert("현재 비밀번호가 일치하지 않습니다. 다시 확인해주세요."); history.back();</script>');

    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.session.user.id], (err) => {
        if (err) return res.send('<script>alert("비밀번호 변경 실패"); history.back();</script>');
        req.session.user.password = newPassword;
        return res.send('<script>alert("비밀번호가 안전하게 변경되었습니다!"); location.href="/mypage";</script>');
    });
});

// 7. 🔓 로그아웃 처리 (요청대로 뒤에 붙던 사족 다 빼고 깔끔하게 단독 알림창으로 변경)
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.send('<script>alert("로그아웃 되었습니다."); location.href="/";</script>');
    });
});

module.exports = router;