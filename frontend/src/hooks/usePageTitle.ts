import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export function usePageTitle(baseTitle: string) {
  const location = useLocation();

  useEffect(() => {
    let path = location.pathname === "/" ? "" : location.pathname;

    if (path.startsWith("/details")) {
      path = " / Details";
    } else if (path === "/dashboard") {
      path = " / Dashboard";
    } else {
      path = "";
    }

    document.title = baseTitle + path;
  }, [location, baseTitle]);
}
