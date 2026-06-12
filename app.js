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

    // 🛠️ [🚨 에러 원인 정밀 수리 완료]
    // 기존 INSERT 구문을 중복 무시 문법인 'INSERT OR IGNORE'로 고정하여 UNIQUE constraint failed 에러를 영구 소멸시킵니다.
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

// 🚨 라우터 주소 등록 구역
app.use('/', indexRouter);
app.use('/shop', shopRouter);
app.use('/', authRouter);
app.use('/post', postRouter);
app.use('/admin', adminRouter);


// ==========================================================
// 하드코딩 제거 및 환경변수 포트 스위칭
// ==========================================================
// 관리자가 pm2로 켤 때는 배정받은 PORT 변수를 쓰고, 내 컴퓨터 테스트 시에는 3004번을 기본값으로 작동!
const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
    console.log(`Server Running : ${PORT}`);
});

module.exports = app;