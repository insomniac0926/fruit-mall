const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// 📂 데이터베이스 연결 및 orders(주문) 테이블 자동 설정 구역
const dbPath = path.join(__dirname, 'db/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.on('trace', (sql) => {});
db.run('PRAGMA ignore_check_constraints = ON;');

db.serialize(() => {
    // 주문 테이블 생성
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT,
        username TEXT,
        total_price INTEGER,
        status TEXT DEFAULT '배송준비중',
        reg_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get('SELECT * FROM users WHERE username = "admin" OR id = "admin"', [], (err, row) => {
        if (!row) {
            db.run('INSERT OR IGNORE INTO users (username, password) VALUES ("admin", "1234")', (err) => {
                if (err) {
                    db.run('INSERT OR IGNORE INTO users (id, password) VALUES ("admin", "1234")');
                }
            });
        }
    });
});

// 📂 뷰 엔진 및 정적 폴더 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ⭕ 학교 프록시 환경에서 CSS, 이미지 정적 파일이 깨지지 않도록 두 경로 모두 지원
app.use('/stud11', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 세션 미들웨어 설정
app.use(session({
    secret: 'secret-key-fruit-mall',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 30 }
}));

// 🛣️ 라우터 파일 불러오기
const indexRouter = require('./routes/index');
const shopRouter = require('./routes/shop');
const authRouter = require('./routes/auth');
const postRouter = require('./routes/post');
const adminRouter = require('./routes/admin');

// ==========================================================
// 🌟 무한 루프 탈출 핵심 가드: /와 /stud11 둘 다 라우터 작동 보장
// ==========================================================
// 1. 프록시 서버가 /stud11을 떼고 그냥 /로 신호를 보낼 때 대응
app.use('/', indexRouter);
app.use('/shop', shopRouter);
app.use('/', authRouter);
app.use('/post', postRouter);
app.use('/admin', adminRouter);

// 2. 외부 브라우저 탭 링크 클릭 시 /stud11 주소로 직접 찾아 들어올 때 대응
app.use('/stud11', indexRouter);
app.use('/stud11/shop', shopRouter);
app.use('/stud11', authRouter);
app.use('/stud11/post', postRouter);
app.use('/stud11/admin', adminRouter);

// ==========================================================
// 하드코딩 제거 및 환경변수 포트 스위칭
// ==========================================================
const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
    console.log(`Server Running : ${PORT}`);
});

module.exports = app;