; ============================================================
; 第三轮测试: 大规模综合场景（修正版）
; ============================================================
; 设计原则: 错误不会级联污染（未闭合字符串/残缺defun放在文件末尾）
;
; 用例1: 多个正常 defun + 顶层代码交错
; 用例2: 重复 defun
; 用例3: 嵌套 defun（外层吞噬内层）— 应该被识别为完整或被污染
; 用例4: 块注释内含代码 — 不误报
; 用例5: vlax- 函数正确调用
; 用例6: 深层嵌套循环
; 用例7: 空 defun 体
; 用例8: c: 命令各种参数组合
; 用例9: cond 多分支正确写法
; 用例10: while + if + progn 组合
; 用例11: lambda 多种写法
; 用例12: 大量 setq 成对/不成对
; 用例13: and/or 可变参数
; 用例14: mapcar + lambda 嵌套
; 用例15: apply + function
; 用例16: 字符串中含各种特殊字符
; 用例17: 嵌套块注释
; 用例18: 顶层多余闭括号
; 用例19: 残缺 defun（放在末尾，不影响前面的代码）
; 用例20: 未闭合字符串（放在最后，不影响前面的代码）

; ===== 顶层初始化代码 =====
(vl-load-com)
(setq *scale* 1.0)
(setq *layer* "0")
(setq *count* 0)

; ===== 用例5: vlax- 函数正确调用 =====
(defun get-circle-area (en / rad area)
  (setq rad (vlax-get-property (vlax-ename->vla-object en) 'Radius))
  (setq area (* pi (* rad rad)))
  area
)

(defun set-entity-color (en clr / obj)
  (setq obj (vlax-ename->vla-object en))
  (vla-put-color obj clr)
)

; ===== 用例6: 深层嵌套循环 =====
(defun process-all (lst / i el)
  (setq i 0)
  (while (< i (length lst))
    (setq el (nth i lst))
    (repeat 3
      (foreach item (list el)
        (princ item)
      )
    )
    (setq i (1+ i))
  )
)

; ===== 用例2: 重复 defun =====
(defun helper () (princ "first"))
(defun helper () (princ "second"))

; ===== 用例7: 空 defun 体 =====
(defun empty-func ()
)

; ===== 用例8: c: 命令各种参数组合 =====
(defun c:cmd1 () (princ "no params"))
(defun c:cmd2 (/ x y) (setq x 1))
(defun c:cmd3 (pt) (princ pt))

; ===== 用例9: cond 多分支 =====
(defun classify (x / result)
  (setq result
    (cond
      ((< x 0) "negative")
      ((= x 0) "zero")
      ((> x 0) "positive")
    )
  )
  (princ result)
)

; ===== 用例10: while + if + progn 组合 =====
(defun countdown (n / i)
  (setq i n)
  (while (> i 0)
    (if (= (rem i 2) 0)
      (progn
        (princ i)
        (princ " is even")
      )
      (progn
        (princ i)
        (princ " is odd")
      )
    )
    (setq i (1- i))
  )
)

; ===== 用例11: lambda 多种写法 =====
(defun lambda-test (lst)
  (mapcar (lambda (x) (* x x)) lst)
  (mapcar (lambda (x y) (+ x y)) lst (list 1 2 3))
)

; ===== 用例12: setq 成对/不成对混合 =====
(defun setq-test ()
  (setq a 1)           ; 正确
  (setq b 2 c 3)       ; 正确
  (setq d 4 e 5 f 6)   ; 正确
)

; ===== 用例13: and/or 可变参数 =====
(defun logic-test (x y z)
  (and (> x 0) (< y 10))
  (or (= z 0) (> z 100))
  (and t)
  (or nil)
)

; ===== 用例14: mapcar + lambda 嵌套 =====
(defun nested-mapcar (lst)
  (mapcar (lambda (sub)
    (mapcar (lambda (x) (1+ x)) sub)
  ) lst)
)

; ===== 用例15: apply + function =====
(defun apply-test (lst)
  (apply '+ lst)
  (apply (function +) lst)
)

; ===== 用例16: 字符串中含各种特殊字符 =====
(defun string-test ()
  (princ "parentheses: ( ) [ ]")
  (princ "quotes: \" \\ \"")
  (princ "semicolons: ; not a comment")
)

; ===== 用例17: 嵌套块注释 =====
(defun block-comment-test ()
  ;| outer block
    ;| inner block |;
    (princ "inside")
  |;
  (princ "after")
)

; ===== 用例4: 块注释内含代码 =====
(defun comment-code-test ()
  (setq x 1)
  ;| (defun fake () (setq y 2) (car) (princ "unclosed) |;
  (setq z 3)
  (princ (list x y z))
)

; ===== 用例3: 嵌套 defun（外层吞噬内层）=====
; 注意: AutoLISP 实际上不支持嵌套 defun 的局部作用域，
; 但外层 defun 括号是完整的，应该被识别为完整函数
(defun outer-func ()
  (defun inner-func ()
    (princ "inner")
  )
  (inner-func)
)

; ===== 用例1: 更多顶层代码 =====
(princ "\nLoading complete.")
(princ (strcat "Scale: " (rtos *scale* 2 2)))

; ===== 用例18: 顶层多余闭括号 =====
)

; ===== 用例19: 残缺 defun（放在末尾）=====
(defun broken-func (x / y z)
  (setq x (+ x 1))
  (if (> x 10)
    (progn
      (princ "big")
      (setq y (* x 2))
    )
  )

; ===== 用例20: 未闭合字符串（放在最后）=====
(defun bad-string ()
  (princ "this string is not closed
