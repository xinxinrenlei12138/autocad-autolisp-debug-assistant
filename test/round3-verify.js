// ============================================================
// 第三轮测试验证脚本: 大规模综合场景（修正版）
// ============================================================
const path = require('path');
const fs = require('fs');
const ext = require(path.resolve(__dirname, '..', 'extension.js'));

const { lintLispFile } = ext._linter || ext;

const testFile = path.join(__dirname, 'round3-test.lsp');
const content = fs.readFileSync(testFile, 'utf8');
const result = lintLispFile(content);

console.log('='.repeat(60));
console.log('  第三轮测试: 大规模综合场景');
console.log('='.repeat(60));
console.log('\n--- Errors ---');
for (const e of result.errors) {
    console.log(`  [${e.severity}] 第${e.line+1}行, 第${e.col+1}列: ${e.msg} [${e.code}]` + (e.context ? ` (${e.context})` : ''));
}
console.log(`\npassed: ${result.passed}`);
console.log(`summary: ${result.summary}`);
console.log(`\n--- Defun 列表 (${result.completeDefuns} 完整, ${result.brokenDefuns} 残缺) ---`);
for (const b of result.blocks) {
    console.log(`  [OK] ${b.name} (行 ${content.slice(0,b.start).split('\n').length})`);
}

// ============================================================
// 用例验证
// ============================================================
let passCount = 0;
let failCount = 0;
const failures = [];

function check(name, condition, detail) {
    if (condition) {
        passCount++;
        console.log(`  [PASS] ${name}`);
    } else {
        failCount++;
        failures.push({ name, detail });
        console.log(`  [FAIL] ${name}: ${detail}`);
    }
}

function hasBlock(name) {
    return result.blocks.some(b => b.name === name);
}

function hasErrFor(name, code) {
    return result.errors.some(e => e.context === name && e.code === code);
}

function blockHasErr(name, code) {
    return result.errors.some(e => e.context === name && e.severity === 'ERROR' && e.code === code);
}

console.log('\n' + '='.repeat(60));
console.log('  用例验证');
console.log('='.repeat(60));

// === 正向用例（应通过，不报 ERROR）===

check('用例1: 多 defun + 顶层代码正常处理',
    result.totalDefuns >= 10,
    'defun 计数不足: ' + result.totalDefuns);

check('用例5: vlax-函数不误报签名错误',
    !result.errors.some(e =>
        e.code.startsWith('SIG_') &&
        (e.context === 'vlax-get-property' || e.context === 'vlax-ename->vla-object' || e.context === 'vla-put-color')
    ),
    'vlax- 函数正确调用被误报');

check('用例6: process-all 深层嵌套通过',
    hasBlock('process-all') && !blockHasErr('process-all', 'UNCLOSED_PAREN') && !blockHasErr('process-all', 'EXTRA_CLOSE_PAREN'),
    'process-all 深层嵌套被误报');

check('用例7: empty-func 空体通过',
    hasBlock('empty-func'),
    'empty-func 未被识别');

check('用例9: cond 多分支通过',
    hasBlock('classify') && !blockHasErr('classify', 'UNCLOSED_PAREN') && !blockHasErr('classify', 'EXTRA_CLOSE_PAREN'),
    'classify cond 多分支被误报');

check('用例10: countdown while+if+progn 通过',
    hasBlock('countdown') && !blockHasErr('countdown', 'UNCLOSED_PAREN') && !blockHasErr('countdown', 'EXTRA_CLOSE_PAREN'),
    'countdown 被误报');

check('用例12: setq 成对不报错',
    hasBlock('setq-test') && !hasErrFor('setq', 'SIG_TOO_FEW_ARGS'),
    'setq 成对写法被误报');

check('用例13: and/or 可变参数不报错',
    hasBlock('logic-test') && !result.errors.some(e =>
        (e.context === 'and' || e.context === 'or') && e.code.startsWith('SIG_')
    ),
    'and/or 被误报');

check('用例14: nested-mapcar 通过',
    hasBlock('nested-mapcar') && !blockHasErr('nested-mapcar', 'UNCLOSED_PAREN') && !blockHasErr('nested-mapcar', 'EXTRA_CLOSE_PAREN'),
    'nested-mapcar 被误报');

check('用例15: apply + function 通过',
    hasBlock('apply-test') && !blockHasErr('apply-test', 'UNCLOSED_PAREN'),
    'apply-test 被误报');

// 用例16单独测试确认不误报，完整文件中 UNCLOSED_STRING 仅来自末尾的 bad-string
check('用例16: UNCLOSED_STRING 仅来自末尾的 bad-string',
    result.errors.filter(e => e.code === 'UNCLOSED_STRING').length === 1,
    'UNCLOSED_STRING 数量异常: ' + result.errors.filter(e => e.code === 'UNCLOSED_STRING').length);

check('用例17: 嵌套块注释不误报',
    hasBlock('block-comment-test') && !blockHasErr('block-comment-test', 'UNCLOSED_PAREN'),
    '嵌套块注释被误报');

check('用例4: 块注释内含代码不误报',
    hasBlock('comment-code-test') && !blockHasErr('comment-code-test', 'UNCLOSED_PAREN'),
    '块注释内代码被误报');

check('用例3: outer-func 被检测为嵌套吞噬（设计行为）',
    result.errors.some(e => e.context === 'outer-func'),
    'outer-func 嵌套吞噬未检测');

// === 负向用例（应报错）===

check('用例2: helper 重复定义报 DUPLICATE_DEFUN',
    result.errors.some(e => e.code === 'DUPLICATE_DEFUN' && e.context === 'helper'),
    '重复 defun 未检测');

check('用例8: c:cmd3 带必选参数报 CPREFIX_INCOMPLETE',
    result.errors.some(e => e.code === 'CPREFIX_INCOMPLETE' && e.context === 'c:cmd3'),
    'c:cmd3 带必选参数未报错');

check('用例8b: c:cmd1 无参不报 CPREFIX_INCOMPLETE',
    !result.errors.some(e => e.code === 'CPREFIX_INCOMPLETE' && e.context === 'c:cmd1'),
    'c:cmd1 无参被误报');

check('用例18: 顶层多余闭括号报错',
    result.errors.some(e => e.code === 'UNBALANCED_TOTAL' || e.code === 'EXTRA_CLOSE_PAREN' || e.code === 'GAP_UNBALANCED'),
    '多余闭括号未被检测');

check('用例19: broken-func 报 DEFUN_BROKEN',
    result.errors.some(e => e.code === 'DEFUN_BROKEN' && e.context === 'broken-func'),
    '残缺 defun 未报 DEFUN_BROKEN');

check('用例20: 未闭合字符串报 UNCLOSED_STRING',
    result.errors.some(e => e.code === 'UNCLOSED_STRING'),
    '未闭合字符串未检测');

// === 总体检查 ===

check('总体: passed=false (有ERROR)',
    result.passed === false,
    '应该 passed=false');

check('总体: 至少5个ERROR',
    result.errors.filter(e => e.severity === 'ERROR').length >= 5,
    'ERROR 数量不足');

check('总体: 所有 error 都有 code 字段',
    result.errors.every(e => e.code),
    '存在缺少 code 的 error');

check('总体: 所有 error 都有合法 line 字段',
    result.errors.every(e => typeof e.line === 'number'),
    '存在非法 line');

check('总体: 所有 error severity 合法',
    result.errors.every(e => e.severity === 'ERROR' || e.severity === 'WARN'),
    '存在非法 severity');

check('总体: 完整 defun 至少 15 个',
    result.completeDefuns >= 15,
    '完整 defun 数量不足: ' + result.completeDefuns);

console.log(`\n${'='.repeat(60)}`);
console.log(`  第三轮结果: ${passCount}/${passCount + failCount} 用例通过`);
if (failCount > 0) {
    console.log(`  失败项:`);
    for (const f of failures) console.log(`    - ${f.name}: ${f.detail}`);
    process.exit(1);
} else {
    console.log(`  全部通过！`);
    process.exit(0);
}
