# 预约登记系统 - 后端部署说明

## 项目结构

```
F:\appointment-system\
├── appointment.html      # 前端页面
├── styles.css           # 样式文件
├── script.js            # 前端脚本（已更新为调用后端API）
├── server.js            # 后端服务器
├── database.js          # 数据库初始化
├── package.json         # 项目依赖配置
└── appointment.db       # SQLite数据库文件（运行后自动生成）
```

## 安装步骤

### 1. 安装 Node.js

确保已安装 Node.js，版本 14 或以上。

### 2. 安装依赖

在项目目录下运行：

```bash
cd F:\appointment-system
npm install
```

### 3. 启动后端服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 4. 访问系统

在浏览器中打开 `appointment.html` 文件即可使用。

## 数据库表结构

### users 表（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | 用户名（唯一） |
| role | TEXT | 角色（civilian/friend） |
| created_at | DATETIME | 注册时间 |
| last_login | DATETIME | 最后登录时间 |

### appointments 表（预约表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | 预约人用户名 |
| date | TEXT | 预约日期 |
| time | TEXT | 预约时间 |
| reason | TEXT | 预约原因 |
| status | TEXT | 状态（pending/accepted/ignored） |
| created_at | DATETIME | 创建时间 |

### access_logs 表（访问日志表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | 操作用户 |
| action | TEXT | 操作类型（REGISTER/LOGIN/CREATE_APPOINTMENT等） |
| details | TEXT | 操作详情 |
| ip_address | TEXT | IP地址 |
| created_at | DATETIME | 操作时间 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/login | 用户登录/注册 |
| GET | /api/appointments | 获取预约列表 |
| POST | /api/appointments | 创建预约 |
| PUT | /api/appointments/:id/status | 更新预约状态 |
| DELETE | /api/appointments/:id | 删除预约 |
| DELETE | /api/appointments/expired | 清理过期预约 |
| GET | /api/users | 获取用户列表（仅小友） |
| GET | /api/access-logs | 获取访问日志（仅小友） |

## 功能说明

### 平民功能
- 查看所有预约记录
- 创建新预约
- 取消自己的预约

### 小友功能
- 查看所有预约记录
- 筛选预约状态（全部/待处理/已接受/不予理会）
- 接受或拒绝预约
- 查看所有用户列表及注册时间、最后登录时间
- 查看访问日志（最近100条）

## 注意事项

1. 数据库文件 `appointment.db` 会自动在项目目录下生成
2. 访问日志只保留最近100条记录
3. 过期的预约会自动清理
4. 如需停止服务器，在终端按 `Ctrl + C`