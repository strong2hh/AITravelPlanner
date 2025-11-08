// Demand.js - AI旅行规划器前端交互逻辑（修复版）

console.log('开始加载修复版demand.js');

// 全局变量
let supabase = null;
let currentUser = null;
let demandData = null;
let currentChatHistory = [];

// 语音识别相关变量
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = 0;

// 简单安全的Supabase客户端初始化函数
function initSupabase() {
    try {
        console.log('开始初始化Supabase...');
        
        // 检查配置是否存在
        if (!window.SUPABASE_CONFIG) {
            console.warn('Supabase配置未找到，将使用本地模式');
            return null;
        }
        
        // 检查Supabase库是否加载
        if (typeof window.supabase === 'undefined') {
            console.warn('Supabase库未加载，将使用本地模式');
            return null;
        }
        
        const SUPABASE_URL = window.SUPABASE_CONFIG.url;
        const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;
        
        console.log('使用Supabase URL:', SUPABASE_URL.substring(0, 30) + '...');
        
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, window.SUPABASE_CONFIG.auth);
        console.log('Supabase客户端创建成功');
        return client;
        
    } catch (error) {
        console.error('Supabase初始化失败:', error);
        return null;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - 开始页面初始化');
    
    // 立即绑定基本事件，确保语音功能可用
    bindBasicEvents();
    
    // 检查语音识别功能是否可用
    checkVoiceRecognitionSupport();
    
    // 异步初始化Supabase（不阻塞页面）
    setTimeout(() => {
        supabase = initSupabase();
        if (supabase) {
            console.log('Supabase初始化完成');
        } else {
            console.log('Supabase不可用，使用本地模式');
        }
    }, 100);
    
    // 其他初始化
    setTimeout(() => {
        try {
            loadDraft();
            console.log('页面功能初始化完成');
        } catch (error) {
            console.error('页面初始化失败:', error);
        }
    }, 200);
});

// 基础事件绑定（确保即使有错误也能工作）
function bindBasicEvents() {
    console.log('绑定基础事件...');
    
    // 发送消息按钮
    const sendBtn = document.getElementById('send-message');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        console.log('发送消息按钮绑定成功');
    }
    
    // 清空对话按钮
    const clearBtn = document.getElementById('clear-chat');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearChat);
        console.log('清空对话按钮绑定成功');
    }
    
    // 保存草稿按钮
    const saveBtn = document.getElementById('save-draft');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveDraft);
        console.log('保存草稿按钮绑定成功');
    }
    
    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('退出按钮绑定成功');
    }
    
    // 回车键发送消息
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        console.log('输入框回车事件绑定成功');
    }
    
    // 模态框确认按钮
    const modalConfirm = document.getElementById('modal-confirm');
    if (modalConfirm) {
        modalConfirm.addEventListener('click', hideModal);
        console.log('模态框确认按钮绑定成功');
    }
    
    // 模态框取消按钮
    const modalCancel = document.getElementById('modal-cancel');
    if (modalCancel) {
        modalCancel.addEventListener('click', hideModal);
        console.log('模态框取消按钮绑定成功');
    }
    
    // 点击模态框背景关闭
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
        console.log('模态框背景点击关闭绑定成功');
    }
    
    // 语音识别按钮
    bindVoiceRecognitionEvents();
}

// 完整事件绑定
function bindEvents() {
    console.log('绑定所有事件...');
    
    try {
        bindBasicEvents();
        
        // 其他按钮（如果有的话）
        const confirmBtn = document.getElementById('confirm-demand');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmDemand);
        }
        
        const editBtn = document.getElementById('edit-demand');
        if (editBtn) {
            editBtn.addEventListener('click', editDemand);
        }
        
        const downloadBtn = document.getElementById('download-plan');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadPlan);
        }
        
        const newBtn = document.getElementById('new-plan');
        if (newBtn) {
            newBtn.addEventListener('click', newPlan);
        }
        
        // 模态框按钮
        const modalConfirm = document.getElementById('modal-confirm');
        if (modalConfirm) {
            modalConfirm.addEventListener('click', hideModal);
        }
        
        const modalCancel = document.getElementById('modal-cancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', hideModal);
        }
        
        console.log('所有事件绑定完成');
        
    } catch (error) {
        console.error('绑定事件时出错:', error);
        // 即使有错误，也要确保基本功能
        bindBasicEvents();
    }
}

// =============================
// 核心功能实现
// =============================

// 发送消息
async function sendMessage() {
    console.log('发送消息功能被调用');
    
    const input = document.getElementById('chat-input');
    const message = input ? input.value.trim() : '';
    
    if (!message) {
        showModal('warning', '提示', '请输入消息内容');
        return;
    }
    
    // 添加用户消息到聊天记录
    addMessageToChat('user', message);
    
    // 清空输入框
    if (input) {
        input.value = '';
    }
    
    // 显示AI思考状态
    showTypingIndicator();
    
    try {
        // 调用后端API
        const response = await fetch('/api/process-demand', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                chatHistory: currentChatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 添加AI回复到聊天记录
            addMessageToChat('bot', data.response);
            
            // 更新需求数据
            if (data.demandData) {
                demandData = data.demandData;
                
                // 如果需求已完整，显示确认界面
                if (data.isDemandComplete) {
                    showDemandConfirm(data.demandData);
                }
            }
            
        } else {
            throw new Error(data.error || '处理请求失败');
        }
        
    } catch (error) {
        console.error('发送消息失败:', error);
        addMessageToChat('bot', '抱歉，处理您的请求时出现了问题。请稍后重试。');
    } finally {
        hideTypingIndicator();
    }
}

// 添加消息到聊天界面
function addMessageToChat(type, content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${type}-message`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${type === 'bot' ? '🤖' : '👤'}</div>
        <div class="message-content">
            ${content}
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 添加到历史记录
    currentChatHistory.push({
        type: type,
        content: content,
        timestamp: new Date().toISOString()
    });
}

// 显示AI思考状态
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.className = 'typing-indicator visible';
    typingIndicator.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 隐藏AI思考状态
function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 清空对话
function clearChat() {
    if (confirm('确定要清空当前对话吗？所有未保存的内容将丢失。')) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <p>您好！我是AI旅行规划助手，请告诉我您的旅行需求，例如：</p>
                        <ul>
                            <li>想去哪里旅行？</li>
                            <li>什么时间出发和返回？</li>
                            <li>预算是多少？</li>
                            <li>几个人同行？</li>
                            <li>有什么特别的偏好或需求？</li>
                        </ul>
                        <p>您可以一次性告诉我所有信息，也可以分多次说明。</p>
                    </div>
                </div>
            `;
        }
        
        currentChatHistory = [];
        demandData = null;
        
        // 隐藏确认和结果区域
        const confirmDiv = document.getElementById('demand-confirm');
        if (confirmDiv) confirmDiv.style.display = 'none';
        
        const resultDiv = document.getElementById('result');
        if (resultDiv) resultDiv.style.display = 'none';
        
        showSaveStatus('success', '对话已清空');
    }
}

// 保存草稿
function saveDraft() {
    const draft = {
        chatHistory: currentChatHistory,
        demandData: demandData,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('travel-plan-draft', JSON.stringify(draft));
    showSaveStatus('success', '草稿已保存');
}

// 加载草稿
function loadDraft() {
    const draft = localStorage.getItem('travel-plan-draft');
    if (draft) {
        try {
            const parsedDraft = JSON.parse(draft);
            currentChatHistory = parsedDraft.chatHistory || [];
            demandData = parsedDraft.demandData || null;
            
            // 如果有聊天历史，重新渲染
            if (currentChatHistory.length > 0) {
                renderChatHistory();
                showSaveStatus('success', '草稿已加载');
            }
        } catch (error) {
            console.error('加载草稿失败:', error);
        }
    }
}

// 重新渲染聊天历史
function renderChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    currentChatHistory.forEach(item => {
        addMessageToChat(item.type, item.content);
    });
}

// 退出登录
async function logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    window.location.href = '/LogIn/index.html';
}

// =============================
// 其他功能（简化版）
// =============================

function showDemandConfirm(demandData) {
    const demandSummary = document.getElementById('demand-summary');
    if (demandSummary) {
        let html = '<ul>';
        if (demandData.destination) html += `<li><strong>目的地：</strong>${demandData.destination}</li>`;
        if (demandData.startDate) html += `<li><strong>出发日期：</strong>${demandData.startDate}</li>`;
        if (demandData.endDate) html += `<li><strong>返回日期：</strong>${demandData.endDate}</li>`;
        if (demandData.budget) html += `<li><strong>预算：</strong>${demandData.budget}</li>`;
        if (demandData.people) html += `<li><strong>人数：</strong>${demandData.people}</li>`;
        if (demandData.preferences) html += `<li><strong>偏好：</strong>${demandData.preferences}</li>`;
        html += '</ul>';
        
        demandSummary.innerHTML = html;
    }
    
    const confirmDiv = document.getElementById('demand-confirm');
    if (confirmDiv) confirmDiv.style.display = 'block';
}

function confirmDemand() {
    showModal('warning', '功能开发中', '确认需求功能正在开发中');
}

function editDemand() {
    const confirmDiv = document.getElementById('demand-confirm');
    if (confirmDiv) confirmDiv.style.display = 'none';
    addMessageToChat('bot', '好的，请告诉我您要修改的需求细节。');
}

function downloadPlan() {
    showModal('warning', '功能开发中', '下载计划功能正在开发中');
}

function newPlan() {
    clearChat();
    const resultDiv = document.getElementById('result');
    if (resultDiv) resultDiv.style.display = 'none';
}

// =============================
// UI工具函数
// =============================

// 显示模态框
function showModal(type, title, content) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    if (!modalOverlay || !modalIcon || !modalTitle || !modalContent) return;
    
    // 设置图标
    modalIcon.className = `modal-icon ${type}`;
    modalIcon.innerHTML = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
    
    modalTitle.textContent = title;
    modalContent.innerHTML = `<p>${content}</p>`;
    
    modalOverlay.classList.add('active');
}

// 隐藏模态框
function hideModal() {
    console.log('隐藏模态框被调用');
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        console.log('模态框已隐藏');
    } else {
        console.error('找不到模态框元素');
    }
}

// 显示保存状态
function showSaveStatus(type, message) {
    const saveStatus = document.getElementById('save-status');
    const saveStatusIcon = document.getElementById('save-status-icon');
    const saveStatusText = document.getElementById('save-status-text');
    
    if (!saveStatus || !saveStatusIcon || !saveStatusText) return;
    
    saveStatus.className = `save-status ${type}`;
    saveStatusIcon.innerHTML = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
    saveStatusText.textContent = message;
    
    saveStatus.classList.add('show');
    
    setTimeout(() => {
        saveStatus.classList.remove('show');
    }, 3000);
}

// =============================
// 语音识别功能（完整实现）
// =============================

function bindVoiceRecognitionEvents() {
    console.log('绑定语音识别事件...');
    
    const voiceBtn = document.getElementById('voice-btn');
    const voiceIcon = voiceBtn ? voiceBtn.querySelector('.voice-icon') : null;
    const voiceText = voiceBtn ? voiceBtn.querySelector('.voice-text') : null;
    
    if (!voiceBtn) {
        console.warn('语音识别按钮未找到');
        return;
    }
    
    console.log('找到语音识别按钮，开始绑定语音识别功能');
    
// 简化语音按钮事件绑定 - 直接使用统一处理函数
voiceBtn.addEventListener('click', handleVoiceButtonClick);

console.log('语音按钮事件绑定完成');
    
    console.log('语音识别按钮绑定完成');
}

// 使用浏览器原生语音识别API
function handleVoiceRecognition(e) {
    e.preventDefault();
    
    if (isRecording) {
        stopRecording();
        return;
    }
    
    startRecording();
}

// 开始录音
function startRecording() {
    console.log('开始语音识别...');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // 配置识别参数
    recognition.continuous = true; // 连续识别
    recognition.interimResults = true; // 显示中间结果
    recognition.lang = 'zh-CN'; // 中文识别
    
    const voiceBtn = document.getElementById('voice-btn');
    const voiceIcon = voiceBtn ? voiceBtn.querySelector('.voice-icon') : null;
    const voiceText = voiceBtn ? voiceBtn.querySelector('.voice-text') : null;
    
    // 更新按钮状态
    if (voiceBtn) voiceBtn.classList.add('recording');
    if (voiceIcon) voiceIcon.innerHTML = '🎤';
    if (voiceText) voiceText.textContent = '录音中...';
    
    isRecording = true;
    
    recognition.onstart = function() {
        console.log('语音识别开始');
        showModal('info', '语音识别', '请开始说话...');
    };
    
    recognition.onresult = function(event) {
        console.log('收到语音识别结果');
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // 如果有最终结果，添加到输入框
        if (finalTranscript) {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = finalTranscript.trim();
                chatInput.focus();
            }
            
            // 停止录音
            recognition.stop();
            
            showModal('success', '语音识别', `识别结果：${finalTranscript}`);
        }
    };
    
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        isRecording = false;
        
        // 恢复按钮状态
        if (voiceBtn) voiceBtn.classList.remove('recording');
        if (voiceIcon) voiceIcon.innerHTML = '🎤';
        if (voiceText) voiceText.textContent = '按住说话';
        
        let errorMessage = '语音识别出错';
        switch(event.error) {
            case 'not-allowed':
                errorMessage = '请允许浏览器使用麦克风权限';
                break;
            case 'no-speech':
                errorMessage = '没有检测到语音，请重新尝试';
                break;
            case 'audio-capture':
                errorMessage = '无法访问麦克风';
                break;
        }
        
        showModal('error', '语音识别错误', errorMessage);
    };
    
    recognition.onend = function() {
        console.log('语音识别结束');
        isRecording = false;
        
        // 恢复按钮状态
        if (voiceBtn) voiceBtn.classList.remove('recording');
        if (voiceIcon) voiceIcon.innerHTML = '🎤';
        if (voiceText) voiceText.textContent = '按住说话';
    };
    
    // 开始识别
    try {
        recognition.start();
    } catch (error) {
        console.error('启动语音识别失败:', error);
        showModal('error', '语音识别', '启动语音识别失败，请检查麦克风权限');
    }
}

// 停止录音
function stopRecording() {
    console.log('停止录音');
    isRecording = false;
    
    const voiceBtn = document.getElementById('voice-btn');
    const voiceIcon = voiceBtn ? voiceBtn.querySelector('.voice-icon') : null;
    const voiceText = voiceBtn ? voiceBtn.querySelector('.voice-text') : null;
    
    // 恢复按钮状态
    if (voiceBtn) voiceBtn.classList.remove('recording');
    if (voiceIcon) voiceIcon.innerHTML = '🎤';
    if (voiceText) voiceText.textContent = '按住说话';
}

// 使用后端语音识别服务
function handleVoiceRecognitionBackend(e) {
    e.preventDefault();
    
    if (isRecording) {
        stopRecording();
        return;
    }
    
    startBackendRecording();
}

// 开始后端录音
async function startBackendRecording() {
    console.log('开始后端语音识别...');
    
    const voiceBtn = document.getElementById('voice-btn');
    const voiceIcon = voiceBtn ? voiceBtn.querySelector('.voice-icon') : null;
    const voiceText = voiceBtn ? voiceBtn.querySelector('.voice-text') : null;
    
    // 更新按钮状态
    if (voiceBtn) voiceBtn.classList.add('recording');
    if (voiceIcon) voiceIcon.innerHTML = '🎤';
    if (voiceText) voiceText.textContent = '录音中...';
    
    isRecording = true;
    
    try {
        // 首先检查后端服务状态
        const statusResponse = await fetch('/api/voice-recognition/status');
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (!statusData.serviceAvailable) {
                showModal('warning', '语音识别', 
                    '后端语音识别服务暂不可用。将尝试使用浏览器内置语音识别功能。\n\n' +
                    '如需使用高级语音识别功能，请配置科大讯飞API密钥。');
                
                // 回退到浏览器原生语音识别
                stopRecording();
                handleVoiceRecognitionFallback();
                return;
            }
        }
        
        // 检查麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        // 创建媒体录制器
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async function() {
            // 创建音频blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // 准备上传数据
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            
            try {
                // 调用后端语音识别API
                const response = await fetch('/api/voice-recognition', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.success) {
                        // 将识别结果添加到输入框
                        const chatInput = document.getElementById('chat-input');
                        if (chatInput) {
                            chatInput.value = data.text;
                            chatInput.focus();
                        }
                        
                        showModal('success', '语音识别', `识别结果：${data.text}`);
                    } else {
                        showModal('error', '语音识别', data.error || '识别失败');
                    }
                } else {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                
            } catch (error) {
                console.error('语音识别API调用失败:', error);
                showModal('error', '语音识别', '语音识别服务暂时不可用，请尝试使用键盘输入');
            }
            
            // 停止所有媒体轨道
            stream.getTracks().forEach(track => track.stop());
        };
        
        // 开始录制
        mediaRecorder.start();
        
        // 显示提示
        showModal('info', '语音识别', '请开始说话...（点击任意位置停止录音）');
        
        // 设置计时器，5秒后自动停止
        recordingTimer = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                stopRecording();
                showModal('info', '语音识别', '录音时间结束，正在识别...');
            }
        }, 5000);
        
        // 点击页面任意位置停止录音
        const stopRecordingHandler = function(e) {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                stopRecording();
                clearTimeout(recordingTimer);
                document.removeEventListener('click', stopRecordingHandler);
                showModal('info', '语音识别', '正在识别语音...');
            }
        };
        
        // 延迟绑定，避免立即触发
        setTimeout(() => {
            document.addEventListener('click', stopRecordingHandler);
        }, 100);
        
    } catch (error) {
        console.error('启动录音失败:', error);
        isRecording = false;
        
        // 恢复按钮状态
        if (voiceBtn) voiceBtn.classList.remove('recording');
        if (voiceIcon) voiceIcon.innerHTML = '🎤';
        if (voiceText) voiceText.textContent = '按住说话';
        
        // 详细的错误处理
        let errorMessage = '无法访问麦克风';
        let errorDetails = '';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = '麦克风权限被拒绝';
            errorDetails = '请按照以下步骤启用麦克风权限：\n\n' +
                         '1. 点击地址栏左侧的锁形图标或摄像头图标\n' +
                         '2. 选择"允许"或"始终允许"麦克风访问\n' +
                         '3. 刷新页面后重新尝试\n\n' +
                         '或者使用键盘输入文字代替语音功能。';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '未找到麦克风设备';
            errorDetails = '请检查：\n\n' +
                         '1. 确保麦克风已正确连接到电脑\n' +
                         '2. 检查麦克风是否被其他应用程序占用\n' +
                         '3. 尝试使用键盘输入文字';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = '浏览器不支持录音功能';
            errorDetails = '建议：\n\n' +
                         '1. 使用最新版本的Chrome、Edge或Firefox浏览器\n' +
                         '2. 确保使用HTTPS协议访问网站\n' +
                         '3. 或者直接使用键盘输入';
        } else {
            errorDetails = '错误详情：' + error.message;
        }
        
        showModal('error', '语音识别', `${errorMessage}\n\n${errorDetails}`);
    }
}

// 统一语音按钮点击处理
function handleVoiceButtonClick(e) {
    e.preventDefault();
    
    if (isRecording) {
        stopRecording();
        return;
    }
    
    console.log('语音按钮被点击，开始语音识别');
    
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        console.log('使用浏览器原生语音识别');
        startRecording();
    } else {
        console.log('浏览器不支持原生语音识别，尝试后端服务');
        startBackendRecording();
    }
}

// 检查语音识别支持
function checkVoiceRecognitionSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBtn = document.getElementById('voice-btn');
    
    if (!voiceBtn) return;
    
    if (!SpeechRecognition && !window.MediaRecorder) {
        console.warn('语音识别功能不可用');
        voiceBtn.style.display = 'none';
        showModal('info', '语音功能', '您的浏览器不支持语音识别功能，请使用键盘输入。');
    } else {
        console.log('语音识别功能可用');
    }
}

// 浏览器原生语音识别回退方案
function handleVoiceRecognitionFallback() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showModal('warning', '语音识别', 
            '您的浏览器不支持语音识别功能。\n\n' +
            '建议：\n' +
            '1. 使用Chrome、Edge或Safari浏览器\n' +
            '2. 或者直接使用键盘输入文字');
        return;
    }
    
    // 使用浏览器原生语音识别
    handleVoiceRecognition(new Event('click'));
}

console.log('修复版demand.js加载完成');