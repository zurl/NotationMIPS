
// unreach code
// repeat label

function optimize(code){
    const result = [];
    const replaceTable = {};
    let waste = 0;
    let onLabel = null;
    for(let i = 0; i < code.length; i++){
        if(/^\s*$/.test(code[i])){result.push(code[i]);continue;}
        if(/^\s*j\s*/.test(code[i])){
            result.push(code[i]);
            waste = 1;
            onLabel = null;
            continue;
        }
        if(code[i].indexOf(':') != -1){
            waste = 0;
            if(onLabel){
                const name = /\s*(.*)\s*:/.exec(code[i]);
                replaceTable[name] = onLabel;
                continue;
            }else{
                const name = /\s*(.*)\s*:/.exec(code[i]);
                onLabel = name[1];
                //console.log('a '+onLabel);
            } 
        }else{
            onLabel = null;
        }
        if(waste != 1){
            result.push(code[i]);
        }
    }
    for(let i = 0; i < result.length; i++){
        for(let key of Object.keys(replaceTable)){
            result[i] = result[i].replace(key, replaceTable[key]);
        }
    }
    return result;
}

exports.optimize = optimize;