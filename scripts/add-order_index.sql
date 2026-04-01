-- Menambahkan kolom order_index ke tabel projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Optional: Update data yang sudah ada berurutan
-- WITH numbered_rows AS (
--     SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
--     FROM projects
-- )
-- UPDATE projects
-- SET order_index = numbered_rows.row_num
-- FROM numbered_rows
-- WHERE projects.id = numbered_rows.id;
