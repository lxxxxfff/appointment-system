// API 基础地址
const API_BASE = 'https://appointment-system-6yrz.onrender.com/api';

// 用户登录功能
let currentUser = null;
let currentRole = null;
let currentFilter = 'all';
let civilianCurrentPage = 1;
let friendCurrentPage = 1;
const pageSize = 5;

// 清理过期预约
async function cleanExpiredAppointments() {
    try {
        const response = await fetch(`${API_BASE}/appointments/expired`, {
            method: 'DELETE'
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('清理过期预约失败:', error);
        return false;
    }
}

// 用户登录
async function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
        showToast('请输入用户名', 'error');
        return;
    }

    if (!password) {
        showToast('请输入密码', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = username;
            currentRole = data.user.role;
            localStorage.setItem('currentUser', currentUser);
            localStorage.setItem('currentRole', currentRole);

            document.getElementById('currentUser').textContent = currentUser;
            updateRoleDisplay();
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appointmentPage').style.display = 'block';

            showSectionByRole();

            const today = new Date().toISOString().split('T')[0];
            document.getElementById('appointmentDate').min = today;

            await cleanExpiredAppointments();
            await loadAppointments();
            showToast('登录成功！', 'success');
            // 清空密码
            passwordInput.value = '';
        } else {
            showToast(data.error || '登录失败', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showToast('连接服务器失败，请检查后端是否启动', 'error');
    }
}

// 更新身份显示
function updateRoleDisplay() {
    const roleSpan = document.getElementById('userRole');
    const kingCrown = document.getElementById('kingCrown');
    if (currentRole === 'civilian') {
        roleSpan.textContent = '（平民）';
        roleSpan.className = 'role-civilian';
        kingCrown.style.display = 'none';
    } else if (currentRole === 'friend') {
        roleSpan.textContent = '（小友）';
        roleSpan.className = 'role-friend';
        kingCrown.style.display = 'none';
    } else if (currentRole === 'king') {
        roleSpan.textContent = '（张爽大王）';
        roleSpan.className = 'role-king';
        kingCrown.style.display = 'inline';
    }
}

// 根据身份显示不同区域
function showSectionByRole() {
    const civilianSection = document.getElementById('civilianSection');
    const friendSection = document.getElementById('friendSection');
    const kingSection = document.getElementById('kingSection');

    if (currentRole === 'civilian') {
        civilianSection.style.display = 'block';
        friendSection.style.display = 'none';
        kingSection.style.display = 'none';
    } else if (currentRole === 'king') {
        civilianSection.style.display = 'none';
        friendSection.style.display = 'none';
        kingSection.style.display = 'block';
        loadKingUsers();
    } else {
        civilianSection.style.display = 'none';
        friendSection.style.display = 'block';
        kingSection.style.display = 'none';
    }
}

// 用户退出登录
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentRole');
    currentUser = null;
    currentRole = null;
    civilianCurrentPage = 1;
    friendCurrentPage = 1;
    document.getElementById('username').value = '';
    document.getElementById('appointmentPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    showToast('已退出登录', 'success');
}

// 创建预约
async function createAppointment() {
    const date = document.getElementById('appointmentDate').value;
    const timeStart = document.getElementById('appointmentTimeStart').value;
    const timeEnd = document.getElementById('appointmentTimeEnd').value;
    const reason = document.getElementById('appointmentReason').value.trim();

    if (!date) {
        showToast('请选择预约日期', 'error');
        return;
    }

    if (!timeStart || !timeEnd) {
        showToast('请选择预约时间段', 'error');
        return;
    }

    if (timeStart >= timeEnd) {
        showToast('结束时间必须大于开始时间', 'error');
        return;
    }

    const time = `${timeStart}-${timeEnd}`;

    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, date, time, reason })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('appointmentDate').value = '';
            document.getElementById('appointmentTimeStart').value = '';
            document.getElementById('appointmentTimeEnd').value = '';
            document.getElementById('appointmentReason').value = '';
            await loadAppointments();
            showToast('预约成功！', 'success');
        } else {
            showToast(data.error || '预约失败', 'error');
        }
    } catch (error) {
        console.error('创建预约错误:', error);
        showToast('创建预约失败', 'error');
    }
}

// 加载预约记录
async function loadAppointments() {
    try {
        const response = await fetch(
            `${API_BASE}/appointments?username=${currentUser}&role=${currentRole}&filter=${currentFilter}`
        );
        const appointments = await response.json();

        if (currentRole === 'civilian') {
            loadCivilianAppointments(appointments);
        } else {
            loadAllAppointments(appointments);
        }
    } catch (error) {
        console.error('加载预约错误:', error);
        showToast('加载预约失败', 'error');
    }
}

// 平民加载所有预约（带分页）
async function loadCivilianAppointments(appointments) {
    const listContainer = document.getElementById('appointmentsList');
    const totalItems = appointments.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (civilianCurrentPage > totalPages) {
        civilianCurrentPage = totalPages;
    }
    if (civilianCurrentPage < 1) {
        civilianCurrentPage = 1;
    }

    const startIndex = (civilianCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = appointments.slice(startIndex, endIndex);

    if (totalItems === 0) {
        listContainer.innerHTML = '<div class="no-appointments">暂无预约记录</div>';
        document.getElementById('civilianPagination').innerHTML = '';
        return;
    }

    // 检测冲突
    const conflicts = detectConflicts(appointments);

    // 加载留言
    for (const apt of pageData) {
        apt.comments = await loadComments(apt.id);
    }

    listContainer.innerHTML = pageData.map(apt => {
        const isConflict = conflicts.has(apt.id);
        const conflictClass = isConflict ? 'conflict' : 'no-conflict';

        return `
        <div class="appointment-card ${conflictClass}" data-appointment-id="${apt.id}">
            <div class="appointment-card-header">
                <div>
                    <div class="appointment-user">预约人：${apt.username}</div>
                    <div class="appointment-date">${formatDate(apt.date)}</div>
                    <div class="appointment-time">${apt.time}</div>
                    ${isConflict ? '<div class="conflict-badge">⚠️ 时间冲突</div>' : ''}
                </div>
                <div>
                    <span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span>
                </div>
            </div>
            <div class="appointment-reason">${apt.reason}</div>
            <div class="appointment-actions">
                ${apt.username === currentUser ? `<button class="btn btn-danger" onclick="cancelAppointment(${apt.id})">取消预约</button>` : ''}
            </div>
            ${renderComments(apt)}
        </div>
    `}).join('');

    renderPagination('civilianPagination', civilianCurrentPage, totalPages, 'civilian');
}

// 加载留言
async function loadComments(appointmentId) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}/comments`);
        return await response.json();
    } catch (error) {
        console.error('加载留言错误:', error);
        return [];
    }
}

// 渲染留言
function renderComments(apt) {
    const comments = apt.comments || [];

    // 构建层级结构
    const commentTree = buildCommentTree(comments);

    const commentsHtml = Object.values(commentTree).map(comment => renderCommentItem(comment, apt.id)).join('');

    return `
        <div class="comments-section" id="comments-${apt.id}">
            <button class="comment-toggle-btn" onclick="openCommentModal(${apt.id})">
                💬 查看留言 (${comments.length})
            </button>
        </div>
    `;
}

// 构建评论树
function buildCommentTree(comments) {
    const tree = {};
    const children = {};

    // 先收集所有评论和子评论关系
    comments.forEach(comment => {
        tree[comment.id] = { ...comment, replies: [] };
        if (comment.parent_id) {
            if (!children[comment.parent_id]) {
                children[comment.parent_id] = [];
            }
            children[comment.parent_id].push(comment.id);
        }
    });

    // 构建层级
    Object.keys(children).forEach(parentId => {
        const parent = tree[parentId];
        if (parent) {
            parent.replies = children[parentId].map(id => tree[id]);
        }
    });

    // 只返回顶级评论
    const topLevel = {};
    Object.values(tree).forEach(comment => {
        if (!comment.parent_id) {
            topLevel[comment.id] = comment;
        }
    });

    return topLevel;
}

// 渲染单个评论项
function renderCommentItem(comment, appointmentId) {
    const repliesHtml = comment.replies && comment.replies.length > 0
        ? `<div class="comment-reply-list">
            ${comment.replies.map(reply => renderReplyItem(reply, appointmentId)).join('')}
           </div>`
        : '';

    return `
        <div class="comment-item" id="comment-${comment.id}">
            <div class="comment-header">
                <span class="comment-user">${comment.username}</span>
                <span class="comment-time">${formatDateTime(comment.created_at)}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
            <button class="comment-reply-btn" onclick="setReplyTargetInModal(${comment.id}, '${comment.username}')">回复</button>
            ${repliesHtml}
        </div>
    `;
}

// 渲染回复项
function renderReplyItem(reply, appointmentId) {
    const nestedRepliesHtml = reply.replies && reply.replies.length > 0
        ? `<div class="comment-reply-list">
            ${reply.replies.map(r => renderReplyItem(r, appointmentId)).join('')}
           </div>`
        : '';

    return `
        <div class="comment-reply-item" id="comment-${reply.id}">
            <div class="comment-reply-header">
                <span class="comment-reply-user">${reply.username}</span>
                <span class="comment-time">${formatDateTime(reply.created_at)}</span>
            </div>
            ${reply.parent_comment_username ? `<div class="comment-reply-to">回复 ${reply.parent_comment_username}</div>` : ''}
            <div class="comment-reply-content">${reply.content}</div>
            <button class="comment-reply-btn" onclick="setReplyTargetInModal(${reply.id}, '${reply.username}')">回复</button>
            ${nestedRepliesHtml}
        </div>
    `;
}

// 在弹窗中设置回复目标
function setReplyTargetInModal(commentId, username) {
    setReplyTarget(commentId, username);
}

// 全局变量存储当前评论状态
let currentCommentModal = null;
let currentAppointmentId = null;
let currentParentCommentId = null;

// 打开留言弹窗
function openCommentModal(appointmentId, parentCommentId = null) {
    currentAppointmentId = appointmentId;
    currentParentCommentId = parentCommentId;

    // 关闭已存在的弹窗
    if (currentCommentModal) {
        document.body.removeChild(currentCommentModal);
    }

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'comment-modal';
    modal.id = 'commentModal';

    modal.innerHTML = `
        <div class="comment-modal-content">
            <div class="comment-modal-header">
                <span class="comment-modal-title">留言</span>
                <button class="comment-modal-close" onclick="closeCommentModal()">×</button>
            </div>
            <div class="comment-modal-body" id="commentModalBody">
                <div class="comments-list" id="modalCommentsList"></div>
            </div>
            <div class="comment-replying-to" id="commentReplyingTo" style="display: none;">
                <span class="comment-replying-to-text" id="replyingToText"></span>
                <button class="comment-cancel-reply" onclick="cancelReply()">×</button>
            </div>
            <div class="comment-modal-input-area">
                <textarea id="commentModalInput" placeholder="输入留言内容..." rows="3"></textarea>
                <button class="btn-send" onclick="sendComment()">发送</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentCommentModal = modal;

    // 加载留言
    loadModalComments();

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCommentModal();
        }
    });
}

// 加载弹窗中的留言
async function loadModalComments() {
    try {
        const response = await fetch(`${API_BASE}/appointments/${currentAppointmentId}/comments`);
        const comments = await response.json();

        // 构建评论树
        const commentTree = buildCommentTree(comments);

        const commentsHtml = Object.values(commentTree).map(comment => renderCommentItem(comment, currentAppointmentId)).join('');

        const listContainer = document.getElementById('modalCommentsList');
        if (Object.keys(commentTree).length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无留言</div>';
        } else {
            listContainer.innerHTML = commentsHtml;
        }

        // 更新按钮文字
        const btn = document.querySelector(`#comments-${currentAppointmentId} .comment-toggle-btn`);
        if (btn) {
            btn.textContent = `💬 查看留言 (${comments.length})`;
        }
    } catch (error) {
        console.error('加载留言错误:', error);
    }
}

// 关闭留言弹窗
function closeCommentModal() {
    if (currentCommentModal) {
        document.body.removeChild(currentCommentModal);
        currentCommentModal = null;
        currentAppointmentId = null;
        currentParentCommentId = null;
    }
}

// 取消回复
function cancelReply() {
    currentParentCommentId = null;
    document.getElementById('commentReplyingTo').style.display = 'none';
    document.getElementById('commentModalInput').placeholder = '输入留言内容...';
}

// 设置回复目标
function setReplyTarget(commentId, username) {
    currentParentCommentId = commentId;
    const replySection = document.getElementById('commentReplyingTo');
    const replyText = document.getElementById('replyingToText');
    replySection.style.display = 'flex';
    replyText.textContent = `回复 ${username}`;
    document.getElementById('commentModalInput').placeholder = `回复 ${username}...`;
    document.getElementById('commentModalInput').focus();
}

// 发送留言
async function sendComment() {
    const input = document.getElementById('commentModalInput');
    const content = input.value.trim();

    if (!content) {
        showToast('请输入留言内容', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/${currentAppointmentId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                content,
                parent_id: currentParentCommentId
            })
        });

        const data = await response.json();

        if (data.success) {
            input.value = '';
            cancelReply();
            await loadModalComments();
            await loadAppointments();
            showToast('留言成功', 'success');
        } else {
            showToast(data.error || '留言失败', 'error');
        }
    } catch (error) {
        console.error('添加留言错误:', error);
        showToast('留言失败', 'error');
    }
}

// 添加留言（保留原函数作为兼容）
async function addComment(appointmentId) {
    openCommentModal(appointmentId);
}

// 小友加载所有预约（带分页和筛选）
async function loadAllAppointments(appointments) {
    const listContainer = document.getElementById('allAppointmentsList');
    const totalItems = appointments.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (friendCurrentPage > totalPages) {
        friendCurrentPage = totalPages;
    }
    if (friendCurrentPage < 1) {
        friendCurrentPage = 1;
    }

    const startIndex = (friendCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = appointments.slice(startIndex, endIndex);

    if (totalItems === 0) {
        listContainer.innerHTML = '<div class="no-appointments">暂无预约记录</div>';
        document.getElementById('friendPagination').innerHTML = '';
        return;
    }

    // 检测冲突
    const conflicts = detectConflicts(appointments);

    // 加载留言
    for (const apt of pageData) {
        apt.comments = await loadComments(apt.id);
    }

    listContainer.innerHTML = pageData.map(apt => {
        const isConflict = conflicts.has(apt.id);
        const conflictClass = isConflict ? 'conflict' : 'no-conflict';

        return `
        <div class="appointment-card ${conflictClass}">
            <div class="appointment-card-header">
                <div>
                    <div class="appointment-user">预约人：${apt.username}</div>
                    <div class="appointment-date">${formatDate(apt.date)}</div>
                    <div class="appointment-time">${apt.time}</div>
                    ${isConflict ? '<div class="conflict-badge">⚠️ 时间冲突</div>' : ''}
                </div>
                <div>
                    <span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span>
                </div>
            </div>
            <div class="appointment-reason">${apt.reason}</div>
            <div class="appointment-actions">
                ${apt.status === 'pending' ? `
                    <button class="btn btn-success" onclick="acceptAppointment(${apt.id})">接受预约</button>
                    <button class="btn btn-warning" onclick="ignoreAppointment(${apt.id})">不予理会</button>
                ` : ''}
                ${apt.status === 'accepted' ? `
                    <button class="btn btn-warning" onclick="ignoreAppointment(${apt.id})">不予理会</button>
                ` : ''}
                ${apt.status === 'ignored' ? `
                    <button class="btn btn-success" onclick="acceptAppointment(${apt.id})">接受预约</button>
                ` : ''}
            </div>
            ${renderComments(apt)}
        </div>
    `}).join('');

    renderPagination('friendPagination', friendCurrentPage, totalPages, 'friend');
}

// 渲染分页控件
function renderPagination(containerId, currentPage, totalPages, userType) {
    const container = document.getElementById(containerId);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <button onclick="goToPage(${currentPage - 1}, '${userType}')" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        <div class="page-numbers">
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <button onclick="goToPage(${i}, '${userType}')" ${i === currentPage ? 'class="active"' : ''}>${i}</button>
        `;
    }

    paginationHTML += `
        </div>
        <button onclick="goToPage(${currentPage + 1}, '${userType}')" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
        <span class="page-info">第 ${currentPage} / ${totalPages} 页</span>
    `;

    container.innerHTML = paginationHTML;
}

// 翻页
function goToPage(page, userType) {
    if (userType === 'civilian') {
        civilianCurrentPage = page;
    } else {
        friendCurrentPage = page;
    }
    loadAppointments();
}

// 设置筛选器
function setFilter(filter) {
    currentFilter = filter;
    friendCurrentPage = 1;

    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    loadAppointments();
}

// 接受预约
async function acceptAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted', username: currentUser })
        });

        const data = await response.json();

        if (data.success) {
            await loadAppointments();
            showToast('已接受该预约', 'success');
        } else {
            showToast(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('接受预约错误:', error);
        showToast('操作失败', 'error');
    }
}

// 不予理会
async function ignoreAppointment(appointmentId) {
    if (!confirm('确定要将此预约标记为不予理会吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ignored', username: currentUser })
        });

        const data = await response.json();

        if (data.success) {
            await loadAppointments();
            showToast('已标记为不予理会', 'success');
        } else {
            showToast(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('操作错误:', error);
        showToast('操作失败', 'error');
    }
}

// 取消预约
async function cancelAppointment(appointmentId) {
    if (!confirm('确定要取消这个预约吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser })
        });

        const data = await response.json();

        if (data.success) {
            await loadAppointments();
            showToast('预约已取消', 'success');
        } else {
            showToast(data.error || '取消失败', 'error');
        }
    } catch (error) {
        console.error('取消预约错误:', error);
        showToast('取消失败', 'error');
    }
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'accepted': '已接受',
        'ignored': '不予理会'
    };
    return statusMap[status] || status;
}

// 格式化日期显示
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
}

// 显示提示消息
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 页面加载时检查是否有已登录用户
window.addEventListener('load', async () => {
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('currentRole');

    if (savedUser && savedRole) {
        currentUser = savedUser;
        currentRole = savedRole;
        document.getElementById('currentUser').textContent = currentUser;
        updateRoleDisplay();
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appointmentPage').style.display = 'block';

        showSectionByRole();

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('appointmentDate').min = today;

        await cleanExpiredAppointments();
        await loadAppointments();
    }
});

// 支持回车键登录
document.getElementById('username').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('password').focus();
    }
});

document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users?role=${currentRole}`);
        const users = await response.json();

        const listContainer = document.getElementById('usersList');

        if (users.length === 0) {
            listContainer.innerHTML = '<div class="no-appointments">暂无用户</div>';
            return;
        }

        listContainer.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <span class="user-name">${user.username}</span>
                    <span class="user-role ${user.role}">${user.role === 'civilian' ? '平民' : '小友'}</span>
                </div>
                <div class="user-meta">
                    注册: ${formatDateTime(user.created_at)} | 最后登录: ${formatDateTime(user.last_login)}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载用户列表错误:', error);
    }
}

// 加载访问日志
async function loadAccessLogs() {
    try {
        const response = await fetch(`${API_BASE}/access-logs?username=${currentUser}&role=${currentRole}`);
        const logs = await response.json();

        const listContainer = document.getElementById('accessLogsList');

        if (logs.length === 0) {
            listContainer.innerHTML = '<div class="no-appointments">暂无访问日志</div>';
            return;
        }

        listContainer.innerHTML = logs.map(log => `
            <div class="log-entry">
                <div class="log-entry-header">
                    <span class="log-username">${log.username}</span>
                    <span class="log-time">${formatDateTime(log.created_at)}</span>
                </div>
                <div class="log-action">${getActionText(log.action)}</div>
                ${log.details ? `<div class="log-details">${log.details}</div>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('加载访问日志错误:', error);
    }
}

// 获取操作文本
function getActionText(action) {
    const actionMap = {
        'REGISTER': '注册',
        'LOGIN': '登录',
        'CREATE_APPOINTMENT': '创建预约',
        'UPDATE_APPOINTMENT': '更新预约',
        'DELETE_APPOINTMENT': '取消预约'
    };
    return actionMap[action] || action;
}

// 格式化日期时间
function formatDateTime(dateString) {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 切换标签页
function switchTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // 隐藏所有标签页内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // 显示选中的标签页
    document.getElementById(`${tabName}Tab`).style.display = 'block';

    // 加载对应数据
    if (tabName === 'appointments') {
        loadAppointments();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'logs') {
        loadAccessLogs();
    }
}

// 筛选按钮事件
document.addEventListener('DOMContentLoaded', () => {
    // 筛选按钮
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            setFilter(btn.dataset.filter);
        });
    });

    // 标签页按钮
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
});

// === 张爽大王专用功能 ===

// 检测两个时间段是否重叠
function isTimeOverlap(start1, end1, start2, end2) {
    const s1 = timeToMinutes(start1);
    const e1 = timeToMinutes(end1);
    const s2 = timeToMinutes(start2);
    const e2 = timeToMinutes(end2);
    return Math.max(s1, s2) < Math.min(e1, e2);
}

// 将时间字符串转换为分钟数
function timeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// 提取时间段的开始和结束时间
function parseTimeRange(timeRange) {
    const parts = timeRange.split('-');
    if (parts.length === 2) {
        return { start: parts[0].trim(), end: parts[1].trim() };
    }
    return null;
}

// 检测预约列表中的时间冲突（小友和张家大王使用）
function detectConflicts(appointments) {
    const conflicts = new Set();
    const dateGroups = {};

    // 按日期分组
    appointments.forEach(apt => {
        if (!dateGroups[apt.date]) {
            dateGroups[apt.date] = [];
        }
        dateGroups[apt.date].push(apt);
    });

    // 检查每天的冲突
    for (const date in dateGroups) {
        const dayAppointments = dateGroups[date];
        for (let i = 0; i < dayAppointments.length; i++) {
            for (let j = i + 1; j < dayAppointments.length; j++) {
                const apt1 = dayAppointments[i];
                const apt2 = dayAppointments[j];
                const range1 = parseTimeRange(apt1.time);
                const range2 = parseTimeRange(apt2.time);

                if (range1 && range2) {
                    if (isTimeOverlap(range1.start, range1.end, range2.start, range2.end)) {
                        conflicts.add(apt1.id);
                        conflicts.add(apt2.id);
                    }
                }
            }
        }
    }

    return conflicts;
}

// 加载用户管理列表
async function loadKingUsers() {
    try {
        const response = await fetch(`${API_BASE}/users?role=${currentRole}`);
        const users = await response.json();

        const listContainer = document.getElementById('kingUsersList');

        if (users.length === 0) {
            listContainer.innerHTML = '<div class="no-appointments">暂无用户</div>';
            return;
        }

        listContainer.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <span class="user-name">${user.username}</span>
                    <span class="user-role ${user.role}">${getRoleText(user.role)}</span>
                </div>
                <div class="user-meta">
                    注册: ${formatDateTime(user.created_at)} | 最后登录: ${formatDateTime(user.last_login)}
                </div>
                ${user.role !== 'king' && user.username !== currentUser ? `
                    <div class="user-actions">
                        ${user.role === 'civilian' ? `
                            <button class="btn btn-success" onclick="changeUserRole('${user.username}', 'friend')">设为小友</button>
                        ` : ''}
                        ${user.role === 'friend' ? `
                            <button class="btn btn-primary" onclick="changeUserRole('${user.username}', 'civilian')">设为平民</button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('加载用户列表错误:', error);
        showToast('加载用户列表失败', 'error');
    }
}

// 修改用户角色
async function changeUserRole(username, newRole) {
    const roleText = newRole === 'civilian' ? '平民' : '小友';
    if (!confirm(`确定要将 ${username} 的角色改为 ${roleText} 吗？`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${username}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole, currentUser: currentUser })
        });

        const data = await response.json();

        if (data.success) {
            await loadKingUsers();
            showToast(data.message, 'success');
        } else {
            showToast(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('修改角色错误:', error);
        showToast('操作失败', 'error');
    }
}

// 获取角色文本
function getRoleText(role) {
    const roleMap = {
        'civilian': '平民',
        'friend': '小友',
        'king': '张爽大王'
    };
    return roleMap[role] || role;
}

// 加载张爽大王的访问日志
async function loadKingAccessLogs() {
    try {
        const response = await fetch(`${API_BASE}/access-logs?username=${currentUser}&role=${currentRole}`);
        const logs = await response.json();

        const listContainer = document.getElementById('kingAccessLogsList');

        if (logs.length === 0) {
            listContainer.innerHTML = '<div class="no-appointments">暂无访问日志</div>';
            return;
        }

        listContainer.innerHTML = logs.map(log => `
            <div class="log-entry">
                <div class="log-entry-header">
                    <span class="log-username">${log.username}</span>
                    <span class="log-time">${formatDateTime(log.created_at)}</span>
                </div>
                <div class="log-action">${getActionText(log.action)}</div>
                ${log.details ? `<div class="log-details">${log.details}</div>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('加载访问日志错误:', error);
    }
}

// 覆盖原有的 switchTab 函数以支持张爽大王
const originalSwitchTab = switchTab;
switchTab = function(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // 隐藏所有标签页内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // 显示选中的标签页
    document.getElementById(`${tabName}Tab`).style.display = 'block';

    // 根据角色加载数据
    if (tabName === 'appointments' && currentRole === 'friend') {
        loadAppointments();
    } else if (tabName === 'logs' && currentRole === 'friend') {
        loadAccessLogs();
    } else if (tabName === 'king-users') {
        loadKingUsers();
    } else if (tabName === 'king-logs') {
        loadKingAccessLogs();
    }
};