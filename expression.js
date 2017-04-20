const spiltRegex = /\s*(=|\+|(-?[0-9]+)|\*|-|\(|\)|\$?[a-zA-Z0-9_]+)\s*/g;
const common = require('./common');
const applyRegister = common.applyRegister;
const freeRegister = common.freeRegister;
const lookup = common.lookup;

function tokenize(str){
    let match;
    const result = [];
    while(match = spiltRegex.exec(str)) result.push(match[1]);
    return result;
}
// | ^ & ( < > ) (+ -) (*)
const nextTable = { '|': '^', '^':'&', '&':'<','<':'+','+':'*','*':'0'};
function parseExpression(ctx, exp, target){
    
    let result = null;
    let status = 0; // 0 for lhs 1 for ope 2 for rhs
    let ope = null;
    while(ctx.cpos < exp.length){
        if(status == 0 || status == 2){
            let buf = null;
            if(target == '0'){
                if(exp[ctx.cpos] == '('){
                    ctx.cpos++;
                    const tmp = parseExpression(ctx, exp, '|');
                    if(exp[ctx.cpos] != ')')return null;
                    buf = tmp;
                    ctx.cpos++;
                    return buf;
                }
                else{
                    if(exp[ctx.cpos].charAt(0) == '$'){
                        ctx.cpos++;
                        return exp[ctx.cpos-1];
                    }
                    else{
                        let tmp = lookup(ctx, exp[ctx.cpos]);
                        if(!tmp){
                            if(!isNaN(parseInt(exp[ctx.cpos]))){
                                ctx.cpos++;
                                return parseInt(exp[ctx.cpos-1]);
                            }else return null;
                        }
                        ctx.cpos++;
                        return tmp;
                    }
                }
            }else{
                buf = parseExpression(ctx, exp, nextTable[target]);
            }
            if(status == 0)result = buf;
            else result.push(buf);
            status = 1;
        }
        else{
            if(target == '*'){
                if(exp[ctx.cpos] == '*'){
                    result = ['*', result];
                }else break;
            }
            else if( target == '+'){
                if(exp[ctx.cpos] == '+'){
                    result = ['+', result];
                }else if(exp[ctx.cpos] == '-'){
                    result = ['-', result];
                }else break;
            }
            else if( target == '<'){
                if(exp[ctx.cpos] == '>'){
                    result = ['>', result];
                }else if(exp[ctx.cpos] == '<'){
                    result = ['<', result];
                }else break;
            }else if( target == '&'){
                if(exp[ctx.cpos] == '&'){
                    result = ['&', result];
                }else break;
            }else if( target == '^'){
                if(exp[ctx.cpos] == '^'){
                    result = ['^', result];
                }else break;
            }else if( target == '|'){
                if(exp[ctx.cpos] == '|'){
                    result = ['|', result];
                }else   break;
            }
            ctx.cpos++;
            status = 2;
        }
    }
    if(status == 1){
        return result;
    }else return null;
}


function parseAssignment(ctx, exp){
    if(exp[1] != '=' ) return null;
    if(exp[0].charAt(0) != '$'){
        exp[0] = lookup(ctx, exp[0]);
        if(!exp[0])return null;
    }
    ctx.cpos = 2;
    const ast = parseExpression(ctx, exp, '|');
    if(!ast)return null;
    return ['=', exp[0], ast];
}
const operatorMap = {'+':'add', '-': 'sub', '&': 'and', '|': 'or', '^': 'xor'};


function pr(x){
    if(typeof(x) == 'object')return "[" + x.map(y=>pr(y)).join(',') + "]";
    else return x;
}
function generateExpression(ctx, ast){
    if(typeof(ast) == 'number')return ast;
    if(typeof(ast) == 'string')return ast;
    const l = generateExpression(ctx, ast[1]);
    const r = generateExpression(ctx, ast[2]);
    if(ast[0] == '*'){
        if(typeof(l) == 'string' && typeof(r) == 'string'){
            ctx.error(0, 'variable multiplication is not support currently');
            return null;
        }
        else if(typeof(l) == 'number' && typeof(r) == 'number'){
            return l*r;
        }
        else {
            const sr = applyRegister(ctx);
            const tr = applyRegister(ctx);
            let v,n;let neg = 0, init=0;
            if(typeof(l)=='string'){v = l; n = r;}
            else { v = r; n = l;}
            if(n<0){n=-n;neg=1};
            while(n){
                const lowbit = n & (-n);
                if(lowbit == 1){
                    if(init == 0){
                        init = 1;
                        ctx.buffer.push(`    add ${sr}, $zero, ${v}`);
                    }else{
                        ctx.buffer.push(`    add ${sr}, ${sr}, ${v}`);
                    }
                }
                else{
                    ctx.buffer.push(`    sll ${tr}, ${v}, ${Math.log(lowbit)/Math.log(2)}`);
                    if(init == 0){
                        init = 1;
                        ctx.buffer.push(`    add ${sr}, $zero, ${tr}`);
                    }
                    else{
                        ctx.buffer.push(`    add ${sr}, ${sr}, ${tr}`);
                    }
                }
                n-=lowbit;
            }
            if(neg){
                ctx.buffer.push(`    nor ${sr}, ${sr}, $zero`);
            }
            freeRegister(ctx, tr);
            freeRegister(ctx, v);
            return sr;
        }
    }
    else if(ast[0] == '='){
        if(typeof(r) == 'string'){
             ctx.buffer.push(`    add ${l}, $zero, ${r}`);
             freeRegister(ctx, r);
        }
        else{
             ctx.buffer.push(`    addi ${l}, $zero, ${r}`);
        }
    }
    else{
        if(typeof(l) == 'string' && typeof(r) == 'string'){
            freeRegister(ctx, r);
            if(ctx.exptregu[l] == true){
                ctx.buffer.push(`    ${operatorMap[ast[0]]} ${l}, ${l}, ${r}`);
                return l;
            }else{
                const dst = applyRegister(ctx);
                ctx.buffer.push(`    ${operatorMap[ast[0]]} ${dst}, ${l}, ${r}`);
                return dst;
            }
        }
        else if(typeof(l) == 'string' && typeof(r) == 'number'){
            let dst = l;
            if(ctx.exptregu[l] != true){
                dst = applyRegister(ctx);;
            }
            if(ast[0] == '-'){
                ctx.buffer.push(`    addi ${dst}, ${l}, -${r}`);
            }
            else{
                ctx.buffer.push(`    ${operatorMap[ast[0]]}i ${dst}, ${l}, ${r}`);
            }
            return dst;
        }
        else if(typeof(l) == 'number' && typeof(r) == 'string'){
            let dst = r;
            if(ctx.exptregu[r] != true){
                dst = applyRegister(ctx);;
            }
            if(ast[0] == '-'){
                ctx.buffer.push(`    addi ${dst}, ${r}, -${l}`);
                ctx.buffer.push(`    sub ${dst}, $zero, ${dst}`);
            }
            else{
                ctx.buffer.push(`    ${operatorMap[ast[0]]}i ${dst}, ${r}, ${l}`);
            }
            return dst;
        }
        else{
            return eval(`l${ast[0]}r`);
        }
    }
}

function dealExpression(ctx, exp){
    const ast = parseAssignment(ctx, tokenize(exp));
    return generateExpression(ctx, ast);
}

exports.dealExpression = dealExpression;