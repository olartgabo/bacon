/**
 * The seven context domains from olympus/context.md. Structured content
 * per domain (contacts, deadlines, open loops) is stage-2+ work — see
 * docs/web-dashboard-stack.md — so for now a space is a landing tile,
 * not a populated page.
 */
export type Space = {
  slug: string;
  label: string;
  note: string;
};

export const SPACES: Space[] = [
  { slug: "work", label: "Work", note: "MCPJam" },
  { slug: "university", label: "University", note: "coursework" },
  { slug: "aws", label: "AWS", note: "ownership, infra" },
  {
    slug: "student-community-day",
    label: "Student Community Day",
    note: "event",
  },
  { slug: "quantum", label: "Quantum", note: "research" },
  { slug: "personal", label: "Personal", note: "life" },
  { slug: "projects", label: "Projects", note: "olympus + side work" },
];
