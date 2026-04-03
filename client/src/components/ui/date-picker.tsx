import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className
}: {
  value: string | undefined
  onChange: (date: string | undefined) => void
  placeholder?: string
  className?: string
}) {
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-white h-[38px] px-3",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium">{date ? format(date, "PPP") : <span>{placeholder}</span>}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            onChange(newDate ? format(newDate, "yyyy-MM-dd") : "")
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
