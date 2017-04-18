Notation MIPS Preprocessor
==========================

## example

```
@function max(u, k)
@treg i, pui, ui
    lw $v0, 0(%u)
    addi %i, $zero, 1
    @while(i < k)
        add %pui, %u, %i
        lw %ui, 0(%pui)
        @if(ui > $v0)
            add $v0, %ui, $zero
        @endif
        addi %i, %i, 1
    @endwhile
```

## After Preprocess

```
max :
    addi $sp, $sp, -12
    sw $ra, 0($sp)
    lw $v0, 0($a0)
    addi $s0, $zero, 1
max_head_1:
    slt $ra, $s0, $a0
    beq $ra, $zero, max_flow_1
    add $s1, $a0, $s0
    lw $s2, 0($s1)
    slt $ra, $v0, $s2
    beq $ra, $zero, max_flow_2
    add $v0, $s2, $zero
max_flow_2:
    addi $s0, $s0, 1
    j max_head_1
max_flow_1:
    
max_end :
    lw $ra, 0($sp)
    addi $sp, $sp, 12
    jr $ra
```
