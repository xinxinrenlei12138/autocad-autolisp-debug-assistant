const vscode = require('vscode');

const MAX_LOG = 500;
const outputLog = [];

function pushLog(entry) { outputLog.push(entry); if (outputLog.length > MAX_LOG) outputLog.shift(); }

// ============================================================
// AutoLISP Linter 核心引擎（JS 移植版）
// ============================================================

/** 跳过注释: 支持 ; 行注释 和 ;| ... |; 块注释 */
function skipComment(text, pos) {
    if (pos + 1 >= text.length) return pos;
    // 块注释 ;| ... |;
    if (text.slice(pos, pos + 2) === ';|') {
        pos += 2;
        while (pos < text.length - 1) {
            if (text.slice(pos, pos + 2) === '|;') return pos + 2;
            pos++;
        }
        return pos;
    }
    // 行注释
    while (pos < text.length && text[pos] !== '\n') pos++;
    return pos;
}

/** 跳过双引号字符串，处理 \\ 和 \" 转义 */
function skipString(text, pos) {
    pos++; // 跳过开头的 "
    let esc = false;
    while (pos < text.length) {
        const ch = text[pos];
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') return pos + 1;
        pos++;
    }
    return pos; // 未闭合
}

/** 检查位置是否在注释或字符串内 */
function isInCommentOrString(text, idx) {
    let s = 0, inStr = false, esc = false;
    while (s <= idx) {
        const ch = text[s];
        if (!inStr && ch === ';') {
            if (s + 1 < text.length && text.slice(s, s + 2) === ';|') {
                // 块注释
                let ss = s + 2;
                while (ss < text.length - 1 && text.slice(ss, ss + 2) !== '|;') ss++;
                if (ss > idx) return true;
                s = ss + 2; continue;
            } else {
                const nl = text.indexOf('\n', s);
                const end = nl === -1 ? text.length : nl;
                if (end > idx) return true;
                s = end + 1; continue;
            }
        }
        if (!inStr && ch === '"') { inStr = true; s++; continue; }
        if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') inStr = false;
            s++; continue;
        }
        s++;
    }
    return inStr;
}

/** 从开括号位置找到匹配的闭括号 */
function findMatchingClose(text, start) {
    let depth = 0, pos = start;
    while (pos < text.length) {
        const ch = text[pos];
        if (ch === ';') { pos = skipComment(text, pos); continue; }
        if (ch === '"') { pos = skipString(text, pos); continue; }
        if (ch === '(') depth++;
        else if (ch === ')') { depth--; if (depth === 0) return { end: pos + 1, ok: true }; }
        pos++;
    }
    return { end: pos, ok: false };
}

/** 统计区域内的括号数 */
function countParens(text, regionStart, regionEnd) {
    let op = 0, cl = 0, pos = regionStart;
    while (pos < regionEnd && pos < text.length) {
        const ch = text[pos];
        if (ch === ';') { pos = skipComment(text, pos); continue; }
        if (ch === '"') { pos = skipString(text, pos); continue; }
        if (ch === '(') op++;
        else if (ch === ')') cl++;
        pos++;
    }
    return { open: op, close: cl };
}

/** 提取 defun 函数名 */
function extractFuncName(text, start) {
    const after = text.slice(start + 6).trimStart();
    const name = after.split(/\s/)[0] || '?';
    return name.split('\n')[0];
}

/** 查找所有 (defun 位置（跳过注释/字符串内的假 defun） */
function findAllDefunStarts(text) {
    const starts = new Set();
    let pos = 0;
    while (true) {
        const idx = text.indexOf('(defun', pos);
        if (idx === -1) break;
        if (!isInCommentOrString(text, idx)) starts.add(idx);
        pos = idx + 6;
    }
    return starts;
}

/** 查找所有顶层 defun 块 */
function findAllDefuns(text) {
    const blocks = [], unmatched = [];
    let pos = 0;
    while (true) {
        const idx = text.indexOf('(defun', pos);
        if (idx === -1) break;
        if (isInCommentOrString(text, idx)) { pos = idx + 6; continue; }
        const funcName = extractFuncName(text, idx);
        const { end, ok } = findMatchingClose(text, idx);
        if (!ok) { unmatched.push({ start: idx, name: funcName }); pos = idx + 6; continue; }
        blocks.push({ start: idx, end, name: funcName });
        pos = end;
    }
    return { blocks, unmatched };
}

/** 检测 defun 是否被吞噬 */
function validateBlockBoundaries(blocks, unmatched, text) {
    const allStarts = findAllDefunStarts(text);
    for (const u of unmatched) allStarts.add(u.start);
    const fixed = [], extra = [], warnings = [];
    for (const b of blocks) {
        let contaminated = false, contaminator = 0;
        for (const other of allStarts) {
            if (other !== b.start && b.start < other && other < b.end) {
                contaminated = true;
                contaminator = other;
                break;
            }
        }
        if (contaminated) { warnings.push({ name: b.name, contaminator }); extra.push(b); }
        else fixed.push(b);
    }
    return { fixedBlocks: fixed, fixedUnmatched: [...unmatched, ...extra], warnings };
}

/** 深度栈回溯诊断单个函数块 */
function deepCheck(text, start, end, funcName) {
    const lines = text.slice(0, end).split('\n');
    const startLine = text.slice(0, start).split('\n').length - 1;
    const stack = [], extraCloses = [];
    let inStr = false, esc = false, pos = start, lineNo = startLine;
    const prevNl = text.slice(0, start).lastIndexOf('\n');
    let col = prevNl >= 0 ? start - (prevNl + 1) : start;

    while (pos < end && pos < text.length) {
        const ch = text[pos];
        if (ch === '\n') { lineNo++; col = 0; pos++; continue; }
        if (!inStr && ch === ';') { pos = skipComment(text, pos); col = 0; continue; }
        if (!inStr && ch === '"') { inStr = true; pos++; col++; continue; }
        if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') inStr = false;
            pos++; col++; continue;
        }
        if (ch === '(') stack.push({ line: lineNo, col });
        else if (ch === ')') {
            if (stack.length) stack.pop();
            else extraCloses.push({ line: lineNo, col });
        }
        pos++; col++;
    }

    const out = [];
    out.push(`\n  ${'-'.repeat(50)}`);
    out.push(`  详细诊断: ${funcName}`);
    const endLine = text.slice(0, Math.min(end, text.length)).split('\n').length - 1;
    out.push(`  区间: 第 ${startLine + 1} 行 ~ 第 ${endLine + 1} 行`);
    out.push(`  ${'-'.repeat(50)}`);
    if (extraCloses.length) {
        out.push(`\n  [FAIL] 多余的闭括号: ${extraCloses.length} 处`);
        for (const e of extraCloses) {
            const lt = (lines[e.line] || '').trim();
            out.push(`    第 ${e.line + 1} 行, 第 ${e.col + 1} 列: ${lt.slice(0, 80)}`);
        }
    }
    if (stack.length) {
        out.push(`\n  [FAIL] 未闭合的开括号: ${stack.length} 处`);
        for (const s of stack) {
            const lt = (lines[s.line] || '').trim();
            out.push(`    第 ${s.line + 1} 行, 第 ${s.col + 1} 列: ${lt.slice(0, 80)}`);
        }
    }
    if (!extraCloses.length && !stack.length)
        out.push(`\n  [WARN] 深度追踪正常，但该块的括号总数不平衡`);
    return out.join('\n');
}

/** 全文件扫描未闭合字符串 */
function checkUnclosedStrings(text) {
    const violations = [];
    let pos = 0;
    while (pos < text.length) {
        const ch = text[pos];
        if (ch === ';') { pos = skipComment(text, pos); continue; }
        if (ch === '"') {
            const line = text.slice(0, pos).split('\n').length - 1;
            const prevNl = text.slice(0, pos).lastIndexOf('\n');
            const col = prevNl >= 0 ? pos - (prevNl + 1) : pos;
            const old = pos;
            pos = skipString(text, pos);
            if (pos >= text.length || text[pos - 1] !== '"') {
                violations.push({ severity: 'ERROR', line, col, msg: '字符串未闭合(缺少结尾的 ")' });
                return violations;
            }
            continue;
        }
        pos++;
    }
    return violations;
}

/** 主入口: 对 LISP 文件执行语法检查 */
function lintLispFile(content) {
    const lines = content.split('\n');
    const result = { totalDefuns: 0, completeDefuns: 0, brokenDefuns: 0, blocks: [], errors: [] };

    // 1. 未闭合字符串
    const strErrors = checkUnclosedStrings(content);
    if (strErrors.length) {
        result.errors.push(...strErrors);
        return result;
    }

    // 2. 全文件括号平衡
    const total = countParens(content, 0, content.length);
    result.totalParens = total;

    // 3. 扫描 defun
    const { blocks, unmatched } = findAllDefuns(content);
    const { fixedBlocks, fixedUnmatched, warnings } = validateBlockBoundaries(blocks, unmatched, content);

    result.blocks = fixedBlocks;
    result.totalDefuns = fixedBlocks.length + fixedUnmatched.length;
    result.completeDefuns = fixedBlocks.length;
    result.brokenDefuns = fixedUnmatched.length;

    // 4. 检查间隔区域的括号平衡
    const gaps = [];
    let prevEnd = 0;
    for (const b of fixedBlocks) {
        if (b.start > prevEnd) gaps.push({ start: prevEnd, end: b.start });
        prevEnd = b.end;
    }
    if (prevEnd < content.length) gaps.push({ start: prevEnd, end: content.length });

    // 5. 生成详细报告
    const report = [];
    report.push(`============================================================`);
    report.push(`  文件分析`);
    report.push(`  共 ${result.totalDefuns} 个 defun 函数块 (${result.completeDefuns} 完整, ${result.brokenDefuns} 残缺)`);
    report.push(`============================================================`);

    // 间隔在前
    let gapIdx = 0;
    for (let i = 0; i < fixedBlocks.length; i++) {
        const b = fixedBlocks[i];
        // 输出前面的间隙
        while (gapIdx < gaps.length && gaps[gapIdx].end <= b.start) {
            const g = gaps[gapIdx];
            const gContent = content.slice(g.start, g.end).trim();
            const gStartLine = content.slice(0, g.start).split('\n').length;
            const gEndLine = content.slice(0, g.end).split('\n').length - 1;
            const gp = countParens(content, g.start, g.end);
            const gOk = gp.open === gp.close;
            report.push(`  [间隙 第${gStartLine}-${gEndLine}行] [${gOk ? 'OK' : 'FAIL'}] ${gOk ? '平衡' : '不平衡 — 开' + gp.open + ' 闭' + gp.close}`);
            if (!gOk && gContent) {
                const extraOpen = gp.open - gp.close;
                report.push(`    ${extraOpen > 0 ? '未闭合的开括号: ' + extraOpen + ' 处' : '多余的闭括号: ' + (-extraOpen) + ' 处'}`);
            }
            gapIdx++;
        }
        // 输出 defun
        const bp = countParens(content, b.start, b.end);
        const bOk = bp.open === bp.close;
        report.push(`  [${b.name}] [${bOk ? 'OK' : 'FAIL'}] ${bOk ? '平衡' : '不平衡 — 开' + bp.open + ' 闭' + bp.close}`);
        if (!bOk) {
            const detail = deepCheck(content, b.start, b.end, b.name);
            report.push(...detail.split('\n').map(l => '  ' + l));
        }
    }
    // 剩余间隙
    while (gapIdx < gaps.length) {
        const g = gaps[gapIdx];
        const gStartLine = content.slice(0, g.start).split('\n').length;
        const gEndLine = content.slice(0, g.end).split('\n').length - 1;
        const gp = countParens(content, g.start, g.end);
        const gOk = gp.open === gp.close;
        const gContent = content.slice(g.start, g.end).trim();
        report.push(`  [间隙 第${gStartLine}-${gEndLine}行] [${gOk ? 'OK' : 'FAIL'}] ${gOk ? '平衡' : '不平衡 — 开' + gp.open + ' 闭' + gp.close}`);
        if (!gOk && gContent) {
            const extraOpen = gp.open - gp.close;
            const detail = deepCheck(content, g.start, g.end, '间隙');
            report.push(...detail.split('\n').map(l => '  ' + l));
        }
        gapIdx++;
    }

    // 处理不匹配的 defun
    for (const u of fixedUnmatched) {
        const uLine = content.slice(0, u.start).split('\n').length;
        report.push(`  [${u.name}] [FAIL] 残缺 — 第${uLine}行起未找到匹配闭括号`);
    }

    // lambda( 检查
    let lambdaPos = 0;
    while (lambdaPos < content.length) {
        const idx = content.toLowerCase().indexOf('lambda(', lambdaPos);
        if (idx === -1) break;
        if (!isInCommentOrString(content, idx)) {
            const line = content.slice(0, idx).split('\n').length - 1;
            const prevNl = content.slice(0, idx).lastIndexOf('\n');
            const col = prevNl >= 0 ? idx - (prevNl + 1) : idx;
            result.errors.push({ severity: 'ERROR', line, col, msg: 'lambda 后缺少空格，应写为 (lambda (参数) ...)' });
        }
        lambdaPos = idx + 7;
    }

    // 重复 defun 检测
    const nameCount = {};
    for (const b of fixedBlocks) {
        (nameCount[b.name] = nameCount[b.name] || []).push(b.start);
    }
    for (const [fname, positions] of Object.entries(nameCount)) {
        if (positions.length > 1) {
            for (const pos of positions) {
                const line = content.slice(0, pos).split('\n').length - 1;
                result.errors.push({ severity: 'WARN', line, col: 0, msg: `函数 "${fname}" 重复定义(${positions.length}次)` });
            }
        }
    }

    const hasFail = total.open !== total.close || fixedUnmatched.length > 0 || result.errors.length > 0;
    result.passed = !hasFail;
    result.report = report.join('\n');
    result.summary = `括号: 开${total.open} 闭${total.close} | Defun: ${result.completeDefuns}完整 ${result.brokenDefuns}残缺 | 错误: ${result.errors.length}`;

    return result;
}

function activate(context) {
    context.subscriptions.push(
        vscode.debug.onDidReceiveDebugSessionCustomEvent(evt => {
            pushLog({ t: new Date().toISOString().slice(11, 23), event: evt.event });
        })
    );
    context.subscriptions.push(
        vscode.debug.onDidChangeActiveDebugSession(() => {
            const s = vscode.debug.activeDebugSession;
            pushLog({ t: 'SESSION', event: s ? 'attached' : 'detached' });
        })
    );

    // evaluate（带 10 秒超时）
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.evaluate', async (expr) => {
            const s = vscode.debug.activeDebugSession;
            if (!s) return 'ERR: no session';
            try {
                const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
                const req = s.customRequest('evaluate', { expression: String(expr), context: 'repl' });
                const r = await Promise.race([req, timeout]);
                pushLog({ t: 'EVAL', expr, result: r });
                const extra = { _type: typeof r, _isNull: r === null, _isObj: r !== null && typeof r === 'object' };
                if (r && typeof r === 'object') {
                    for (const k of Object.getOwnPropertyNames(r)) {
                        try { extra[k] = JSON.stringify(r[k]); } catch (e) { extra[k] = String(r[k]); }
                    }
                    // 尝试遍历原型链
                    let proto = Object.getPrototypeOf(r);
                    let pidx = 0;
                    while (proto && pidx < 3) {
                        for (const k of Object.getOwnPropertyNames(proto)) {
                            if (!(k in r)) {
                                try { extra['_proto'+pidx+'_'+k] = JSON.stringify(proto[k]); } catch(e) {}
                            }
                        }
                        proto = Object.getPrototypeOf(proto);
                        pidx++;
                    }
                }
                return JSON.stringify(extra);
            } catch (e) {
                if (e.message === 'timeout') return 'ERR: evaluate timeout (10s)';
                return `ERR: ${e.message}`;
            }
        })
    );

    // loadFile（带 10 秒超时）
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.loadFile', async (filePath) => {
            const s = vscode.debug.activeDebugSession;
            if (!s) return 'ERR: no session';
            const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
            try {
                const req = s.customRequest('customLoad', filePath);
                await Promise.race([req, timeout]);
                pushLog({ t: 'LOAD', file: filePath });
                return 'OK';
            } catch (e) {
                if (e.message === 'timeout') return 'ERR: loadFile timeout (10s)';
                return `ERR: ${e.message}`;
            }
        })
    );

    // getState
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.getState', () => {
            const ed = vscode.window.activeTextEditor;
            const ss = vscode.debug.activeDebugSession;
            const diag = vscode.languages.getDiagnostics();
            const ds = diag.map(([u, a]) => ({
                file: u.fsPath,
                errors: a.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length,
                warnings: a.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length
            })).filter(d => d.errors + d.warnings > 0);
            return JSON.stringify({
                hasEditor: !!ed,
                editorFile: ed ? ed.document.fileName : null,
                editorLang: ed ? ed.document.languageId : null,
                debugSession: ss ? ss.type + ':' + ss.id : null,
                terminals: (vscode.window.terminals || []).map(t => ({ name: t.name })),
                diagnostics: ds,
                logCount: outputLog.length
            });
        })
    );

    // execCommand — 执行任意 VS Code 命令
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.execCommand', async (cmdId, ...args) => {
            try {
                const r = await vscode.commands.executeCommand(cmdId, ...args);
                return r === undefined ? 'OK' : String(r);
            } catch (e) { return `ERR: ${e.message}`; }
        })
    );

    // lisp — 通过 PowerShell COM 执行 LISP 表达式并捕获错误
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.lisp', async (expr) => {
            const cp = require('child_process');
            const escaped = String(expr).replace(/"/g, '\\"').replace(/\n/g, ' ');
            try {
                const out = cp.execSync(
                    `powershell -NoProfile -Command "$acad=[System.Runtime.InteropServices.Marshal]::GetActiveObject('AutoCAD.Application');$doc=$acad.ActiveDocument;$doc.SendCommand('${escaped} ')"`,
                    { encoding: 'utf8', timeout: 15000 }
                ).trim();
                pushLog({ t: 'LISP', expr, out });
                return 'OK';
            } catch (e) {
                pushLog({ t: 'LISP', expr, err: e.message });
                return `ERR: ${e.message}`;
            }
        })
    );

    // getOutput
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.getOutput', () => JSON.stringify(outputLog))
    );

    // clearOutput
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.clearOutput', () => { outputLog.length = 0; return 'OK'; })
    );

    // getDiagnostics
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.getDiagnostics', () => {
            const all = vscode.languages.getDiagnostics();
            const r = all.map(([u, a]) => ({
                file: u.fsPath,
                issues: a.map(d => ({
                    msg: d.message,
                    sev: ['Ignore', 'Hint', 'Warning', 'Error'][d.severity] || 'Unknown',
                    line: d.range.start.line + 1,
                    col: d.range.start.character + 1
                }))
            })).filter(d => d.issues.length > 0);
            return JSON.stringify(r, null, 1);
        })
    );

    // openFile — 静默打开文件到编辑器，不弹窗
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.openFile', async (filePath) => {
            try {
                const uri = vscode.Uri.file(String(filePath));
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc, { preview: false });
                pushLog({ t: 'OPENFILE', file: filePath });
                return 'OK';
            } catch (e) { return `ERR: ${e.message}`; }
        })
    );

    // lintFile — 内置 JS linter 检查 LISP 文件（无需 Python）
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.lintFile', async (filePath) => {
            const fs = require('fs');
            const path = require('path');

            const targetPath = path.resolve(String(filePath || ''));
            if (!targetPath || !fs.existsSync(targetPath)) {
                // 尝试用当前编辑器文件
                const ed = vscode.window.activeTextEditor;
                if (ed && fs.existsSync(ed.document.fileName))
                    filePath = ed.document.fileName;
                else
                    return 'ERR: file not found and no active editor';
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const result = lintLispFile(content);
                pushLog({ t: 'LINT', file: filePath, passed: result.passed });

                let output = result.report;
                output += `\n============================================================`;
                if (result.errors.length) {
                    for (const e of result.errors) {
                        output += `\n  [${e.severity}] 第${e.line+1}行, 第${e.col+1}列: ${e.msg}`;
                    }
                }
                const verdict = result.passed ? '[OK] 全部通过' : '[FAIL] 存在问题';
                output += `\n  结论: ${verdict}`;
                output += `\n============================================================`;
                return output;
            } catch (e) { return `ERR: ${e.message}`; }
        })
    );

    // selfCheck — 一键全自动：lint → attach → load → test
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.selfCheck', async (filePath) => {
            const results = { steps: [], errors: [] };
            const addStep = (name, ok, detail) => results.steps.push({ name, ok, detail });

            const fs = require('fs');
            const path = require('path');
            const targetPath = path.resolve(String(filePath || ''));

            // 1. 检查文件存在
            if (!targetPath || !fs.existsSync(targetPath)) {
                // 尝试用当前编辑器文件
                const ed = vscode.window.activeTextEditor;
                if (ed && fs.existsSync(ed.document.fileName)) {
                    filePath = ed.document.fileName;
                } else {
                    addStep('文件检查', false, '未指定文件且无活动编辑器');
                    return JSON.stringify(results, null, 1);
                }
            }

            // 2. 语法检查（内置 JS linter）
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const lintResult = lintLispFile(content);
                const hasFail = !lintResult.passed;
                addStep('语法检查', !hasFail, hasFail ? '存在语法错误' : '通过');
                results.lintOutput = hasFail ? (lintResult.report + '\n  结论: [FAIL]') : '通过';
            } catch (e) { addStep('语法检查', false, e.message); }

            // 3. 自动附着 CAD
            try {
                const ext = vscode.extensions.getExtension('autodesk.autolispext');
                if (!ext) { addStep('附着CAD', false, 'AutoCAD扩展未找到'); }
                else {
                    if (!ext.isActive) await ext.activate();
                    const debugJsPath = path.join(ext.extensionPath, 'out', 'debug');
                    let debugModule;
                    try { debugModule = require(debugJsPath); } catch (e2) { throw new Error('require debug.js: ' + e2.message); }
                    if (typeof debugModule.setDefaultAcadPid !== 'function') throw new Error('setDefaultAcadPid not found');
                    const cp = require('child_process');
                    const pidOut = cp.execSync(
                        'powershell -Command "(Get-Process acad|Sort StartTime -Descending|Select -First 1).Id"',
                        { encoding: 'utf8', timeout: 5000 }
                    ).trim();
                    const pid = parseInt(pidOut, 10);
                    if (isNaN(pid) || pid <= 0) throw new Error('no CAD process');
                    debugModule.setDefaultAcadPid(pid);
                    await vscode.commands.executeCommand('workbench.action.debug.start');
                    addStep('附着CAD', true, 'PID=' + pid);
                }
            } catch (e) { addStep('附着CAD', false, e.message); }

            // 4. 加载文件到 CAD
            const s = vscode.debug.activeDebugSession;
            if (s) {
                try {
                    const normPath = String(filePath).replace(/\\/g, '/');
                    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
                    const req = s.customRequest('evaluate', {
                        expression: `(load "${normPath}")`,
                        context: 'repl'
                    });
                    await Promise.race([req, timeout]);
                    addStep('加载CAD', true, '');
                } catch (e) { addStep('加载CAD', false, e.message); }
            } else { addStep('加载CAD', false, '无调试会话'); }

            // 5. 结论
            const failed = results.steps.filter(s => !s.ok);
            results.conclusion = failed.length === 0 ? '全部通过' : `${failed.length}/${results.steps.length} 步失败`;
            pushLog({ t: 'SELFCHECK', file: filePath, ok: failed.length === 0 });
            return JSON.stringify(results, null, 1);
        })
    );

    // autoAttach — 通过 AutoCAD 扩展的 setDefaultAcadPid 跳过进程选择器
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.autoAttach', async () => {
            // 获取 AutoCAD 扩展
            const ext = vscode.extensions.getExtension('autodesk.autolispext');
            if (!ext) return 'ERR: AutoCAD extension not found';

            // 确保扩展已激活
            if (!ext.isActive) await ext.activate();

            // 通过 Node.js 模块缓存加载 debug.js（与 AutoCAD 扩展共享同一模块实例）
            const debugJsPath = require('path').join(ext.extensionPath, 'out', 'debug');
            let debugModule;
            try { debugModule = require(debugJsPath); }
            catch (e) { return `ERR: require debug.js failed: ${e.message}`; }

            if (typeof debugModule.setDefaultAcadPid !== 'function')
                return 'ERR: setDefaultAcadPid not found';

            // 获取当前 CAD 进程 PID
            const cp2 = require('child_process');
            let pid;
            try {
                const out = cp2.execSync(
                    'powershell -Command "(Get-Process acad|Sort StartTime -Descending|Select -First 1).Id"',
                    { encoding: 'utf8', timeout: 5000 }
                ).trim();
                pid = parseInt(out, 10);
                if (isNaN(pid) || pid <= 0) return 'ERR: no CAD process found';
            } catch (e) { return `ERR: failed to get CAD PID: ${e.message}`; }

            // 设置默认 PID
            debugModule.setDefaultAcadPid(pid);
            pushLog({ t: 'AUTOATTACH', pid });

            // 启动调试（此时 pickProcess 会直接返回该 PID 而不弹窗）
            try {
                await vscode.commands.executeCommand('workbench.action.debug.start');
                return 'OK';
            } catch (e) { return `ERR: debug start failed: ${e.message}`; }
        })
    );
}

function deactivate() {}
module.exports = { activate, deactivate };
