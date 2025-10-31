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
const saveDraftBtn = document.getElementById('save-draft');
const demandConfirm = document.getElementById('demand-confirm');
const demandSummary = document.getElementById('demand-summary');
const confirmDemandBtn = document.getElementById('confirm-demand');
const editDemandBtn = document.getElementById('edit-demand');
const loadingElement = document.getElementById('loading');
const resultElement = document.getElementById('result');
const travelPlanElement = document.getElementById('travel-plan');
const downloadPlanBtn = document.getElementById('download-plan');
const newPlanBtn = document.getElementById('new-plan');

// 模态对话框元素
const modalOverlay = document.getElementById('modal-overlay');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');

// 保存状态指示器
const saveStatus = document.getElementById('save-status');
const saveStatusIcon = document.getElementById('save-status-icon');
const saveStatusText = document.getElementById('save-status-text');

// 聊天状态管理
let currentDemandData = {
    destination: '',
    startDate: '',
    endDate: '',
    budget: 0,
    travelers: 1,
    preferences: '',
    specialRequirements: ''
};

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
    saveDraftBtn.addEventListener('click', handleSaveDraft);
    
    // 需求确认相关事件
    confirmDemandBtn.addEventListener('click', handleConfirmDemand);
    editDemandBtn.addEventListener('click', handleEditDemand);

    // 结果相关事件
    downloadPlanBtn.addEventListener('click', handleDownloadPlan);
    newPlanBtn.addEventListener('click', handleNewPlan);

    // 模态对话框事件
    modalConfirm.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
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
    
    // 显示正在输入状态
    showTypingIndicator();
    
    // 延迟处理，模拟AI思考时间
    setTimeout(async () => {
        // 解析用户消息并提取需求信息
        const extractedData = extractDemandFromMessage(message);
        updateCurrentDemandData(extractedData);
        
        // 检查是否已收集到足够的信息
        const missingFields = checkMissingFields();
        
        // 隐藏正在输入状态
        hideTypingIndicator();
        
        if (missingFields.length === 0) {
            // 所有信息都已收集，显示确认界面
            const botResponse = generateBotResponse(missingFields);
            addMessageToChat('bot', botResponse);
            setTimeout(() => showDemandConfirm(), 500);
        } else {
            // 询问缺失的信息
            const botResponse = generateBotResponse(missingFields);
            addMessageToChat('bot', botResponse);
        }
        
        // 重新启用输入框和按钮
        chatInput.disabled = false;
        sendMessageBtn.disabled = false;
        chatInput.focus();
        
    }, 1500); // 1.5秒延迟
}

// 从消息中提取需求信息
function extractDemandFromMessage(message) {
    const extractedData = {};
    
    // 提取目的地
    const destinationMatch = message.match(/(?:去|想去|目的地|目标)([^，。！？\n]+)/);
    if (destinationMatch) {
        extractedData.destination = destinationMatch[1].trim();
    }
    
    // 提取日期
    const dateMatch = message.match(/(\d{1,4}[年\-/.]\d{1,2}[月\-/.]\d{1,2}[日]?)[到至](\d{1,4}[年\-/.]\d{1,2}[月\-/.]\d{1,2}[日]?)/);
    if (dateMatch) {
        extractedData.startDate = formatDate(dateMatch[1]);
        extractedData.endDate = formatDate(dateMatch[2]);
    }
    
    // 提取预算
    const budgetMatch = message.match(/(\d+)(?:元|块钱|人民币)/);
    if (budgetMatch) {
        extractedData.budget = parseInt(budgetMatch[1]);
    }
    
    // 提取人数
    const travelersMatch = message.match(/(\d+)(?:人|个人)/);
    if (travelersMatch) {
        extractedData.travelers = parseInt(travelersMatch[1]);
    }
    
    // 提取偏好和特殊需求
    const preferencesMatch = message.match(/(?:喜欢|偏好|爱好)([^，。！？\n]+)/);
    if (preferencesMatch) {
        extractedData.preferences = preferencesMatch[1].trim();
    }
    
    const requirementsMatch = message.match(/(?:需要|要求|特殊)([^，。！？\n]+)/);
    if (requirementsMatch) {
        extractedData.specialRequirements = requirementsMatch[1].trim();
    }
    
    return extractedData;
}

// 格式化日期
function formatDate(dateStr) {
    // 简单的日期格式化，实际应用中可能需要更复杂的处理
    return dateStr.replace(/[年月]/g, '-').replace(/日/g, '');
}

// 显示正在输入状态
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.className = 'message bot-message typing-indicator';
    typingIndicator.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span>AI正在思考...</span>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 隐藏正在输入状态
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 改进的消息添加函数
function addMessageToChat(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 处理换行符 - 统一处理所有换行符格式
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

// 更新当前需求数据
function updateCurrentDemandData(newData) {
    Object.keys(newData).forEach(key => {
        if (newData[key]) {
            currentDemandData[key] = newData[key];
        }
    });
    
    console.log('更新后的需求数据:', currentDemandData);
}

// 检查缺失的字段
function checkMissingFields() {
    const requiredFields = ['destination', 'startDate', 'endDate', 'budget', 'travelers'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        if (!currentDemandData[field] || currentDemandData[field] === '') {
            missingFields.push(field);
        }
    });
    
    return missingFields;
}

// 生成机器人回复
function generateBotResponse(missingFields) {
    const fieldNames = {
        destination: '旅行目的地',
        startDate: '出发日期',
        endDate: '返回日期',
        budget: '预算金额',
        travelers: '同行人数'
    };
    
    if (missingFields.length === 0) {
        return '太好了！我已经收集到所有必要的信息。请确认您的旅行需求是否正确。';
    }
    
    const missingFieldNames = missingFields.map(field => fieldNames[field]);
    
    if (missingFields.length === 1) {
        return `我还需要知道您的${missingFieldNames[0]}信息，请告诉我吧！`;
    } else {
        return `我还需要知道以下信息：${missingFieldNames.join('、')}，请告诉我吧！`;
    }
}

// 显示需求确认界面
function showDemandConfirm() {
    const summaryHTML = `
        <ul>
            <li><strong>目的地：</strong>${currentDemandData.destination}</li>
            <li><strong>出发日期：</strong>${currentDemandData.startDate}</li>
            <li><strong>返回日期：</strong>${currentDemandData.endDate}</li>
            <li><strong>预算：</strong>${currentDemandData.budget}元</li>
            <li><strong>同行人数：</strong>${currentDemandData.travelers}人</li>
            ${currentDemandData.preferences ? `<li><strong>旅行偏好：</strong>${currentDemandData.preferences}</li>` : ''}
            ${currentDemandData.specialRequirements ? `<li><strong>特殊需求：</strong>${currentDemandData.specialRequirements}</li>` : ''}
        </ul>
    `;
    
    demandSummary.innerHTML = summaryHTML;
    demandConfirm.style.display = 'block';
    
    // 滚动到确认区域
    demandConfirm.scrollIntoView({ behavior: 'smooth' });
}

// 处理确认需求
async function handleConfirmDemand() {
    // 验证数据
    if (!validateDemandData(currentDemandData)) {
        return;
    }
    
    // 显示加载状态
    showLoading();
    
    try {
        // 生成旅行计划
        await generateTravelPlan(currentDemandData);
        
    } catch (error) {
        console.error('生成旅行计划失败:', error);
        hideLoading();
        showError('生成旅行计划失败: ' + error.message);
    }
}

// 处理编辑需求
function handleEditDemand() {
    demandConfirm.style.display = 'none';
    addMessageToChat('bot', '好的，请告诉我您需要修改哪些信息？');
}

// 处理清空聊天
function handleClearChat() {
    if (confirm('确定要清空聊天记录吗？')) {
        chatMessages.innerHTML = '';
        chatHistory = [];
        currentDemandData = {
            destination: '',
            startDate: '',
            endDate: '',
            budget: 0,
            travelers: 1,
            preferences: '',
            specialRequirements: ''
        };
        demandConfirm.style.display = 'none';
        
        // 重新添加欢迎消息
        addMessageToChat('bot', '您好！我是AI旅行规划助手，请告诉我您的旅行需求，例如：\n\n- 想去哪里旅行？\n- 什么时间出发和返回？\n- 预算是多少？\n- 几个人同行？\n- 有什么特别的偏好或需求？\n\n您可以一次性告诉我所有信息，也可以分多次说明。');
    }
}

// 验证需求数据
function validateDemandData(data) {
    if (!data.destination || data.destination.trim() === '') {
        showError('请输入旅行目的地');
        return false;
    }

    if (!data.startDate) {
        showError('请选择起始日期');
        return false;
    }
    
    if (!data.endDate) {
        showError('请选择截止日期');
        return false;
    }
    
    if (data.endDate < data.startDate) {
        showError('截止日期不能早于起始日期');
        return false;
    }

    if (!data.budget || data.budget <= 0) {
        showError('请输入有效的预算金额');
        return false;
    }

    if (!data.travelers || data.travelers < 1) {
        showError('请选择同行人数');
        return false;
    }

    return true;
}

// 保存草稿
async function handleSaveDraft() {
    if (Object.values(currentDemandData).every(value => !value || value === '' || value === 0)) {
        showError('请先输入一些旅行需求信息');
        return;
    }
    
    try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
            const demandData = {
                ...currentDemandData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // 检查是否已存在草稿
            const { data: existingDrafts } = await supabase
                .from('travel_demands')
                .select('*')
                .eq('user_id', userData.user.id)
                .eq('status', 'draft')
                .eq('destination', demandData.destination)
                .limit(1);

            let result;
            
            if (existingDrafts && existingDrafts.length > 0) {
                // 更新现有草稿
                const { data, error } = await supabase
                    .from('travel_demands')
                    .update({
                        destination: demandData.destination,
                        start_date: demandData.startDate,
                        end_date: demandData.endDate,
                        budget: demandData.budget,
                        travelers: demandData.travelers,
                        preferences: demandData.preferences,
                        special_requirements: demandData.specialRequirements,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingDrafts[0].id)
                    .select();

                if (error) throw error;
                result = data;
                showSuccess('草稿更新成功');
                
            } else {
                // 创建新草稿
                const { data, error } = await supabase
                    .from('travel_demands')
                    .insert([
                        {
                            user_id: userData.user.id,
                            destination: demandData.destination,
                            start_date: demandData.startDate,
                            end_date: demandData.endDate,
                            budget: demandData.budget,
                            travelers: demandData.travelers,
                            preferences: demandData.preferences,
                            special_requirements: demandData.specialRequirements,
                            status: 'draft',
                            created_at: demandData.created_at,
                            updated_at: demandData.updated_at
                        }
                    ])
                    .select();

                if (error) throw error;
                result = data;
                showSuccess('草稿保存成功');
            }
            
        } else {
            throw new Error('用户信息获取失败，请重新登录');
        }
        
    } catch (error) {
        console.error('保存草稿错误:', error);
        showError('保存草稿失败: ' + error.message);
    }
}

// 生成旅行计划（调用AI接口）
async function generateTravelPlan(demandData) {
    try {
        console.log('开始调用AI生成旅行计划，数据:', demandData);
        
        // 构建请求数据
        const requestData = {
            destination: demandData.destination,
            startDate: demandData.startDate,
            endDate: demandData.endDate,
            budget: demandData.budget,
            travelers: demandData.travelers,
            preferences: demandData.preferences,
            specialRequirements: demandData.specialRequirements
        };
        
        console.log('发送到后端的请求数据:', requestData);
        
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
        
        // 显示AI生成的旅行计划
        displayAITravelPlan(result.travelPlan, demandData);
        hideLoading();
        showResult();
        
    } catch (error) {
        console.error('生成旅行计划失败:', error);
        hideLoading();
        showError('AI旅行计划生成失败: ' + error.message);
    }
}

// 显示AI生成的旅行计划
function displayAITravelPlan(aiResponse, demandData) {
    try {
        // 解析AI返回的JSON数据
        const aiData = JSON.parse(aiResponse);
        
        // 检查是否有具体的回复内容
        let planContent = '';
        
        if (aiData.output && aiData.output.choices && aiData.output.choices.length > 0) {
            // 从AI回复中提取文本内容
            const choice = aiData.output.choices[0];
            if (choice.message && choice.message.content) {
                planContent = choice.message.content;
            }
        } else if (aiData.output && aiData.output.text) {
            // 备用格式：直接提取text字段
            planContent = aiData.output.text;
        } else {
            // 如果无法解析，显示原始JSON
            planContent = 'AI回复格式：\n' + JSON.stringify(aiData, null, 2);
        }
        
        // 创建HTML内容
        const html = `
            <div class="plan-summary">
                <h4>${demandData.destination} ${demandData.startDate} 至 ${demandData.endDate} AI旅行计划</h4>
                <p>基于您的需求，AI为您生成了以下旅行计划：</p>
            </div>
            
            <div class="plan-content">
                <div class="ai-response">
                    <h5>AI生成的旅行计划</h5>
                    <div class="response-text">
                        ${formatAIText(planContent)}
                    </div>
                </div>
            </div>
            
            <div class="plan-details">
                <h5>您的旅行需求</h5>
                <ul>
                    <li><strong>目的地：</strong>${demandData.destination}</li>
                    <li><strong>出发日期：</strong>${demandData.startDate}</li>
                    <li><strong>返回日期：</strong>${demandData.endDate}</li>
                    <li><strong>预算：</strong>${demandData.budget}元</li>
                    <li><strong>同行人数：</strong>${demandData.travelers}人</li>
                    ${demandData.preferences ? `<li><strong>旅行偏好：</strong>${demandData.preferences}</li>` : ''}
                    ${demandData.specialRequirements ? `<li><strong>特殊要求：</strong>${demandData.specialRequirements}</li>` : ''}
                </ul>
            </div>
        `;
        
        travelPlanElement.innerHTML = html;
        
    } catch (error) {
        console.error('解析AI回复失败:', error);
        
        // 如果解析失败，显示原始回复
        const html = `
            <div class="plan-summary">
                <h4>${demandData.destination} ${demandData.startDate} 至 ${demandData.endDate} 旅行计划</h4>
                <p>AI生成的旅行计划：</p>
            </div>
            
            <div class="plan-content">
                <div class="ai-response">
                    <h5>AI回复内容</h5>
                    <div class="response-text">
                        <pre>${aiResponse}</pre>
                    </div>
                </div>
            </div>
        `;
        
        travelPlanElement.innerHTML = html;
    }
}

// 格式化AI文本（将换行符转换为HTML）
function formatAIText(text) {
    if (!text) return '';
    
    // 将换行符转换为<br>标签
    return text.replace(/\\r\\n/g, '<br>').replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
}

// 下载旅行计划
function handleDownloadPlan() {
    const planContent = travelPlanElement.innerText;
    const blob = new Blob([planContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-plan.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// 创建新计划
function handleNewPlan() {
    hideResult();
    handleClearChat();
}

// 模态对话框功能
function showModal(type, title, content, options = {}) {
    // 设置图标
    modalIcon.className = 'modal-icon';
    modalIcon.textContent = '';
    
    switch (type) {
        case 'success':
            modalIcon.className += ' success';
            modalIcon.textContent = '✓';
            break;
        case 'warning':
            modalIcon.className += ' warning';
            modalIcon.textContent = '⚠';
            break;
        case 'error':
            modalIcon.className += ' error';
            modalIcon.textContent = '✗';
            break;
        case 'info':
            modalIcon.className += ' info';
            modalIcon.textContent = 'ℹ';
            break;
    }
    
    modalTitle.textContent = title;
    modalContent.textContent = content;
    
    // 设置按钮
    modalConfirm.textContent = options.confirmText || '确定';
    modalCancel.style.display = options.showCancel ? 'inline-block' : 'none';
    
    // 显示模态框
    modalOverlay.classList.add('active');
    
    // 返回Promise以便处理用户选择
    return new Promise((resolve) => {
        const handleConfirm = () => {
            closeModal();
            resolve(true);
        };
        
        const handleCancel = () => {
            closeModal();
            resolve(false);
        };
        
        modalConfirm.onclick = handleConfirm;
        modalCancel.onclick = handleCancel;
    });
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// 状态指示器功能
function showStatus(type, message, duration = 3000) {
    saveStatus.className = 'save-status';
    saveStatusIcon.textContent = '';
    
    switch (type) {
        case 'success':
            saveStatus.className += ' success';
            saveStatusIcon.textContent = '✓';
            break;
        case 'warning':
            saveStatus.className += ' warning';
            saveStatusIcon.textContent = '⚠';
            break;
        case 'error':
            saveStatus.className += ' error';
            saveStatusIcon.textContent = '✗';
            break;
        case 'info':
            saveStatus.className += ' info';
            saveStatusIcon.textContent = 'ℹ';
            break;
    }
    
    saveStatusText.textContent = message;
    saveStatus.classList.add('show');
    
    // 自动隐藏
    setTimeout(() => {
        saveStatus.classList.remove('show');
    }, duration);
}

// 显示/隐藏函数
function showLoading() {
    loadingElement.style.display = 'block';
    demandConfirm.style.display = 'none';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

function showResult() {
    resultElement.style.display = 'block';
    demandConfirm.style.display = 'none';
}

function hideResult() {
    resultElement.style.display = 'none';
}

function showError(message) {
    showStatus('error', message);
}

function showSuccess(message) {
    showStatus('success', message);
}