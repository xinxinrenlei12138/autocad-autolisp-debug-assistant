// ============================================================
// AADA Linter 自动化测试
// 运行: node test/test-linter.js
// 零框架依赖，纯 Node.js assert
// ============================================================

const assert = require('assert');
const path = require('path');

// 加载被测模块
const extPath = path.resolve(__dirname, '..', 'extension.js');
const ext = require(extPath);

// 函数可能直接导出或在 _linter 下
const {
    lintLispFile, deepCheckStructured, deepCheck, checkUnclosedStrings,
    checkSignatures, checkIfCondProgn, checkCPrefix,
    skipComment, skipString, countParens, findMatchingClose, countArgs,
    AUTOLISP_PRECISE_SIGS, AUTOLISP_MIN_ARGS
} = ext._linter || ext;

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        failedTests.push({ name, error: e.message });
        console.log(`  [FAIL] ${name}: ${e.message}`);
    }
}

function section(title) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'='.repeat(60)}`);
}

// ============================================================
// 1. 括号匹配
// ============================================================
section('括号匹配');

test('正确代码 passed=true', () => {
    const r = lintLispFile('(defun foo () (princ "hello"))');
    assert.strictEqual(r.passed, true, `Expected passed=true, got errors: ${JSON.stringify(r.errors)}`);
});

test('多开括号报 UNBALANCED_TOTAL', () => {
    const r = lintLispFile('(defun foo () (princ "hello"');
    assert.strictEqual(r.passed, false);
    assert.ok(r.errors.some(e => e.code === 'UNBALANCED_TOTAL'), 'Should have UNBALANCED_TOTAL');
});

test('多闭括号报 UNBALANCED_TOTAL', () => {
    const r = lintLispFile('(defun foo ()) extra)');
    assert.strictEqual(r.passed, false);
    assert.ok(r.errors.some(e => e.code === 'UNBALANCED_TOTAL'), 'Should have UNBALANCED_TOTAL');
});

test('嵌套括号正确', () => {
    const r = lintLispFile('(defun foo () (if t (princ "a") (princ "b")))');
    assert.strictEqual(r.passed, true, `Expected passed=true, got errors: ${JSON.stringify(r.errors)}`);
});

// ============================================================
// 2. 字符串检查
// ============================================================
section('字符串检查');

test('闭合字符串通过', () => {
    const r = lintLispFile('(defun foo () (princ "hello"))');
    assert.ok(!r.errors.some(e => e.code === 'UNCLOSED_STRING'));
});

test('未闭合字符串报 UNCLOSED_STRING', () => {
    const r = lintLispFile('(defun foo () (princ "hello))');
    assert.ok(r.errors.some(e => e.code === 'UNCLOSED_STRING'), 'Should have UNCLOSED_STRING');
});

test('转义引号不误报', () => {
    const r = lintLispFile('(defun foo () (princ "say \\"hi\\""))');
    assert.ok(!r.errors.some(e => e.code === 'UNCLOSED_STRING'), 'Escaped quote should not trigger UNCLOSED_STRING');
});

test('未闭合字符串不阻断后续检查', () => {
    // 有未闭合字符串 AND 括号不平衡 → errors 数组应同时包含两者
    const r = lintLispFile('(defun foo () (princ "hello');
    assert.ok(r.errors.some(e => e.code === 'UNCLOSED_STRING'), 'Should have UNCLOSED_STRING');
    assert.ok(r.errors.some(e => e.code === 'UNBALANCED_TOTAL'), 'Should have UNBALANCED_TOTAL');
});

// ============================================================
// 3. defun 检测
// ============================================================
section('defun 检测');

test('完整 defun 计数', () => {
    const r = lintLispFile('(defun foo () (princ "a"))\n(defun bar () (princ "b"))');
    assert.strictEqual(r.completeDefuns, 2);
    assert.strictEqual(r.brokenDefuns, 0);
});

test('残缺 defun 报 DEFUN_BROKEN', () => {
    const r = lintLispFile('(defun foo () (princ "a"');
    assert.ok(r.errors.some(e => e.code === 'DEFUN_BROKEN'), 'Should have DEFUN_BROKEN');
});

test('重复 defun 报 DUPLICATE_DEFUN', () => {
    const r = lintLispFile('(defun foo () (princ "a"))\n(defun foo () (princ "b"))');
    assert.ok(r.errors.some(e => e.code === 'DUPLICATE_DEFUN'), 'Should have DUPLICATE_DEFUN');
    assert.strictEqual(r.errors.filter(e => e.code === 'DUPLICATE_DEFUN').length, 2, 'Should have 2 DUPLICATE_DEFUN entries');
});

// ============================================================
// 4. lambda 检查
// ============================================================
section('lambda 检查');

test('(lambda (x) ...) 通过', () => {
    const r = lintLispFile('(mapcar (lambda (x) (1+ x)) (list 1 2 3))');
    assert.ok(!r.errors.some(e => e.code === 'LAMBDA_NO_SPACE'));
});

test('(lambda(x) ...) 报 LAMBDA_NO_SPACE', () => {
    const r = lintLispFile('(mapcar (lambda(x) (1+ x)) (list 1 2 3))');
    assert.ok(r.errors.some(e => e.code === 'LAMBDA_NO_SPACE'), 'Should have LAMBDA_NO_SPACE');
});

// ============================================================
// 5. 签名校验
// ============================================================
section('签名校验');

test('(car a) 通过', () => {
    const r = lintLispFile('(defun foo () (car (list 1 2)))');
    assert.ok(!r.errors.some(e => e.code === 'SIG_TOO_FEW_ARGS' && e.context === 'car'));
    assert.ok(!r.errors.some(e => e.code === 'SIG_TOO_MANY_ARGS' && e.context === 'car'));
});

test('(car) 报 SIG_TOO_FEW_ARGS', () => {
    const r = lintLispFile('(defun foo () (car))');
    assert.ok(r.errors.some(e => e.code === 'SIG_TOO_FEW_ARGS' && e.context === 'car'), 'Should have SIG_TOO_FEW_ARGS for car');
});

test('(car a b) 报 SIG_TOO_MANY_ARGS', () => {
    const r = lintLispFile('(defun foo () (car a b))');
    assert.ok(r.errors.some(e => e.code === 'SIG_TOO_MANY_ARGS' && e.context === 'car'), 'Should have SIG_TOO_MANY_ARGS for car');
});

test('(setq x 1 y 2) 通过', () => {
    const r = lintLispFile('(defun foo () (setq x 1 y 2))');
    assert.ok(!r.errors.some(e => e.code.startsWith('SIG_') && e.context === 'setq'));
});

test('(setq x) 报 SIG_TOO_FEW_ARGS (setq 成对)', () => {
    const r = lintLispFile('(defun foo () (setq x))');
    assert.ok(r.errors.some(e => e.code === 'SIG_TOO_FEW_ARGS' && e.context === 'setq'), 'Should have SIG_TOO_FEW_ARGS for setq');
});

test('(setq x 1 y) 报错 (setq 不成对)', () => {
    const r = lintLispFile('(defun foo () (setq x 1 y))');
    assert.ok(r.errors.some(e => e.code === 'SIG_TOO_FEW_ARGS' && e.context === 'setq'), 'Should have SIG for setq with odd args');
});

test('(if test then else) 通过', () => {
    const r = lintLispFile('(defun foo () (if t (princ "a") (princ "b")))');
    assert.ok(!r.errors.some(e => e.code.startsWith('SIG_') && e.context === 'if'));
});

test('(if) 报 SIG_TOO_FEW_ARGS', () => {
    const r = lintLispFile('(defun foo () (if))');
    assert.ok(r.errors.some(e => e.code === 'SIG_TOO_FEW_ARGS' && e.context === 'if'), 'Should have SIG_TOO_FEW_ARGS for if');
});

// ============================================================
// 6. progn 检查
// ============================================================
section('progn 检查');

test('(if t (progn a b)) 通过', () => {
    const r = lintLispFile('(defun foo () (if t (progn (princ "a") (princ "b"))))');
    assert.ok(!r.errors.some(e => e.code === 'MISSING_PROGN'));
});

test('(if t a b c) 报 MISSING_PROGN', () => {
    const r = lintLispFile('(defun foo () (if t (princ "a") (princ "b") (princ "c")))');
    assert.ok(r.errors.some(e => e.code === 'MISSING_PROGN'), 'Should have MISSING_PROGN');
});

// ============================================================
// 7. c: 前缀
// ============================================================
section('c: 前缀检查');

test('(defun c:foo () ...) 通过', () => {
    const r = lintLispFile('(defun c:foo () (princ "hello"))');
    assert.ok(!r.errors.some(e => e.code === 'CPREFIX_INCOMPLETE'));
});

test('(defun c:foo (/ x y) ...) 通过', () => {
    const r = lintLispFile('(defun c:foo (/ x y) (princ "hello"))');
    assert.ok(!r.errors.some(e => e.code === 'CPREFIX_INCOMPLETE'));
});

test('(defun c:foo (x) ...) 报 CPREFIX_INCOMPLETE', () => {
    const r = lintLispFile('(defun c:foo (x) (princ x))');
    assert.ok(r.errors.some(e => e.code === 'CPREFIX_INCOMPLETE'), 'Should have CPREFIX_INCOMPLETE');
});

// ============================================================
// 8. errors 完整性
// ============================================================
section('errors 完整性');

test('同一文件有字符串+括号错误时 errors 同时包含两者', () => {
    const r = lintLispFile('(defun foo () (princ "hello');
    assert.ok(r.errors.some(e => e.code === 'UNCLOSED_STRING'), 'Should have UNCLOSED_STRING');
    assert.ok(r.errors.some(e => e.code === 'UNBALANCED_TOTAL'), 'Should have UNBALANCED_TOTAL');
    assert.ok(r.errors.some(e => e.code === 'DEFUN_BROKEN'), 'Should have DEFUN_BROKEN');
});

test('errors 中每个 error 都有 code 字段', () => {
    const r = lintLispFile('(defun foo () (princ "hello');
    for (const e of r.errors) {
        assert.ok(e.code, `Error missing code field: ${JSON.stringify(e)}`);
    }
});

// ============================================================
// 9. passed 语义
// ============================================================
section('passed 语义');

test('只有 WARN 时 passed=true', () => {
    // 重复定义是 WARN
    const r = lintLispFile('(defun foo () (princ "a"))\n(defun foo () (princ "b"))');
    assert.strictEqual(r.passed, true, `WARN should not affect passed, errors: ${JSON.stringify(r.errors.filter(e => e.severity === 'ERROR'))}`);
});

test('有 ERROR 时 passed=false', () => {
    const r = lintLispFile('(defun foo () (car))');
    assert.strictEqual(r.passed, false);
});

test('无错误时 passed=true', () => {
    const r = lintLispFile('(defun foo () (princ "hello"))');
    assert.strictEqual(r.passed, true);
});

// ============================================================
// 10. deepCheckStructured
// ============================================================
section('deepCheckStructured');

test('平衡代码返回空 unclosed 和 extraCloses', () => {
    const r = deepCheckStructured('(defun foo () (princ "a"))', 0, 28);
    assert.strictEqual(r.unclosed.length, 0);
    assert.strictEqual(r.extraCloses.length, 0);
});

test('多开括号返回 unclosed', () => {
    const r = deepCheckStructured('(defun foo () (princ "a"', 0, 26);
    assert.ok(r.unclosed.length > 0, 'Should have unclosed parens');
});

test('多闭括号返回 extraCloses', () => {
    const r = deepCheckStructured('(defun foo ()) extra)', 0, 21);
    assert.ok(r.extraCloses.length > 0, 'Should have extra closes');
});

// ============================================================
// 11. lintFile 返回值（JSON 格式）
// ============================================================
section('lintFile 返回值');

test('lintLispFile 返回值包含 passed/summary/errors/report', () => {
    const r = lintLispFile('(defun foo () (princ "hello"))');
    assert.ok('passed' in r, 'Should have passed');
    assert.ok('summary' in r, 'Should have summary');
    assert.ok('errors' in r, 'Should have errors');
    assert.ok('report' in r, 'Should have report');
});

test('errors 是数组且每个元素有 severity/code/msg/line/col', () => {
    const r = lintLispFile('(defun foo () (car))');
    assert.ok(Array.isArray(r.errors));
    for (const e of r.errors) {
        assert.ok('severity' in e, `Missing severity in ${JSON.stringify(e)}`);
        assert.ok('code' in e, `Missing code in ${JSON.stringify(e)}`);
        assert.ok('msg' in e, `Missing msg in ${JSON.stringify(e)}`);
        assert.ok('line' in e, `Missing line in ${JSON.stringify(e)}`);
        assert.ok('col' in e, `Missing col in ${JSON.stringify(e)}`);
    }
});

// ============================================================
// 12. 签名表完整性
// ============================================================
section('签名表完整性');

test('AUTOLISP_PRECISE_SIGS 无重复 key', () => {
    const keys = Object.keys(AUTOLISP_PRECISE_SIGS);
    const unique = new Set(keys);
    assert.strictEqual(keys.length, unique.size, 'AUTOLISP_PRECISE_SIGS has duplicate keys');
});

test('AUTOLISP_MIN_ARGS 无重复 key', () => {
    const keys = Object.keys(AUTOLISP_MIN_ARGS);
    const unique = new Set(keys);
    assert.strictEqual(keys.length, unique.size, 'AUTOLISP_MIN_ARGS has duplicate keys');
});

test('AUTOLISP_PRECISE_SIGS 中 setq 有 special=even', () => {
    assert.strictEqual(AUTOLISP_PRECISE_SIGS['setq'].special, 'even');
});

test('AUTOLISP_PRECISE_SIGS 至少有 50 个条目', () => {
    assert.ok(Object.keys(AUTOLISP_PRECISE_SIGS).length >= 50, `Only ${Object.keys(AUTOLISP_PRECISE_SIGS).length} entries`);
});

test('AUTOLISP_MIN_ARGS 至少有 100 个条目', () => {
    assert.ok(Object.keys(AUTOLISP_MIN_ARGS).length >= 100, `Only ${Object.keys(AUTOLISP_MIN_ARGS).length} entries`);
});

// ============================================================
// 13. 辅助函数
// ============================================================
section('辅助函数');

test('countParens 正确统计', () => {
    const r = countParens('(a (b) c)', 0, 10);
    assert.strictEqual(r.open, 2);
    assert.strictEqual(r.close, 2);
});

test('skipComment 跳过行注释', () => {
    const text = '; this is a comment\n(next)';
    const pos = skipComment(text, 0);
    assert.ok(pos >= text.indexOf('\n'), 'Should skip to end of line');
});

test('skipComment 跳过块注释', () => {
    const text = ';| block |; (next)';
    const pos = skipComment(text, 0);
    assert.strictEqual(text[pos], ' ', 'Should skip past block comment');
});

test('findMatchingClose 找到匹配', () => {
    const r = findMatchingClose('(a (b) c)', 0);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.end, 9);
});

test('countArgs 正确计数', () => {
    const r = countArgs('(car a)', 0);
    assert.strictEqual(r, 2, 'car + a = 2 tokens');  // car 和 a
});

// ============================================================
// 结果汇总
// ============================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`  测试结果: ${passedTests}/${totalTests} 通过`);
if (failedTests.length > 0) {
    console.log(`  失败: ${failedTests.length}`);
    for (const f of failedTests) {
        console.log(`    - ${f.name}: ${f.error}`);
    }
    console.log(`\n  ❌ 有 ${failedTests.length} 个测试未通过`);
    process.exit(1);
} else {
    console.log(`\n  ✅ 全部 ${totalTests} 个测试通过！`);
    process.exit(0);
}
