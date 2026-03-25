-- Run this query in your Supabase SQL Editor to pull your entire database schema.
-- You can copy the results or export them to CSV and share them with me so I can write perfect SQL for you.

SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM 
    information_schema.tables t
JOIN 
    information_schema.columns c ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name, c.ordinal_position;
