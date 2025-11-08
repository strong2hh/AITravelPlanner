package com.aitravelplanner.Service;

import java.util.List;

/**
 * 位置提取服务接口
 * 定义从文本中提取位置信息的标准方法
 */
public interface LocationExtraction {
    
    /**
     * 从文本中提取【】中的内容
     * @param text 输入的文本内容
     * @return 提取到的【】中的内容列表
     */
    List<String> extractBracketContents(String text);
}