alter type public.core_exam_activity_action
  add value if not exists 'contribution_created';

alter type public.core_exam_activity_action
  add value if not exists 'contribution_updated';
