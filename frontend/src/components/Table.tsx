import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  PlusCircle,
  X,
  Trash2,
  RefreshCcw,
  SearchCode,
  Pause,
  Play,
} from "lucide-react";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../components/ui/command";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";

import { cn } from "../lib/utils";
import type { UrlData } from "../types/urlData";
import { Checkbox } from "./ui/checkbox";
import { API_URL } from "../constants/env";
import { useAuth } from "../context/AuthContext";
import useAxios from "../hooks/useAxios";
import { PopoverSort } from "./PopoverSort";
import { formatDateEU } from "../utils/dateFormatter";
import StatusBadge from "./StatusBadge";
import { PopoverClose } from "@radix-ui/react-popover";

// TableProps defines the required props for the Table component
// - urls: the list of URL data to be displayed : export interface => UrlData {
//   id: number;
//   user_id: number;
//   url: string;
//   status: UrlStatus;
//   should_pause: boolean;
//   title: string;
//   html_version: string;
//   heading_counts: any | null;
//   internal_links_count: number;
//   external_links_count: number;
//   has_login_form: boolean;
//   inaccessible_links_count: number;
//   inaccessible_links: any | null;
//   internal_links: any | null;
//   external_links: any | null;
//   created_at: string;
//   updated_at: string;
// }
// - selectedUrls: the currently selected URLs with their statuses => SelectedUrl {
//   id: number;
//   url: string;
//   status: UrlStatus;
//   should_pause: boolean;
// }
// - fetchProfile: function to refetch profile or URL list from the server /profile route
// - giveTogglePayload: prop is used to pass the active URL checks from the Table component to its parent, the Dashboard

interface TableProps {
  urls: UrlData[];
  fetchProfile: () => void;
  giveTogglePayload: (
    payload: Partial<{
      id: number | null;
      shouldPause: boolean;
      data: any;
      url: string;
      status: string;
    }>
  ) => void;
}

// Table SortOrder url data type definition asc or desc
type SortOrder = "asc" | "desc";

const Table: React.FC<TableProps> = ({
  urls,
  fetchProfile,
  giveTogglePayload,
}) => {
  const { getToken } = useAuth();
  const { fetchData } = useAxios();
  // The table has pagination, so by default it shows details for 10 items — this may change later as it’s meant to be adjustable, up to 50
  const [ITEMS_PER_PAGE, setITEMS_PER_PAGE] = useState<number>(10);

  // Status filtering is handled through the filter state
  const [popoverStatusFilter, setPopoverStatusFilter] = useState<string[]>([
    "all",
  ]); // all, queued, running, done, error

  // The first page of the pagination, will be manipulated
  const [currentPage, setCurrentPage] = useState<number>(1);

  // This state is prepared for the global search box. The values entered into this state will be used globally to perform searches across the entire table based on certain conditions, and filter the table accordingly
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>("");

  // States to be used for column filtering
  // Variable holding the filtering state for the ID column
  const [idFilter, setIdFilter] = useState<string>("");
  // Variable holding the filtering state for the Title column
  const [titleFilter, setTitleFilter] = useState<string>("");
  // Variable holding the filtering state for the Status column
  const [statusFilter, setStatusFilter] = useState<string>("");
  // Variable holding the filtering state for the HTML Version column
  const [htmlVersionFilter, setHtmlVersionFilter] = useState<string>("");

  // State that monitors changes made in the status filter
  const [selectedStatus, setSelectedStatus] = useState<Set<unknown>>(new Set());

  // To keep a record of the checked items across pages
  // example output: 1
  // {
  //   "1": { Page number
  //     "1094": true, The item with ID 1094 is checked (true)
  //     "1095": true, The item with ID 1094 is checked (true)
  //     "1096": true, The item with ID 1094 is checked (true)
  //     "1097": false, The item with ID 1094 is checked (false)
  //     "1098": true, ...
  //     "1099": true, ...
  //     "1100": false, The item with ID 1094 is checked (false)
  //     "1101": false, The item with ID 1094 is checked (false)
  //     "1102": true, The item with ID 1094 is checked (true)
  //     "1103": true ...
  //   },
  //   "2": { Page number
  //     "1104": false, The item with ID 1094 is checked (false)
  //     "1105": true, The item with ID 1094 is checked (true)
  //     "1106": false, The item with ID 1094 is checked (false)
  //     "1107": false, The item with ID 1094 is checked (false)
  //   }
  // }
  const [checkedItemsByPage, setCheckedItemsByPage] = useState<
    Record<number, Record<string, boolean>>
  >({});

  // If every item on the page is selected or not selected, keep it here as a boolean
  const [selectAll, setSelectAll] = useState<boolean>(false);

  // State that holds only the items checked within the currentPage
  const currentCheckedItems = checkedItemsByPage[currentPage] || {};

  // The sort field shows the ID column by default
  const [sortField, setSortField] = useState<string>("id");

  // State that manages the sort order value, it can take the type 'asc' or 'desc'
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // State that stores the items displayed on the table, with the following type:
  // type UrlStatus = "all" | "queued" | "running" | "done" | "error";
  // interface UrlData {
  //   id: number;
  //   user_id: number;
  //   url: string;
  //   status: UrlStatus;
  //   should_pause: boolean;
  //   title: string;
  //   html_version: string;
  //   heading_counts: any | null;
  //   internal_links_count: number;
  //   external_links_count: number;
  //   has_login_form: boolean;
  //   inaccessible_links_count: number;
  //   inaccessible_links: any | null;
  //   internal_links: any | null;
  //   external_links: any | null;
  //   created_at: string;
  //   updated_at: string;
  // }
  const [sortedData, setSortedData] = useState<UrlData[]>([]);

  // A state that holds the URLs for bulk analysis, meaning multiple URL analyses
  const [sendURLs, setToSendURLs] = useState<string[]>([]);

  // this shallow data copy, we get the entire set of URLs — whether they’re on page 1 or page 2. Although the sorted data only shows the active page, this state covers all items in the URL list

  // So, for example, if the sorted data on the current page shows 10 items with status “done,” we still know from this full state that there are actually 50 URLs with the “done” status overall

  // I use this to display the count (length) of each status in the UI’s status filter
  let shallowCopyDataToShow: UrlData[] = [
    ...(urls || []).map((item: any) => ({
      ...item,
      status: item.status,
    })),
  ];

  // State that I will set to manage filtering operations
  let dataToShow: UrlData[] = [];

  if (popoverStatusFilter.includes("all")) {
    // If the filter is set to 'all', meaning none of the statuses are selected, then set dataToShow equal to all URLs
    dataToShow = urls;
  } else {
    dataToShow = [];

    if (popoverStatusFilter.includes("Queued")) {
      // If the filter is 'queued', then take only the URLs with status 'queued'
      const queuedURLs = urls.filter((item) => item.status === "queued");
      dataToShow = [...dataToShow, ...queuedURLs];
    }

    if (popoverStatusFilter.includes("Running")) {
      // If the filter is 'running', then take only the URLs with status 'running'
      const runningURLs = urls.filter((item) => item.status === "running");
      dataToShow = [...dataToShow, ...runningURLs];
    }

    if (popoverStatusFilter.includes("Done")) {
      // If the filter is 'done', then take only the URLs with status 'done'
      const doneURLs = urls.filter((item) => item.status === "done");
      dataToShow = [...dataToShow, ...doneURLs];
    }

    if (popoverStatusFilter.includes("Error")) {
      // If the filter is 'error', then take only the URLs with status 'error'
      const errorURLs = urls.filter((item) => item.status === "error");
      dataToShow = [...dataToShow, ...errorURLs];
    }
  }

  // handleFilterChange function needed for managing popover status filter
  const handleFilterChange = (option: string) => {
    setPopoverStatusFilter((prevState) => {
      // If the previous state is 'all'
      if (prevState.includes("all")) {
        // Remove "all" and replace it with the newly selected option
        // This means if "all" was selected, now only the new specific option remains active
        return [...prevState.filter((item) => item !== "all"), option];
        // 2. If the previous state already includes the selected option:
      } else if (prevState.includes(option)) {
        // Remove that option (deselect the filter)
        const filteredArr = [...prevState.filter((item) => item !== option)];

        // If no filters remain after removal, revert to ["all"] (meaning all filters active)
        const newArr = !filteredArr.length ? ["all"] : filteredArr;

        return newArr;
        // 3. If the selected option is not in previous state:
      } else {
        // Extra check if the option exists (redundant here but safe)
        if (prevState.includes(option)) {
          return prevState;
        }
        // Otherwise, add the new option to the filters
        return [...prevState, option];
      }
    });
    setCurrentPage(1);
    setGlobalSearchTerm("");
  };

  // After filtering, the dataShow variable now contains only the selected URL values, to make it clearer, create a filteredData variable and set dataToShow to it using the filtered data
  const filteredData: UrlData[] = dataToShow.filter((item) => {
    // For the global search input, I based it on the id, title, html_version, and status fields. These can, of course, change — increase or decrease — over time
    // If there is any match in the global search term from any of the fields: id, title, html_version, or status
    const globalMatch =
      // 1- Make sure the fields are of type string
      // 2- Make sure they are in lowercase
      // 3- And make sure these values are contained within the global search term
      // 4- And make sure the global search term coming from the input is also in lowercase
      item.id
        .toString()
        .toLowerCase()
        .includes(globalSearchTerm.toLowerCase()) ||
      item.title?.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      item.html_version
        ?.toLowerCase()
        .includes(globalSearchTerm.toLowerCase()) ||
      item.status?.toLowerCase().includes(globalSearchTerm.toLowerCase());

    // If the id matches
    const matchesId = item.id
      .toString()
      .toLowerCase()
      .includes(idFilter.toLowerCase());
    // If the title matches
    const matchesTitle = item.title
      ?.toLowerCase()
      .includes(titleFilter.toLowerCase());
    // If the html_version matches
    const matchesHtmlVersion = item.html_version
      ?.toLowerCase()
      .includes(htmlVersionFilter.toLowerCase());
    // If the status matches
    const matchesStatus = item.status
      ?.toLowerCase()
      .includes(statusFilter.toLowerCase());

    // Assign the global search term to a variable and use .trim() to remove all leading and trailing spaces and make sure this string is not empty
    const isGlobalSearchActive = globalSearchTerm.trim() !== "";

    // If isGlobalSearchActive is true
    return isGlobalSearchActive
      ? // return globalMatch true or false
        globalMatch
      : // Otherwise, check all of them; if all are true, return true; if any one is false, return false
        matchesId && matchesTitle && matchesHtmlVersion && matchesStatus;
  });

  // A function to handle input changes for filtering these columns: id, title, status, html_version, internal_links_count, external_links_count, created_at, and updated_at
  const handleSortChange = (field: string, order: SortOrder) => {
    // Change the sort field; for example, the input takes a field like updated_at
    setSortField(field);
    // and an order value such as asc or desc
    setSortOrder(order);
  };

  // Find the total number of pages. Use Math.ceil so that if the result is a decimal, it rounds up to the next integer. For example, 4.3 becomes 5
  // If there are a total of 15 filtered data items and 10 items are shown per page, then 15 divided by 10 equals 1.5. Using Math.ceil(1.5), the total number of pages becomes 2
  // This way, we can display ‘Page 1 of 2’ below the table in the UI
  // 1- we can set the disabled styles for the pagination buttons like this
  // 2- we can keep page changes under control
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // This function enables navigation to the first page, last page, previous page, and next page
  const handlePageChange = (newPage: number) => {
    // If the page number is less than 1 (could be 0 or negative), or if the entered value is greater than the total number of pages, stop the function execution
    if (newPage < 1 || newPage > totalPages) return;
    // Otherwise, update the current page state
    setCurrentPage(newPage);
  };

  // useMemo was used for performance optimization
  // const paginatedData = useMemo(() => {
  //   return filteredData.slice(
  //     (currentPage - 1) * ITEMS_PER_PAGE,
  //     currentPage * ITEMS_PER_PAGE
  //   );
  // }, [filteredData, currentPage]);

  // Show only the items belonging to the current page in the table
  // If currentPage is 3, the first parameter of slice will be (3 - 1) * ITEMS_PER_PAGE,
  // which is 2 * 20 = 40 (assuming ITEMS_PER_PAGE is 20).
  // The second parameter will be currentPage * ITEMS_PER_PAGE, which is 3 * 20 = 60.
  // So slice(40, 60) is called, which returns items from index 40 up to (but not including) index 60.
  // In other words, it returns the items with indices 40 through 59.
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    // If all the checkboxes on the active page are checked
    const allChecked =
      paginatedData.length > 0 &&
      paginatedData.every((item) => currentCheckedItems[item.id]);

    // set all selected states to this boolean value: true or false
    // so I can set the checked status of the checkbox next to the ID
    setSelectAll(allChecked);
  }, [currentPage]);

  // Select all checkboxes on the current page
  const handleSelectAll = (checked: boolean) => {
    const newCheckedItems: Record<string, boolean> = {};
    paginatedData.forEach((item) => {
      newCheckedItems[item.id] = checked;
    });

    setCheckedItemsByPage((prev) => ({
      ...prev,
      [currentPage]: newCheckedItems,
    }));
    setSelectAll(checked);
  };

  // Individually check a specific item and add it to checkedItemsByPage
  const handleCheckItem = (id: number, checked: string | boolean) => {
    setCheckedItemsByPage((prev) => {
      const pageCheckedItems = prev[currentPage] || {};
      const newPageCheckedItems = { ...pageCheckedItems, [id]: checked };

      return {
        ...prev,
        [currentPage]: newPageCheckedItems,
      };
    });
  };

  // Delete all items that are currently selected (checked) on the current page
  const deleteSelected = async () => {
    const pageKey = currentPage;

    // 1. Check if there are any selected items on the current page; if none, shows an alert and exits
    if (!checkedItemsByPage[pageKey]) {
      alert("No items selected on this page.");
      return;
    }

    // 2. Extract the IDs of the selected items
    const selectedIds = Object.keys(checkedItemsByPage[pageKey])
      .filter((id) => checkedItemsByPage[pageKey][id])
      .map(Number);

    // 3. If no items are selected, alert the user and exit
    if (selectedIds.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    try {
      // 4. Send a DELETE request to the API with the selected IDs and include authorization token
      await fetchData({
        url: `${API_URL}/profile/urls`,
        method: "DELETE",
        data: { ids: selectedIds },
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      // 5. If successful, show a confirmation alert
      alert("Selected items have been deleted.");

      setSelectAll(false);
      // 6. Update the local state to remove the deleted items from the checked list for the current page
      setCheckedItemsByPage((prev) => {
        const updated = { ...prev };
        const currentPageItems = { ...updated[pageKey] };

        selectedIds.forEach((id) => {
          delete currentPageItems[id];
        });

        updated[pageKey] = currentPageItems;
        return updated;
      });

      // 7. Refresh the profile data to reflect the changes
      fetchProfile();
    } catch (error) {
      // 8. Handle any errors by logging and alerting the user
      console.error("Deletion failed:", error);
      alert("An error occurred while trying to delete the selected items.");
    }
  };

  // A function that deletes a specific row from the table
  const deleteUrlById = async (id: number) => {
    try {
      // Fetch data by sending a request to the analyses/id route using a hook from useAxios
      await fetchData({
        url: `${API_URL}/analyses/${id}`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      // If an individual row is successfully deleted, show an alert to the user
      alert("Selected url analysis have been deleted.");

      // Refresh the profile data to reflect the changes
      fetchProfile();
    } catch (error) {
      // Handle any errors by logging and alerting the user
      console.error("Deletion failed:", error);
      alert("An error occurred while trying to delete the selected url.");
    }
  };

  // A function that checks if any item in sortedData (the data displayed in the table) has changed
  // Performs a deep comparison to check if any item in sortedData has changed
  const isDataChanged = (prevData: UrlData[], newData: UrlData[]) => {
    if (prevData.length !== newData.length) return true;

    for (let i = 0; i < prevData.length; i++) {
      const prevItem = prevData[i];
      const newItem = newData[i];

      const keys = Object.keys(newItem) as (keyof UrlData)[];
      for (const key of keys) {
        if (prevItem[key] !== newItem[key]) {
          return true;
        }
      }
    }

    return false;
  };

  // The sorted variable performs ascending and descending sorting, and specifically handles time-based sorting for fields like created_at and updated_at
  const sorted = [...paginatedData]?.sort((a, b) => {
    const aValue = a[sortField as keyof UrlData];
    const bValue = b[sortField as keyof UrlData];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (
      sortField === "date" ||
      sortField === "createdAt" ||
      sortField === "created_at" ||
      sortField === "updatedAt" ||
      sortField === "updated_at"
    ) {
      return sortOrder === "asc"
        ? new Date(aValue).getTime() - new Date(bValue).getTime()
        : new Date(bValue).getTime() - new Date(aValue).getTime();
    }

    return sortOrder === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  // If there is a change in the data, the sorted variable updates accordingly and takes its new value
  if (isDataChanged(sortedData, sorted)) {
    setSortedData(sorted);
  }

  // With this function, you can stop a running URL analysis or restart a paused URL analysis
  const toggleShouldPause = async (id: number) => {
    // giveTogglePayload first collects all states at the beginning
    // This prop function allows me to send the operations I perform in my table one by one to the parent component Dashboard.tsx
    giveTogglePayload({
      id: null,
      shouldPause: false,
      data: null,
      url: "",
      status: "",
    });

    // First, I notify the Dashboard that I toggled this ID in my table. If this ID exists in selectedUrls within the Dashboard, it will be affected, and the Dashboard will know and be able to use this information
    giveTogglePayload({ id });

    try {
      // Toggle the should_pause field of this analysis within the analyses: if it’s false, set it to true; if it’s true, set it to false
      // The responsible route is /analyses/id/toggle_should_pause
      const data = await fetchData({
        url: `${API_URL}/analyses/${id}/toggle_should_pause`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      // To update the profile and receive the changes
      fetchProfile();

      // Expected JSON response output from the backend:
      //       {
      //   "message": "Pause state toggled successfully",
      //   "id": id,
      //   "should_pause": newPauseValue,
      //   "status": status,
      //   "url": url
      // }
      // Get the should_pause variable from the response data
      const shouldPause = data.should_pause;
      // and pass the should_pause state of this URL to the Dashboard
      giveTogglePayload({ shouldPause });

      // If the should_pause field is false, continue
      if (!shouldPause) {
        setTimeout(async () => {
          // Now, to change this URL analysis—which is back in the queue and toggled—to the running state, switch to the /running state
          const res = await fetchData({
            url: `${API_URL}/analyses/running`,
            method: "POST",
            data: {
              // The data should include id passed as an array, since the backend expects an array of IDs because we can set multiple IDs to running at the same time, in this case, it’s a single ID, but it still needs to be sent as an array
              ids: [id],
            },
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          });

          // Expected response from the backend is as follows:
          //           [{
          //   "id": id,
          //   "url": url,
          //   "status": running,
          //   "should_pause": false
          // }]
          // This will return an array of objects which may contain more than one item, but we know that the first element (at index 0) is the last URL that was set to the /running state
          // Send the data of this last analyzed running URL to the Dashboard as data
          giveTogglePayload({ data: res.data[0] });

          // To update the profile and receive the changes
          fetchProfile();
        }, 600);

        setTimeout(async () => {
          // After running, it’s time to get the result. However, during running, the user might have paused the analysis again, so additional checks are necessary
          const res = await fetchData({
            url: `${API_URL}/analyses/result`,
            method: "POST",
            data: {
              // The data should include id passed as an array, since the backend expects an array of IDs because we can set multiple IDs to running at the same time, in this case, it’s a single ID, but it still needs to be sent as an array
              ids: [id],
            },
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          });

          // Expected response from the backend is as follows:
          //  [{
          //   "id": id,
          //   "url": url,
          //   "status": status,
          //   "should_pause": shouldPause
          //   "result": result
          // }]
          // This will return an array of objects which may contain more than one item, but we know that the first element (at index 0) is the last URL that was set to the /running state
          // I take the url and status values from the incoming data
          const { url, status } = res.data[0];

          // Send the url and status of this last analyzed running URL to the Dashboard as data
          giveTogglePayload({ url, status });
          console.log("datas child:", url);
          console.log("datas child:", status);

          // To update the profile and receive the changes
          fetchProfile();
        }, 5000);
      }
    } catch (error) {
      console.error("error:", error);
    }
  };

  // This function is used to analyze multiple URLs or just one URL, but regardless of the length, it always sends the URLs inside an array
  const startBulkAnalysis = async (urls: string[]) => {
    setToSendURLs([]);
    setCheckedItemsByPage([]);
    setSelectAll(false);
    try {
      const res = await fetchData({
        url: `${API_URL}/analyses/create`,
        method: "POST",
        data: {
          // If the analysis is re-run individually from the actions section, the item will have a length and urls will be sent; otherwise, the sendURLs array is sent
          urls: urls.length ? urls : sendURLs,
        },
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      // The /analyses/create route returns both created and failed URLs
      // Created URLs include the new URLs that are being analyzed for the first time
      const created = res.data || [];
      // Failed URLs are usually URLs that have been analyzed before, and there’s no need to analyze them again
      const failed = res.failedURLs || [];

      // I’m setting both the new IDs of the created URLs and the IDs of the failed URLs from the created and failed variable
      const createdIds = created.map((item: any) => item.id);
      const failedIds = failed.map((item: any) => item.id);

      // Spread the IDs of both created and failed URLs into a single id array
      const ids = [...createdIds, ...failedIds];

      // To update the profile and receive the changes
      fetchProfile();

      setTimeout(async () => {
        // Put the received ID array into a queue for processing
        const res = await fetchData({
          url: `${API_URL}/analyses/queued`,
          method: "POST",
          data: {
            ids: ids,
          },
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        // To update the profile and receive the changes
        fetchProfile();

        console.log("data after adding to queues:", res.data);
      }, 300);

      setTimeout(async () => {
        // After adding to the queue, switch to the running status after a certain delay using setTimeout
        const res = await fetchData({
          url: `${API_URL}/analyses/running`,
          method: "POST",
          data: {
            ids: ids,
          },
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        // To update the profile and receive the changes
        fetchProfile();

        console.log("data after adding to running:", res.data);
      }, 1000);

      setTimeout(async () => {
        // To get the results after bulk analysis, send a request to the /analyses/result API route
        await fetchData({
          url: `${API_URL}/analyses/result`,
          method: "POST",
          data: {
            ids: ids,
          },
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        // To update the profile and receive the changes
        fetchProfile();
      }, 5000);
    } catch (error: any) {
      console.error("error:", error);
      setToSendURLs([]);
      setCheckedItemsByPage([]);
      setSelectAll(false);
    }
  };

  console.log("selected send urls:", sendURLs);

  return (
    <>
      <div className="mt-[60px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className=" inline-flex mb-6 items-center gap-x-2">
                <SearchCode
                  className="w-5 h-5 rounded-[4px] p-[2px] bg-[#e0e7ff] "
                  style={{
                    color: "#6366f1",
                  }}
                />
                <h2 className="m-0 p-0 font-semibold">URL Status Overview</h2>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>
                This table displays URLs with the following statuses:
                <br />
                <strong>all</strong>: All URLs
                <br />
                <strong>queued</strong>: URLs queued for running
                <br />
                <strong>running</strong>: URLs currently being processed
                <br />
                <strong>done</strong>: URLs for which running is complete
                <br />
                <strong>error</strong>: URLs where an error occurred during
                running
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="mb-6">
          <span
            style={{
              fontSize: "14px !important",
            }}
          >
            Summary of URL statuses and their meanings.
          </span>
        </div>

        <div className="flex items-center justify-between mb-[10px]">
          <div className="flex flex-1 items-center gap-x-2">
            <Input
              placeholder="Filter..."
              value={globalSearchTerm}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-[150px] lg:w-[250px] rounded-[4px]"
              style={{
                border: "1px solid rgba(0,0,0,0.1)",
                fontSize: "14px",
                backgroundColor: "transparent",
              }}
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed bg-transparent"
                >
                  <PlusCircle />
                  <span
                    style={{
                      fontSize: "14px",
                    }}
                  >
                    Status
                  </span>
                  {selectedStatus?.size > 0 && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal lg:hidden"
                      >
                        {selectedStatus.size}
                      </Badge>
                      <div className="hidden space-x-1 lg:flex">
                        {selectedStatus.size > 2 ? (
                          <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                          >
                            {selectedStatus.size} selected
                          </Badge>
                        ) : (
                          // options
                          ["Queued", "Running", "Done", "Error"]
                            .filter((option) => selectedStatus.has(option))
                            .map((option) => (
                              <Badge
                                variant="secondary"
                                key={option}
                                className="rounded-sm px-1 font-normal"
                              >
                                {option}
                              </Badge>
                            ))
                        )}
                      </div>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={"Status"}
                    style={{
                      fontSize: "14px",
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {
                        // options
                        ["Queued", "Running", "Done", "Error"].map((option) => {
                          const isSelected = selectedStatus.has(option);
                          return (
                            <CommandItem
                              key={option}
                              onSelect={() => {
                                setSelectedStatus((prev) => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(option)) {
                                    newSet.delete(option);
                                  } else {
                                    newSet.add(option);
                                  }
                                  return newSet;
                                });
                                handleFilterChange(option);
                              }}
                              style={{
                                fontSize: "14px",
                              }}
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <Check />
                              </div>
                              <span>{option}</span>

                              <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                {
                                  shallowCopyDataToShow.filter(
                                    (item) =>
                                      item.status === option.toLowerCase()
                                  ).length
                                }
                              </span>
                            </CommandItem>
                          );
                        })
                      }
                    </CommandGroup>

                    {selectedStatus.size > 0 && (
                      <>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setSelectedStatus(new Set());
                              setPopoverStatusFilter(["all"]);
                            }}
                            className="justify-center"
                          >
                            <span
                              style={{
                                fontSize: "14px",
                              }}
                            >
                              Clear filters
                            </span>
                          </CommandItem>
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedStatus.size > 0 && (
              <Button
                onClick={() => {
                  setSelectedStatus(new Set());
                  handleFilterChange("all");
                  setPopoverStatusFilter(["all"]);
                }}
                className="h-8 px-2 lg:px-3 bg-transparent outline-none border-0 shadow-none"
                variant="outline"
              >
                <span
                  style={{
                    fontSize: "14px",
                  }}
                >
                  Reset
                </span>
                <X />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-[4px]"
          style={{
            borderTop: "1px solid rgba(0,0,0,0.1)",
            borderLeft: "1px solid rgba(0,0,0,0.1)",
            borderRight: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead
                className="text-left"
                style={{
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <tr className="text-[14px]">
                  <th className="px-[12px] py-[6px]">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={(checked: boolean) => {
                        handleSelectAll(checked);
                        if (checked) {
                          const allUrls = sortedData.map((item) => item.url);
                          setToSendURLs(allUrls);
                        } else {
                          setToSendURLs([]);
                        }
                      }}
                    />
                  </th>

                  <th className="py-[6px]">
                    <PopoverSort
                      label="ID"
                      field="id"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="Title"
                      field="title"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="Status"
                      field="status"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="HTML Version"
                      field="html_version"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="#Internal Links"
                      field="internal_links_count"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="#External Links"
                      field="external_links_count"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="Created At"
                      field="created_at"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="py-[6px]">
                    <PopoverSort
                      label="Updated At"
                      field="updated_at"
                      onSortChange={handleSortChange}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                    />
                  </th>
                  <th className="px-[12px] py-[6px]">
                    <div className="flex items-center"></div>
                  </th>
                </tr>
                <tr className="text-[14px]">
                  <th className="px-[12px] py-[6px]"></th>
                  <th className="px-[12px] py-[6px]">
                    <Input
                      placeholder="Filter by ID"
                      className="h-8 rounded-[4px] font-medium"
                      style={{
                        border: "1px solid rgba(0,0,0,0.1)",
                        backgroundColor: "transparent",
                      }}
                      value={idFilter}
                      onChange={(e) => {
                        setIdFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </th>
                  <th className="px-[12px]  py-[6px]">
                    <Input
                      placeholder="Filter by Title"
                      className="h-8 rounded-[4px] font-medium"
                      style={{
                        border: "1px solid rgba(0,0,0,0.1)",
                        backgroundColor: "transparent",
                      }}
                      value={titleFilter}
                      onChange={(e) => {
                        setTitleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </th>
                  <th className="px-[12px] py-[6px]">
                    <Input
                      placeholder="Filter by Status"
                      className="h-8 rounded-[4px] font-medium"
                      style={{
                        border: "1px solid rgba(0,0,0,0.1)",
                        backgroundColor: "transparent",
                      }}
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </th>

                  <th className="px-[12px] py-[6px]">
                    <Input
                      placeholder="Filter by HTML Version"
                      className="h-8 rounded-[4px] font-medium"
                      style={{
                        border: "1px solid rgba(0,0,0,0.1)",
                        backgroundColor: "transparent",
                      }}
                      value={htmlVersionFilter}
                      onChange={(e) => {
                        setHtmlVersionFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedData?.length === 0 ? (
                  <tr
                    className={`text-[14px]`}
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.1)",
                    }}
                  >
                    <td className="px-[12px] py-[6px] text-center" colSpan={10}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  sortedData?.map(
                    ({
                      id,
                      url,
                      status,
                      should_pause,
                      title,
                      html_version,
                      internal_links_count,
                      external_links_count,
                      created_at,
                      updated_at,
                    }) => {
                      const detailUrl = `/analyses/${id}`;

                      return (
                        <tr
                          onClick={() =>
                            window.open(
                              detailUrl,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          key={id}
                          className={`${
                            !!currentCheckedItems[id] && "bg-[#f5f5f5]"
                          } ${"hover:bg-[#f5f5f5]"} tr-challenges-and-projects text-[14px] transition-all duration-200 url-history`}
                          style={{
                            borderBottom: "1px solid rgba(0,0,0,0.1)",
                          }}
                        >
                          <td className="px-[12px] py-[6px]">
                            <Checkbox
                              checked={!!currentCheckedItems[id]}
                              onCheckedChange={(checked) => {
                                handleCheckItem(id, checked);
                                if (checked) {
                                  setToSendURLs((prevState) => [
                                    ...prevState,
                                    url,
                                  ]);
                                } else {
                                  setToSendURLs((prevState: string[]) =>
                                    prevState.filter((item) => item !== url)
                                  );
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-[12px] py-[6px]">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left"
                            >
                              {id}
                            </a>
                          </td>
                          <td className="px-[12px] py-[6px] whitespace-nowrap">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left overflow-hidden whitespace-nowrap overflow-ellipsis max-w-[500px]"
                            >
                              {title}
                            </a>
                          </td>
                          <td className="px-[12px] py-[6px]">
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  status === "running" ||
                                  (status === "queued" && should_pause)
                                ) {
                                  toggleShouldPause(id);
                                }
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-full h-full text-left flex items-center gap-3 cursor-pointer
                                  `}
                            >
                              {should_pause ? (
                                <div className="cursor-pointer flex gap-3 items-center">
                                  <div className="flex items-center gap-1 text-xs px-2 py-[2px] bg-yellow-100 text-yellow-700 rounded-full ">
                                    <Pause className="w-3.5 h-3.5" />
                                    Paused
                                  </div>
                                  <Play size={16} color="green" />
                                </div>
                              ) : (
                                <div
                                  className={`flex gap-3 items-center ${
                                    (status === "running" ||
                                      (status === "queued" && should_pause)) &&
                                    "cursor-pointer"
                                  }`}
                                >
                                  <StatusBadge status={status} />
                                  <>
                                    <Pause
                                      size={16}
                                      color="#f5a623"
                                      className={`${
                                        status !== "queued" && status !== "done"
                                          ? ""
                                          : "hidden"
                                      }`}
                                    />
                                  </>
                                </div>
                              )}
                            </a>
                          </td>
                          <td className=" px-[12px] py-[6px]">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left"
                            >
                              {html_version}
                            </a>
                          </td>
                          <td className=" px-[12px] py-[6px]">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left"
                            >
                              {internal_links_count}
                            </a>
                          </td>
                          <td className=" px-[12px] py-[6px]">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left"
                            >
                              {external_links_count}
                            </a>
                          </td>
                          <td className=" px-[12px] py-[6px]">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left"
                            >
                              {formatDateEU(created_at)}
                            </a>
                          </td>
                          <td className=" px-[12px] py-[6px]">
                            <a
                              href={detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full text-left"
                            >
                              {formatDateEU(updated_at)}
                            </a>
                          </td>
                          <td className=" px-[12px] py-[6px] bg--50 flex justify-center items-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  onClick={(e) => e.stopPropagation()}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 bg-transparent font-bold gap-1"
                                >
                                  <DotsHorizontalIcon />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                onClick={(e) => e.stopPropagation()}
                                className="w-[150px] p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandList>
                                    <CommandEmpty>
                                      No results found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {
                                        // options
                                        ["Re-run", "Delete"].map((option) => {
                                          return (
                                            <CommandItem
                                              onSelect={() => {
                                                switch (option) {
                                                  case "Delete":
                                                    deleteUrlById(id);
                                                    break;
                                                  case "Re-run":
                                                    startBulkAnalysis([url]);
                                                    break;
                                                  default:
                                                    break;
                                                }
                                              }}
                                              key={option}
                                              className="p-2 text-sm"
                                            >
                                              <PopoverClose className="flex items-center gap-2">
                                                {option === "Re-run" && (
                                                  <RefreshCcw
                                                    size={16}
                                                    color="#008236"
                                                  />
                                                )}

                                                {option === "Delete" && (
                                                  <Trash2
                                                    size={16}
                                                    color="#c10007"
                                                  />
                                                )}

                                                <span>{option}</span>
                                              </PopoverClose>
                                            </CommandItem>
                                          );
                                        })
                                      }
                                    </CommandGroup>

                                    {selectedStatus.size > 0 && (
                                      <>
                                        <CommandSeparator />
                                        <CommandGroup>
                                          <CommandItem
                                            onSelect={() => {
                                              setSelectedStatus(new Set());
                                              setPopoverStatusFilter(["all"]);
                                            }}
                                            className="justify-center"
                                          >
                                            <span
                                              style={{
                                                fontSize: "14px",
                                              }}
                                            >
                                              Clear filters
                                            </span>
                                          </CommandItem>
                                        </CommandGroup>
                                      </>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-2 mt-[10px]">
          <div>
            {Object.values(currentCheckedItems).some((val) => val) && (
              <Button onClick={() => startBulkAnalysis([])} variant={"default"}>
                Re-run Selected URLs
              </Button>
            )}
            {Object.values(currentCheckedItems).some((val) => val) && (
              <Button
                className="ml-[12px]"
                variant={"default"}
                onClick={deleteSelected}
              >
                Delete Selected URLs
              </Button>
            )}
          </div>
          <div className="flex items-center gap-x-6 lg:gap-x-8">
            <div className="flex items-center gap-x-2">
              <p>
                <span className="text-[14px] font-medium">Rows per page</span>
              </p>
              <Select
                value={`${ITEMS_PER_PAGE}`}
                onValueChange={(value) => {
                  setITEMS_PER_PAGE(+value);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={ITEMS_PER_PAGE} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center font-medium">
              <span className="text-[14px]">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
            <div className="flex items-center gap-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Table;
