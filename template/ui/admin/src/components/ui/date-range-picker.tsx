import { useState } from "react";
import {
    format,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subDays,
    subWeeks,
    subMonths
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";

export interface DateRangeShortcut {
    label: string;
    range: DateRange;
}

interface DateRangePickerProps {
    value?: DateRange | undefined;
    onChange?: (date: DateRange | undefined) => void;
    className?: string;
    placeholder?: string;
    shortcuts?: DateRangeShortcut[];
}

const getDefaultShortcuts = (): DateRangeShortcut[] => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    return [
        {
            label: "Hoje",
            range: { from: startOfDay(today), to: endOfDay(today) }
        },
        {
            label: "Ontem",
            range: { from: startOfDay(yesterday), to: endOfDay(yesterday) }
        },
        {
            label: "Esta Semana",
            range: {
                from: startOfWeek(today, { locale: ptBR }),
                to: endOfWeek(today, { locale: ptBR })
            }
        },
        {
            label: "Semana Passada",
            range: {
                from: startOfWeek(subWeeks(today, 1), { locale: ptBR }),
                to: endOfWeek(subWeeks(today, 1), { locale: ptBR })
            }
        },
        {
            label: "Este Mes",
            range: { from: startOfMonth(today), to: endOfMonth(today) }
        },
        {
            label: "Mes Passado",
            range: {
                from: startOfMonth(subMonths(today, 1)),
                to: endOfMonth(subMonths(today, 1))
            }
        },
        {
            label: "Ultimos 3 Meses",
            range: {
                from: startOfMonth(subMonths(today, 2)),
                to: endOfDay(today)
            }
        }
    ];
};

export function DateRangePicker({
    value,
    onChange,
    className,
    placeholder = "Selecione um periodo",
    shortcuts: shortcutsProp
}: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [tempRange, setTempRange] = useState<DateRange | undefined>(value);

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setTempRange(value);
        }
        setOpen(isOpen);
    };

    const handleSelect = (range: DateRange | undefined) => {
        setTempRange(range);
    };

    const handleShortcut = (range: DateRange) => {
        setTempRange(range);
    };

    const handleApply = () => {
        onChange?.(tempRange);
        setOpen(false);
    };

    const handleClear = () => {
        setTempRange(undefined);
        onChange?.(undefined);
        setOpen(false);
    };

    const shortcuts = shortcutsProp || getDefaultShortcuts();

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant="outline"
                        className={cn(
                            "w-full sm:w-[280px] justify-start text-left font-normal",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {value?.from ? (
                            value.to ? (
                                <span className="truncate">
                                    {format(value.from, "dd/MM", { locale: ptBR })} -{" "}
                                    {format(value.to, "dd/MM/yy", { locale: ptBR })}
                                </span>
                            ) : (
                                <span className="truncate">
                                    {format(value.from, "dd 'de' MMMM, yyyy", {
                                        locale: ptBR
                                    })}
                                </span>
                            )
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0 max-w-[calc(100vw-2rem)]"
                    align="center"
                    sideOffset={8}
                >
                    <div className="flex flex-col max-h-[80vh] overflow-y-auto">
                        <div className="p-3 border-b">
                            <div className="flex flex-wrap gap-1.5">
                                {shortcuts.map((shortcut) => (
                                    <Button
                                        key={shortcut.label}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 px-2.5"
                                        onClick={() => handleShortcut(shortcut.range)}
                                    >
                                        {shortcut.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Calendar
                                mode="range"
                                defaultMonth={tempRange?.from || value?.from}
                                selected={tempRange}
                                onSelect={handleSelect}
                                numberOfMonths={2}
                                className="p-2 sm:p-3"
                            />
                            <div className="p-3 border-t flex justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClear}
                                >
                                    Limpar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleApply}
                                    disabled={!tempRange?.from || !tempRange?.to}
                                >
                                    Aplicar
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
