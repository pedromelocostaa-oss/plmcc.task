-- Add multi-link support and description field to purchases table
alter table purchases
  add column if not exists urls      jsonb   default '[]'::jsonb,
  add column if not exists description text  default null;
