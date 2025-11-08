package com.aitravelplanner.Service;

/**
 * 阿里云大模型服务接口
 * 定义阿里云大模型调用的标准方法
 */
public interface AaLIBigModelService {
    
    /**
     * 调用阿里云大模型生成回复
     * @param query 用户输入的查询内容
     * @return 大模型的回复结果
     */
    String generateResponse(String query);
}