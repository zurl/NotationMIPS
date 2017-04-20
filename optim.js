
// unreachable code
// repeat label
// useless j
// useless move
// continuous optimiztion
function optimize(code){
    let result = [];
    const result2 = [];
    const replaceTable = {};
    let waste = 0;
    let onLabel = null;
    let jname = null;
    for(let i = 0; i < code.length; i++){
        if(/^\s*$/.test(code[i])){result.push(code[i]);continue;}
        if(/add\s/.test(code[i])){
            const tuple = 
            /add\s*([a-zA-Z0-9$_]*)\s*,\s*([a-zA-Z0-9$_]*)\s*,\s*([a-zA-Z0-9$_]*)/.exec(code[i]);
            //console.log(tuple);
            if(tuple[2] == '$zero'){
                if(tuple[3] == tuple[1])continue;
            }
            if(tuple[3] == '$zero'){
                if(tuple[2] == tuple[1])continue;
                continue;
            }
        }
        if(/^\s*j\s+/.test(code[i])){
            jname = /j\s*([a-zA-Z_$0-9]*)\s*/.exec(code[i])[1];
            result.push(code[i]);
            waste = 1;
            continue;
        }
        if(code[i].indexOf(':') != -1){
            waste = 0;
            const name = /\s*([a-zA-Z_$0-9]+)\s*:/.exec(code[i]);
            if(name[1] == jname)result.pop();
        }
        jname = null;
        if(waste != 1){
            result.push(code[i]);
        }
    }
    for(let i = 0; i < result.length; i++){
        if(result[i].indexOf(':') != -1){
            if(onLabel){
                const name = /\s*([a-zA-Z_$0-9]+)\s*:/.exec(result[i]);
                replaceTable[name] = onLabel;
                continue;
            }else{
                const name = /\s*([a-zA-Z_$0-9]+)\s*:/.exec(result[i]);
                onLabel = name[1];
                result2.push(result[i]);
            } 
        }else{
            onLabel = null;
            result2.push(result[i]);
        }
    }
    result = [];
    for(let i = 0; i < result2.length; i++){
        for(let key of Object.keys(replaceTable)){
            result2[i] = result2[i].replace(key, replaceTable[key]);
        }
        result.push(result2[i]);
    }
    return result;
}

exports.optimize = optimize;