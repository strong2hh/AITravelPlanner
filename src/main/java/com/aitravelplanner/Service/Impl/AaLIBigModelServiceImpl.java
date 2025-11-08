package com.aitravelplanner.Service.Impl;

import com.aitravelplanner.Service.AaLIBigModelService;
import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.protocol.Protocol;

import java.util.Arrays;
import java.lang.System;

/**
 * 阿里云大模型服务实现类
 * 基于阿里云DashScope API实现大模型服务功能
 */
public class AaLIBigModelServiceImpl implements AaLIBigModelService {
    
    /**
     * 调用AI模型生成回复
     * @param query 用户输入的查询内容
     * @return AI模型的回复结果
     */
    @Override
    public String generateResponse(String query) {
        try {
            GenerationResult result = callWithMessage(query);
            return extractResponseText(result);
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
            // 使用日志框架记录异常信息
            System.err.println("An error occurred while calling the generation service: " + e.getMessage());
            return "抱歉，AI服务暂时不可用，请稍后重试。";
        }
    }


    
    /**
     * 调用阿里云DashScope API
     * @param args 用户输入的查询内容
     * @return 生成结果
     */
    private GenerationResult callWithMessage(String args) throws ApiException, NoApiKeyException, InputRequiredException {
        Generation gen = new Generation(Protocol.HTTP.getValue(), "https://dashscope.aliyuncs.com/api/v1");
        
        Message systemMsg = Message.builder()
                .role(Role.SYSTEM.getValue())
                .content("You are a helpful assistant.")
                .build();
        
        Message userMsg = Message.builder()
                .role(Role.USER.getValue())
                .content(args)
                .build();
        
        GenerationParam param = GenerationParam.builder()
                // 若没有配置环境变量，请用百炼API Key将下行替换为：.apiKey("sk-xxx")
                .apiKey(System.getenv("DASHSCOPE_API_KEY"))
                .model("qwen-plus")
                .messages(Arrays.asList(systemMsg, userMsg))
                .resultFormat(GenerationParam.ResultFormat.MESSAGE)
                .build();
        
        return gen.call(param);
    }
    
    /**
     * 从生成结果中提取回复文本
     * @param result 生成结果
     * @return 回复文本
     */
    private String extractResponseText(GenerationResult result) {
        try {
            // 调试信息：打印整个结果对象
            System.out.println("GenerationResult: " + result);
            
            if (result == null) {
                System.out.println("Result is null");
                return "抱歉，AI未返回有效内容。result == null";
            }
            if (result.getOutput() == null) {
                System.out.println("Output is null");
                return "抱歉，AI未返回有效内容。result.getOutput() == null";
            }
            
            // 调试输出结构
            System.out.println("GenerationResult output structure: " + 
                com.alibaba.dashscope.utils.JsonUtils.toJson(result.getOutput()));
            
            // 优先从 output.text 提取
            String responseText = result.getOutput().getText();
            
            // 如果 output.text 为空，尝试从 output.choices[0].message.content 提取
            if ((responseText == null || responseText.trim().isEmpty()) 
                && result.getOutput().getChoices() != null 
                && !result.getOutput().getChoices().isEmpty()) {
                responseText = result.getOutput().getChoices().get(0).getMessage().getContent();
                System.out.println("Extracted text from choices: " + responseText);
            }
            
            if (responseText == null || responseText.trim().isEmpty()) {
                System.out.println("Response text is empty or null");
                return "抱歉，AI未返回有效内容。responseText == null || responseText.trim().isEmpty()";
            }
            
            // 调试原始文本和格式化后的文本
            System.out.println("Raw response text: " + responseText);
            System.out.println("Formatted text: " + formatResponseText(responseText));
            
            return formatResponseText(responseText);
        } catch (Exception e) {
            System.err.println("Error extracting response text: " + e.getMessage());
            return "抱歉，处理AI回复时出现错误。";
        }
    }
    
    /**
     * 格式化回复文本，提供更好的阅读体验
     * @param text 原始文本
     * @return 格式化后的文本
     */
    private String formatResponseText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return text;
        }
        
        // 1. 统一换行符：将Windows换行(\r\n)、Mac换行(\r)统一转换为标准换行(\n)
        text = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
        
        // 2. 去除首尾多余空格和换行
        text = text.trim();
        
        // 3. 合并连续换行符：将2个及以上连续换行符合并为2个（保持段落间距）
        // （避免出现3个以上空行，同时保留段落间的分隔）
        text = text.replaceAll("\n{2,}", "\n\n");
        
        // 4. 修复标点后的格式问题
        // 中文冒号、句号后如果紧跟换行，补充一个空格（避免标点后直接换行）
        text = text.replaceAll("：\n", "： ");
        text = text.replaceAll("。\n", "。 ");
        // 英文冒号、句号同理（可选，根据需求添加）
        text = text.replaceAll(":\n", ": ");
        text = text.replaceAll("\\.\n", ". ");
        
        // 5. 最终去除可能产生的首尾空格（可选，根据需求保留）
        return text.trim();
    }
    
    /**
     * 主方法（保留原有功能，用于测试）
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        AaLIBigModelServiceImpl assistant = new AaLIBigModelServiceImpl();
        
        // 从控制台读取用户输入
        java.util.Scanner sc = new java.util.Scanner(System.in);
        System.out.print("请输入您的查询：");
        String query = sc.nextLine();
        
        // 调用AI助手生成回复
        String response = assistant.generateResponse(query);
        
        // 输出结果
        System.out.println("AI回复：");
        System.out.println(response);
        
        sc.close();
    }
}