import { NavigationMenu, type NavigationMenuItem } from "@/components/ouro/navigation-menu/navigation-menu";

/** The desktop middle of the header: the site's sections, with Tools as a dropdown. */
export default function NavMenu({
  links,
  tools,
  currentPath,
}: {
  links: { href: string; label: string }[];
  tools: { href: string; label: string }[];
  currentPath: string;
}) {
  const items: NavigationMenuItem[] = [
    { label: "Tools", links: tools },
    ...links.map((l) => ({ label: l.label, href: l.href })),
  ];
  return <NavigationMenu label="Sections" items={items} currentPath={currentPath} />;
}
