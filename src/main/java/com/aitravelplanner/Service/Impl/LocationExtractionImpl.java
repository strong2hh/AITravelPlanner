package com.aitravelplanner.Service.Impl;

import com.aitravelplanner.Service.LocationExtraction;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 位置提取服务实现类
 * 实现从文本中提取【】中内容的功能
 */
public class LocationExtractionImpl implements LocationExtraction {
    
    /**
     * 从文本中提取【】中的内容
     * @param text 输入的文本内容
     * @return 提取到的【】中的内容列表
     */
    @Override
    public List<String> extractBracketContents(String text) {
        List<String> contents = new ArrayList<>();
        
        if (text == null || text.trim().isEmpty()) {
            return contents;
        }
        
        // 使用正则表达式匹配【】中的内容
        Pattern pattern = Pattern.compile("【([^】]+)】");
        Matcher matcher = pattern.matcher(text);
        
        while (matcher.find()) {
            String content = matcher.group(1).trim();
            if (!content.isEmpty()) {
                contents.add(content);
            }
        }
        
        return contents;
    }
}