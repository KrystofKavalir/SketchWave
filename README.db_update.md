# Aktualizace databáze - ukládání kreslení a textu

## Změny v databázi

Byla přidána podpora pro ukládání volného kreslení a textu do tabulky `canvas_object`.

### Úprava ENUM v tabulce canvas_object

Do sloupce `type` byla přidána hodnota `'draw'` pro volné kreslení.

## Spuštění aktualizace

### Pokud používáte Docker:

1. Připojte se k databázovému kontejneru:
```bash
docker exec -it sketchwave-db-1 mysql -u root -p sketchwave
```

2. Spusťte SQL příkaz:
```sql
ALTER TABLE `canvas_object` 
MODIFY COLUMN `type` enum('rect','circle','line','text','image','draw') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
```

3. Ověřte změnu:
```sql
DESCRIBE canvas_object;
```

### Nebo použijte připravený soubor:

```bash
docker exec -i sketchwave-db-1 mysql -u root -p sketchwave < db_update.sql
```

## Jak to funguje

### 1. Volné kreslení (type = 'draw')
- Body jsou uloženy jako JSON pole v poli `content`
- Formát: `{"points": [{"x": 10, "y": 20}, ...], "lineWidth": 4}`
- Pole `x`, `y`, `width`, `height` zůstávají NULL

### 2. Text (type = 'text')
- Text a velikost písma jsou uloženy jako JSON v poli `content`
- Formát: `{"text": "Můj text", "fontSize": 24}`
- Pole `x`, `y` obsahují pozici textu
- Pole `color` obsahuje barvu textu

### 3. Tvary (rect, circle, line)
- Geometry v polích `x`, `y`, `width`, `height`
- Barva v poli `color`
- Pole `content` zůstává NULL

## Co se změnilo v kódu

1. **sketchpad.js**:
   - `pointerUp()` nyní trackuje volné kreslení s `lineWidth`
   - `createTextInput()` ukládá text do `canvasObjects` s `fontSize` a `content`

2. **server.js**:
   - Endpoint `/board/save-full` správně serializuje:
     - Body kreslení jako `{points: [...], lineWidth: ...}` do `content`
     - Text jako `{text: "...", fontSize: ...}` do `content`

## Test funkčnosti

Po aktualizaci databáze:
1. Nakreslete něco volnou rukou
2. Přidejte nějaký text
3. Přidejte nějaký tvar (obdélník, kruh, čára)
4. Zadejte název tabule a klikněte "Uložit tabuli"
5. Zkontrolujte v databázi tabulku `canvas_object` - měly by tam být všechny tři typy objektů
