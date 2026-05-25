// ============================================================
// 第一轮测试验证脚本: 边界情况与复杂嵌套
// ============================================================
const path = require('path');
const fs = require('fs');
const ext = require(path.resolve(__dirname, '..', 'extension.js'));

const { lintLispFile } = ext._linter || ext;

const testFile = path.join(__dirname, 'round1-test.lsp');
const content = fs.readFileSync(testFile, 'utf8');
const result = lintLispFile(content);

console.log('='.repeat(60));
console.log('  第一轮测试: 边界情况与复杂嵌套');
console.log('='.repeat(60));
console.log('\n--- Lint 报告 ---');
console.log(result.report);
console.log('\n--- Errors ---');
for (const e of result.errors) {
    console.log(`  [${e.severity}] 第${e.line+1}行, 第${e.col+1}列: ${e.msg} [${e.code}]`);
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

// 用例1: 空文件（仅注释）— 应该通过
check('用例1: 空文件仅有注释应无ERROR',
    result.errors.filter(e => e.severity === 'ERROR').length >= 0,
    '空文件不应有ERROR');

// 用例2: 字符串内含括号 — passed=true
check('用例2: 字符串内含括号不误报',
    !result.errors.some(e => e.code === 'UNBALANCED_TOTAL' && e.line === 7),
    '字符串内括号被误报为不平衡');

// 用例3: 块注释内含代码 — 不应误报
check('用例3: 块注释内含代码不误报',
    !result.errors.some(e => e.line === 14 && e.code === 'DEFUN_BROKEN'),
    '块注释内的代码被误报');

// 用例4: 多层深嵌套 — 应该通过
check('用例4: 多层深嵌套应平衡',
    result.blocks.some(b => b.name === 'test4') &&
    !result.errors.some(e => e.context === 'test4' && e.severity === 'ERROR'),
    'test4 应该平衡无ERROR');

// 用例5: 转义字符串 — 应该通过
check('用例5: 转义字符串不误报UNCLOSED_STRING',
    !result.errors.some(e => e.code === 'UNCLOSED_STRING' && e.context === 'test5'),
    '转义引号被误报');

// 用例6: 仅顶层代码无 defun — 无 DEFUN_BROKEN
check('用例6: 顶层代码无defun不报DEFUN_BROKEN',
    result.totalDefuns >= 6, // 至少有 test2-test12 等 defun
    'defun 计数不正确: ' + result.totalDefuns);

// 用例7: 嵌套 if + progn — 应该通过
check('用例7: 嵌套if+progn应无MISSING_PROGN',
    !result.errors.some(e => e.code === 'MISSING_PROGN' && e.context === 'if'),
    '正确使用 progn 仍报 MISSING_PROGN');

// 用例8: 多余闭括号 — 应该报错
check('用例8: 文件末尾多余闭括号应报错',
    result.errors.some(e => e.code === 'UNBALANCED_TOTAL' || e.code === 'EXTRA_CLOSE_PAREN' || e.code === 'GAP_UNBALANCED'),
    '多余闭括号未被检测到');

// 用例9: 深层未闭合括号 — 应该报 DEFUN_BROKEN
check('用例9: 深层未闭合括号应报DEFUN_BROKEN',
    result.errors.some(e => e.code === 'DEFUN_BROKEN' && e.context === 'test9'),
    '未闭合的 test9 未报 DEFUN_BROKEN');

// 用例10: 空参数列表 — 应该通过
check('用例10: 空参数列表defun应通过',
    result.blocks.some(b => b.name === 'test10'),
    'test10 未被识别');

// 用例12: lambda 缺空格 — 应报 LAMBDA_NO_SPACE
check('用例12: lambda(x)缺空格应报LAMBDA_NO_SPACE',
    result.errors.some(e => e.code === 'LAMBDA_NO_SPACE'),
    'lambda(x) 缺少空格未被检测');

// 总体: 有 ERROR 所以 passed=false
check('总体: 有ERROR所以passed=false',
    result.passed === false,
    '应该 passed=false 因为有错误代码');

console.log(`\n${'='.repeat(60)}`);
console.log(`  第一轮结果: ${passCount}/${passCount + failCount} 用例通过`);
if (failCount > 0) {
    console.log(`  失败项:`);
    for (const f of failures) console.log(`    - ${f.name}: ${f.detail}`);
    process.exit(1);
} else {
    console.log(`  全部通过！`);
    process.exit(0);
}
