// For the status badge UI, the Lucide React icon library was used — it’s lightweight and nice
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";

// Additionally, a switch-case condition was written to display the statuses: queued → running → done / error
const StatusBadge = ({ status }: { status: string | null }) => {
  // Classes like animate-pulse, animate-spin, animate-fade-in, and animate-shake are available thanks to the tailwindcss-animate plugin
  switch (status) {
    case "queued":
      return (
        <div className="flex items-center justify-center gap-1 text-xs px-2 py-[2px] bg-gray-100 text-gray-600 rounded-full animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          Queued
        </div>
      );
    case "running":
      return (
        <div className="flex items-center justify-center gap-1 text-xs px-2 py-[2px] bg-blue-100 text-blue-700 rounded-full">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Running
        </div>
      );
    case "done":
      return (
        <div className="flex items-center justify-center gap-1 text-xs px-2 py-[2px] bg-green-100 text-green-700 rounded-full animate-fade-in">
          <CheckCircle className="w-3.5 h-3.5" />
          Done
        </div>
      );
    case "error":
      return (
        <div className="flex items-center justify-center gap-1 text-xs px-2 py-[2px] bg-red-100 text-red-700 rounded-full animate-shake">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </div>
      );
    default:
      return null;
  }
};

export default StatusBadge;
