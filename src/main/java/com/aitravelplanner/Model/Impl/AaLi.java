package com.aitravelplanner.Model.Impl;// 建议dashscope SDK的版本 >= 2.12.0
import java.util.Arrays;
import java.lang.System;
import java.util.Scanner;


import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.protocol.Protocol;

public class AaLi {
    public static GenerationResult callWithMessage(String args) throws ApiException, NoApiKeyException, InputRequiredException {
        Generation gen = new Generation(Protocol.HTTP.getValue(), "https://dashscope.aliyuncs.com/api/v1");
        // 以上为新加坡地域base_url，若使用北京地域的模型，需将base_url替换为：https://dashscope.aliyuncs.com/api/v1
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
                // 新加坡和北京地域的API Key不同。获取API Key：https://www.alibabacloud.com/help/zh/model-studio/get-api-key
                .apiKey(System.getenv("DASHSCOPE_API_KEY"))
                // 此处以qwen-plus为例，可按需更换模型名称。模型列表：https://www.alibabacloud.com/help/zh/model-studio/getting-started/models
                .model("qwen-plus")
                .messages(Arrays.asList(systemMsg, userMsg))
                .resultFormat(GenerationParam.ResultFormat.MESSAGE)
                .build();
        return gen.call(param);
    }
    public static void main(String[] args) {
        try {
            Scanner sc = new Scanner(System.in);
            String  query = sc.nextLine();
            GenerationResult result = callWithMessage(query);
            System.out.println(JsonUtils.toJson(result));
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
            // 使用日志框架记录异常信息
            System.err.println("An error occurred while calling the generation service: " + e.getMessage());
        }
        System.exit(0);
    }
}