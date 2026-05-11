import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            locale={ptBR}
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-4",
                month_caption: "flex justify-center relative items-center h-9",
                caption_label: "text-sm font-medium pointer-events-none",
                nav: "absolute inset-x-0 flex items-center justify-between z-10",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                week: "flex w-full mt-2",
                day: "h-9 w-9 p-0 font-normal text-center text-sm",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
                ),
                selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                today: "bg-accent text-accent-foreground rounded-md",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
                hidden: "invisible",
                range_start: "rounded-l-md",
                range_end: "rounded-r-md",
                range_middle: "bg-accent",
                ...classNames
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
                    return <Icon className="h-4 w-4" />;
                }
            }}
            {...props}
        />
    );
}
Calendar.displayName = "Calendar";

export { Calendar };
