const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// فتح قاعدة البيانات
const db = new sqlite3.Database('./orders.db', (err) => {
    if (err) console.error(err.message);
    console.log('تم الاتصال بقاعدة البيانات بنجاح.');
});

// إنشاء الجدول إذا لم يكن موجوداً
db.run(`CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    address TEXT,
    product TEXT,
    price REAL,
    delivery REAL,
    total REAL,
    currency TEXT,
    date TEXT
)`);

const server = http.createServer((req, res) => {
    const urlParts = req.url.split('/');
    
    // 1. عرض الصفحة الرئيسية
    if (req.method === 'GET' && req.url === '/') {
        const filePath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('خطأ في قراءة ملف الواجهة');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(content);
            }
        });
    } 
    // 2. جلب جميع الأوصال لعرضها في الجدول
    else if (req.method === 'GET' && req.url === '/get-orders') {
        db.all("SELECT * FROM receipts ORDER BY id DESC", [], (err, rows) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, orders: rows }));
            }
        });
    }
    // 3. حفظ وصل جديد
    else if (req.method === 'POST' && req.url === '/save-order') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const currentDate = new Date().toISOString().split('T')[0];

            const query = `INSERT INTO receipts (name, phone, address, product, price, delivery, total, currency, date) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(query, [data.name, data.phone, data.address, data.product, data.price, data.delivery, data.total, data.currency, currentDate], function(err) {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, id: this.lastID }));
                }
            });
        });
    }
    // 4. ميزة الحذف (Delete API)
    else if (req.method === 'DELETE' && urlParts[1] === 'delete-order') {
        const orderId = urlParts[2];
        db.run("DELETE FROM receipts WHERE id = ?", [orderId], function(err) {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            }
        });
    }
    // 5. ميزة التعديل (Update API)
    else if (req.method === 'PUT' && urlParts[1] === 'update-order') {
        const orderId = urlParts[2];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const query = `UPDATE receipts SET name=?, phone=?, address=?, product=?, price=?, delivery=?, total=?, currency=? WHERE id=?`;
            
            db.run(query, [data.name, data.phone, data.address, data.product, data.price, data.delivery, data.total, data.currency, orderId], function(err) {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            });
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر شغال بنجاح على المنفذ ${PORT}`);
});