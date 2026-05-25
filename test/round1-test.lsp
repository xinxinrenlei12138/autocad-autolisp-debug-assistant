; ============================================================
; 第一轮测试: 边界情况与复杂嵌套
; ============================================================
; 用例1: 空文件（仅有注释）— 应该 passed=true（无 defun 无错误）
; 用例2: 字符串内包含括号 — 不应误报括号不平衡
; 用例3: 块注释内包含代码 — 不应误报
; 用例4: 多层深嵌套 — 应正确平衡
; 用例5: 混合转义字符串 — 不应误报
; 用例6: 仅顶层代码（无 defun）— 无 defun 时的间隙处理
; 用例7: defun 内部嵌套 if 且含 progn — 正确检查
; 用例8: 多余闭括号在文件末尾
; 用例9: 未闭合括号在深层嵌套中
; 用例10: 空参数列表 defun
; 用例11: 仅 whitespace 的文件
; 用例12: 单独的 (princ) 无参调用

; 用例1: 空文件（仅注释）
; 这是注释，没有代码

; 用例2: 字符串内含括号 — 应该通过
(defun test2 () (princ "(hello world)"))

; 用例3: 块注释内含代码 — 应该通过
(defun test3 ()
  (princ "before")
  ;| (defun fake () (setq x 1)) |;
  (princ "after")
)

; 用例4: 多层深嵌套 — 应该通过
(defun test4 ()
  (setq a (list
    (list 1 2 3)
    (list (list 4 5) (list 6 7))
    (list
      (list
        (list 8 9 10)
      )
    )
  ))
)

; 用例5: 转义字符串 — 应该通过
(defun test5 ()
  (princ "quote: \" paren: ( end")
  (princ "backslash: \\ end")
)

; 用例6: 仅顶层代码（无 defun）
(setq global-var 42)
(setq another-var "hello")
(princ global-var)

; 用例7: 嵌套 if + progn
(defun test7 (x)
  (if (> x 0)
    (progn
      (princ "positive")
      (setq y (* x 2))
    )
    (princ "not positive")
  )
)

; 用例8: 多余闭括号 — 文件末尾有一个多余的 )
(defun test8 () (princ "ok"))
)

; 用例9: 深层未闭合括号
(defun test9 ()
  (setq z (list 1 2 (list 3 4
)

; 用例10: 空参数列表
(defun test10 () (princ "no params"))

; 用例11: lambda 正确写法
(defun test11 ()
  (mapcar (lambda (x) (* x x)) (list 1 2 3))
)

; 用例12: lambda 缺空格
(defun test12 ()
  (mapcar (lambda(x) (* x x)) (list 1 2 3))
)
