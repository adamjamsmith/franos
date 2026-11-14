import { SubNav } from "@/components/sub-nav";

/** How it is going: the numbers against the target, and where visitors drop out of the form. */
export default async function NumbersLayout({ children, params }: LayoutProps<"/b/[slug]/numbers">) {
  const { slug } = await params;
  return (
    <div>
      <SubNav
        items={[
          { href: `/b/${slug}/numbers`, label: "Against target" },
          { href: `/b/${slug}/numbers/form`, label: "Form drop-off" },
        ]}
      />
      {children}
    </div>
  );
}
