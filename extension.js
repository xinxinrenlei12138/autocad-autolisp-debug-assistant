// VS Code 运行时加载 vscode 模块；Node.js 测试环境跳过
let vscode;
try { vscode = require('vscode'); } catch(e) { vscode = null; }

const MAX_LOG = 500;
const outputLog = [];

function pushLog(entry) { outputLog.push(entry); if (outputLog.length > MAX_LOG) outputLog.shift(); }

// ============================================================
// AutoLISP 函数签名表
// ============================================================

/** 高频函数精确签名 — 同时校验参数下限和上限 */
const AUTOLISP_PRECISE_SIGS = {
  'car':    { minArgs: 1, maxArgs: 1 },
  'cdr':    { minArgs: 1, maxArgs: 1 },
  'setq':   { minArgs: 2, maxArgs: null, special: 'even' },
  'if':     { minArgs: 2, maxArgs: 3 },
  'while':  { minArgs: 2, maxArgs: null },
  'defun':  { minArgs: 2, maxArgs: null },
  'repeat': { minArgs: 2, maxArgs: null },
  'foreach':{ minArgs: 3, maxArgs: null },
  'progn':  { minArgs: 0, maxArgs: null },
  'cond':   { minArgs: 1, maxArgs: null },
  'command':{ minArgs: 1, maxArgs: null },
  'strcat': { minArgs: 0, maxArgs: null },
  'substr': { minArgs: 2, maxArgs: 3 },
  'list':   { minArgs: 0, maxArgs: null },
  'nth':    { minArgs: 2, maxArgs: 2 },
  'cons':   { minArgs: 2, maxArgs: 2 },
  'append': { minArgs: 0, maxArgs: null },
  'length': { minArgs: 1, maxArgs: 1 },
  'member': { minArgs: 2, maxArgs: 2 },
  'reverse':{ minArgs: 1, maxArgs: 1 },
  'assoc':  { minArgs: 2, maxArgs: 2 },
  'subst':  { minArgs: 3, maxArgs: 3 },
  'entget': { minArgs: 1, maxArgs: 1 },
  'entmod': { minArgs: 1, maxArgs: 1 },
  'entmake':{ minArgs: 1, maxArgs: 1 },
  'entdel': { minArgs: 1, maxArgs: 1 },
  'ssget':  { minArgs: 0, maxArgs: null },
  'ssadd':  { minArgs: 0, maxArgs: 2 },
  'ssdel':  { minArgs: 2, maxArgs: 2 },
  'sslength':{ minArgs: 1, maxArgs: 1 },
  'ssname': { minArgs: 2, maxArgs: 2 },
  'mapcar': { minArgs: 2, maxArgs: null },
  'apply':  { minArgs: 2, maxArgs: 2 },
  'lambda': { minArgs: 1, maxArgs: null },
  'princ':  { minArgs: 0, maxArgs: 2 },
  'print':  { minArgs: 0, maxArgs: 2 },
  'terpri': { minArgs: 0, maxArgs: 0 },
  'read-line': { minArgs: 0, maxArgs: 1 },
  'write-line': { minArgs: 1, maxArgs: 2 },
  'open':   { minArgs: 2, maxArgs: 2 },
  'close':  { minArgs: 1, maxArgs: 1 },
  '1+':     { minArgs: 1, maxArgs: 1 },
  '1-':     { minArgs: 1, maxArgs: 1 },
  'abs':    { minArgs: 1, maxArgs: 1 },
  'angle':  { minArgs: 2, maxArgs: 2 },
  'distance': { minArgs: 2, maxArgs: 2 },
  'polar':  { minArgs: 3, maxArgs: 3 },
  'itoa':   { minArgs: 1, maxArgs: 1 },
  'atoi':   { minArgs: 1, maxArgs: 1 },
  'atof':   { minArgs: 1, maxArgs: 1 },
  'fix':    { minArgs: 1, maxArgs: 1 },
  'float':  { minArgs: 1, maxArgs: 1 },
  'type':   { minArgs: 1, maxArgs: 1 },
  'boundp': { minArgs: 1, maxArgs: 1 },
  'null':   { minArgs: 1, maxArgs: 1 },
  'not':    { minArgs: 1, maxArgs: 1 },
  'and':    { minArgs: 0, maxArgs: null },
  'or':     { minArgs: 0, maxArgs: null },
  'equal':  { minArgs: 2, maxArgs: 3 },
  '=':      { minArgs: 0, maxArgs: null },
  '<':      { minArgs: 0, maxArgs: null },
  '>':      { minArgs: 0, maxArgs: null },
  '<=':     { minArgs: 0, maxArgs: null },
  '>=':     { minArgs: 0, maxArgs: null },
  '/=':     { minArgs: 0, maxArgs: null },
  '+':      { minArgs: 0, maxArgs: null },
  '-':      { minArgs: 1, maxArgs: null },
  '*':      { minArgs: 0, maxArgs: null },
  '/':      { minArgs: 2, maxArgs: null },
  'rem':    { minArgs: 2, maxArgs: null },
  'min':    { minArgs: 1, maxArgs: null },
  'max':    { minArgs: 1, maxArgs: null },
  'sin':    { minArgs: 1, maxArgs: 1 },
  'cos':    { minArgs: 1, maxArgs: 1 },
  'atan':   { minArgs: 1, maxArgs: 2 },
  'sqrt':   { minArgs: 1, maxArgs: 1 },
  'expt':   { minArgs: 2, maxArgs: 2 },
  'log':    { minArgs: 1, maxArgs: 1 },
  'gcd':    { minArgs: 2, maxArgs: null },
  'set':    { minArgs: 2, maxArgs: 2 },
  'getvar': { minArgs: 1, maxArgs: 1 },
  'setvar': { minArgs: 2, maxArgs: 2 },
  'chr':    { minArgs: 1, maxArgs: 1 },
  'ascii':  { minArgs: 1, maxArgs: 1 },
  'strlen': { minArgs: 1, maxArgs: 1 },
  'read':   { minArgs: 1, maxArgs: 1 },
  'vl-load-com': { minArgs: 0, maxArgs: 0 },
  'entnext': { minArgs: 0, maxArgs: 1 },
  'entsel': { minArgs: 0, maxArgs: 1 },
  'entupd': { minArgs: 1, maxArgs: 1 },
  'trans':  { minArgs: 2, maxArgs: 3 },
  'rtos':   { minArgs: 1, maxArgs: 3 },
  'angtos': { minArgs: 1, maxArgs: 3 },
  'caddr':  { minArgs: 1, maxArgs: 1 },
  'cadr':   { minArgs: 1, maxArgs: 1 },
  'caar':   { minArgs: 1, maxArgs: 1 },
  'cdar':   { minArgs: 1, maxArgs: 1 },
  'cddr':   { minArgs: 1, maxArgs: 1 },
  'last':   { minArgs: 1, maxArgs: 1 },
  'numberp': { minArgs: 1, maxArgs: 1 },
  'listp':  { minArgs: 1, maxArgs: 1 },
  'atom':   { minArgs: 1, maxArgs: 1 },
  'minusp': { minArgs: 1, maxArgs: 1 },
  'zerop':  { minArgs: 1, maxArgs: 1 },
  'eq':     { minArgs: 2, maxArgs: 2 },
  'wcmatch': { minArgs: 2, maxArgs: 2 },
  'acad_strlsort': { minArgs: 1, maxArgs: 1 },
  'entlast': { minArgs: 0, maxArgs: 0 },
  'entmakex': { minArgs: 1, maxArgs: 1 },
  'prin1':  { minArgs: 1, maxArgs: 2 },
  'prompt': { minArgs: 1, maxArgs: 1 },
  'osnap':  { minArgs: 2, maxArgs: 2 },
  'inters': { minArgs: 3, maxArgs: 4 },
  'redraw': { minArgs: 1, maxArgs: 3 },
  'ssmemb': { minArgs: 2, maxArgs: 2 },
  'cvunit': { minArgs: 3, maxArgs: 3 },
  'eval':   { minArgs: 1, maxArgs: 1 },
  'quote':  { minArgs: 1, maxArgs: 1 },
  'exit':   { minArgs: 0, maxArgs: 0 },
  'quit':   { minArgs: 0, maxArgs: 0 },
  'gc':     { minArgs: 0, maxArgs: 0 },
  'boole':  { minArgs: 3, maxArgs: null },
  'lsh':    { minArgs: 2, maxArgs: 2 },
  'logand': { minArgs: 1, maxArgs: null },
  'logior': { minArgs: 1, maxArgs: null },
  'strcase': { minArgs: 1, maxArgs: 2 },
  'read-char': { minArgs: 0, maxArgs: 1 },
  'write-char': { minArgs: 1, maxArgs: 2 },
};

/** 标准函数最少参数数 — 仅校验下限 */
const AUTOLISP_MIN_ARGS = {
  'abs': 1, 'acad_strlsort': 1, 'acad_truecolorcli': 1, 'acad_truecolordlg': 1,
  'action_tile': 2, 'add_list': 1, 'alloc': 0, 'and': 0, 'angle': 2,
  'apply': 2, 'arxload': 1, 'arxunload': 1, 'ascii': 1, 'assert': 1,
  'assoc': 2, 'atan': 1, 'atof': 1, 'atoi': 1, 'atom': 1,
  'boole': 3, 'boundp': 1, 'caddr': 1, 'cadr': 1, 'caar': 1, 'car': 1,
  'cdar': 1, 'cddr': 1, 'cdr': 1, 'chr': 1, 'client_data_tile': 2,
  'close': 1, 'command': 1, 'cond': 1, 'cons': 2, 'cos': 1, 'cvunit': 3,
  'defun': 2, 'dimx_tile': 1, 'dimy_tile': 1, 'distance': 2,
  'done_dialog': 1, 'dos_help': 0, 'end_image': 0, 'end_list': 0,
  'entdel': 1, 'entget': 1, 'entlast': 0, 'entmake': 1, 'entmakex': 1,
  'entmod': 1, 'entnext': 0, 'entsel': 0, 'entupd': 1, 'eq': 2, 'equal': 2,
  'eval': 1, 'exit': 0, 'exp': 1, 'expt': 2, 'fill_image': 5,
  'findfile': 1, 'fix': 1, 'float': 1, 'foreach': 3, 'function': 1,
  'gc': 0, 'gcd': 2, 'get_attr': 2, 'get_tile': 1, 'getangle': 0,
  'getcfg': 1, 'getcorner': 1, 'getdist': 0, 'getenv': 1, 'getfield': 4,
  'getint': 0, 'getkword': 0, 'getorient': 0, 'getpoint': 0, 'getreal': 0,
  'getstring': 0, 'getvar': 1, 'graphscr': 0, 'grdraw': 4, 'grread': 0,
  'grtext': 1, 'grvecs': 2, 'handent': 1, 'help': 0, 'if': 2,
  'initdia': 0, 'initget': 1, 'inters': 3, 'itoa': 1, 'lambda': 1,
  'last': 1, 'length': 1, 'list': 0, 'listp': 1, 'load': 1,
  'log': 1, 'logand': 1, 'logior': 1, 'lsh': 2, 'mapcar': 2, 'max': 1,
  'member': 2, 'menucmd': 1, 'menugroup': 1, 'min': 1, 'minusp': 1,
  'mode_tile': 2, 'named_box': 1, 'new_dialog': 2, 'not': 1, 'nth': 2,
  'null': 1, 'numberp': 1, 'open': 2, 'or': 0, 'osnap': 2, 'polar': 3,
  'prin1': 0, 'princ': 0, 'print': 0, 'progn': 0, 'prompt': 1,
  'quit': 0, 'quote': 1, 'read': 1, 'read-char': 0, 'read-line': 0,
  'redraw': 1, 'rem': 2, 'repeat': 2, 'reverse': 1, 'rtos': 1,
  'set': 2, 'set_tile': 2, 'setq': 2, 'setvar': 2, 'sin': 1,
  'slide_image': 5, 'snvalid': 1, 'sqrt': 1, 'ssadd': 0, 'ssdel': 2,
  'ssget': 0, 'ssgetfirst': 0, 'sslength': 1, 'ssmemb': 2, 'ssname': 2,
  'ssnamex': 2, 'sssetfirst': 2, 'start_dialog': 0, 'start_image': 1,
  'start_list': 1, 'strcase': 1, 'strcat': 0, 'strlen': 1, 'subst': 3,
  'substr': 2, 't': 0, 'tablet': 1, 'term_dialog': 0, 'terpri': 0,
  'textpage': 0, 'textscr': 0, 'trace': 1, 'trans': 2, 'type': 1,
  'untrace': 1, 'vector_image': 5, 'ver': 0, 'vports': 0, 'wcmatch': 2,
  'while': 2, 'write-char': 1, 'write-line': 1, 'xdroom': 1, 'xdsize': 1,
  'zerop': 1,
  // vla-/vlax-/vlr- 扩展
  'vla-activate': 1, 'vla-add': 2, 'vla-addcircle': 3,
  'vla-addline': 3, 'vla-addtext': 3, 'vla-delete': 1,
  'vla-get-activelayer': 1, 'vla-get-activedocument': 1,
  'vla-get-applications': 1, 'vla-get-color': 1,
  'vla-get-linetype': 1, 'vla-get-modelspace': 1,
  'vla-get-name': 1, 'vla-get-objectname': 1,
  'vla-get-paperspace': 1, 'vla-get-textstring': 1,
  'vla-item': 2, 'vla-put-color': 2, 'vla-put-layer': 2,
  'vla-put-linetype': 2, 'vla-put-name': 2,
  'vla-put-textstring': 2, 'vla-update': 1,
  'vlax-ename->vla-object': 1, 'vlax-vla-object->ename': 1,
  'vlax-get': 2, 'vlax-get-property': 2,
  'vlax-put': 3, 'vlax-put-property': 3,
  'vlax-invoke': 2, 'vlax-invoke-method': 2,
  'vlax-make-variant': 1, 'vlax-make-safearray': 2,
  'vlax-safearray->list': 1, 'vlax-safearray-fill': 2,
  'vlax-safearray-get-dimension': 1, 'vlax-safearray-get-element': 2,
  'vlax-safearray-get-lbound': 2, 'vlax-safearray-get-ubound': 2,
  'vlax-safearray-put-element': 3, 'vlax-safearray-type': 1,
  'vlax-variant-value': 1, 'vlax-variant-type': 1,
  'vlax-variant-change-type': 2, 'vlax-write-enabled-p': 1,
  'vlax-read-enabled-p': 1, 'vlax-property-available-p': 2,
  'vlax-method-applicable-p': 2, 'vlax-object-destroyed-p': 1,
  'vlax-dump-object': 1,
  'vlr-acdb-reactor': 1, 'vlr-editor-reactor': 1,
  'vlr-object-reactor': 3, 'vlr-command-reactor': 1,
  'vlr-lisp-reactor': 1, 'vlr-miscellaneous-reactor': 1,
  'vlr-linker-reactor': 1, 'vlr-sysvar-reactor': 1,
  'vlr-notify-reactor': 1, 'vlr-toolbar-reactor': 1,
  'vlr-remove': 1, 'vlr-reaction-names': 1,
  'vlr-reactions': 1, 'vlr-set-notification': 2,
  'vlr-trace-reaction': 1,
};

// ============================================================
// AutoLISP Linter 核心引擎
// ============================================================

/** 跳过注释: 支持 ; 行注释 和 ;| ... |; 块注释 */
function skipComment(text, pos) {
    if (pos + 1 >= text.length) return pos;
    if (text.slice(pos, pos + 2) === ';|') {
        pos += 2;
        while (pos < text.length - 1) {
            if (text.slice(pos, pos + 2) === '|;') return pos + 2;
            pos++;
        }
        return pos;
    }
    while (pos < text.length && text[pos] !== '\n') pos++;
    return pos;
}

/** 跳过双引号字符串，处理 \\ 和 \" 转义 */
function skipString(text, pos) {
    pos++;
    let esc = false;
    while (pos < text.length) {
        const ch = text[pos];
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') return pos + 1;
        pos++;
    }
    return pos;
}

/** 检查位置是否在注释或字符串内 */
function isInCommentOrString(text, idx) {
    let s = 0, inStr = false, esc = false;
    while (s <= idx) {
        const ch = text[s];
        if (!inStr && ch === ';') {
            if (s + 1 < text.length && text.slice(s, s + 2) === ';|') {
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

/** 深度栈回溯诊断 — 结构化版本，返回 { unclosed, extraCloses } */
function deepCheckStructured(text, start, end) {
    const stack = [], extraCloses = [];
    let inStr = false, esc = false, pos = start;
    while (pos < end && pos < text.length) {
        const ch = text[pos];
        if (ch === '\n') { pos++; continue; }
        if (!inStr && ch === ';') { pos = skipComment(text, pos); continue; }
        if (!inStr && ch === '"') { inStr = true; pos++; continue; }
        if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') inStr = false;
            pos++; continue;
        }
        const line = text.slice(0, pos).split('\n').length - 1;
        const prevNl = text.slice(0, pos).lastIndexOf('\n');
        const col = prevNl >= 0 ? pos - (prevNl + 1) : pos;
        if (ch === '(') stack.push({ line, col });
        else if (ch === ')') {
            if (stack.length) stack.pop();
            else extraCloses.push({ line, col });
        }
        pos++;
    }
    return { unclosed: stack, extraCloses };
}

/** 深度栈回溯诊断 — 文本报告版（调用 deepCheckStructured 再格式化） */
function deepCheck(text, start, end, funcName) {
    const { unclosed, extraCloses } = deepCheckStructured(text, start, end);
    const lines = text.slice(0, end).split('\n');
    const startLine = text.slice(0, start).split('\n').length - 1;
    const endLine = text.slice(0, Math.min(end, text.length)).split('\n').length - 1;

    const out = [];
    out.push('\n  ' + '-'.repeat(50));
    out.push('  详细诊断: ' + funcName);
    out.push('  区间: 第 ' + (startLine + 1) + ' 行 ~ 第 ' + (endLine + 1) + ' 行');
    out.push('  ' + '-'.repeat(50));
    if (extraCloses.length) {
        out.push('\n  [FAIL] 多余的闭括号: ' + extraCloses.length + ' 处');
        for (const e of extraCloses) {
            const lt = (lines[e.line] || '').trim();
            out.push('    第 ' + (e.line + 1) + ' 行, 第 ' + (e.col + 1) + ' 列: ' + lt.slice(0, 80));
        }
    }
    if (unclosed.length) {
        out.push('\n  [FAIL] 未闭合的开括号: ' + unclosed.length + ' 处');
        for (const s of unclosed) {
            const lt = (lines[s.line] || '').trim();
            out.push('    第 ' + (s.line + 1) + ' 行, 第 ' + (s.col + 1) + ' 列: ' + lt.slice(0, 80));
        }
    }
    if (!extraCloses.length && !unclosed.length)
        out.push('\n  [WARN] 深度追踪正常，但该块的括号总数不平衡');
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
            pos = skipString(text, pos);
            if (pos >= text.length || text[pos - 1] !== '"') {
                violations.push({ severity: 'ERROR', line, col, msg: '字符串未闭合(缺少结尾的 ")', code: 'UNCLOSED_STRING' });
                return violations;
            }
            continue;
        }
        pos++;
    }
    return violations;
}

// ============================================================
// Phase 2: 函数签名校验
// ============================================================

/** 从 ( 位置数直接子表达式个数（跳过注释/字符串/嵌套括号） */
function countArgs(text, openPos) {
    let pos = openPos + 1;
    let depth = 1;
    let args = 0;
    let gotToken = false;

    while (pos < text.length && depth > 0) {
        const ch = text[pos];
        if (ch === ';') { pos = skipComment(text, pos); continue; }
        if (ch === '"') {
            pos = skipString(text, pos);
            if (depth === 1) gotToken = true;
            continue;
        }
        if (ch === '(') {
            // 子表达式作为整体算一个参数
            if (depth === 1) {
                if (gotToken) args++; // 先前的 token
                args++; // 子表达式本身算一个参数
                gotToken = false;
            }
            depth++;
            pos++; continue;
        }
        if (ch === ')') {
            depth--;
            if (depth === 0) {
                if (gotToken) { args++; gotToken = false; }
                pos++; continue;
            }
            if (depth === 1 && gotToken) { args++; gotToken = false; }
            pos++; continue;
        }
        if (ch === '\n' || ch === '\r' || ch === '\t' || ch === ' ') {
            if (depth === 1 && gotToken) { args++; gotToken = false; }
            pos++; continue;
        }
        if (depth === 1) gotToken = true;
        pos++;
    }
    return args;
}

/** 校验函数参数签名，返回错误项数组 */
function checkSignatures(text) {
    const errors = [];
    let pos = 0;

    while (pos < text.length) {
        const ch = text[pos];
        if (ch === ';') { pos = skipComment(text, pos); continue; }
        if (ch === '"') { pos = skipString(text, pos); continue; }
        if (ch === '(') {
            // 读取函数名
            let nameStart = pos + 1;
            while (nameStart < text.length && ' \t\n\r'.includes(text[nameStart])) nameStart++;
            let nameEnd = nameStart;
            while (nameEnd < text.length && !" \t\n\r()\"';".includes(text[nameEnd])) nameEnd++;
            const rawName = text.slice(nameStart, nameEnd);
            const funcName = rawName.toLowerCase();

            // 查找签名
            const precise = AUTOLISP_PRECISE_SIGS[funcName];
            const minArgsEntry = !precise ? AUTOLISP_MIN_ARGS[funcName] : undefined;

            if (precise || minArgsEntry !== undefined) {
                const argCount = countArgs(text, pos) - 1; // 减去函数名本身
                const line = text.slice(0, pos).split('\n').length - 1;
                const prevNl = text.slice(0, pos).lastIndexOf('\n');
                const col = prevNl >= 0 ? pos - (prevNl + 1) : pos;

                if (precise) {
                    if (precise.special === 'even') {
                        // setq 等成对约束：参数(不含函数名)必须 >= minArgs 且为偶数
                        if (argCount < precise.minArgs) {
                            errors.push({ severity: 'ERROR', line, col, msg: '函数 "' + rawName + '" 需要至少 ' + precise.minArgs + ' 个参数(参数必须成对)，当前 ' + argCount + ' 个', code: 'SIG_TOO_FEW_ARGS', context: rawName });
                        } else if (argCount % 2 !== 0) {
                            errors.push({ severity: 'ERROR', line, col, msg: '函数 "' + rawName + '" 参数必须成对，当前 ' + argCount + ' 个参数不是偶数', code: 'SIG_TOO_FEW_ARGS', context: rawName });
                        }
                    } else {
                        if (argCount < precise.minArgs) {
                            errors.push({ severity: 'ERROR', line, col, msg: '函数 "' + rawName + '" 需要至少 ' + precise.minArgs + ' 个参数，当前 ' + argCount + ' 个', code: 'SIG_TOO_FEW_ARGS', context: rawName });
                        }
                        if (precise.maxArgs !== null && argCount > precise.maxArgs) {
                            errors.push({ severity: 'ERROR', line, col, msg: '函数 "' + rawName + '" 最多接受 ' + precise.maxArgs + ' 个参数，当前 ' + argCount + ' 个', code: 'SIG_TOO_MANY_ARGS', context: rawName });
                        }
                    }
                } else if (minArgsEntry !== undefined) {
                    if (argCount < minArgsEntry) {
                        errors.push({ severity: 'ERROR', line, col, msg: '函数 "' + rawName + '" 需要至少 ' + minArgsEntry + ' 个参数，当前 ' + argCount + ' 个', code: 'SIG_TOO_FEW_ARGS', context: rawName });
                    }
                }
            }
            // 继续扫描内部（需要递归检查嵌套调用）
            pos++;
            continue;
        }
        pos++;
    }
    return errors;
}

// ============================================================
// Phase 2: if/cond 多表达式缺少 progn 检查
// ============================================================

/** 检测 if 多表达式分支缺少 progn — 启发式 */
function checkIfCondProgn(text) {
    const errors = [];
    let pos = 0;

    while (pos < text.length) {
        const ch = text[pos];
        if (ch === ';') { pos = skipComment(text, pos); continue; }
        if (ch === '"') { pos = skipString(text, pos); continue; }
        if (ch === '(') {
            // 读取表达式头部
            let nameStart = pos + 1;
            while (nameStart < text.length && ' \t\n\r'.includes(text[nameStart])) nameStart++;
            let nameEnd = nameStart;
            while (nameEnd < text.length && !' \t\n\r()'.includes(text[nameEnd])) nameEnd++;
            const funcName = text.slice(nameStart, nameEnd).toLowerCase();

            if (funcName === 'if') {
                const ifEnd = findMatchingClose(text, pos);
                if (ifEnd.ok) {
                    const argCount = countArgs(text, pos) - 1; // 减去 if 本身
                    // (if test then) → 2 args
                    // (if test then else) → 3 args
                    // >3 args → 缺少 progn
                    if (argCount > 3) {
                        const line = text.slice(0, pos).split('\n').length - 1;
                        const prevNl = text.slice(0, pos).lastIndexOf('\n');
                        const col = prevNl >= 0 ? pos - (prevNl + 1) : pos;
                        errors.push({ severity: 'WARN', line, col, msg: 'if 表达式有 ' + argCount + ' 个子表达式(预期2-3个)，可能缺少 progn', code: 'MISSING_PROGN', context: 'if' });
                    }
                }
            }

            // 继续扫描内部（需要递归检查嵌套的 if）
            pos++;
            continue;
        }
        pos++;
    }
    return errors;
}

// ============================================================
// Phase 2: c: 前缀命令完整性检查
// ============================================================

/** 检测 c: 前缀命令函数是否有必选参数 */
function checkCPrefix(text, fixedBlocks) {
    const errors = [];
    for (const b of fixedBlocks) {
        if (!b.name.toLowerCase().startsWith('c:')) continue;
        // 提取参数列表
        const afterName = text.slice(b.start + 6).trimStart();
        const nameEnd = afterName.indexOf(b.name) + b.name.length;
        const rest = afterName.slice(nameEnd).trimStart();
        if (rest[0] !== '(') continue;
        // 找到参数列表的范围
        const paramStart = text.indexOf('(', b.start + 6);
        if (paramStart < 0 || paramStart > b.end) continue;
        const paramEnd = findMatchingClose(text, paramStart);
        if (!paramEnd.ok) continue;
        const paramText = text.slice(paramStart + 1, paramEnd.end - 1).trim();
        // 如果参数列表非空，检查是否有 / 之前的必选参数
        if (paramText.length > 0) {
            const slashIdx = paramText.indexOf('/');
            if (slashIdx < 0) {
                // 没有 /，所有参数都是必选参数 → 报错
                const line = text.slice(0, b.start).split('\n').length - 1;
                errors.push({ severity: 'WARN', line, col: 0, msg: 'c: 命令函数 "' + b.name + '" 不应有必选参数(当前参数: ' + paramText + ')', code: 'CPREFIX_INCOMPLETE', context: b.name });
            } else {
                // 有 /，检查 / 之前是否有必选参数
                const beforeSlash = paramText.slice(0, slashIdx).trim();
                if (beforeSlash.length > 0) {
                    const line = text.slice(0, b.start).split('\n').length - 1;
                    errors.push({ severity: 'WARN', line, col: 0, msg: 'c: 命令函数 "' + b.name + '" 不应有必选参数(当前必选参数: ' + beforeSlash + ')', code: 'CPREFIX_INCOMPLETE', context: b.name });
                }
            }
        }
    }
    return errors;
}

// ============================================================
// 主入口: 对 LISP 文件执行语法检查
// ============================================================

function lintLispFile(content) {
    const result = { totalDefuns: 0, completeDefuns: 0, brokenDefuns: 0, blocks: [], errors: [] };

    // 1. 未闭合字符串 — 不再 early return，继续后续检查
    const strErrors = checkUnclosedStrings(content);
    const hasUnclosedString = strErrors.length > 0;
    if (hasUnclosedString) {
        result.errors.push(...strErrors);
    }

    // 2. 全文件括号平衡
    const total = countParens(content, 0, content.length);
    result.totalParens = total;
    if (total.open !== total.close) {
        const hint = hasUnclosedString ? '（文件存在未闭合字符串，括号分析可能不准确）' : '';
        result.errors.push({
            severity: 'ERROR',
            line: 0, col: 0,
            msg: '括号不平衡 — 开' + total.open + ' 闭' + total.close + hint,
            code: 'UNBALANCED_TOTAL'
        });
    }

    // 3. 扫描 defun
    const { blocks, unmatched } = findAllDefuns(content);
    const { fixedBlocks, fixedUnmatched, warnings } = validateBlockBoundaries(blocks, unmatched, content);

    result.blocks = fixedBlocks;
    result.totalDefuns = fixedBlocks.length + fixedUnmatched.length;
    result.completeDefuns = fixedBlocks.length;
    result.brokenDefuns = fixedUnmatched.length;

    // 4. 残缺 defun → DEFUN_BROKEN
    for (const u of fixedUnmatched) {
        const line = content.slice(0, u.start).split('\n').length - 1;
        const prevNl = content.slice(0, u.start).lastIndexOf('\n');
        const col = prevNl >= 0 ? u.start - (prevNl + 1) : u.start;
        result.errors.push({
            severity: 'ERROR', line, col,
            msg: '函数 "' + u.name + '" 残缺 — 未找到匹配的闭括号',
            code: 'DEFUN_BROKEN', context: u.name
        });
    }

    // 5. 间隔区域
    const gaps = [];
    let prevEnd = 0;
    for (const b of fixedBlocks) {
        if (b.start > prevEnd) gaps.push({ start: prevEnd, end: b.start });
        prevEnd = b.end;
    }
    if (prevEnd < content.length) gaps.push({ start: prevEnd, end: content.length });

    // 6. 对不平衡的 defun 块做深度检查 → UNCLOSED_PAREN / EXTRA_CLOSE_PAREN
    for (const b of fixedBlocks) {
        const bp = countParens(content, b.start, b.end);
        if (bp.open !== bp.close) {
            const { unclosed, extraCloses } = deepCheckStructured(content, b.start, b.end);
            for (const u of unclosed) {
                result.errors.push({ severity: 'ERROR', line: u.line, col: u.col, msg: '函数 "' + b.name + '" 内未闭合的开括号', code: 'UNCLOSED_PAREN', context: b.name });
            }
            for (const e of extraCloses) {
                result.errors.push({ severity: 'ERROR', line: e.line, col: e.col, msg: '函数 "' + b.name + '" 内多余的闭括号', code: 'EXTRA_CLOSE_PAREN', context: b.name });
            }
        }
    }

    // 7. 间隙不平衡 → GAP_UNBALANCED + EXTRA_CLOSE_PAREN / UNCLOSED_PAREN
    for (const g of gaps) {
        const gp = countParens(content, g.start, g.end);
        if (gp.open !== gp.close) {
            const gStartLine = content.slice(0, g.start).split('\n').length - 1;
            const gEndLine = content.slice(0, g.end).split('\n').length - 1;
            result.errors.push({
                severity: 'ERROR', line: gStartLine, col: 0,
                msg: '间隙区域(第' + (gStartLine + 1) + '-' + (gEndLine + 1) + '行)括号不平衡 — 开' + gp.open + ' 闭' + gp.close,
                code: 'GAP_UNBALANCED'
            });
            // 对间隙区域也做深度检查，定位具体位置
            const { unclosed, extraCloses } = deepCheckStructured(content, g.start, g.end);
            for (const e of extraCloses) {
                result.errors.push({ severity: 'ERROR', line: e.line, col: e.col, msg: '多余的闭括号', code: 'EXTRA_CLOSE_PAREN' });
            }
            for (const u of unclosed) {
                result.errors.push({ severity: 'ERROR', line: u.line, col: u.col, msg: '未闭合的开括号', code: 'UNCLOSED_PAREN' });
            }
        }
    }

    // 8. lambda( 检查
    let lambdaPos = 0;
    while (lambdaPos < content.length) {
        const idx = content.toLowerCase().indexOf('lambda(', lambdaPos);
        if (idx === -1) break;
        if (!isInCommentOrString(content, idx)) {
            const line = content.slice(0, idx).split('\n').length - 1;
            const prevNl = content.slice(0, idx).lastIndexOf('\n');
            const col = prevNl >= 0 ? idx - (prevNl + 1) : idx;
            result.errors.push({ severity: 'ERROR', line, col, msg: 'lambda 后缺少空格，应写为 (lambda (参数) ...)', code: 'LAMBDA_NO_SPACE' });
        }
        lambdaPos = idx + 7;
    }

    // 9. 重复 defun 检测
    const nameCount = {};
    for (const b of fixedBlocks) {
        (nameCount[b.name] = nameCount[b.name] || []).push(b.start);
    }
    for (const [fname, positions] of Object.entries(nameCount)) {
        if (positions.length > 1) {
            for (const p of positions) {
                const line = content.slice(0, p).split('\n').length - 1;
                result.errors.push({ severity: 'WARN', line, col: 0, msg: '函数 "' + fname + '" 重复定义(' + positions.length + '次)', code: 'DUPLICATE_DEFUN', context: fname });
            }
        }
    }

    // 10. 函数签名校验
    const sigErrors = checkSignatures(content);
    result.errors.push(...sigErrors);

    // 11. if/cond 缺少 progn
    const prognErrors = checkIfCondProgn(content);
    result.errors.push(...prognErrors);

    // 12. c: 前缀命令完整性
    const cprefixErrors = checkCPrefix(content, fixedBlocks);
    result.errors.push(...cprefixErrors);

    // ============================================================
    // 生成人类可读报告（从 errors 数组 + 保留结构化信息）
    // ============================================================
    const report = [];
    report.push('============================================================');
    report.push('  文件分析');
    report.push('  共 ' + result.totalDefuns + ' 个 defun 函数块 (' + result.completeDefuns + ' 完整, ' + result.brokenDefuns + ' 残缺)');
    report.push('============================================================');

    // 间隔在前
    let gapIdx = 0;
    for (let i = 0; i < fixedBlocks.length; i++) {
        const b = fixedBlocks[i];
        while (gapIdx < gaps.length && gaps[gapIdx].end <= b.start) {
            const g = gaps[gapIdx];
            const gContent = content.slice(g.start, g.end).trim();
            const gStartLine = content.slice(0, g.start).split('\n').length;
            const gEndLine = content.slice(0, g.end).split('\n').length - 1;
            const gp = countParens(content, g.start, g.end);
            const gOk = gp.open === gp.close;
            report.push('  [间隙 第' + gStartLine + '-' + gEndLine + '行] [' + (gOk ? 'OK' : 'FAIL') + '] ' + (gOk ? '平衡' : '不平衡 — 开' + gp.open + ' 闭' + gp.close));
            if (!gOk && gContent) {
                const extraOpen = gp.open - gp.close;
                report.push('    ' + (extraOpen > 0 ? '未闭合的开括号: ' + extraOpen + ' 处' : '多余的闭括号: ' + (-extraOpen) + ' 处'));
            }
            gapIdx++;
        }
        const bp = countParens(content, b.start, b.end);
        const bOk = bp.open === bp.close;
        report.push('  [' + b.name + '] [' + (bOk ? 'OK' : 'FAIL') + '] ' + (bOk ? '平衡' : '不平衡 — 开' + bp.open + ' 闭' + bp.close));
        if (!bOk) {
            const detail = deepCheck(content, b.start, b.end, b.name);
            report.push(...detail.split('\n').map(l => '  ' + l));
        }
    }
    while (gapIdx < gaps.length) {
        const g = gaps[gapIdx];
        const gStartLine = content.slice(0, g.start).split('\n').length;
        const gEndLine = content.slice(0, g.end).split('\n').length - 1;
        const gp = countParens(content, g.start, g.end);
        const gOk = gp.open === gp.close;
        const gContent = content.slice(g.start, g.end).trim();
        report.push('  [间隙 第' + gStartLine + '-' + gEndLine + '行] [' + (gOk ? 'OK' : 'FAIL') + '] ' + (gOk ? '平衡' : '不平衡 — 开' + gp.open + ' 闭' + gp.close));
        if (!gOk && gContent) {
            const detail = deepCheck(content, g.start, g.end, '间隙');
            report.push(...detail.split('\n').map(l => '  ' + l));
        }
        gapIdx++;
    }

    // 不匹配的 defun
    for (const u of fixedUnmatched) {
        const uLine = content.slice(0, u.start).split('\n').length;
        report.push('  [' + u.name + '] [FAIL] 残缺 — 第' + uLine + '行起未找到匹配闭括号');
    }

    // errors 汇总（从 errors 数组生成）
    const errOnly = result.errors.filter(e => e.severity === 'ERROR');
    const warnOnly = result.errors.filter(e => e.severity === 'WARN');
    if (errOnly.length || warnOnly.length) {
        report.push('');
        report.push('  ---- 错误/警告列表 ----');
        for (const e of result.errors) {
            report.push('  [' + e.severity + '] 第' + (e.line + 1) + '行, 第' + (e.col + 1) + '列: ' + e.msg + ' [' + e.code + ']' + (e.context ? ' (' + e.context + ')' : ''));
        }
    }

    // passed 判定 — 仅 ERROR 级别影响
    result.passed = !result.errors.some(e => e.severity === 'ERROR');

    result.report = report.join('\n');
    result.summary = '括号: 开' + total.open + ' 闭' + total.close + ' | Defun: ' + result.completeDefuns + '完整 ' + result.brokenDefuns + '残缺 | 错误: ' + errOnly.length + ' 警告: ' + warnOnly.length;

    return result;
}

function activate(context) {
    context.subscriptions.push(
        vscode.debug.onDidReceiveDebugSessionCustomEvent(evt => {
            const summary = { t: new Date().toISOString().slice(11, 23), event: evt.event };
            if (evt.body) {
                try { summary.body = JSON.stringify(evt.body).slice(0, 500); } catch(e) {}
            }
            pushLog(summary);
        })
    );
    context.subscriptions.push(
        vscode.debug.onDidChangeActiveDebugSession(() => {
            const s = vscode.debug.activeDebugSession;
            pushLog({ t: 'SESSION', event: s ? 'attached' : 'detached' });
        })
    );
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('*', {
            createDebugAdapterTracker(session) {
                return {
                    onDidSendMessage: m => {
                        if (m.type === 'event' && m.event === 'output') {
                            pushLog({ t: 'DAP_OUTPUT', category: m.body?.category, output: (m.body?.output || '').slice(0, 300) });
                        }
                    }
                };
            }
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
                return 'ERR: ' + e.message;
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
                return 'ERR: ' + e.message;
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
            } catch (e) { return 'ERR: ' + e.message; }
        })
    );

    // lisp — 通过 PowerShell COM 执行 LISP 表达式并捕获错误
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.lisp', async (expr) => {
            const cp = require('child_process');
            const escaped = String(expr).replace(/"/g, '\\"').replace(/\n/g, ' ');
            try {
                const out = cp.execSync(
                    'powershell -NoProfile -Command "$acad=[System.Runtime.InteropServices.Marshal]::GetActiveObject(\'AutoCAD.Application\');$doc=$acad.ActiveDocument;$doc.SendCommand(\'' + escaped + ' \')"',
                    { encoding: 'utf8', timeout: 15000 }
                ).trim();
                pushLog({ t: 'LISP', expr, out });
                return 'OK';
            } catch (e) {
                pushLog({ t: 'LISP', expr, err: e.message });
                return 'ERR: ' + e.message;
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
            } catch (e) { return 'ERR: ' + e.message; }
        })
    );

    // lintFile — 内置 JS linter 检查 LISP 文件（返回 JSON）
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.lintFile', async (filePath) => {
            const fs = require('fs');
            const path = require('path');

            const targetPath = path.resolve(String(filePath || ''));
            if (!targetPath || !fs.existsSync(targetPath)) {
                const ed = vscode.window.activeTextEditor;
                if (ed && fs.existsSync(ed.document.fileName))
                    filePath = ed.document.fileName;
                else
                    return JSON.stringify({ passed: false, summary: 'ERR: file not found', errors: [], report: '' });
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const result = lintLispFile(content);
                pushLog({ t: 'LINT', file: filePath, passed: result.passed });

                // 返回 JSON 字符串，AI Agent 可直接 JSON.parse()
                return JSON.stringify({
                    passed: result.passed,
                    summary: result.summary,
                    errors: result.errors.map(e => ({
                        severity: e.severity,
                        line: e.line,
                        col: e.col,
                        msg: e.msg,
                        code: e.code || '',
                        context: e.context || ''
                    })),
                    report: result.report
                });
            } catch (e) { return JSON.stringify({ passed: false, summary: 'ERR: ' + e.message, errors: [], report: '' }); }
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

            if (!targetPath || !fs.existsSync(targetPath)) {
                const ed = vscode.window.activeTextEditor;
                if (ed && fs.existsSync(ed.document.fileName)) {
                    filePath = ed.document.fileName;
                } else {
                    addStep('文件检查', false, '未指定文件且无活动编辑器');
                    return JSON.stringify(results, null, 1);
                }
            }

            // 1. 语法检查
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const lintResult = lintLispFile(content);
                const hasFail = !lintResult.passed;
                addStep('语法检查', !hasFail, hasFail ? '存在语法错误' : '通过');
                results.lintOutput = hasFail ? (lintResult.report + '\n  结论: [FAIL]') : '通过';
            } catch (e) { addStep('语法检查', false, e.message); }

            // 2. 自动附着 CAD
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

            // 3. 加载文件到 CAD
            const s = vscode.debug.activeDebugSession;
            if (s) {
                try {
                    const normPath = String(filePath).replace(/\\/g, '/');
                    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
                    const req = s.customRequest('evaluate', {
                        expression: '(load "' + normPath + '")',
                        context: 'repl'
                    });
                    await Promise.race([req, timeout]);
                    addStep('加载CAD', true, '');
                } catch (e) { addStep('加载CAD', false, e.message); }
            } else { addStep('加载CAD', false, '无调试会话'); }

            // 4. 结论
            const failed = results.steps.filter(s => !s.ok);
            results.conclusion = failed.length === 0 ? '全部通过' : failed.length + '/' + results.steps.length + ' 步失败';
            pushLog({ t: 'SELFCHECK', file: filePath, ok: failed.length === 0 });
            return JSON.stringify(results, null, 1);
        })
    );

    // autoAttach — 通过 AutoCAD 扩展的 setDefaultAcadPid 跳过进程选择器
    context.subscriptions.push(
        vscode.commands.registerCommand('debugEval.autoAttach', async () => {
            const ext = vscode.extensions.getExtension('autodesk.autolispext');
            if (!ext) return 'ERR: AutoCAD extension not found';

            if (!ext.isActive) await ext.activate();

            const debugJsPath = require('path').join(ext.extensionPath, 'out', 'debug');
            let debugModule;
            try { debugModule = require(debugJsPath); }
            catch (e) { return 'ERR: require debug.js failed: ' + e.message; }

            if (typeof debugModule.setDefaultAcadPid !== 'function')
                return 'ERR: setDefaultAcadPid not found';

            const cp2 = require('child_process');
            let pid;
            try {
                const out = cp2.execSync(
                    'powershell -Command "(Get-Process acad|Sort StartTime -Descending|Select -First 1).Id"',
                    { encoding: 'utf8', timeout: 5000 }
                ).trim();
                pid = parseInt(out, 10);
                if (isNaN(pid) || pid <= 0) return 'ERR: no CAD process found';
            } catch (e) { return 'ERR: failed to get CAD PID: ' + e.message; }

            debugModule.setDefaultAcadPid(pid);
            pushLog({ t: 'AUTOATTACH', pid });

            try {
                await vscode.commands.executeCommand('workbench.action.debug.start');
                return 'OK';
            } catch (e) { return 'ERR: debug start failed: ' + e.message; }
        })
    );
}

function deactivate() {}
module.exports = {
    activate,
    deactivate,
    // 导出供测试使用
    lintLispFile,
    deepCheckStructured,
    deepCheck,
    checkSignatures,
    checkIfCondProgn,
    checkCPrefix,
    checkUnclosedStrings,
    skipComment,
    skipString,
    countParens,
    findMatchingClose,
    countArgs,
    isInCommentOrString,
    AUTOLISP_PRECISE_SIGS,
    AUTOLISP_MIN_ARGS,
};
