"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Home, Upload, Images, Users, LogOut, ImageIcon } from "lucide-react";

interface SidebarProps {
  children: React.ReactNode;
}

export function AppSidebar({ children }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const userMenuItems = [
    {
      title: "Tổng Quan",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Upload Ảnh",
      url: "/upload",
      icon: Upload,
    },
    {
      title: "Ảnh Đã Upload",
      url: "/dashboard/images",
      icon: Images,
    },
  ];

  const adminMenuItems = [
    {
      title: "Tổng Quan",
      url: "/admin",
      icon: Home,
    },
    {
      title: "Upload Ảnh",
      url: "/upload",
      icon: Upload,
    },
    {
      title: "Quản Lí Image",
      url: "/admin/images",
      icon: Images,
    },
    {
      title: "Quản Lí User",
      url: "/admin/users",
      icon: Users,
    },
    // Removed quota tab per requirement
  ];

  const menuItems = user?.role === "admin" ? adminMenuItems : userMenuItems;
  const currentMenu = menuItems.find((item) => item.url === pathname);
  const currentTitle = currentMenu ? currentMenu.title : "";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Image System</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === "admin" ? "Admin" : "User"}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => router.push(item.url)}
                        isActive={pathname === item.url}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 items-center gap-2 border-b px-4 shrink-0">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{currentTitle}</h1>
            </div>
            <div className="text-sm text-muted-foreground truncate max-w-[40%]">
              {user?.email}
            </div>
          </header>
          <main className="flex-1 overflow-auto min-h-0">
            <div className="h-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
