
function applyRegister(ctx){
    if(ctx.exptreg.length == 0){
        ctx.error(0, 'tvariable are not enough');
        return null;
    }
    const dst = ctx.exptreg.pop();
    ctx.exptregu[dst] = true;
    return dst;
}
function freeRegister(ctx, x){
    if(ctx.exptregu[x] == true){
        ctx.exptregu[x] = false;
        ctx.exptreg.push(x);
    }
}

function lookup(ctx, name){
    if(ctx.alias.hasOwnProperty(name))return ctx.alias[name];
    if(ctx.sregs.hasOwnProperty(name))return ctx.sregs[name];
    if(ctx.tregs.hasOwnProperty(name))return ctx.tregs[name];
    if(ctx.locals.hasOwnProperty(name))return ctx.locals[name];
    if(ctx.params.hasOwnProperty(name))return ctx.params[name];
    return null;
}

exports.freeRegister = freeRegister;
exports.lookup = lookup;
exports.applyRegister = applyRegister;