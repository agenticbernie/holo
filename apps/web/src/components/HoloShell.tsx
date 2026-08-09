import { AppShell } from "@astryxdesign/core/AppShell";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { defineTheme, Theme } from "@astryxdesign/core/theme";
import {
  ArrowTrendingUpIcon,
  CircleStackIcon,
  HomeIcon,
  MegaphoneIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import logoUrl from "../assets/logo.png";

const holoTheme = defineTheme({
  name: "holo-runway",
  tokens: {
    "--color-accent": ["#5111FB", "#8F7BFF"],
    "--color-background-body": ["#F5F7FF", "#080B24"],
    "--color-background-surface": ["#FFFFFF", "#111637"],
    "--color-background-card": ["#FFFFFF", "#151B43"],
    "--color-text-primary": ["#040935", "#F4F6FF"],
    "--color-text-secondary": ["#596080", "#B8C0E4"],
    "--color-border": ["#D8DDF3", "#3D4677"],
    "--radius-container": "16px",
  },
});

const navItems = [
  { label: "Tổng quan", href: "/", icon: HomeIcon },
  { label: "Sản phẩm", href: "/products", icon: Square3Stack3DIcon },
  { label: "KOC", href: "/kocs", icon: UserGroupIcon },
  { label: "Chiến dịch", href: "/campaigns", icon: MegaphoneIcon },
  { label: "Đề xuất", href: "/recommendations", icon: ArrowTrendingUpIcon },
  { label: "Bộ dữ liệu", href: "/datasets", icon: CircleStackIcon },
];

interface Props {
  currentPath: string;
  children: ReactNode;
}

const navigation = (currentPath: string) => (
  <SideNav
    header={
      <a className="holo-brand" href="/" aria-label="Holo — Tổng quan">
        <img src={logoUrl.src} alt="Holo" />
      </a>
    }
  >
    <SideNavSection title="Workspace" isHeaderHidden>
      {navItems.map((item) => (
        <SideNavItem
          key={item.href}
          label={item.label}
          icon={item.icon}
          href={item.href}
          isSelected={
            currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href))
          }
        />
      ))}
    </SideNavSection>
    <SideNavSection title="Signal">
      <SideNavItem
        label="API trực tiếp"
        icon={SparklesIcon}
        href="https://holo-api.hackonteam.workers.dev/docs"
      />
    </SideNavSection>
  </SideNav>
);

export default function HoloShell({ currentPath, children }: Props) {
  const sideNav = navigation(currentPath);
  return (
    <Theme theme={holoTheme} mode="light">
      <AppShell
        contentPadding={0}
        height="fill"
        variant="elevated"
        sideNav={sideNav}
        mobileNav={{ hasToggle: true, content: sideNav }}
        style={{ minHeight: "100dvh" }}
      >
        {children}
      </AppShell>
    </Theme>
  );
}
