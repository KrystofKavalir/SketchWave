-- Přidání typu 'draw' do enum v tabulce canvas_object
ALTER TABLE `canvas_object` 
MODIFY COLUMN `type` enum('rect','circle','line','text','image','draw') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
