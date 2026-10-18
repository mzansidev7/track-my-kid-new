export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  user_id: string | null;
  sender_id: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  related_route_id: string | null;
  related_child_id: string | null;
  related_stop_id: string | null;
};
