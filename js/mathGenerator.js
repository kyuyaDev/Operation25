/**
 * Math Generator for Operation 25
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNDigitNumber(n) {
  if (n === 1) return randomInt(1, 9);
  const min = Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  // For n >= 16 this might lose precision, but we use BigInt for n>=10 if needed.
  // We'll use string generation to be absolutely safe for any digit length.
  let str = randomInt(1, 9).toString();
  for (let i = 1; i < n; i++) {
    str += randomInt(0, 9).toString();
  }
  return BigInt(str);
}

function countBorrowings(strA, strB) {
  const revA = strA.split('').reverse();
  const revB = strB.split('').reverse();
  let borrows = 0;
  let borrow = 0;
  let len = Math.max(revA.length, revB.length);

  for (let i = 0; i < len; i++) {
    let digitA = parseInt(revA[i] || '0') - borrow;
    let digitB = parseInt(revB[i] || '0');
    if (digitA < digitB) {
      borrows++;
      borrow = 1;
    } else {
      borrow = 0;
    }
  }
  return borrows;
}

// AST Generation for R21~25
function getFactors(n, minF) {
  let f = [];
  for (let i = minF; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      if (n / i >= minF) {
        f.push(i);
        if (i !== n / i) f.push(n / i);
      }
    }
  }
  return f;
}

function getLeaves(node) {
  if (node.type === 'val') return [node];
  return getLeaves(node.left).concat(getLeaves(node.right));
}

function generateAST(opsPool, targetVal, minLeaf) {
  let tree = { type: 'val', val: targetVal };
  // Clone opsPool to avoid mutating original
  let ops = [...opsPool];

  for (let op of ops) {
    let leafNodes = getLeaves(tree);
    leafNodes.sort(() => Math.random() - 0.5);
    
    let success = false;
    for (let leaf of leafNodes) {
      let val = leaf.val;
      let L = null, R = null;

      if (op === '+') {
        if (val < minLeaf * 2) continue;
        L = randomInt(minLeaf, val - minLeaf);
        R = val - L;
      } else if (op === '-') {
        R = randomInt(minLeaf, 50); // limit R to prevent huge numbers
        L = val + R;
      } else if (op === '*') {
        let factors = getFactors(val, minLeaf);
        if (factors.length === 0) continue;
        L = factors[randomInt(0, factors.length - 1)];
        R = val / L;
        // Randomize order of L and R
        if (Math.random() > 0.5) { let tmp = L; L = R; R = tmp; }
      } else if (op === '/') {
        R = randomInt(minLeaf, 20);
        L = val * R;
      }

      if (L !== null && R !== null) {
        leaf.type = 'op';
        leaf.op = op;
        leaf.left = { type: 'val', val: L };
        leaf.right = { type: 'val', val: R };
        success = true;
        break;
      }
    }
    
    if (!success) return null; // failed to place operator, need to restart
  }
  return tree;
}

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

function astToString(node, parentOp = null, isRight = false) {
  if (node.type === 'val') {
    return { str: node.val.toString(), parens: 0 };
  }

  let left = astToString(node.left, node.op, false);
  let right = astToString(node.right, node.op, true);

  let needsParen = false;
  if (parentOp) {
    if (PRECEDENCE[node.op] < PRECEDENCE[parentOp]) {
      needsParen = true;
    } else if (PRECEDENCE[node.op] === PRECEDENCE[parentOp]) {
      if (isRight && (parentOp === '-' || parentOp === '/')) {
        needsParen = true;
      }
    }
  }

  let str = `${left.str} ${node.op} ${right.str}`;
  let parensCount = left.parens + right.parens + (needsParen ? 1 : 0);

  if (needsParen) {
    str = `( ${str} )`;
  }

  return { str, parens: parensCount };
}

function generateMixedExpression(opsPool, targetMin, targetMax, minLeaf, minParens) {
  let attempts = 0;
  while (attempts < 5000) {
    attempts++;
    let targetVal = randomInt(targetMin, targetMax);
    // shuffle opsPool
    let shuffledOps = [...opsPool].sort(() => Math.random() - 0.5);
    
    let ast = generateAST(shuffledOps, targetVal, minLeaf);
    if (ast) {
      let result = astToString(ast);
      if (result.parens >= minParens) {
        // Return equation string and answer
        return {
          equation: result.str,
          answer: targetVal.toString()
        };
      }
    }
  }
  // Fallback if super unlucky
  return { equation: "2 * ( 50 + 50 )", answer: "200" };
}


/**
 * Generate a problem for the given round.
 * returns { equation: string, answer: string }
 */
export function generateRound(round) {
  // 1~4 Round: Addition
  if (round === 1) {
    let a = generateNDigitNumber(3);
    let b = generateNDigitNumber(3);
    return { equation: `${a} + ${b}`, answer: (a + b).toString() };
  }
  if (round === 2) {
    let a = generateNDigitNumber(4);
    let b = generateNDigitNumber(4);
    return { equation: `${a} + ${b}`, answer: (a + b).toString() };
  }
  if (round === 3) {
    let a = generateNDigitNumber(5);
    let b = generateNDigitNumber(5);
    return { equation: `${a} + ${b}`, answer: (a + b).toString() };
  }
  if (round === 4) {
    let a = generateNDigitNumber(10);
    let b = generateNDigitNumber(10);
    return { equation: `${a} + ${b}`, answer: (a + b).toString() };
  }

  // 5~8 Round: Subtraction with >= 2 borrowings
  if (round >= 5 && round <= 8) {
    let digit1, digit2;
    if (round === 5) { digit1 = 6; digit2 = 5; }
    if (round === 6) { digit1 = 7; digit2 = 6; }
    if (round === 7) { digit1 = 8; digit2 = 7; }
    if (round === 8) { digit1 = 10; digit2 = 9; }

    while (true) {
      let a = generateNDigitNumber(digit1);
      let b = generateNDigitNumber(digit2);
      if (a > b) {
        let borrows = countBorrowings(a.toString(), b.toString());
        if (borrows >= 2) {
          return { equation: `${a} - ${b}`, answer: (a - b).toString() };
        }
      }
    }
  }

  // 9~10 Round: Mixed Add/Sub
  if (round === 9 || round === 10) {
    const digit = (round === 9) ? 5 : 6;
    const opsCount = (round === 9) ? 2 : 3; // 2 adds, 2 subs OR 3 adds, 3 subs
    
    while(true) {
      let ops = [];
      for(let i=0; i<opsCount; i++) { ops.push('+'); ops.push('-'); }
      // Shuffle operators
      ops.sort(() => Math.random() - 0.5);
      
      let currentValue = generateNDigitNumber(digit);
      let equation = currentValue.toString();
      let valid = true;

      for (let op of ops) {
        let nextVal = generateNDigitNumber(digit);
        if (op === '+') {
          currentValue += nextVal;
        } else {
          currentValue -= nextVal;
        }
        equation += ` ${op} ${nextVal}`;
        if (currentValue <= 0n) {
          valid = false;
          break;
        }
      }

      if (valid && currentValue >= 100n) {
        return { equation: equation, answer: currentValue.toString() };
      }
    }
  }

  // 11~15 Round: Multiplication
  // 11: 2-digit * 2-digit (Tens in 1st is 3+)
  if (round === 11) {
    let a = randomInt(30, 99);
    let b = randomInt(10, 99);
    return { equation: `${a} * ${b}`, answer: (BigInt(a) * BigInt(b)).toString() };
  }
  // 12: 3-digit * 2-digit (Hundreds in 1st is 3+)
  if (round === 12) {
    let a = randomInt(300, 999);
    let b = randomInt(10, 99);
    return { equation: `${a} * ${b}`, answer: (BigInt(a) * BigInt(b)).toString() };
  }
  // 13: 3-digit * 3-digit (Hundreds in 1st is 3+)
  if (round === 13) {
    let a = randomInt(300, 999);
    let b = randomInt(100, 999);
    return { equation: `${a} * ${b}`, answer: (BigInt(a) * BigInt(b)).toString() };
  }
  // 14: 4-digit * 3-digit (Thousands in 1st is 3+)
  if (round === 14) {
    let a = randomInt(3000, 9999);
    let b = randomInt(100, 999);
    return { equation: `${a} * ${b}`, answer: (BigInt(a) * BigInt(b)).toString() };
  }
  // 15: 4-digit * 4-digit (Thousands in 1st is 2+)
  if (round === 15) {
    let a = randomInt(2000, 9999);
    let b = randomInt(1000, 9999);
    return { equation: `${a} * ${b}`, answer: (BigInt(a) * BigInt(b)).toString() };
  }

  // 16~20 Round: Division
  if (round >= 16 && round <= 20) {
    while(true) {
      let b = 0; // divisor
      let targetLengthA = 0; // dividend length length
      if (round === 16) {
        b = randomInt(20, 99); targetLengthA = 4;
      }
      if (round === 17) {
        b = randomInt(20, 99); targetLengthA = 5;
      }
      if (round === 18) {
        b = randomInt(200, 999); targetLengthA = 6;
      }
      if (round === 19) {
        b = randomInt(2000, 9999); targetLengthA = 8;
      }
      if (round === 20) {
        b = randomInt(20, 99); targetLengthA = 8;
      }
      
      if (b % 10 < 3) continue; // divisor ones digit 3+

      let minA = Math.pow(10, targetLengthA - 1);
      let maxA = Math.pow(10, targetLengthA) - 1;

      let minC = Math.ceil(minA / b);
      let maxC = Math.floor(maxA / b);

      if (maxC >= minC) {
        let c = randomInt(minC, maxC);
        let a = b * c;
        if (a.toString().length === targetLengthA) {
          return { equation: `${a} / ${b}`, answer: c.toString() };
        }
      }
    }
  }

  // 21~25 Round: AST Mixed Operations
  if (round === 21) {
    // R21: +, -, *, / once each. 1+ parens. Ans >= 100 (3-digit)
    let ops = ['+', '-', '*', '/'];
    return generateMixedExpression(ops, 100, 999, 1, 1);
  }
  if (round === 22) {
    // R22: +, -, *, / once each. 1+ parens. Ans >= 1000 (4-digit)
    let ops = ['+', '-', '*', '/'];
    return generateMixedExpression(ops, 1000, 9999, 1, 1);
  }
  if (round === 23) {
    // R23: +, - twice, *, / once. 2+ parens. Ans >= 1000
    let ops = ['+', '+', '-', '-', '*', '/'];
    return generateMixedExpression(ops, 1000, 9999, 1, 2);
  }
  if (round === 24) {
    // R24: +, -, *, / twice each. 1+ parens. Ans >= 1000
    let ops = ['+', '+', '-', '-', '*', '*', '/', '/'];
    return generateMixedExpression(ops, 1000, 9999, 1, 1);
  }
  if (round === 25) {
    // R25: +, -, *, / twice each. 1+ parens. All nums are >= 10. Ans >= 1000
    let ops = ['+', '+', '-', '-', '*', '*', '/', '/'];
    return generateMixedExpression(ops, 1000, 9999, 10, 1);
  }

  return { equation: "1 + 1", answer: "2" };
}
