import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle } from "lucide-react";

interface StatusSelectorProps {
  status: string;
  onStatusChange: (status: string) => void;
}

const statusOptions = [
  { value: "online", label: "Online", color: "text-status-online" },
  { value: "away", label: "Away", color: "text-status-away" },
  { value: "dnd", label: "Do Not Disturb", color: "text-status-busy" },
  { value: "offline", label: "Offline", color: "text-status-offline" },
];

export default function StatusSelector({
  status,
  onStatusChange,
}: StatusSelectorProps) {
  const currentStatus = statusOptions.find((s) => s.value === status);

  return (
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger
        className="w-full"
        data-testid="select-status"
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            <Circle className={`w-3 h-3 fill-current ${currentStatus?.color}`} />
            <span>{currentStatus?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            data-testid={`status-option-${option.value}`}
          >
            <div className="flex items-center gap-2">
              <Circle className={`w-3 h-3 fill-current ${option.color}`} />
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
