// Configuration Supabase — Corbeau (même base que BS WOLD CASH)
const SUPABASE_URL = "https://xvdqxwuvdaubgmehszfd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZHF4d3V2ZGF1YmdtZWhzemZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NzYwNzksImV4cCI6MjEwMDU1MjA3OX0.WL_nhgdTJmG3Eh2LyKBTx_spVFZq3U_-DSQZP46yH9Q";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
