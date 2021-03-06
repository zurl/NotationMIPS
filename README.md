Notation MIPS Preprocessor
==========================

using notation to accelerate the coding of MIPS Assembly

## Example

```
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
```

## After Preprocess

```
max :
    addi $sp, $sp, -12
    sw $ra, 0($sp)
    lw $v0, 0($a0)
    addi $t0, $zero, 1
max_head_1:
    slt $ra, $t0, $a1
    beq $ra, $zero, max_end_1
    sll $t1, $t0, 2
    add $t1, $t1, $a0
    lw $t2, 0($t1)
    slt $ra, $v0, $t2
    beq $ra, $zero, max_flow_2
    add $v0, $t2, $zero
max_flow_2:
    j max_head_1
max_end_1:
    lw $ra, 0($sp)
    addi $sp, $sp, 12
    jr $ra

strlen :
    addi $sp, $sp, -8
    sw $ra, 0($sp)
    addi $v0, $zero, $zero
strlen_loop:
    sll $t0, $v0, 2
    add $t0, $a0, $t0
    lw $t1, 0($t0)
    bne $t1, $zero, strlen_loop
strlen_end :
    lw $ra, 0($sp)
    addi $sp, $sp, 8
    jr $ra

sum :
    addi $sp, $sp, -12
    sw $ra, 0($sp)
    lw $v0, 0($a0)
    addi $t0, $zero, 1
sum_head_1:
    slt $ra, $t0, $a1
    beq $ra, $zero, sum_end_1
    sll $t1, $t0, 2
    add $t1, $t1, $a0
    lw $t2, 0($t1)
    add $v0, $t2, $v0
    j sum_head_1
sum_end_1:
    lw $ra, 0($sp)
    addi $sp, $sp, 12
    jr $ra

mmax :
    addi $sp, $sp, -12
    sw $ra, 0($sp)
    jal max
    addi $t0, $zero, 0
mmax_head_1:
    slt $ra, $t0, $a1
    beq $ra, $zero, mmax_end_1
    sll $t1, $t0, 2
    add $t1, $t1, $a0
    sw $v0, 0($t1)
    j mmax_head_1
mmax_end_1:
    lw $ra, 0($sp)
    addi $sp, $sp, 12
    jr $ra
```

## Notations

### `@function` and `@return`

Define a funtion like C function, it will own stack space, and can be called.  
Parameters are supported under MIPS call standard($a0->$a3, and stack).  

Function cannot be explicitly terminated semantically, only before another function start,  
the former function will be terminated semantically.  

```
@function self(a)
@return a
``` 

### `@call`

call a function, function do not need to be defined previously.

```
@function main(a)
    @call self(1)
@function self(a)
@return a
```

### `@sreg`, `@treg` and `@local`

Declare some local variable on register or stack, sreg means `$s0`-`$s7`, treg means,  
`$t0`-`$t9`, local means stack variables.

```
@function self(a)
@sreg a,b,c
@treg i,j,k
@local cnt
``` 

### `@alias`

name replacement, like `#define` in c
```
@function self(a)
@alias ret $v0
    addi %ret, $zero, 1
``` 

### `@if`, `@else` and `@endif`

Condition control flow. like C-if.

> if only support `single` comparation expression like a < b, constant are not supported

```
@function max(a,b)
@alias m $v0
@if(a > b)
    add %m, %a, $zero
@else
    add %m, %b, $zero
@endif
```
### `@while` and `@endwhile`

loop.  
```
@function domath(a, b)
@alias ret $v0
@treg i, iend
    @@(iend = 5)
    @while(i < iend)
        @@(ret = ret + 2 * a + 3 * (4 * b + a))
        @@(i = i + 1)
    @endwhile
```
### `@repeat` and `@endrepeat`

loop.  
```
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
```

### `@@`
Expression Generator ( Experimental )

generate a series of MIPS assembly with syntax like C-expression.  

> allows +, -, *, &, |, ^, <, >, =   
> allows deref(*) and subscript (a[1] / a[b])

inter-register mutilplition are not allowed cuurently,  
optimization is poor currently.  
```
@function domath(a, b)
@alias ret $v0
@treg i, iend
    @@(iend = 5)
    @while(i < iend)
        @@(ret = ret + 2 * a + 3 * (4 * b + a))
        @@(i = i + 1)
    @endwhile
    
```
