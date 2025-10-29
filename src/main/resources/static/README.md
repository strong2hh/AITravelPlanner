# AI旅行规划器 - 前端认证系统

## 概述

这是一个基于Supabase的前端认证系统，包含登录和注册功能，专为AI旅行规划器项目设计。

## 功能特性

- ✅ 用户注册和登录
- ✅ 邮箱验证支持
- ✅ 会话管理
- ✅ 响应式设计
- ✅ 错误处理和用户反馈

## 配置Supabase

### 1. 创建Supabase项目

1. 访问 [Supabase官网](https://supabase.com)
2. 注册账号并创建新项目
3. 获取项目URL和匿名密钥

### 2. 配置认证设置

在Supabase仪表板中：

1. 进入 **Authentication > Settings**
2. 配置以下设置：
   - **Site URL**: `http://localhost:8080` (开发环境)
   - **Enable email confirmations**: 开启
   - **Email template**: 可自定义欢迎邮件

### 3. 更新配置文件

编辑 `auth.js` 文件，替换以下配置：

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## 文件结构

```
static/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── auth.js            # 认证逻辑
├── config.js          # 配置文件
└── README.md          # 说明文档
```

## 使用说明

### 开发环境运行

1. 确保Spring Boot应用正在运行
2. 访问 `http://localhost:8080`
3. 前端页面将自动加载

### 生产环境部署

1. 更新Supabase配置中的Site URL
2. 构建并部署Spring Boot应用
3. 确保静态资源正确配置

## API端点

前端通过Supabase客户端直接与Supabase认证服务交互，无需后端API支持基础认证功能。

## 自定义和扩展

### 添加新功能

1. 在 `auth.js` 中添加新的处理函数
2. 在 `index.html` 中添加对应的UI元素
3. 在 `styles.css` 中添加样式

### 集成后端API

当需要与Spring Boot后端交互时：

```javascript
// 获取当前用户的JWT令牌
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// 调用后端API
fetch('/api/travel-plans', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

## 错误处理

系统包含完整的错误处理机制，包括：

- 表单验证错误
- 网络请求错误
- 认证失败错误
- 用户友好的错误消息

## 安全考虑

- 使用HTTPS连接
- JWT令牌自动管理
- 密码强度验证
- 邮箱验证要求

## 浏览器兼容性

支持所有现代浏览器：
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 故障排除

### 常见问题

1. **认证失败**：检查Supabase配置是否正确
2. **样式不显示**：检查静态资源路径配置
3. **模态框不显示**：检查JavaScript控制台错误

### 调试技巧

在浏览器控制台中检查：
- Supabase连接状态
- 网络请求
- JavaScript错误

## 贡献指南

欢迎提交Issue和Pull Request来改进这个认证系统。