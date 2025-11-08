// 安全的Supabase客户端初始化函数
function initSupabase() {
    if (!window.SUPABASE_CONFIG) {
        console.error('Supabase配置未找到，请确保config.js已正确加载');
        throw new Error('Supabase配置缺失');
    }
    
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase库未加载，请检查CDN连接');
        throw new Error('Supabase库未加载');
    }
    
    const SUPABASE_URL = window.SUPABASE_CONFIG.url;
    const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;
    
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, window.SUPABASE_CONFIG.auth);
}

// 初始化Supabase客户端
let supabase;
try {
    supabase = initSupabase();
} catch (error) {
    console.error('Supabase初始化失败:', error);
    // 延迟重试
    setTimeout(() => {
        try {
            supabase = initSupabase();
            console.log('Supabase客户端重试初始化成功');
        } catch (retryError) {
            console.error('Supabase重试初始化失败:', retryError);
        }
    }, 1000);
}

// DOM元素
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const userEmail = document.getElementById('user-email');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const resetPasswordModal = document.getElementById('reset-password-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const resetPasswordForm = document.getElementById('reset-password-form');
const welcomeContent = document.getElementById('welcome-content');
const dashboard = document.getElementById('dashboard');

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化应用');
    initApp();
    setupEventListeners();
    checkPasswordReset();
});

// 初始化应用状态
async function initApp() {
    // 检查当前会话
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // 用户已登录
        showUserInterface(session.user);
    } else {
        // 用户未登录
        showGuestInterface();
    }

    // 监听认证状态变化
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            showUserInterface(session.user);
        } else if (event === 'SIGNED_OUT') {
            showGuestInterface();
        }
    });
}

// 检查URL中是否有密码重置令牌
function checkPasswordReset() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const type = urlParams.get('type');
    const access_token = urlParams.get('access_token');
    
    if (type === 'recovery' && access_token) {
        // 显示重置密码模态框
        showModal(resetPasswordModal);
    }
}

// 设置事件监听器
function setupEventListeners() {
    console.log('开始设置事件监听器');
    
    // 登录按钮
    console.log('登录按钮元素:', loginBtn);
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('登录按钮被点击');
            showModal(loginModal);
        });
    } else {
        console.error('登录按钮元素未找到');
    }

    // 注册按钮
    console.log('注册按钮元素:', registerBtn);
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            console.log('注册按钮被点击');
            showModal(registerModal);
        });
    } else {
        console.error('注册按钮元素未找到');
    }

    // 退出按钮
    logoutBtn.addEventListener('click', handleLogout);

    // 忘记密码链接
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    console.log('忘记密码链接元素:', forgotPasswordLink);
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            console.log('忘记密码链接被点击');
            e.preventDefault();
            hideAllModals();
            console.log('忘记密码模态框元素:', forgotPasswordModal);
            showModal(forgotPasswordModal);
        });
    } else {
        console.error('忘记密码链接元素未找到');
    }

    // 关闭模态框
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            hideAllModals();
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            hideAllModals();
        }
    });

    // 登录表单提交
    loginForm.addEventListener('submit', handleLogin);

    // 注册表单提交
    registerForm.addEventListener('submit', handleRegister);

    // 忘记密码表单提交
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);

    // 重置密码表单提交
    resetPasswordForm.addEventListener('submit', handleResetPassword);
}

// 显示模态框
function showModal(modal) {
    hideAllModals();
    modal.style.display = 'flex';
}

// 隐藏所有模态框
function hideAllModals() {
    loginModal.style.display = 'none';
    registerModal.style.display = 'none';
    forgotPasswordModal.style.display = 'none';
    resetPasswordModal.style.display = 'none';
    clearErrorMessages();
    clearForms();
}

// 清除错误消息
function clearErrorMessages() {
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    document.getElementById('forgot-password-error').textContent = '';
    document.getElementById('forgot-password-success').textContent = '';
    document.getElementById('forgot-password-success').style.display = 'none';
    document.getElementById('reset-password-error').textContent = '';
}

// 清除表单
function clearForms() {
    loginForm.reset();
    registerForm.reset();
    forgotPasswordForm.reset();
    resetPasswordForm.reset();
}

// 显示用户界面
function showUserInterface(user) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'flex';
    userEmail.textContent = user.email;
    welcomeContent.style.display = 'none';
    dashboard.style.display = 'block';
    hideAllModals();
}

// 显示访客界面
function showGuestInterface() {
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
    welcomeContent.style.display = 'block';
    dashboard.style.display = 'none';
}

// 处理登录
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    // 验证输入
    if (!email || !password) {
        errorElement.textContent = '请填写所有字段';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        // 登录成功
        console.log('登录成功:', data.user);
        hideAllModals();
        
        // 跳转到AI助手界面
        window.location.href = '/Demand/index.html';
        
    } catch (error) {
        console.error('登录错误:', error);
        errorElement.textContent = getErrorMessage(error);
    }
}

// 处理注册
async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorElement = document.getElementById('register-error');
    
    // 验证输入
    if (!email || !password || !confirmPassword) {
        errorElement.textContent = '请填写所有字段';
        return;
    }

    if (password !== confirmPassword) {
        errorElement.textContent = '密码不匹配';
        return;
    }

    if (password.length < 6) {
        errorElement.textContent = '密码至少需要6个字符';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        // 注册成功
        console.log('注册成功:', data.user);
        errorElement.textContent = '注册成功！请检查您的邮箱验证邮件。';
        errorElement.style.color = '#27ae60';
        errorElement.style.background = '#d5f4e6';
        errorElement.style.border = '1px solid #a3e4d7';
        
        // 3秒后关闭模态框
        setTimeout(() => {
            hideAllModals();
            // 重置错误消息样式
            errorElement.style.color = '';
            errorElement.style.background = '';
            errorElement.style.border = '';
        }, 3000);
        
    } catch (error) {
        console.error('注册错误:', error);
        errorElement.textContent = getErrorMessage(error);
    }
}

// 处理忘记密码
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('reset-email').value;
    const errorElement = document.getElementById('forgot-password-error');
    const successElement = document.getElementById('forgot-password-success');
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // 验证输入
    if (!email) {
        errorElement.textContent = '请输入邮箱地址';
        return;
    }

    if (!isValidEmail(email)) {
        errorElement.textContent = '请输入有效的邮箱地址';
        return;
    }

    // 设置加载状态
    setLoading(submitButton, true);
    
    try {
        console.log('开始发送密码重置邮件，邮箱:', email);
        console.log('Supabase配置检查:', {
            url: SUPABASE_URL,
            keyLength: SUPABASE_ANON_KEY.length
        });
        
        // 测试网络连接
        const testResponse = await fetch(SUPABASE_URL + '/auth/v1/settings', {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        if (!testResponse.ok) {
            throw new Error(`网络连接测试失败: ${testResponse.status} ${testResponse.statusText}`);
        }
        
        console.log('网络连接测试成功');
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:8080'
        });

        if (error) {
            console.error('Supabase API错误:', error);
            throw error;
        }

        // 发送成功
        console.log('密码重置邮件发送成功');
        successElement.textContent = '密码重置链接已发送到您的邮箱，请检查您的收件箱。';
        successElement.style.display = 'block';
        errorElement.textContent = '';
        
        // 5秒后关闭模态框
        setTimeout(() => {
            hideAllModals();
            successElement.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('忘记密码错误详情:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // 更详细的错误处理
        if (error.message && error.message.includes('fetch')) {
            errorElement.textContent = '网络连接失败，请检查：1) 网络连接 2) Supabase配置 3) 浏览器控制台错误信息';
        } else if (error.message && error.message.includes('CORS')) {
            errorElement.textContent = '跨域请求被阻止，请检查Supabase CORS配置。';
        } else if (error.message && error.message.includes('401')) {
            errorElement.textContent = '认证失败，请检查Supabase匿名密钥是否正确。';
        } else {
            errorElement.textContent = getErrorMessage(error);
        }
    } finally {
        setLoading(submitButton, false);
    }
}

// 处理重置密码
async function handleResetPassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const errorElement = document.getElementById('reset-password-error');
    
    // 验证输入
    if (!newPassword || !confirmNewPassword) {
        errorElement.textContent = '请填写所有字段';
        return;
    }

    if (newPassword !== confirmNewPassword) {
        errorElement.textContent = '密码不匹配';
        return;
    }

    if (newPassword.length < 6) {
        errorElement.textContent = '密码至少需要6个字符';
        return;
    }

    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }

        // 密码重置成功
        console.log('密码重置成功:', data.user);
        alert('密码重置成功！请使用新密码登录。');
        hideAllModals();
        
        // 清除URL中的重置令牌
        window.history.replaceState({}, document.title, window.location.pathname);
        
    } catch (error) {
        console.error('重置密码错误:', error);
        errorElement.textContent = getErrorMessage(error);
    }
}

// 处理退出
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        console.log('退出成功');
    } catch (error) {
        console.error('退出错误:', error);
        alert('退出失败，请重试');
    }
}

// 获取友好的错误消息
function getErrorMessage(error) {
    switch (error.message) {
        case 'Invalid login credentials':
            return '邮箱或密码错误';
        case 'Email not confirmed':
            return '请先验证您的邮箱';
        case 'User already registered':
            return '该邮箱已被注册';
        case 'Password should be at least 6 characters':
            return '密码至少需要6个字符';
        case 'Invalid email':
            return '邮箱格式不正确';
        case 'Email rate limit exceeded':
            return '发送邮件过于频繁，请稍后再试';
        case 'User not found':
            return '该邮箱未注册';
        case 'Password reset required':
            return '需要重置密码';
        default:
            return error.message || '发生错误，请重试';
    }
}

// 工具函数：显示加载状态
function setLoading(button, isLoading) {
    const originalText = button.textContent;
    if (isLoading) {
        button.disabled = true;
        button.textContent = '处理中...';
    } else {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 工具函数：验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}