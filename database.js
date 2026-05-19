const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'appointment.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('已连接到 SQLite 数据库');
        initTables();
    }
});

function initTables() {
    // 先删除旧的 users 表（清空所有账号）
    db.run(`DROP TABLE IF EXISTS users`, (err) => {
        if (err) {
            console.error('删除旧表失败:', err.message);
        } else {
            console.log('已清空旧用户数据');
            // 创建新的用户表（带密码字段）
            db.run(`CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'civilian',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('创建用户表失败:', err.message);
                } else {
                    console.log('用户表创建成功（包含密码字段）');
                }
            });
        }
    });

    // 创建预约表
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username)
    )`);

    // 创建访问日志表
    db.run(`CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 创建留言表（支持嵌套回复）
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) {
            console.error('创建留言表失败:', err.message);
        } else {
            console.log('留言表创建成功');
            // 添加 parent_id 列（如果不存在）
            db.run(`ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL`, (alterErr) => {
                // 忽略错误，如果列已存在会报错
                if (alterErr && !alterErr.message.includes('duplicate column')) {
                    console.log('parent_id 列已存在或添加成功');
                }
            });
        }
    });
}

module.exports = db;