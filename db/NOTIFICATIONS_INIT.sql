-- Phase 18: In-App Notifications Schema
-- Automatically run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    related_entity_type TEXT,
    related_entity_id UUID
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy 3: Allow inserting notifications globally (for system alerts mapped by frontend)
CREATE POLICY "Anyone can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
