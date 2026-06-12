const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// [안전장치] 게시판 테이블 규격 확실하게 보장
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            writer TEXT,
            reg_date TEXT,
            parent_id INTEGER
        )
    `);
});

// 1. 게시글 목록 보기 (장바구니 배열 연동 완료)
router.get('/list', (req, res) => {
    const query = `
        SELECT * FROM posts 
        ORDER BY CASE WHEN parent_id IS NULL THEN id ELSE parent_id END DESC, id ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("게시판 목록 로드 에러:", err);
            return res.status(500).send('게시글 목록 로드 실패');
        }

        // 세션 배열 기반 장바구니 카운트 적용
        const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;

        res.render('post_list', {
            posts: rows || [],
            user: req.session.user || null,
            cartCount: cartCount
        });
    });
});

// 2. 글쓰기 페이지 이동 (장바구니 배열 연동 완료)
router.get('/write', (req, res) => {
    const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;
    res.render('post_write', {
        user: req.session.user || null,
        parentId: req.query.parentId || null,
        cartCount: cartCount
    });
});

// 3. 글 저장 처리
router.post('/write', (req, res) => {
    const { title, content, parentId } = req.body;
    const writer = req.session.user ? req.session.user.id : '익명';
    const regDate = new Date().toISOString();

    const query = `INSERT INTO posts (title, content, writer, reg_date, parent_id) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [title, content, writer, regDate, parentId || null], (err) => {
        if (err) return res.status(500).send('글 저장 실패');
        res.redirect('/post/list');
    });
});

// 4. 글 상세보기 페이지 (장바구니 배열 연동 완료)
router.get('/detail/:id', (req, res) => {
    const postId = req.params.id;

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, row) => {
        if (err) return res.status(500).send('글 조회 실패');
        if (!row) return res.status(404).send('게시글을 찾을 수 없습니다.');

        const cartCount = req.session.cartItems ? req.session.cartItems.length : 0;

        res.render('post_detail', {
            post: row,
            user: req.session.user || null,
            cartCount: cartCount
        });
    });
});

// 5. 글 삭제 처리
router.post('/delete/:id', (req, res) => {
    const postId = req.params.id;

    db.run('DELETE FROM posts WHERE id = ? OR parent_id = ?', [postId, postId], (err) => {
        if (err) return res.status(500).send('글 삭제 실패');
        res.redirect('/post/list');
    });
});

module.exports = router;