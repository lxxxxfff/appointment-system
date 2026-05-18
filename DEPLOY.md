# 部署到 Zeabur - 5分钟免费部署

## 方案：Zeabur（国内访问友好）

### 步骤 1：推送到 GitHub（2分钟）

1. 访问 https://github.com/new 创建新仓库，命名为 `appointment-system`

2. 在项目目录执行：
```bash
cd F:\appointment-system
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/appointment-system.git
git push -u origin main
```

### 步骤 2：在 Zeabur 部署（3分钟）

1. 访问 https://zeabur.com 注册/登录

2. 点击 **Create New Project**

3. 选择 **Git** → **Connect GitHub Account** → 选择你的仓库

4. Zeabur 会自动检测到 Node.js 项目，点击 **Deploy**

5. 等待部署完成（约1-2分钟）

6. 部署完成后，点击 **Generate Domain** 获取免费网址（格式：xxx.zeabur.app）

### 步骤 3：修改前端 API 地址

部署后需要修改 `script.js` 中的 API 地址：

将 `const API_BASE = 'http://localhost:3000/api';`
改为：`const API_BASE = 'https://你的域名.zeabur.app/api';`

### 完成访问

通过生成的网址访问：`https://你的域名.zeabur.app/appointment.html`

---

## 注意事项

1. **数据不持久**：Zeabur 免费版重启后 SQLite 数据会丢失，仅适合测试
2. **免费额度**：Zeabur 提供足够的免费额度用于测试
3. **HTTPS**：Zeabur 自动提供 HTTPS 证书

## 其他免费选项

如果 Zeabur 不可用，可尝试：

### Render（国外平台）
1. 推送代码到 GitHub
2. 访问 https://render.com 注册
3. 点击 New → Web Service → 连接 GitHub 仓库
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. 获得网址：`https://xxx.onrender.com`

### Replit（最简单）
1. 访问 https://replit.com
2. 点击 Create Repl → Import from GitHub → 输入你的仓库地址
3. 会自动部署并生成网址