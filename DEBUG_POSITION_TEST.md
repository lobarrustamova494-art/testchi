# 🔍 POZITSIYA DEBUGGING TEST

## MUAMMO:
Qog'ozda B belgilangan, lekin AI A deb o'qiyapti

## DEBUGGING SAVOLLARI:

### 1. AI qaysi pozitsiyani marked deb ko'ryapti?
- Agar AI 1-pozitsiyani marked deb ko'rsa → A javob beradi (XATO)
- Agar AI 2-pozitsiyani marked deb ko'rsa → B javob beradi (TO'G'RI)

### 2. Pozitsiya counting xatosi:
```
Noto'g'ri: O'ngdan chapga sanash
[D] [C] [B] [A] ← XATO

To'g'ri: Chapdan o'ngga sanash  
[A] [B] [C] [D] ← TO'G'RI
```

### 3. Visual misalignment:
- AI rasm orientatsiyasini noto'g'ri tushunayotgan bo'lishi mumkin
- Chapni o'ng, o'ngni chap deb hisoblamoqda

## DEBUGGING STEPS:

### Step 1: Position verification
```json
{
  "markedPosition": 2,
  "positionCheck": "Pos1=clear, Pos2=marked, Pos3=clear, Pos4=clear"
}
```

### Step 2: Left-to-right confirmation
```
[CLEAR] [MARKED] [CLEAR] [CLEAR]
   ↑        ↑        ↑        ↑
 POS-1    POS-2    POS-3    POS-4
   A        B        C        D
```

### Step 3: Answer verification
- Position 2 marked → Answer should be "B"
- If AI says "A", position counting is wrong

## EXPECTED OUTPUT:
```json
{
  "question": 1,
  "marked": "B",
  "markedPosition": 2,
  "reasoning": "Position 2 (second from left) has hidden letter",
  "positionCheck": "Left to right: Pos1=clear, Pos2=marked, Pos3=clear, Pos4=clear"
}
```

## TEST QILISH:
1. Rasmni AI ga yuborib, debugging output ni ko'ring
2. `markedPosition` qiymatini tekshiring
3. Agar `markedPosition: 1` bo'lsa, pozitsiya xatosi bor
4. Agar `markedPosition: 2` bo'lsa, lekin javob "A" bo'lsa, mapping xatosi bor