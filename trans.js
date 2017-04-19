/*
lw, sw, addi, jr, jal, j
*/
const script=`
@function max(u, k)
@alias m $v0
@treg i, uiaddr, ui
    lw %m, 0(%u)
    @repeat(i, 1, k)
        sll %uiaddr, %i, 2
        add %uiaddr, %uiaddr, %u
        lw %ui, 0(%uiaddr)
        @if(ui > m)
            add %m, %ui, $zero
        @endif
    @endrepeat
    @return m

@function strlen(u)
@alias m $v0
@treg umaddr, um
    addi %m, $zero, $zero
strlen_loop:
    sll %umaddr, %m, 2
    add %umaddr, %u, %umaddr
    lw %um, 0(%umaddr)
    bne %um, $zero, strlen_loop

@function sum(u, k)
@alias m $v0
@treg i, uiaddr, ui
    lw %m, 0(%u)
    @repeat(i, 1, k)
        sll %uiaddr, %i, 2
        add %uiaddr, %uiaddr, %u
        lw %ui, 0(%uiaddr)
        add %m, %ui, %m
    @endrepeat
    @return m

@function mmax(u, k)
@alias m $v0
@treg i, uiaddr
    @call max(u, k)
    @repeat(i, 0, k)
        sll %uiaddr, %i, 2
        add %uiaddr, %uiaddr, %u
        sw %m, 0(%uiaddr)
    @endrepeat

`;

function lookup(ctx, name){
    if(ctx.alias.hasOwnProperty(name))return ctx.alias[name];
    if(ctx.sregs.hasOwnProperty(name))return ctx.sregs[name];
    if(ctx.tregs.hasOwnProperty(name))return ctx.tregs[name];
    if(ctx.locals.hasOwnProperty(name))return ctx.locals[name];
    if(ctx.params.hasOwnProperty(name))return ctx.params[name];
    return null;
}

// |sp| local | sreg | ra | param(1, 2, 3, 4) | oldsp
function generateFunction(ctx){
    const stackSize = (Object.keys(ctx.params).length + Object.keys(ctx.sregs).length
     + Object.keys(ctx.locals).length + 1) * 4;
    ctx.result.push(ctx.functionName + " :");
    ctx.result.push(`    addi $sp, $sp, -${stackSize}`);
    ctx.result.push("    sw $ra, 0($sp)");
    let current = (1 + Object.keys(ctx.locals).length) * 4;
    for(let key in ctx.sregs){
        const reg = ctx.sregs[key];
        ctx.result.push(`    sw ${reg}, ${current}($sp)`);
        current += 4;
    }
    for(let cmd of ctx.buffer){
        if(/^\s*$/.test(cmd))continue;
        if(cmd.indexOf(':')!=-1)ctx.result.push(cmd.replace(/^\s*/,''));
        else ctx.result.push(cmd.replace(/^\s*/,'    '));
    }
    ctx.result.push(ctx.functionName + "_end :");
    current = (1 + Object.keys(ctx.locals).length) * 4;
    for(let key in ctx.sregs){
        const reg = ctx.sregs[key];
        ctx.result.push(`    lw ${reg}, ${current}($sp)`);
        current += 4;
    }
    ctx.result.push("    lw $ra, 0($sp)");
    ctx.result.push(`    addi $sp, $sp, ${stackSize}`);
    ctx.result.push(`    jr $ra`);
    ctx.result.push(``);
}


function parseConditionItem(ctx, raw){
    if(raw.indexOf('$') != -1){
        return raw;
    }
    else{
        if(ctx.alias.hasOwnProperty(raw))return ctx.alias[raw];
        if(ctx.sregs.hasOwnProperty(raw))return ctx.sregs[raw];
        if(ctx.tregs.hasOwnProperty(raw))return ctx.tregs[raw];
        if(ctx.params.hasOwnProperty(raw) && typeof(ctx.params[raw]) == 'string')return ctx.params[raw];
    }
    if(parseInt(raw) === 0)return '$zero';
    return null;
}

function parseRegOrImm(ctx, raw){
    if(!isNaN(parseInt(raw)))return parseInt(raw);
    else return parseConditionItem(raw);
}

function parseCondition(ctx, raw){
    const no = ++ ctx.flowno;
    if(raw.indexOf('==') != -1){
        const tuple = raw.split(/\s*==\s*/);
        const l = parseConditionItem(ctx, tuple[0]);
        const r = parseConditionItem(ctx, tuple[1]);
        if(!l || !r) return -1;
        ctx.buffer.push(`    bne ${l}, ${r}, ${ctx.functionName}_flow_${no}`);
    }
    else if(raw.indexOf('!=') != -1){
        const tuple = raw.split(/\s*!=\s*/);
        const l = parseConditionItem(ctx, tuple[0]);
        const r = parseConditionItem(ctx, tuple[1]);
        if(!l || !r) return -1;
        ctx.buffer.push(`    beq ${l}, ${r}, ${ctx.functionName}_flow_${no}`);
    }
    else if(raw.indexOf('>=') != -1){
        const tuple = raw.split(/\s*>=\s*/);
        const l = parseConditionItem(ctx, tuple[0]);
        const r = parseConditionItem(ctx, tuple[1]);
        if(!l || !r) return -1;
        ctx.buffer.push(`    slt $ra, ${l}, ${r}`);
        ctx.buffer.push(`    bne $ra, $zero, ${ctx.functionName}_flow_${no}`);
    }
    else if(raw.indexOf('<') != -1){
        const tuple = raw.split(/\s*<\s*/);
        const l = parseConditionItem(ctx, tuple[0]);
        const r = parseConditionItem(ctx, tuple[1]);
        if(!l || !r) return -1;
        ctx.buffer.push(`    slt $ra, ${l}, ${r}`);
        ctx.buffer.push(`    beq $ra, $zero, ${ctx.functionName}_flow_${no}`);
    }
    else if(raw.indexOf('<=') != -1){
        const tuple = raw.split(/\s*<=\s*/);
        const l = parseConditionItem(ctx, tuple[0]);
        const r = parseConditionItem(ctx, tuple[1]);
        if(!l || !r) return -1;
        ctx.buffer.push(`    slt $ra, ${r}, ${l}`);
        ctx.buffer.push(`    bne $ra, $zero, ${ctx.functionName}_flow_${no}`);
    }   
    else if(raw.indexOf('>') != -1){
        const tuple = raw.split(/\s*>\s*/);
        const l = parseConditionItem(ctx, tuple[0]);
        const r = parseConditionItem(ctx, tuple[1]);
        if(!l || !r) return -1;
        ctx.buffer.push(`    slt $ra, ${r}, ${l}`);
        ctx.buffer.push(`    beq $ra, $zero, ${ctx.functionName}_flow_${no}`);
    }
    else return -1;
    return no;
}

const NotationHandler = {
   "@function" : function(cmd, ctx){
        if(ctx.functionName != null)generateFunction(ctx);
        const tuple = /@function\s*([a-zA-Z_]+)\s*\(\s*(.*)\s*\)/.exec(cmd);
        const funcName = tuple[1];
        const params = tuple[2].split(/\s*,\s*/);
        ctx.sregs = {};
        ctx.alias = {};
        ctx.tregs = {};
        ctx.locals = {};
        ctx.params = {};
        ctx.buffer = [];
        ctx.flowstack = [];
        ctx.flowno = 0;
        ctx.functionName = funcName;
        let current = 0;
        for(let param of params){
            if(current <= 3){
                ctx.params[param] = `$a${current}`;
            }
            else{
                ctx.params[param] = 4 * (current + 1);
            }
            current++;
        }
        return true;
   },
   "@return": function(cmd, ctx){
        const tuple = /@return\s*([a-zA-Z_]+)?/.exec(cmd);
        const name = tuple[1];
        if(name){
            if(name.indexOf('$') != -1){
                if(name != '$v0')ctx.buffer.push(`    add $v0, $zero, ${name}`);
            }
            else if(!isNaN(parseInt(name))){
                ctx.buffer.push(`    addi $v0, $zero, ${name}`);
            }
            else{
                const target = lookup(ctx, name);
                if(target == null){
                    ctx.error(ctx.i, "variable is not defined");
                    return;
                }
                if(typeof target == 'number'){
                    ctx.buffer.push(`    lw $v0, ${target}($sp)`);
                }
                else{
                    ctx.buffer.push(`    add $v0, $zero, ${target}`);
                }
            }
        }
        ctx.buffer.push(`    j ${ctx.functionName}_end`);
        return true;
   },
   "@alias": function(cmd, ctx){
        const tuple = cmd.split(/\s+/);
        const name = tuple[1];
        if(lookup(ctx, name) != null){
            ctx.error(ctx.i, "redefine local varibale");
            return;
        }
        ctx.alias[name] = tuple[2];
   },
   "@call": function(cmd, ctx){
        const tuple = /@call\s*([a-zA-Z_]+)\s*\(\s*(.*)\s*\)\s*(storeparam)?/.exec(cmd);
        const funcName = tuple[1];
        const names = tuple[2].split(/\s*,\s*/);
        if(!ctx.functionTable.hasOwnProperty(funcName)){
            ctx.error(ctx.i, `no such function : ${funcName}`);
            return;
        }
        const func = ctx.functionTable[funcName];
        if(func.length != names.length){
            ctx.error(ctx.i, `parameter number is not correct : ${funcName}`);
            return;
        }
        if(tuple[3]){
            const base = 4 * (Object.keys(ctx.locals).length + Object.keys(ctx.sregs).length + 2);
            for(let i = 0; i < max(4, Object.keys(ctx.params).length); i++){
            ctx.buffer.push(`    sw $a${i}, ${base+4(i)}($sp)`);
            }
        }
        let current = 0;
        for(let name of names){
            if(current <= 3){
                if(name.indexOf('$') != -1){
                    ctx.buffer.push(`    add $a${current}, $zero, ${name}`);
                }
                else if(!isNaN(parseInt(name))){
                    ctx.buffer.push(`    addi $a${current}, $zero, ${name}`);
                }
                else{
                    const target = lookup(ctx, name);
                    if(target == null){
                        ctx.error(ctx.i, "variable is not defined");
                        return;
                    }
                    if(typeof target == 'number'){
                        ctx.buffer.push(`    lw $a${current}, ${target}($sp)`);
                    }
                    else{
                        ctx.buffer.push(`    add $a${current}, $zero, ${target}`);
                    }
                }
            }
            else{
                const pos = -4 * current;
                if(name.indexOf('$') != -1){
                    ctx.buffer.push(`    sw ${name}, ${pos}($sp)`);
                }
                else if(!isNaN(parseInt(name))){
                    ctx.buffer.push(`    addi $at, $zero, ${name}`);
                    ctx.buffer.push(`    sw $at, ${pos}($sp)`);
                }
                else{
                    const target = lookup(ctx, name);
                    if(target == null){
                        ctx.error(ctx.i, "variable is not defined");
                        return;
                    }
                    if(typeof target == 'number'){
                        ctx.buffer.push(`    lw $at, ${name}($sp)`);
                        ctx.buffer.push(`    sw $at, ${pos}($sp)`);
                    }
                    else{
                        ctx.buffer.push(`    sw ${name}, ${pos}($sp)`);
                    }
                }
            }
            current ++;
        }
        ctx.buffer.push(`    jal ${funcName}`);
        if(tuple[3]){
            const base = 4 * (Object.keys(ctx.locals).length + Object.keys(ctx.sregs).length + 2);
            for(let i = 0; i < max(4, Object.keys(ctx.params).length); i++){
            ctx.buffer.push(`    lw $a${i}, ${base+4(i)}($sp)`);
            }
        }
        return true;
   },
   "@local": function(cmd, ctx){
        const tuple = /@local\s*(.*)/.exec(cmd);
        const names = tuple[1].split(/\s*,\s*/);
        for(let name of param){
            if(lookup(ctx, name) != null){
                ctx.error(ctx.i, "redefine local varibale");
                return;
            }
            const num = Object.keys(ctx.local).length;
            ctx.sregs[name] = (num + 1) * 4;
        }
        return true;
   },
   "@sreg": function(cmd, ctx){
        const tuple = /@sreg\s*(.*)/.exec(cmd);
        const names = tuple[1].split(/\s*,\s*/);
        for(let name of names){
            if(lookup(ctx, name) != null){
                ctx.error(ctx.i, "redefine reg varibale");
                return;
            }
            const num = Object.keys(ctx.sregs).length;
            if(num > 7){
                ctx.error(ctx.i, "too much sreg variables");
                return;
            }
            ctx.sregs[name] = `$s${num}`;
        }
        return true;
   },
   "@treg": function(cmd, ctx){
        const tuple = /@treg\s*(.*)/.exec(cmd);
        const names = tuple[1].split(/\s*,\s*/);
        for(let name of names){
            if(lookup(ctx, name) != null){
                ctx.error(ctx.i, "redefine reg varibale");
                return;
            }
            const num = Object.keys(ctx.tregs).length;
            if(num > 9){
                ctx.error(ctx.i, "too much treg variables");
                return;
            }
            ctx.tregs[name] = `$t${num}`;
        }
        return true;
    },
    "@if": function(cmd, ctx){
        const tuple = /@if\s*\(\s*(.*)\s*\)/.exec(cmd);
        const no = parseCondition(ctx, tuple[1]);
        if(no < 0){
            ctx.error(ctx.i, "unknown operator");
            return;
        }
        ctx.flowstack.push({type:'if', no: no});
        return true;
    },
    "@else": function(cmd, ctx){
        if(!ctx.flowstack[ctx.flowstack.length - 1] || ctx.flowstack[ctx.flowstack.length - 1].type != 'if'){
            ctx.error(ctx.i, "unknown else");
            return;
        }
        const no = ctx.flowstack[ctx.flowstack.length - 1].no;
        ctx.buffer.push(`    j ${ctx.functionName}_end_${no}`);
        ctx.buffer.push(`${ctx.functionName}_flow_${no}:`);
        ctx.flowstack[ctx.flowstack.length - 1].type = 'else';
        return true;
    },
    "@endif": function(cmd, ctx){
        if(!ctx.flowstack[ctx.flowstack.length - 1]){
            ctx.error(ctx.i, "unknown endif");
            return;
        }
        const no = ctx.flowstack[ctx.flowstack.length - 1].no;
        if(ctx.flowstack[ctx.flowstack.length - 1].type=='if'){
            ctx.buffer.push(`${ctx.functionName}_flow_${no}:`);
            ctx.flowstack.pop();
        }
        else if(ctx.flowstack[ctx.flowstack.length - 1].type == 'else'){
            ctx.buffer.push(`${ctx.functionName}_end_${no}:`);
            ctx.flowstack.pop();
        }
        return;
    },
    "@while": function(cmd, ctx){
        const tuple = /@while\s*\(\s*(.*)\s*\)/.exec(cmd);
        ctx.buffer.push(`${ctx.functionName}_head_${ctx.flowno+1}:`);
        const no = parseCondition(ctx, tuple[1]);
        if(no < 0){
            ctx.error(ctx.i, "unknown operator");
            return;
        }
        ctx.flowstack.push({type:'while', no: no});
        return true;
    },
    "@repeat": function(cmd, ctx){
        const tuple = /@repeat\s*\(\s*(.*)\s*\)/.exec(cmd);
        const no = ++ctx.flowno;
        
        const data = tuple[1].split(/\s*,\s*/);
        const l = parseConditionItem(ctx, data[0]);
        const m = parseRegOrImm(ctx, data[1]);
        const r = parseConditionItem(ctx, data[2]);
        if(!l || !r){
            ctx.error(ctx.i, "unknown repeat param (cannot be integer)");
            return;
        }
        if(typeof(m) == 'number'){
            ctx.buffer.push(`    addi ${l}, $zero, ${m}`);
        }
        else{
            ctx.buffer.push(`    add ${l}, $zero, ${m}`);
        }
        ctx.buffer.push(`${ctx.functionName}_head_${no}:`);
        ctx.buffer.push(`    slt $ra, ${l}, ${r}`);
        ctx.buffer.push(`    beq $ra, $zero, ${ctx.functionName}_end_${no}`);
        ctx.flowstack.push({type:'repeat', no: no});
        return true;
    },
    "@endwhile": function(cmd, ctx){
        if(!ctx.flowstack[ctx.flowstack.length - 1] || ctx.flowstack[ctx.flowstack.length - 1].type!='while'){
            ctx.error(ctx.i, "unknown endwhile");
            return;
        }
        const no = ctx.flowstack[ctx.flowstack.length - 1].no;
        ctx.buffer.push(`j ${ctx.functionName}_head_${no}`);
        ctx.buffer.push(`${ctx.functionName}_flow_${no}:`);
        ctx.flowstack.pop();
        return true;
    },
    "@endrepeat": function(cmd, ctx){
        if(!ctx.flowstack[ctx.flowstack.length - 1] || ctx.flowstack[ctx.flowstack.length - 1].type!='repeat'){
            ctx.error(ctx.i, "unknown endrepeat");
            return;
        }
        const no = ctx.flowstack[ctx.flowstack.length - 1].no;
        ctx.buffer.push(`j ${ctx.functionName}_head_${no}`);
        ctx.buffer.push(`${ctx.functionName}_end_${no}:`);
        ctx.flowstack.pop();
        return true;
    }
};

function preprocess(script, error){
    let cmds = script.split('\n');
    const ctx = {
        functionTable: {},
        result : [],
        buffer : [],
        sregs : null,
        tregs : null,
        locals: null,
        params: null,
        functionName : null,
        error: error
    };
    //scan function
    for(let i = 0; i < cmds.length; i++){
        if(cmds[i].indexOf('@') != -1){
            cmds[i] = cmds[i].replace(/^\s*/, '');
            const ins = cmds[i].split(' ')[0];
            if(ins.indexOf("@function") != -1){
                const tuple = /@function\s*([a-zA-Z_]+)\((.*)\)/.exec(cmds[i]);
                const funcName = tuple[1];
                const params = tuple[2].split(/\s*,\s*/);
                for(let param of params){
                    if(!/[a-zA-Z_]+/.test(param)){
                        error(i, "illegal parameter defination");
                        return;
                    }
                }
                if(ctx.functionTable.hasOwnProperty(funcName)){
                    error(i, `redefine function : ${funcName}`);
                    return;
                }
                ctx.functionTable[funcName] = params;
            }
        }
    }

    for(let i = 0; i < cmds.length; i++){
        if(cmds[i].indexOf('@') != -1){
            cmds[i] = cmds[i].replace(/^\s*/, '');
            const ins = cmds[i].split(' ')[0];
            let flag = 0;
            ctx.i = i;
            for(const key of Object.keys(NotationHandler)){
                if(ins.indexOf(key) != -1){
                    NotationHandler[key](cmds[i], ctx);
                    flag = 1;
                    break;
                }
            }
            if(!flag)error(i, "unknown notation");
        }
        else{
            let ins = cmds[i];
            let flag = 0;
            let cache = [];
            while(/,\s*%([a-zA-Z_]+)/.test(ins)){
                const origin = /,\s*%([a-zA-Z_]+)/.exec(ins)[1];
                const target = lookup(ctx, origin);
                if(target == null){
                    error(i, "variable is not defined");
                    return;
                }
                if(typeof target == 'number'){
                    if(flag == 0){ //use $at
                        ctx.buffer.push(`    lw $at, ${target}($sp)`);
                        flag = 1;
                        ins = ins.replace(/,\s*%([a-zA-Z_]+)/,`, $at`);
                    }
                    else if( flag == 1){
                        ctx.buffer.push(`    lw $t9, ${target}($sp)`);
                        flag = 1;
                        ins = ins.replace(/,\s*%([a-zA-Z_]+)/,`, $t9`);
                    }
                    else{
                        error(i, "too much marco");
                        return;
                    }
                }
                else{
                    ins = ins.replace(/,\s*%([a-zA-Z_]+)/,`, ${target}`);
                }
            }
            flag = 0;
            while(/%([a-zA-Z_]+)\s*,/.test(ins)){
                const origin = /%([a-zA-Z_]+)\s*,/.exec(ins)[1];
                const target = lookup(ctx, origin);
                if(typeof target == 'number'){
                    if(flag == 0){ //use $at
                        cache.push(`    sw $at, ${target}($sp)`);
                        flag = 1;
                        ins = ins.replace(/%([a-zA-Z_]+)\s*,\s*/,`$at, `);
                    }
                    else if( flag == 1){
                        cache.push(`    sw $t9, ${target}($sp)`);
                        flag = 1;
                        ins = ins.replace(/%([a-zA-Z_]+)\s*,\s*/,`$t9, `);
                    }
                    else{
                        error(i, "too much marco");
                        return;
                    }
                }
                else{
                    ins = ins.replace(/%([a-zA-Z_]+)\s*,\s*/,`${target}, `);
                }
            }
            while(/\(\s*%([a-zA-Z_]+)\s*\)/.test(ins)){
                const origin = /\(\s*%([a-zA-Z_]+)\s*\)/.exec(ins)[1];
                const target = lookup(ctx, origin);
                if(typeof target == 'number'){
                    if(flag == 0){ //use $at
                        cache.push(`    sw $at, ${target}($sp)`);
                        flag = 1;
                        ins = ins.replace(/\(\s*%([a-zA-Z_]+)\s*\)/,`($at)`);
                    }
                    else if( flag == 1){
                        cache.push(`    sw $t9, ${target}($sp)`);
                        flag = 1;
                        ins = ins.replace(/\(\s*%([a-zA-Z_]+)\s*\)/,`($t9)`);
                    }
                    else{
                        error(i, "too much marco");
                        return;
                    }
                }
                else{
                    ins = ins.replace(/\(\s*%([a-zA-Z_]+)\s*\)/,`(${target})`);
                }
            }
            ctx.buffer.push(ins);
            for(let x of cache){
                ctx.buffer.push(x);
            }
        }
    }
    if(ctx.functionName != null)generateFunction(ctx);
    return ctx.result;
}
const optimize = require('./optim');
const data = preprocess(script, (i, text)=>console.log(`ERROR at ${i}: ${text}`));
let result = optimize.optimize(data);
//console.log(data.join('\n'));
//console.log('====');
console.log(result.join('\n'));