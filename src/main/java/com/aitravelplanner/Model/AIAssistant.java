package com.aitravelplanner.Model;

/**
 * AI助手接口
 * 定义AI模型调用的标准方法
 */
public interface AIAssistant {
    
    /**
     * 调用AI模型生成回复
     * @param query 用户输入的查询内容
     * @return AI模型的回复结果
     */
    String generateResponse(String query);
}