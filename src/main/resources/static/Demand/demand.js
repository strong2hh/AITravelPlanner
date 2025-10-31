// 从config.js获取Supabase配置
if (!window.SUPABASE_CONFIG) {
    console.error('Supabase配置未找到，请确保config.js已正确加载');
    throw new Error('Supabase配置缺失');
}

const SUPABASE_URL = window.SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;

// 验证配置
console.log('Supabase配置检查:', {
    url: SUPABASE_URL,
    keyLength: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : '未定义',
    keyPrefix: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 10) + '...' : '未定义'
});

// 初始化Supabase客户端 - 使用修复后的配置
const supabase = createSupabaseClientWithManualHeaders();

// DOM元素
const userMenu = document.getElementById('user-menu');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message');
const clearChatBtn = document.getElementById('clear-chat');

// 聊天状态管理
let chatHistory = [];

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI旅行规划助手页面加载完成');
    initApp();
    setupEventListeners();
});

// 修复API密钥问题 - 手动添加API密钥到请求
function createSupabaseClientWithManualHeaders() {
    // 创建标准的Supabase客户端
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    
    // 重写fetch方法，手动添加API密钥
    const originalFetch = client.fetch.bind(client);
    client.fetch = async (input, init = {}) => {
        // 确保headers存在
        const headers = new Headers(init.headers || {});
        
        // 手动添加API密钥
        if (!headers.has('apikey')) {
            headers.set('apikey', SUPABASE_ANON_KEY);
        }
        
        // 如果已经有Authorization头，确保它是Bearer格式
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        }
        
        // 更新init对象
        init.headers = headers;
        
        console.log('发送请求头:', Object.fromEntries(headers.entries()));
        
        return originalFetch(input, init);
    };
    
    return client;
}

// 初始化应用状态
async function initApp() {
    // 检查当前会话
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // 用户已登录
        showUserInterface(session.user);
    } else {
        // 用户未登录，跳转到登录页面
        window.location.href = '/LogIn/index.html';
    }

    // 监听认证状态变化
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            // 用户退出，跳转到登录页面
            window.location.href = '/LogIn/index.html';
        }
    });
}

// 设置事件监听器
function setupEventListeners() {
    console.log('开始设置事件监听器');
    
    // 退出按钮
    logoutBtn.addEventListener('click', handleLogout);

    // 聊天相关事件
    sendMessageBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    clearChatBtn.addEventListener('click', handleClearChat);
    
    console.log('事件监听器设置完成');
}

// 显示用户界面
function showUserInterface(user) {
    userEmail.textContent = user.email;
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

// 处理发送消息
async function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // 禁用输入框和按钮
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
    
    // 添加用户消息到聊天记录
    addMessageToChat('user', message);
    chatInput.value = '';
    
    // 显示AI正在处理提示
    addMessageToChat('bot', 'AI正在处理您的请求，请稍候...');
    
    // 直接调用AI接口
    try {
        // 构建请求数据
        const requestData = {
            message: message
        };
        
        console.log('发送到AI接口的请求数据:', requestData);
        
        // 调用后端API
        const response = await fetch('/api/generate-travel-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('AI返回结果:', result);
        
        // 显示AI回复
        if (result.travelPlan) {
            addMessageToChat('bot', result.travelPlan);
        } else if (result.message) {
            addMessageToChat('bot', result.message);
        } else {
            addMessageToChat('bot', 'AI已处理完成，但未返回具体内容。');
        }
        
    } catch (error) {
        console.error('调用AI接口失败:', error);
        addMessageToChat('bot', '抱歉，AI处理失败: ' + error.message);
    }
    
    // 重新启用输入框和按钮
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;
    chatInput.focus();
}

// 添加消息到聊天界面
function addMessageToChat(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 处理换行符 - 统一处理所有类型的换行符
    const formattedContent = content.replace(/\r\n|\r|\n/g, '<br>');
    contentDiv.innerHTML = formattedContent;
    
    // 添加时间戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    contentDiv.appendChild(timeDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 保存到聊天历史
    chatHistory.push({
        sender: sender,
        content: content,
        timestamp: new Date().toISOString()
    });
}

// 处理清空聊天
function handleClearChat() {
    if (confirm('确定要清空聊天记录吗？')) {
        chatMessages.innerHTML = '';
        chatHistory = [];
        
        // 重新添加欢迎消息
        addMessageToChat('bot', '您好！我是AI旅行规划助手，请告诉我您的旅行需求，我会为您生成个性化的旅行计划。');
    }
}