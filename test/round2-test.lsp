; ============================================================
; 第二轮测试: 函数签名与特殊语法
; ============================================================
; 用例1: car 0参数 — 应报 SIG_TOO_FEW_ARGS
; 用例2: car 2参数 — 应报 SIG_TOO_MANY_ARGS
; 用例3: substr 4参数 — 应报 SIG_TOO_MANY_ARGS
; 用例4: nth 1参数 — 应报 SIG_TOO_FEW_ARGS
; 用例5: setq 奇数对 (setq x 1 y) — 应报 SIG
; 用例6: setq 0参数 (setq) — 应报 SIG_TOO_FEW_ARGS
; 用例7: if 4个子表达式（缺 progn）— 应报 MISSING_PROGN
; 用例8: if 正确3个参数 — 不应报
; 用例9: c:命令带必选参数 — 应报 CPREFIX_INCOMPLETE
; 用例10: c:命令仅局部变量 — 不应报
; 用例11: vla-put-color 1参数 — 应报 SIG_TOO_FEW_ARGS
; 用例12: vla-get-name 0参数 — 应报 SIG_TOO_FEW_ARGS
; 用例13: vlax-get-property 1参数 — 应报 SIG_TOO_FEW_ARGS
; 用例14: (princ) 无参 — 不应报
; 用例15: (terpri 1) 1参数 — 应报 SIG_TOO_MANY_ARGS
; 用例16: (command) 0参数 — 应报 SIG_TOO_FEW_ARGS
; 用例17: (vl-load-com 1) 1参数 — 应报 SIG_TOO_MANY_ARGS
; 用例18: repeat 1参数 — 应报 SIG_TOO_FEW_ARGS
; 用例19: foreach 2参数 — 应报 SIG_TOO_FEW_ARGS
; 用例20: (+) 0参数 — 不应报（+ 允许0参数）

; === 正确代码（不应报错）===
(defun ok1 () (princ))                ; 用例14: (princ) 合法
(defun ok2 () (+ 1 2 3))              ; 用例20: (+) 可变参数
(defun ok3 () (vl-load-com))          ; vl-load-com 无参
(defun ok4 () (entlast))              ; entlast 无参
(defun ok5 () (list 1 2 3))           ; list 可变参数
(defun ok6 (x) (if (> x 0) (princ "+") (princ "-")))  ; 用例8: if 3参数

; === 错误代码 ===
(defun err1 () (car))                 ; 用例1: car 无参
(defun err2 () (car a b))             ; 用例2: car 2参数
(defun err3 () (substr "abc" 1 2 3))  ; 用例3: substr 4参数
(defun err4 () (nth 0))               ; 用例4: nth 无第二个参数
(defun err5 () (setq x 1 y))          ; 用例5: setq 奇数对
(defun err6 () (setq))                ; 用例6: setq 无参
(defun err7 () (if (> x 0) a b c d))  ; 用例7: if 5子表达式缺progn

(defun c:mycmd (pt)                   ; 用例9: c: 命令带必选参数
  (princ pt)
)

(defun c:mycmd2 (/ pt)                ; 用例10: c: 命令仅局部变量
  (setq pt (getpoint))
  (princ pt)
)

(defun err11 () (vla-put-color en))   ; 用例11: vla-put-color 需2参数
(defun err12 () (vla-get-name))       ; 用例12: vla-get-name 需1参数
(defun err13 () (vlax-get-property en)); 用例13: vlax-get-property 需2参数
(defun err14 () (terpri "extra"))     ; 用例15: terpri 不接受参数
(defun err15 () (command))            ; 用例16: command 需至少1参数
(defun err16 () (vl-load-com 1))      ; 用例17: vl-load-com 不接受参数
(defun err17 () (repeat 5))           ; 用例18: repeat 需2参数
(defun err18 () (foreach lst))        ; 用例19: foreach 需3参数
