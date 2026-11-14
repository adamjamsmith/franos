import { SubNav } from "@/components/sub-nav";

/** Everything that is set once and left: the brand, its pages, calls, emails and who can log in. */
export default async function SettingsLayout({ children, params }: LayoutProps<"/b/[slug]/settings">) {
  const { slug } = await params;
  return (
    <div>
      <SubNav
        items={[
          { href: `/b/${slug}/settings`, label: "Brand and pages" },
          { href: `/b/${slug}/settings/calls`, label: "Calls" },
          { href: `/b/${slug}/settings/emails`, label: "Emails" },
          { href: `/b/${slug}/settings/people`, label: "People" },
        ]}
      />
      {children}
    </div>
  );
}
