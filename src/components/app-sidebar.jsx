import {
  AudioWaveform,
  Blocks,
  Command,
  Frame,
  GalleryVerticalEnd,
  Package,
  Settings2,
  ShoppingBag,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import Cookies from "js-cookie";
import { NavMainReport } from "./nav-main-report";
import { useState, useMemo } from "react";

const NAVIGATION_CONFIG = {
  COMMON: {
    DASHBOARD: {
      title: "Dashboard",
      url: "/home",
      icon: Frame,
      isActive: false,
    },
  },

  MODULES: {
    CHAPTER: {
      title: "Chapter",
      url: "/chapter",
      icon: Frame,
      isActive: false,
    },
    ALL_CHAPTER: {
      title: "All Chapter",
      url: "/allchapter",
      icon: Frame,
      isActive: false,
    },
    MASTER_SETTINGS: {
      title: "Master Settings",
      url: "#",
      isActive: false,
      icon: Settings2,
      items: [
        {
          title: "Chapters",
          url: "/master/chapter",
        },
        {
          title: "Viewer",
          url: "/master/viewer",
        },
        {
          title: "Sign Up",
          url: "/master/signup",
        },
      ],
    },

    MEMBERSHIP: {
      title: "MemberShip",
      url: "#",
      isActive: false,
      icon: ShoppingBag,
      items: [
        {
          title: "Dashboard",
          url: "/membership/dashboard",
        },
        {
          title: "Active Membership",
          url: "/membership/active",
        },
        {
          title: "InActive Membership",
          url: "/membership/inactive",
        },
      ],
    },

    DONOR: {
      title: "Donor",
      url: "#",
      isActive: false,
      icon: Package,
      items: [
        {
          title: "Donor List",
          url: "/donor/donors",
        },
        {
          title: "Duplicate",
          url: "/donor/duplicate",
        },
        {
          title: "No pan",
          url: "/donor/no-pan",
        },
      ],
    },

    RECEIPT: {
      title: "Receipt",
      url: "/receipt",
      isActive: false,
      icon: Package,
    },

    SCHOOL: {
      title: "School",
      url: "#",
      isActive: false,
      icon: Package,
      items: [
        {
          title: "School List",
          url: "/school/list",
        },
        {
          title: "School To Allot",
          url: "/school/to-allot",
        },
        {
          title: "School Alloted",
          url: "/school/alloted",
        },
        {
          title: "Repeated Donor",
          url: "/school/repeated",
        },
        {
          title: "School Closed",
          url: "/closed-school",
        },
      ],
    },
    PROMOTER: {
      title: "Promoter",
      url: "/promoter",
      isActive: false,
      icon: Package,
    },
    PANEL: {
      title: "Panel Condition",
      url: "/panel-condition",
      isActive: false,
      icon: Package,
    },
    EVENt: {
      title: "Event List",
      url: "/event-list",
      isActive: false,
      icon: Package,
    },
  },

  REPORTS: {
    SUMMARY: {
      title: "Summary",
      url: "#",
      isActive: false,
      icon: Settings2,
      items: [
        {
          title: "Donor",
          url: "/report/donor-summary",
        },
        {
          title: "Promoter",
          url: "/report/promoter-summary",
        },
        {
          title: "Receipt",
          url: "/report/receipt-summary",
        },
        {
          title: "Donation",
          url: "/report/donation-summary",
        },
        {
          title: "School",
          url: "/report/school-summary",
        },
        {
          title: "10DB Statement",
          url: "/report/10db-statement-summary",
        },
        {
          title: "Suspense",
          url: "/report/suspense-summary",
        },
        {
          title: "CPR",
          url: "/report/cpr-summary",
        },
      ],
    },

    DOWNLOADS: {
      title: "Downloads",
      url: "/download",
      icon: Blocks,
      isActive: false,
    },

    OTHER: {
      title: "Other",
      url: "#",
      isActive: false,
      icon: Package,
      items: [
        {
          title: "Faq",
          url: "/other/faq",
        },
        {
          title: "Team",
          url: "/other/team",
        },
        {
          title: "Notification",
          url: "/other/notification",
        },
      ],
    },

    SETTINGS: {
      title: "Settings",
      url: "/settings",
      icon: Blocks,
      isActive: false,
    },
    FOLDER: {
      title: "Folder",
      url: "/folder",
      icon: Blocks,
      isActive: false,
    },
    MULTIALLOTMENT: {
      title: "Multi-Allotment",
      url: "/multi-allotment",
      icon: Blocks,
      isActive: false,
    },
    WRONGALLOTMENT: {
      title: "Wrong-Allotment",
      url: "/wrong-allotment",
      icon: Blocks,
      isActive: false,
    },
    BANNER_REPORT: {
      title: "Banner Report",
      url: "/banner-report",
      isActive: false,
      icon: Package,
    },
    PROMOTERDASHBOARD: {
      title: "Promoter Dashboard",
      url: "/dashboard-promoter",
      isActive: false,
      icon: Package,
    },
    RECEIPT_ZERO: {
      title: "Recepit-S",
      url: "/recepit/zero-list",
      icon: Blocks,
      isActive: false,
    },

    RECEIPT_CHANGE_DONOR: {
      title: "C-Recepit-Donor",
      url: "/recepit/change-donor",
      icon: Blocks,
      isActive: false,
    },

    RECEIPT_MULTIPLE: {
      title: "M-Recepit",
      url: "/recepit/multiple-list",
      icon: Blocks,
      isActive: false,
    },
  },
};

const USER_ROLE_PERMISSIONS = {
  1: {
    navMain: [
      "DASHBOARD",
      "MEMBERSHIP",
      "DONOR",
      "RECEIPT",
      "SCHOOL",

      "PROMOTER",
      "EVENt",
    ],
    navMainReport: ["SUMMARY", "DOWNLOADS", "OTHER", "SETTINGS"],
  },

  2: {
    navMain: [
      "DASHBOARD",
      "CHAPTER",

      "MEMBERSHIP",
      "DONOR",
      "RECEIPT",

      "SCHOOL",
      "PROMOTER",
      "EVENt",
    ],
    navMainReport: ["SUMMARY", "DOWNLOADS", "OTHER", "SETTINGS"],
  },

  3: {
    navMain: [
      "DASHBOARD",
      "MASTER_SETTINGS",
      "MEMBERSHIP",
      "DONOR",
      "RECEIPT",
      "SCHOOL",
      "PROMOTER",
      "EVENt",
    ],
    navMainReport: ["SUMMARY", "DOWNLOADS", "OTHER", "SETTINGS"],
  },

  4: {
    navMain: [
      "DASHBOARD",
      "MEMBERSHIP",
      "DONOR",
      "RECEIPT",
      "SCHOOL",
      "PROMOTER",
      "EVENt",
    ],
    navMainReport: ["SUMMARY", "DOWNLOADS", "OTHER", "SETTINGS"],
  },

  5: {
    navMain: [
      "DASHBOARD",
      "CHAPTER",
      "ALL_CHAPTER",
      "PROMOTER",
      "PANEL",
      "EVENt",
      "RECEIPT",
    ],
    navMainReport: [
      "SETTINGS",
      "RECEIPT_ZERO",
      "RECEIPT_CHANGE_DONOR",
      "RECEIPT_MULTIPLE",
      "FOLDER",
      "MULTIALLOTMENT",
      "WRONGALLOTMENT",
      "BANNER_REPORT",
      "PROMOTERDASHBOARD",
    ],
  },
};

const LIMITED_MASTER_SETTINGS = {
  title: "Master Settings",
  url: "#",
  isActive: false,
  icon: Settings2,
  items: [
    {
      title: "Chapters",
      url: "/master/chapter",
    },
  ],
};

const useNavigationData = (userType) => {
  return useMemo(() => {
    const permissions =
      USER_ROLE_PERMISSIONS[userType] || USER_ROLE_PERMISSIONS[1];

    const buildNavItems = (permissionKeys, config, customItems = {}) => {
      return permissionKeys
        .map((key) => {
          if (key === "MASTER_SETTINGS_LIMITED") {
            return LIMITED_MASTER_SETTINGS;
          }
          return config[key];
        })
        .filter(Boolean);
    };

    const navMain = buildNavItems(
      permissions.navMain,
      { ...NAVIGATION_CONFIG.COMMON, ...NAVIGATION_CONFIG.MODULES },
      { MASTER_SETTINGS_LIMITED: LIMITED_MASTER_SETTINGS },
    );

    const navMainReport = buildNavItems(
      permissions.navMainReport,
      NAVIGATION_CONFIG.REPORTS,
    );

    return { navMain, navMainReport };
  }, [userType]);
};

const TEAMS_CONFIG = [
  {
    name: "FTS CHAMP",
    logo: GalleryVerticalEnd,
    plan: "",
  },
  {
    name: "Acme Corp.",
    logo: AudioWaveform,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: Command,
    plan: "Free",
  },
];

export function AppSidebar({ ...props }) {
  const nameL = Cookies.get("name");
  const emailL = Cookies.get("email");
  const userType = Cookies.get("user_type_id") || "1";
  const [openItem, setOpenItem] = useState(null);

  const { navMain, navMainReport } = useNavigationData(userType);

  const initialData = {
    user: {
      name: nameL || "User",
      email: emailL || "user@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: TEAMS_CONFIG,
    navMain,
    navMainReport,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={initialData.teams} />
      </SidebarHeader>
      <SidebarContent className="sidebar-content">
        <NavMain
          items={initialData.navMain}
          openItem={openItem}
          setOpenItem={setOpenItem}
        />
        <NavMainReport
          items={initialData.navMainReport}
          openItem={openItem}
          setOpenItem={setOpenItem}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={initialData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { NAVIGATION_CONFIG, USER_ROLE_PERMISSIONS };
