const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 테이블 생성 및 parent_id 컬럼 보장
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

// 장바구니 카운트 안전 가드 함수
const getCartCount = (req) => {
    return req.session.cartItems ? req.session.cartItems.length : 0;
};

// 1. 게시글 목록 보기 (답변 완료 배지 연동 기능 탑재)
router.get('/list', (req, res) => {
    // 서브쿼리를 이용해 각 원본 글에 달린 답변(parent_id가 해당 id인 글)의 개수를 실시간으로 계산
    const query = `
        SELECT p.*, 
               (SELECT COUNT(*) FROM posts WHERE parent_id = p.id) AS reply_count
        FROM posts p
        ORDER BY CASE WHEN p.parent_id IS NULL THEN p.id ELSE p.parent_id END DESC, p.id ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("게시판 목록 로드 에러:", err);
            return res.status(500).send('게시글 목록 로드 실패');
        }

        const formattedRows = (rows || []).map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            author: row.writer || '익명',
            reg_date: row.reg_date ? row.reg_date.split('T')[0] : '',
            parent_id: row.parent_id,
            reply_count: row.reply_count || 0 // [답변완료] 배지 활성화용 변수
        }));

        res.render('post_list', {
            posts: formattedRows,
            user: req.session.user || null,
            cartCount: getCartCount(req)
        });
    });
});

// 2. 일반 문의글 작성 페이지 이동
router.get('/write', (req, res) => {
    res.render('post_write', {
        user: req.session.user || null,
        parentId: req.query.parentId || null,
        cartCount: getCartCount(req)
    });
});

// 3. 일반 문의글 저장 처리
router.post('/write', (req, res) => {
    const { title, content, parentId } = req.body;

    let writer = '익명';
    if (req.session.user) {
        writer = req.session.user.username || req.session.user.id || '익명';
    }

    const regDate = new Date().toISOString();
    const query = `INSERT INTO posts (title, content, writer, reg_date, parent_id) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [title, content, writer, regDate, parentId || null], (err) => {
        if (err) return res.status(500).send('글 저장 실패');
        res.redirect('/post/list');
    });
});

// 4. 글 상세보기 페이지
router.get('/detail/:id', (req, res) => {
    const postId = req.params.id;

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, row) => {
        if (err) return res.status(500).send('글 조회 실패');
        if (!row) return res.status(404).send('게시글을 찾을 수 없습니다.');

        const formattedPost = {
            id: row.id,
            title: row.title,
            content: row.content,
            author: row.writer || '익명',
            reg_date: row.reg_date ? row.reg_date.split('T')[0] : '',
            parent_id: row.parent_id
        };

        res.render('post_detail', {
            post: formattedPost,
            user: req.session.user || null,
            cartCount: getCartCount(req)
        });
    });
});

// 👑 5. [관리자 전용] 답변 작성 페이지 이동 (새로 수리 완료)
router.get('/reply/:id', (req, res) => {
    const originPostId = req.params.id;

    // 답변을 달아줄 원본 문의글 정보를 DB에서 먼저 조회
    db.get('SELECT * FROM posts WHERE id = ?', [originPostId], (err, row) => {
        if (err) return res.status(500).send('원본 글 조회 실패');
        if (!row) return res.status(404).send('원본 글을 찾을 수 없습니다.');

        // post_reply.ejs 화면 규격에 완벽 호환되도록 바인딩
        const formattedPost = {
            id: row.id,
            title: row.title,
            content: row.content,
            author: row.writer || '익명'
        };

        res.render('post_reply', {
            post: formattedPost,
            user: req.session.user || null,
            cartCount: getCartCount(req)
        });
    });
});

// 👑 6. [관리자 전용] 답변 DB 저장 처리 (새로 수리 완료)
router.post('/reply', (req, res) => {
    const { postId, replyContent } = req.body; // post_reply.ejs 폼 내부 input name 명칭 매칭

    const title = "↳ [공식 답변] 문의하신 내용에 대한 답변입니다.";
    const writer = "admin"; // 관리자 공식 계정 박제
    const regDate = new Date().toISOString();

    // parent_id에 원본 글의 ID(postId)를 꽂아줌으로써 원본 글에 종속된 답변임을 명시
    const query = `INSERT INTO posts (title, content, writer, reg_date, parent_id) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [title, replyContent, writer, regDate, postId], (err) => {
        if (err) {
            console.error("답변 저장 실패 에러:", err);
            return res.status(500).send('답변 등록 실패');
        }
        res.redirect('/post/list'); // 답변 등록 완료 후 다시 목록으로 복귀
    });
});

// 7. 글 수정 페이지 이동
router.get('/edit/:id', (req, res) => {
    const postId = req.params.id;

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, row) => {
        if (err) return res.status(500).send('수정 데이터 로드 실패');
        if (!row) return res.status(404).send('해당 게시글이 없습니다.');

        const formattedPost = {
            id: row.id,
            title: row.title,
            content: row.content,
            author: row.writer || '익명'
        };

        res.render('post_edit', {
            post: formattedPost,
            user: req.session.user || null,
            cartCount: getCartCount(req)
        });
    });
});

// 8. 글 수정 처리
router.post('/edit', (req, res) => {
    const { id, title, content } = req.body;
    const query = `UPDATE posts SET title = ?, content = ? WHERE id = ?`;

    db.run(query, [title, content, id], (err) => {
        if (err) {
            console.error("글 수정 처리 에러:", err);
            return res.status(500).send('글 수정에 실패했습니다.');
        }
        res.redirect(`/post/detail/${id}`);
    });
});

// 9. 글 삭제 처리
router.post('/delete', (req, res) => {
    const postId = req.body.id;

    if (!postId) {
        return res.status(400).send('삭제할 게시글 ID가 없습니다.');
    }

    db.run('DELETE FROM posts WHERE id = ? OR parent_id = ?', [postId, postId], (err) => {
        if (err) {
            console.error("글 삭제 에러:", err);
            return res.status(500).send('글 삭제 실패');
        }
        res.redirect('/post/list');
    });
});

module.exports = router;