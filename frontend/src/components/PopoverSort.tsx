import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui//popover";
import { Button } from "../components/ui//button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { ArrowDown, ArrowUp } from "lucide-react";
import React from "react";
import { PopoverClose } from "@radix-ui/react-popover";

// SortOrder defines the possible states of a sort process
type SortOrder = "asc" | "desc";

// PopoverSort data type definition
interface PopoverSortProps {
  label: string;
  field: string;
  onSortChange: (field: string, order: SortOrder) => void;
  currentSortField: string;
  currentSortOrder: SortOrder;
}

// The component I created for sorting the columns
export const PopoverSort: React.FC<PopoverSortProps> = ({
  label,
  field,
  onSortChange,
  currentSortField,
  currentSortOrder,
}) => {
  // There are two labels for ascending and descending, each with their own icons
  const options: { label: string; icon: React.JSX.Element }[] = [
    { label: "Asc", icon: <ArrowUp size={16} /> },
    { label: "Desc", icon: <ArrowDown size={16} /> },
  ];

  // A function to trigger the popover
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // e.stopPropagation() is used here to prevent the click event
    // from bubbling up to parent elements, which might close the popover immediately
    e.stopPropagation();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          onClick={handleClick}
          variant="ghost"
          size="sm"
          className="h-8 bg-transparent font-bold gap-1"
        >
          {label}
          <CaretSortIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map(({ label: sortLabel, icon }) => {
                const sortKey = sortLabel.toLowerCase() as SortOrder;
                return (
                  <CommandItem
                    key={sortLabel}
                    className="p-2 text-sm"
                    onSelect={() => onSortChange(field, sortKey)}
                  >
                    <PopoverClose>
                      <div className="flex items-center gap-2">
                        {icon}
                        {sortLabel}
                        {currentSortField === field &&
                          currentSortOrder === sortKey && (
                            <span className="ml-auto text-xs text-primary font-semibold">
                              ✓
                            </span>
                          )}
                      </div>
                    </PopoverClose>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
