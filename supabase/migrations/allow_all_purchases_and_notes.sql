-- Allow public access to purchases and notes (matching pattern of tasks/bookmarks)
create policy "Allow all" on purchases for all to public using (true) with check (true);
create policy "Allow all" on notes for all to public using (true) with check (true);
