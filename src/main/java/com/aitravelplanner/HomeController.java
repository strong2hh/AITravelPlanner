package com.aitravelplanner;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "redirect:/LogIn/index.html";
    }
    
    @GetMapping("/login")
    public String login() {
        return "redirect:/LogIn/index.html";
    }
    
    @GetMapping("/register")
    public String register() {
        return "redirect:/LogIn/index.html";
    }
}