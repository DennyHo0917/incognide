export type DiffOp =
    | { type: 'equal'; lines: string[]; origStart: number; modStart: number }
    | { type: 'delete'; lines: string[]; origStart: number }
    | { type: 'insert'; lines: string[]; modStart: number };

function lcsBacktrack(a: string[], b: string[]): number[][] {
    const n = a.length;
    const m = b.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp;
}

function buildEditScript(a: string[], b: string[], dp: number[][]): DiffOp[] {
    const ops: DiffOp[] = [];
    let i = a.length;
    let j = b.length;

    function flushEqual(equalLines: string[], origStart: number, modStart: number) {
        if (equalLines.length > 0) {
            ops.push({ type: 'equal', lines: equalLines, origStart, modStart });
        }
    }

    let pendingEqual: string[] = [];
    let pendingOrigStart = 0;
    let pendingModStart = 0;

    const flushPending = () => {
        flushEqual(pendingEqual, pendingOrigStart, pendingModStart);
        pendingEqual = [];
    };

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1) {
            if (pendingEqual.length === 0) {
                pendingOrigStart = i;
                pendingModStart = j;
            }
            pendingEqual.unshift(a[i - 1]);
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            flushPending();
            const insertLines: string[] = [];
            let modStart = j;
            while (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j]) && !(i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1)) {
                insertLines.unshift(b[j - 1]);
                j--;
            }
            ops.push({ type: 'insert', lines: insertLines, modStart });
        } else if (i > 0) {
            flushPending();
            const deleteLines: string[] = [];
            let origStart = i;
            while (i > 0 && (j === 0 || dp[i - 1][j] > dp[i][j - 1]) && !(i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1)) {
                deleteLines.unshift(a[i - 1]);
                i--;
            }
            ops.push({ type: 'delete', lines: deleteLines, origStart });
        }
    }

    flushPending();
    return ops;
}

export function diffLines(original: string, modified: string): DiffOp[] {
    const a = original.split('\n');
    const b = modified.split('\n');
    if (a.length === 0 && b.length === 0) return [];
    if (a.length === 0) return [{ type: 'insert', lines: b, modStart: 1 }];
    if (b.length === 0) return [{ type: 'delete', lines: a, origStart: 1 }];
    const dp = lcsBacktrack(a, b);
    return buildEditScript(a, b, dp).reverse();
}

export function diffToSideLines(ops: DiffOp[]) {
    const leftLines: { line: string; type: 'removed' | 'unchanged' | 'empty'; lineNum: number }[] = [];
    const rightLines: { line: string; type: 'added' | 'unchanged' | 'empty'; lineNum: number }[] = [];
    let leftLineNum = 1;
    let rightLineNum = 1;

    for (const op of ops) {
        if (op.type === 'equal') {
            for (const line of op.lines) {
                leftLines.push({ line, type: 'unchanged', lineNum: leftLineNum++ });
                rightLines.push({ line, type: 'unchanged', lineNum: rightLineNum++ });
            }
        } else if (op.type === 'delete') {
            for (const line of op.lines) {
                leftLines.push({ line, type: 'removed', lineNum: leftLineNum++ });
                rightLines.push({ line: '', type: 'empty', lineNum: 0 });
            }
        } else if (op.type === 'insert') {
            for (const line of op.lines) {
                leftLines.push({ line: '', type: 'empty', lineNum: 0 });
                rightLines.push({ line, type: 'added', lineNum: rightLineNum++ });
            }
        }
    }

    return { leftLines, rightLines };
}
