// ============================================================
// 第二轮测试验证脚本: 函数签名与特殊语法
// ============================================================
const path = require('path');
const fs = require('fs');
const ext = require(path.resolve(__dirname, '..', 'extension.js'));

const { lintLispFile } = ext._linter || ext;

const testFile = path.join(__dirname, 'round2-test.lsp');
const content = fs.readFileSync(testFile, 'utf8');
const result = lintLispFile(content);

console.log('='.repeat(60));
console.log('  第二轮测试: 函数签名与特殊语法');
console.log('='.repeat(60));
console.log('\n--- Errors ---');
for (const e of result.errors) {
    console.log(`  [${e.severity}] 第${e.line+1}行, 第${e.col+1}列: ${e.msg} [${e.code}]` + (e.context ? ` (${e.context})` : ''));
}
console.log(`\npassed: ${result.passed}`);
console.log(`summary: ${result.summary}`);

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

console.log('\n' + '='.repeat(60));
console.log('  用例验证');
console.log('='.repeat(60));

// 找到某个上下文（函数名）相关的 ERROR
function hasErr(context, code) {
    return result.errors.some(e =>
        e.severity === 'ERROR' && e.code === code && e.context === context
    );
}

// 找到某行的 ERROR
function hasErrOnLine(line, code) {
    return result.errors.some(e =>
        e.severity === 'ERROR' && e.code === code && e.line === line
    );
}

// 正向用例（不应报错）
check('用例14: (princ) 不报错',
    !result.errors.some(e => e.context === 'princ' && e.code.startsWith('SIG_')),
    '(princ) 无参被误报');
check('用例20: (+) 可变参数不报错',
    !result.errors.some(e => e.context === '+' && e.code.startsWith('SIG_')),
    '(+ 1 2 3) 被误报');
check('用例8: if 3参数不报MISSING_PROGN',
    !result.errors.some(e => e.code === 'MISSING_PROGN' && e.line === 18),
    '正确if被误报');

// 负向用例（应报错）
check('用例1: (car) 报 SIG_TOO_FEW_ARGS',
    hasErr('car', 'SIG_TOO_FEW_ARGS'),
    '(car) 无参未报错');
check('用例2: (car a b) 报 SIG_TOO_MANY_ARGS',
    hasErr('car', 'SIG_TOO_MANY_ARGS'),
    '(car a b) 多参数未报错');
check('用例3: (substr "abc" 1 2 3) 报 SIG_TOO_MANY_ARGS',
    hasErr('substr', 'SIG_TOO_MANY_ARGS'),
    'substr 4参数未报错');
check('用例4: (nth 0) 报 SIG_TOO_FEW_ARGS',
    hasErr('nth', 'SIG_TOO_FEW_ARGS'),
    'nth 1参数未报错');
check('用例5: (setq x 1 y) 报 SIG',
    hasErr('setq', 'SIG_TOO_FEW_ARGS'),
    'setq 奇数对未报错');
check('用例6: (setq) 报 SIG_TOO_FEW_ARGS',
    hasErr('setq', 'SIG_TOO_FEW_ARGS'),
    '(setq) 无参未报错');
check('用例7: if 5子表达式报 MISSING_PROGN',
    result.errors.some(e => e.code === 'MISSING_PROGN'),
    'if 多子表达式未报 MISSING_PROGN');
check('用例9: c:mycmd 带必选参数报 CPREFIX_INCOMPLETE',
    result.errors.some(e => e.code === 'CPREFIX_INCOMPLETE' && e.context === 'c:mycmd'),
    'c: 命令带必选参数未报错');
check('用例10: c:mycmd2 仅局部变量不报 CPREFIX_INCOMPLETE',
    !result.errors.some(e => e.code === 'CPREFIX_INCOMPLETE' && e.context === 'c:mycmd2'),
    'c: 命令仅局部变量被误报');
check('用例11: vla-put-color 1参数报 SIG_TOO_FEW_ARGS',
    hasErr('vla-put-color', 'SIG_TOO_FEW_ARGS'),
    'vla-put-color 1参数未报错');
check('用例12: vla-get-name 0参数报 SIG_TOO_FEW_ARGS',
    hasErr('vla-get-name', 'SIG_TOO_FEW_ARGS'),
    'vla-get-name 0参数未报错');
check('用例13: vlax-get-property 1参数报 SIG_TOO_FEW_ARGS',
    hasErr('vlax-get-property', 'SIG_TOO_FEW_ARGS'),
    'vlax-get-property 1参数未报错');
check('用例15: (terpri "extra") 报 SIG_TOO_MANY_ARGS',
    hasErr('terpri', 'SIG_TOO_MANY_ARGS'),
    'terpri 1参数未报错');
check('用例16: (command) 报 SIG_TOO_FEW_ARGS',
    hasErr('command', 'SIG_TOO_FEW_ARGS'),
    '(command) 无参未报错');
check('用例17: (vl-load-com 1) 报 SIG_TOO_MANY_ARGS',
    hasErr('vl-load-com', 'SIG_TOO_MANY_ARGS'),
    'vl-load-com 1参数未报错');
check('用例18: (repeat 5) 报 SIG_TOO_FEW_ARGS',
    hasErr('repeat', 'SIG_TOO_FEW_ARGS'),
    'repeat 1参数未报错');
check('用例19: (foreach lst) 报 SIG_TOO_FEW_ARGS',
    hasErr('foreach', 'SIG_TOO_FEW_ARGS'),
    'foreach 2参数未报错');

console.log(`\n${'='.repeat(60)}`);
console.log(`  第二轮结果: ${passCount}/${passCount + failCount} 用例通过`);
if (failCount > 0) {
    console.log(`  失败项:`);
    for (const f of failures) console.log(`    - ${f.name}: ${f.detail}`);
    process.exit(1);
} else {
    console.log(`  全部通过！`);
    process.exit(0);
}
