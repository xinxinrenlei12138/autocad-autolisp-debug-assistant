# AutoCAD AutoLISP Debug Assistant (AADA)

> **AutoCAD 二次开发全流程智能助手**
> 语法检查 · 自动化调试 · 智能诊断 · 一键交付

[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![VS Code](https://img.shields.io/badge/vscode-%5E1.57.0-blueviolet)](https://code.visualstudio.com/)
[![AutoCAD](https://img.shields.io/badge/AutoCAD-2027%2B-orange)](https://www.autodesk.com/)
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 📖 项目简介

**AutoCAD AutoLISP Debug Assistant** 是一款面向 AutoCAD 二次开发者的 VS Code 扩展插件，致力于将 **语法检查、调试附着、代码执行、诊断报告** 全流程整合为一条无人化自动流水线。

### 解决的核心痛点

| 痛点 | 传统方式 | AADA 方案 |
|------|---------|-----------|
| 🐌 **手动附着调试器** | 每次按 F5 → 搜索进程 → 选 PID | `AADA: 自动附着 CAD` 一键完成 |
| 🔍 **语法错误定位慢** | 加载到 CAD 后看命令行报错 | `AADA: 语法检查` 即刻输出结果 |
| 🔄 **调试流程碎片化** | 手动切换多个工具 | `AADA: 一键自检` 全自动流水线 |
| 📦 **交付前检查繁琐** | 人工逐行审阅代码 | 内置 linter 自动扫描 |

---

## ✨ 核心功能

### 🚀 自动附着 CAD（Auto Attach）

**传统方式：** 每次调试都要按 F5 → 从进程列表中找到 AutoCAD → 确认 PID → 等待附着。

**AADA 方式：** 一条命令，零交互。

```
执行 AADA: 自动附着 CAD
├── 自动检测 AutoCAD 进程（Get-Process acad）
├── 获取最新启动的 CAD 实例 PID
├── 调用扩展 API setDefaultAcadPid() 跳过选择器
└── 启动调试器 → 附着成功 🎯
```

支持多开场景：自动选择**最后启动**的 AutoCAD 实例。

---

### 🔍 内置语法检查引擎（Linter）

完全自研的 AutoLISP 语法检查引擎，**纯 JavaScript 实现，零外部依赖**，无需 Python、无需 Node 模块。

#### 检查项一览

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 括号平衡 | ERROR | 开括号与闭括号数量不匹配时 CAD 拒绝加载 |
| defun 完整性 | ERROR | defun 函数块必须完整闭合，防止被后续代码吞噬 |
| 字符串闭合 | ERROR | 未闭合的双引号字符串导致整个文件解析失败 |
| lambda 空格 | ERROR | `lambda(` 写法缺少空格，CAD 拒绝加载 |
| 重复定义 | WARN | 同一函数名被多次 defun 定义可能引起混淆 |
| 多余闭括号 | WARN | 孤立的 `)` 导致括号平衡计算偏差 |
| 代码间隙 | INFO | 函数块之间的顶层代码间隙的括号平衡 |

#### 引擎工作原理

```
  ┌─────────────┐
  │  文本输入    │
  └──────┬──────┘
         ▼
  ┌─────────────┐    跳过 ; 行注释
  │  注释/字符串  │    ;|...|; 块注释
  │    跳过     │    "字符串" 含转义
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  括号匹配    │ ← 栈追踪定位每对括号
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  defun 检测  │ ← 提取函数名、完整块
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  边界验证    │ ← 防止 defun 被吞噬
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 栈回溯诊断  │ ← 精确定位未闭合/多余括号
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  λ/重复检查  │ ← lambda( 空格、同名 defun
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  报告输出    │ ← 结构化的美观文本报告
  └─────────────┘
```

#### 检查报告示例

```
============================================================
  文件: auto_test.lsp
  共 6 个 defun 函数块 (5 完整, 1 残缺)
============================================================
  [AutoTest:Add] [FAIL] 残缺 — 第6行起未找到匹配闭括号

  --------------------------------------------------
  详细诊断: AutoTest:Add
  区间: 第 6 行 ~ 第 10 行
  --------------------------------------------------
  [FAIL] 未闭合的开括号: 1 处
    第 6 行, 第 1 列: (defun AutoTest:Add (x y

  [AutoTest:Show] [OK] 平衡
  [AutoTest:DoIt] [OK] 平衡

============================================================
  结论: [FAIL] 存在问题: 括号不平衡
============================================================
```

---

### 🤖 一键自检（Self Check）

将整个调试流程压缩为**一个命令**，实现无人化自动检查。

```
执行 AADA: 一键自检
├── [步骤1] 语法检查 ─── 内置 linter 引擎
│   └── 通过 ✔ / 失败 ✘
├── [步骤2] 附着 CAD ─── 自动检测 PID
│   ├── 找到 AutoCAD 进程 → 附着
│   └── 未找到 → 跳过（仅做语法检查）
├── [步骤3] 加载文件 ─── DAP 协议加载到 CAD
│   └── 成功 ✔ / 失败 ✘
└── [步骤4] 输出报告 ─── 结构化 JSON
    └── 包含每步状态 + 详细信息
```

适合集成到 CI/CD 流程或作为代码提交前的自动检查。

---

### ⚡ DAP 执行表达式（Evaluate）

通过 VS Code 的**调试适配器协议（DAP）**与 AutoCAD 通信，在 CAD 环境中执行 AutoLISP 代码。

**支持的操作：**

| 操作 | 示例 | 说明 |
|------|------|------|
| 加载文件 | `(load "path/to/file.lsp")` | 将 LISP 文件加载到 CAD |
| 设置变量 | `(setq *ver* "1.0")` | 在 CAD 中设置变量 |
| 调用函数 | `(AutoTest:Add 3 4)` | 执行自定义函数 |
| 计算表达式 | `(+ 1 2 3)` | 直接计算 |
| 打印输出 | `(princ "Hello")` | 在 CAD 命令行输出 |

---

### 📡 COM 发送 LISP（LISP Bridge）

通过 PowerShell COM Automation 接口直接向 AutoCAD 命令行发送命令，作为 DAP 协议的补充通道。

**适用场景：**
- DAP evaluate 超时或不可用时作为备用
- 需要向 CAD 命令行发送特殊指令
- 执行不依赖调试会话的 CAD 操作

---

## 🚀 快速开始

### 前置条件

1. **AutoCAD 2027+**（需设置 LISPSYS=1）
2. **VS Code AutoLISP 扩展**（Autodesk 官方扩展）
3. **AutoCAD 已运行**，并已打开一个图形文件

### 一键上手

```bash
# 1. 打开 LISP 文件
# 2. 命令面板 → "AADA: 一键自检"
#    → 自动完成：lint → attach → load → 报告
```

### 分步使用

| 步骤 | 命令 | 说明 |
|------|------|------|
| 1️⃣ | **AADA: 语法检查** | 检查当前文件语法（无需 CAD） |
| 2️⃣ | **AADA: 自动附着 CAD** | 调试器附着到 AutoCAD |
| 3️⃣ | **AADA: 打开文件** | 打开要调试的 LISP 文件 |
| 4️⃣ | **AADA: 执行表达式** | 在 CAD 中加载/执行代码 |
| 5️⃣ | 修改代码 → 重复步骤 1-4 | 迭代调试 |

---

## 🎯 典型使用场景

### 场景 1：日常开发调试

```
1. 编写 LISP 代码
2. Ctrl+Shift+P → "AADA: 语法检查" → 立即发现错误
3. 修正错误
4. Ctrl+Shift+P → "AADA: 一键自检"
   → 自动附着 CAD → 加载文件 → 确认无错误
5. 继续编码...
```

### 场景 2：批量检查历史代码

```
1. 打开旧项目中的 .lsp 文件
2. 运行 "AADA: 语法检查"
3. 查看详细诊断报告
4. 批量修复括号不平衡、lambda 空格等问题
```

### 场景 3：自动化构建流水线

结合 VS Code 任务系统，保存时自动检查：

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [{
    "label": "Auto Check",
    "command": "${command:debugEval.lintFile}",
    "problemMatcher": []
  }]
}
```

---

## 🏗️ 技术架构

```
┌────────────────────────────────────────────────────────┐
│              AutoCAD AutoLISP Debug Assistant                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Linter      │  │  DAP Client  │  │  COM Bridge  │ │
│  │  Engine      │  │  (VS Code)   │  │  (PowerShell)│ │
│  │  (JS Native) │  │              │  │              │ │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤ │
│  │ •括号匹配    │  │ •evaluate    │  │ •SendCommand │ │
│  │ •defun检测   │  │ •customLoad  │  │              │ │
│  │ •语义检查    │  │              │  │              │ │
│  │ •报告输出    │  │              │  │              │ │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘ │
│                           │                 │          │
└───────────────────────────┼─────────────────┼──────────┘
                            │                 │
                     ┌──────┴───────┐  ┌──────┴───────┐
                     │  DAP 协议    │  │  COM 接口    │
                     └──────┬───────┘  └──────┬───────┘
                            │                 │
                            ▼                 ▼
                      ┌──────────────────────────────┐
                      │        AutoCAD 2027+          │
                      │  (AutoLISP 调试器 + COM)     │
                      └──────────────────────────────┘
```

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 扩展框架 | VS Code Extension API | v1.57.0+ |
| 调试协议 | Debug Adapter Protocol (DAP) | evaluate / customLoad |
| 进程通信 | PowerShell COM Automation | AutoCAD.Application |
| 语法引擎 | JavaScript（原生，零依赖） | lintLispFile() |
| 运行环境 | Node.js（VS Code 内置） | child_process / fs / path |

---

## 📦 安装

### 从 VS Code Marketplace（已发布）

```bash
code --install-extension autocad-autolisp-debug-assistant
```

### 从 VSIX 文件安装

```bash
code --install-extension autocad-autolisp-debug-assistant-1.0.0.vsix
```

### 开发模式安装

将项目文件夹复制到 `.vscode/extensions/` 目录，或按 F5 启动扩展开发宿主。

---

## 📋 命令参考

| 命令 ID | 面板标题 | 功能 |
|---------|---------|------|
| `debugEval.autoAttach` | AADA: 自动附着 CAD | 自动检测并附着 AutoCAD 调试器 |
| `debugEval.lintFile` | AADA: 语法检查 | 运行内置 linter 检查当前文件 |
| `debugEval.selfCheck` | AADA: 一键自检 | 全自动流水线：lint → attach → load → 报告 |
| `debugEval.evaluate` | AADA: 执行表达式 | 通过 DAP 执行 AutoLISP 代码 |
| `debugEval.openFile` | AADA: 打开文件 | 静默打开 LISP 文件 |
| `debugEval.lisp` | AADA: 发送 LISP | 通过 COM 发送命令到 AutoCAD |
| `debugEval.loadFile` | AADA: 加载文件到CAD | 通过 DAP customLoad 加载文件 |
| `debugEval.execCommand` | AADA: 执行命令 | 执行任意 VS Code 命令 |
| `debugEval.getState` | AADA: 获取状态 | 查看综合状态信息 |
| `debugEval.getOutput` | AADA: 调试日志 | 查看调试事件历史 |
| `debugEval.clearOutput` | AADA: 清空日志 | 清空调试日志 |
| `debugEval.getDiagnostics` | AADA: 诊断信息 | 查看 VS Code 诊断信息 |

---

## 🧪 已知限制

| 限制 | 说明 | 计划 |
|------|------|------|
| DAP 返回值 | AutoCAD DAP 适配器的 evaluate 返回结果始终为空字符串 | 等待 Autodesk 更新适配器，或探索替代方案 |
| setBreakpoints | DAP setBreakpoints 请求可能超时或返回未验证断点 | 已评估为不需要，使用 linter + evaluate 替代 |
| 窗口重载 | 修改扩展文件会触发 VS Code 安全重载提示 | VS Code 安全机制，不可绕过 |
| COM 可靠性 | PowerShell COM SendCommand 受焦点影响 | 仅作为 DAP 的备用通道 |

---

## 🗺️ 路线图

- [x] 内置 AutoLISP 语法检查引擎
- [x] 自动附着 CAD 调试器
- [x] 一键自检流水线
- [x] DAP evaluate 执行代码
- [x] 函数签名校验（200+ 函数参数检查）
- [x] DAP 输出捕获（返回值 + 错误信息）
- [x] if/cond 缺少 progn 检测
- [x] C:命令函数规范检查
- [ ] 问题面板集成（Problem Matcher）
- [ ] 多语言界面（中/英）
- [ ] 测试覆盖率报告

---

## 🤝 贡献

欢迎通过以下方式参与：

- **提交 Issue** — 报告 Bug 或功能建议
- **Pull Request** — 修复问题或添加功能
- **完善文档** — 改进 README、添加示例
- **分享推广** — 推荐给其他 CAD 二次开发者

---

## � 更新日志

### v1.1.0 (2026-05-25)
- ✨ **函数签名校验引擎** — 新增 `checkSignatures`，支持 200+ AutoLISP 函数的参数数量校验
- ✨ **参数计数** — 新增 `countArgs`，精确统计 S-表达式参数个数
- ✨ **if/cond 缺少 progn 检测** — 新增 `checkIfCondProgn`，检测多表达式分支缺少 `progn`
- ✨ **C:命令函数规范检查** — 新增 `checkCPrefix`，检测命令函数缺少 `(princ)` 静默退出
- ✨ **重构栈回溯引擎** — `deepCheck` 拆分为 `deepCheckStructured` + 报告格式化
- ✨ **扩展函数签名库** — 新增 vla-/vlax-/vlr- 等 ActiveX 函数签名
- ⚡ **DAP 输出捕获** — 通过 `DebugAdapterTracker` 捕获返回值与错误信息
- 📦 **发布到 VS Code Marketplace**
- 🐙 **开源到 GitHub**

### v1.0.0 (2026-05-24)
- 🚀 首次发布：内置 linter（括号平衡/defun完整性/lambda空格/重复定义）
- 🚀 自动附着 CAD（setDefaultAcadPid 跳过 PID 选择器）
- 🤖 一键自检流水线（lint → attach → load → 报告）
- ⚡ DAP evaluate 执行 AutoLISP 代码
- 📡 COM 桥接发送命令到 AutoCAD

---

## �📄 许可证

MIT License © 2026

---

<p align="center">
  <b>AutoCAD AutoLISP Debug Assistant</b><br>
  <i>让 CAD 二次开发更高效、更智能、更自动化</i>
</p>
