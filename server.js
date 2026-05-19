const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(__dirname));

// 根路径重定向到主页
app.get('/', (req, res) => {
    res.redirect('/appointment.html');
});

// 记录访问日志的辅助函数
function logAccess(username, action, details, ipAddress) {
    db.run(
        'INSERT INTO access_logs (username, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [username, action, details, ipAddress]
    );
}

// 用户登录/注册
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 确定角色
    let role;
    if (username === '张爽大王') {
        role = 'king';
    } else {
        role = 'civilian';  // 默认平民
    }

    // 检查用户是否存在
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: '数据库错误' });
        }

        if (user) {
            // 用户存在，验证密码
            if (user.password !== password) {
                return res.status(401).json({ error: '密码错误' });
            }

            // 更新最后登录时间
            db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = ?',
                [username],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: '数据库错误' });
                    }
                    logAccess(username, 'LOGIN', '登录系统', ipAddress);
                    res.json({
                        success: true,
                        user: { username: user.username, role: user.role }
                    });
                }
            );
        } else {
            // 新用户，创建记录
            db.run(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, password, role],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: '用户名已存在' });
                        }
                        return res.status(500).json({ error: '数据库错误' });
                    }
                    logAccess(username, 'REGISTER', '新用户注册', ipAddress);
                    logAccess(username, 'LOGIN', '首次登录', ipAddress);
                    res.json({
                        success: true,
                        user: { username: username, role: role }
                    });
                }
            );
        }
    });
});

// 获取所有预约
app.get('/api/appointments', (req, res) => {
    const { username, role, filter } = req.query;

    let query = 'SELECT * FROM appointments';
    let params = [];

    // 如果是小友且需要过滤
    if (role === 'friend' && filter && filter !== 'all') {
        query += ' WHERE status = ?';
        params.push(filter);
    }

    query += ' ORDER BY date ASC, time ASC';

    db.all(query, params, (err, appointments) => {
        if (err) {
            return res.status(500).json({ error: '数据库错误' });
        }
        res.json(appointments);
    });
});

// 创建预约
app.post('/api/appointments', (req, res) => {
    const { username, date, time, reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!username || !date || !time) {
        return res.status(400).json({ error: '缺少必要字段' });
    }

    // 检查该时间段是否已被同一用户预约（状态不为 ignored）
    db.get(
        'SELECT * FROM appointments WHERE username = ? AND date = ? AND time = ? AND status != ?',
        [username, date, time, 'ignored'],
        (err, existing) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }

            if (existing) {
                return res.status(400).json({ error: '该时间段已被预约，请选择其他时间' });
            }

            // 创建预约
            db.run(
                'INSERT INTO appointments (username, date, time, reason, status) VALUES (?, ?, ?, ?, ?)',
                [username, date, time, reason || '未填写原因', 'pending'],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: '数据库错误' });
                    }
                    logAccess(username, 'CREATE_APPOINTMENT', `创建预约: ${date} ${time}`, ipAddress);
                    res.json({
                        success: true,
                        appointment: {
                            id: this.lastID,
                            username,
                            date,
                            time,
                            reason: reason || '未填写原因',
                            status: 'pending',
                            created_at: new Date().toISOString()
                        }
                    });
                }
            );
        }
    );
});

// 更新预约状态（接受/忽略）
app.put('/api/appointments/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, username } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!['pending', 'accepted', 'ignored'].includes(status)) {
        return res.status(400).json({ error: '无效的状态' });
    }

    db.run(
        'UPDATE appointments SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '预约不存在' });
            }
            logAccess(username || 'system', 'UPDATE_APPOINTMENT', `更新预约 ${id} 状态为 ${status}`, ipAddress);
            res.json({ success: true });
        }
    );
});

// 删除预约
app.delete('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    db.run(
        'DELETE FROM appointments WHERE id = ? AND username = ?',
        [id, username],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '预约不存在或无权删除' });
            }
            logAccess(username, 'DELETE_APPOINTMENT', `删除预约 ${id}`, ipAddress);
            res.json({ success: true });
        }
    );
});

// 清理过期预约
app.delete('/api/appointments/expired', (req, res) => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    db.all(
        `SELECT id FROM appointments WHERE date < ? OR (date = ? AND time LIKE ?)`,
        [currentDate, currentDate, `%${currentTime}%`],
        (err, expired) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }

            db.run(
                `DELETE FROM appointments WHERE date < ? OR (date = ? AND substr(time, 1, 5) < ?)`,
                [currentDate, currentDate, currentTime],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: '数据库错误' });
                    }
                    res.json({
                        success: true,
                        deletedCount: this.changes
                    });
                }
            );
        }
    );
});

// 获取所有访问日志（仅小友和张爽大王）
app.get('/api/access-logs', (req, res) => {
    const { username, role } = req.query;

    if (role !== 'friend' && role !== 'king') {
        return res.status(403).json({ error: '无权访问' });
    }

    db.all(
        'SELECT * FROM access_logs ORDER BY created_at DESC LIMIT 100',
        [],
        (err, logs) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            res.json(logs);
        }
    );
});

// 获取所有用户列表（仅小友和张爽大王）
app.get('/api/users', (req, res) => {
    const { role } = req.query;

    if (role !== 'friend' && role !== 'king') {
        return res.status(403).json({ error: '无权访问' });
    }

    db.all(
        'SELECT username, role, created_at, last_login FROM users ORDER BY created_at DESC',
        [],
        (err, users) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            res.json(users);
        }
    );
});

// 修改用户角色（仅张爽大王）
app.put('/api/users/:username/role', (req, res) => {
    const { username: targetUsername } = req.params;
    const { role: newRole, currentUser: requestUser } = req.body;

    // 验证请求者是张爽大王
    if (!requestUser) {
        return res.status(403).json({ error: '未授权' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [requestUser], (err, requester) => {
        if (err) {
            return res.status(500).json({ error: '数据库错误' });
        }

        if (!requester || requester.role !== 'king') {
            return res.status(403).json({ error: '只有张爽大王可以修改用户角色' });
        }

        // 检查新角色是否有效
        if (newRole !== 'civilian' && newRole !== 'friend') {
            return res.status(400).json({ error: '无效的角色' });
        }

        // 检查目标用户是否存在
        db.get('SELECT * FROM users WHERE username = ?', [targetUsername], (err, targetUser) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }

            if (!targetUser) {
                return res.status(404).json({ error: '用户不存在' });
            }

            // 不能修改张爽大王的角色
            if (targetUser.role === 'king') {
                return res.status(403).json({ error: '不能修改张爽大王的角色' });
            }

            // 不能修改自己的角色
            if (targetUsername === requestUser) {
                return res.status(403).json({ error: '不能修改自己的角色' });
            }

            // 更新角色
            db.run(
                'UPDATE users SET role = ? WHERE username = ?',
                [newRole, targetUsername],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: '数据库错误' });
                    }
                    logAccess(requestUser, 'UPDATE_USER_ROLE', `将 ${targetUsername} 的角色改为 ${newRole}`, req.ip || req.connection.remoteAddress);
                    res.json({
                        success: true,
                        message: `已将 ${targetUsername} 的角色改为 ${newRole === 'civilian' ? '平民' : '小友'}`
                    });
                }
            );
        });
    });
});

// 获取预约留言
app.get('/api/appointments/:id/comments', (req, res) => {
    const { id } = req.params;

    db.all(
        'SELECT * FROM comments WHERE appointment_id = ? ORDER BY created_at ASC',
        [id],
        (err, comments) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            res.json(comments);
        }
    );
});

// 添加留言
app.post('/api/appointments/:id/comments', (req, res) => {
    const { id } = req.params;
    const { username, content, parent_id } = req.body;

    if (!username || !content || !content.trim()) {
        return res.status(400).json({ error: '留言内容不能为空' });
    }

    db.run(
        'INSERT INTO comments (appointment_id, username, content, parent_id) VALUES (?, ?, ?, ?)',
        [id, username, content.trim(), parent_id || null],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            res.json({
                success: true,
                comment: {
                    id: this.lastID,
                    appointment_id: parseInt(id),
                    username,
                    content: content.trim(),
                    parent_id: parent_id || null,
                    created_at: new Date().toISOString()
                }
            });
        }
    );
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`预约系统后端运行在 http://localhost:${PORT}`);
});