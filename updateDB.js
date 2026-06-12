const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 파일 연결
const dbPath = path.join(__dirname, 'db/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. 상품 테이블 생성
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            image TEXT,
            description TEXT
        )
    `);

    // 2. 장바구니 테이블 생성
    db.run(`
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    // 3. 테스트용 초기 상품 데이터 집어넣기 (테이블이 비어있을 때만)
    db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)");
            stmt.run("싱싱한 사과", 3000, "🍎", "아침에 먹으면 금사과, 매우 달콤합니다.");
            stmt.run("달콤한 바나나", 4500, "🍌", "필리핀 직송 고당도 바나나 한 다발.");
            stmt.run("상큼한 오렌지", 2000, "🍊", "비타민C가 풍부한 캘리포니아 오렌지.");
            stmt.finalize();
            console.log("테스트용 상품 데이터 삽입 완료!");
        }
    });

    console.log("쇼핑몰 관련 테이블(products, cart_items) 생성 성공!");
});

db.close();