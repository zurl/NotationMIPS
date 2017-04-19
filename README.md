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
