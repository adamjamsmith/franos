-- Linked calendars. The everyday role (franos_app) is given nothing on user_calendars: not the sealed
-- address, not whose calendar it is. This function hands the booking pages busy times only.
--   hosts = 'owners'      : the owners' calendars. Recording sessions are hosted by the owner.
--   hosts = 'consultants' : the calendars of this brand's consultants, who take its lead calls.
--                           A brand with no consultant falls back to the owners, who take the calls instead.
REVOKE ALL ON user_calendars FROM franos_app;
--> statement-breakpoint
CREATE FUNCTION calendar_busy_times(hosts text) RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT (b ->> 's')::timestamptz, (b ->> 'e')::timestamptz
    FROM user_calendars c
    JOIN users u ON u.id = c.user_id
    CROSS JOIN LATERAL jsonb_array_elements(c.busy) AS b
    WHERE CASE
      WHEN hosts = 'consultants' AND EXISTS (SELECT 1 FROM memberships m WHERE m.client_id = app_client_id() AND m.role = 'consultant')
        THEN EXISTS (SELECT 1 FROM memberships m WHERE m.client_id = app_client_id() AND m.role = 'consultant' AND m.user_id = c.user_id)
      ELSE u.is_owner
    END
  $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION calendar_busy_times(text) TO franos_app;
