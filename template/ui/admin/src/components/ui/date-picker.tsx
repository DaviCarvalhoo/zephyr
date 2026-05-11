import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";

interface DatePickerProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Selecione uma data",
    disabled = false,
    className
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => {
        if (!value) return undefined;
        const date = parse(value, "yyyy-MM-dd", new Date());
        return isValid(date) ? date : undefined;
    }, [value]);

    const displayValue = React.useMemo(() => {
        if (!selectedDate) return "";
        return format(selectedDate, "dd/MM/yyyy", { locale: ptBR });
    }, [selectedDate]);

    const handleSelect = (date: Date | undefined) => {
        if (date && onChange) {
            onChange(format(date, "yyyy-MM-dd"));
        } else if (onChange) {
            onChange("");
        }
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {displayValue || placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
