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
    const username = usernameInput.value.trim();

    if (!username) {
        showToast('请输入用户名', 'error');
        return;
    }

    const roleInputs = document.getElementsByName('role');
    for (const input of roleInputs) {
        if (input.checked) {
            currentRole = input.value;
            break;
        }
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, role: currentRole })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = username;
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
    roleSpan.textContent = currentRole === 'civilian' ? '（平民）' : '（小友）';
    roleSpan.className = currentRole === 'civilian' ? 'role-civilian' : 'role-friend';
}

// 根据身份显示不同区域
function showSectionByRole() {
    const civilianSection = document.getElementById('civilianSection');
    const friendSection = document.getElementById('friendSection');

    if (currentRole === 'civilian') {
        civilianSection.style.display = 'block';
        friendSection.style.display = 'none';
    } else {
        civilianSection.style.display = 'none';
        friendSection.style.display = 'block';
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
    const time = document.getElementById('appointmentTime').value;
    const reason = document.getElementById('appointmentReason').value.trim();

    if (!date) {
        showToast('请选择预约日期', 'error');
        return;
    }

    if (!time) {
        showToast('请选择预约时间', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, date, time, reason })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('appointmentDate').value = '';
            document.getElementById('appointmentTime').value = '';
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
function loadCivilianAppointments(appointments) {
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

    listContainer.innerHTML = pageData.map(apt => `
        <div class="appointment-card">
            <div class="appointment-card-header">
                <div>
                    <div class="appointment-user">预约人：${apt.username}</div>
                    <div class="appointment-date">${formatDate(apt.date)}</div>
                    <div class="appointment-time">${apt.time}</div>
                </div>
                <div>
                    <span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span>
                </div>
            </div>
            <div class="appointment-reason">${apt.reason}</div>
            <div class="appointment-actions">
                ${apt.username === currentUser ? `<button class="btn btn-danger" onclick="cancelAppointment(${apt.id})">取消预约</button>` : ''}
            </div>
        </div>
    `).join('');

    renderPagination('civilianPagination', civilianCurrentPage, totalPages, 'civilian');
}

// 小友加载所有预约（带分页和筛选）
function loadAllAppointments(appointments) {
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

    listContainer.innerHTML = pageData.map(apt => `
        <div class="appointment-card">
            <div class="appointment-card-header">
                <div>
                    <div class="appointment-user">预约人：${apt.username}</div>
                    <div class="appointment-date">${formatDate(apt.date)}</div>
                    <div class="appointment-time">${apt.time}</div>
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
        </div>
    `).join('');

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