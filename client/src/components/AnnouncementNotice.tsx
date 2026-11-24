import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SiteAnnouncement } from "@shared/schema";

function getPreference(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("Could not read announcement preference from local storage.", error);
    return null;
  }
}

function setPreference(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch (error) {
    console.warn("Could not save announcement preference to local storage.", error);
  }
}

export default function AnnouncementNotice() {
  const { data: announcement, isError } = useQuery<SiteAnnouncement | null>({
    queryKey: ["/api/site-announcement"],
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const bannerRef = useRef<HTMLDivElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [dismissedRevision, setDismissedRevision] = useState<string | null>(null);
  const isDismissed = !!announcement && dismissedRevision === announcement.revision;

  useEffect(() => {
    if (!announcement) {
      setPopupOpen(false);
      setDismissedRevision(null);
      return;
    }

    const revision = announcement.revision;
    setDismissedRevision(
      getPreference(`ahs-announcement-banner-${revision}`) === "1" ? revision : null,
    );
    setPopupOpen(getPreference(`ahs-announcement-popup-${revision}`) !== "1");
  }, [announcement?.revision]);

  useEffect(() => {
    if (isError) {
      console.error("Could not load the site announcement.");
    }
  }, [isError]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const banner = isError && !announcement ? errorBannerRef.current : bannerRef.current;
    if (!banner || (isDismissed && !isError)) {
      root.style.setProperty("--site-announcement-height", "0px");
      return;
    }

    const updateHeight = () => {
      root.style.setProperty("--site-announcement-height", `${banner.getBoundingClientRect().height}px`);
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(banner);
    updateHeight();
    return () => {
      observer.disconnect();
      root.style.setProperty("--site-announcement-height", "0px");
    };
  }, [announcement?.revision, isDismissed, isError]);

  const dismissBanner = () => {
    if (!announcement) return;
    setPreference(`ahs-announcement-banner-${announcement.revision}`);
    setDismissedRevision(announcement.revision);
  };

  const closePopup = (open: boolean) => {
    setPopupOpen(open);
    if (!open && announcement) {
      setPreference(`ahs-announcement-popup-${announcement.revision}`);
    }
  };

  return (
    <>
      {announcement && !isDismissed && (
        <div
          ref={bannerRef}
          className="relative z-40 flex items-start gap-3 border-b border-primary/20 bg-primary px-4 py-2.5 text-primary-foreground shadow-sm"
          role="status"
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-medium">
            {announcement.message}
          </p>
          <button
            type="button"
            className="shrink-0 rounded p-1 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            onClick={dismissBanner}
            aria-label="Dismiss announcement banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {isError && !announcement && (
        <div ref={errorBannerRef} role="alert" className="relative z-40 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm">
          The site announcement could not be loaded.
        </div>
      )}
      <AlertDialog open={popupOpen && !!announcement} onOpenChange={closePopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Site announcement
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap break-words text-foreground">
              {announcement?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => closePopup(false)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
