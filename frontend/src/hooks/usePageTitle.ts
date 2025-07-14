import { useLocation } from "react-router-dom";
import { useEffect } from "react";

// This iteration is not mandatory, just a nice-to-have feature on the frontend
export function usePageTitle(baseTitle: string) {
  // Assign the location variable to the value returned by the useLocation hook
  // This way, you can get the pathname value from it
  const location = useLocation();

  useEffect(() => {
    // Automatically change the document title based on the pathname
    let path = location.pathname === "/" ? "" : location.pathname;

    if (path.startsWith("/analyses")) {
      path = " / Details";
    } else if (path === "/dashboard") {
      path = " / Dashboard";
    } else {
      path = "";
    }

    // Re-run the useEffect whenever location or baseTitle changes
    document.title = baseTitle + path;
  }, [location, baseTitle]);
}
