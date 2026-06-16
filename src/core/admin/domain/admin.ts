export interface AdminOverview {
  cohorts: number;
  members: number;
  projects: number;
  completed: number;
  waitlist: number;
  value_cents: number;
  by_stage: Record<string, number>;
}

export interface AdminRecentProject {
  id: string;
  title: string;
  status: string;
  created_at: string;
  cohort_name: string;
  cohort_handle: string;
  participants: number;
  agreed_amount_cents: number | null;
  agreed_currency: string | null;
}

export interface AdminInactiveCohort {
  id: string;
  name: string;
  handle: string;
  last_activity_at: string;
  members: number;
}
