CREATE TABLE IF NOT EXISTS support_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  sujet text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own messages" ON support_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
